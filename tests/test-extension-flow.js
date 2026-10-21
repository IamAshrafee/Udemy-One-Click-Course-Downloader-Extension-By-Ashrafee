// Run with:  node tests/test-extension-flow.js [workdir]
// Loads the REAL background.js and offscreen.js into sandboxes with a mocked `chrome` API
// and runs a full download: content-script message -> queue -> offscreen HLS download ->
// chrome.downloads -> file on disk. Needs ffmpeg + ffprobe on PATH.
// This does not replace a manual run in Chrome (OPFS / blob: URLs / downloads are mocked).
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { resolveObjectURL } = require('buffer');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const workdir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'flow-test-'));
fs.mkdirSync(workdir, { recursive: true });

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
    if (r.error) throw r.error;
    return r;
}

// ── Test HLS stream (fMP4 with a separate audio rendition) ─────────────────────────
function generateStream(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const r = run('ffmpeg', ['-y', '-v', 'error',
        '-f', 'lavfi', '-i', 'testsrc=duration=14:size=640x360:rate=30',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=14',
        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60',
        '-sc_threshold', '0', '-c:a', 'aac', '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod',
        '-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init_%v.mp4',
        '-var_stream_map', 'v:0,agroup:aud a:0,agroup:aud,default:yes', '-master_pl_name', 'master.m3u8',
        '-hls_segment_filename', 'seg_%v_%03d.m4s', 'media_%v.m3u8'], { cwd: dir });
    assert.strictEqual(r.status, 0, r.stderr);
    // encrypted variant of the same layout
    const enc = path.join(dir, 'enc');
    fs.mkdirSync(enc);
    fs.writeFileSync(path.join(enc, 'master.m3u8'),
        '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=640x360\nmedia.m3u8\n');
    fs.writeFileSync(path.join(enc, 'media.m3u8'),
        '#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://k"\n#EXTINF:4,\ns.ts\n#EXT-X-ENDLIST\n');
}

function startServer(dir) {
    const server = http.createServer((req, res) => {
        const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        const cors = { 'Access-Control-Allow-Origin': '*' };
        if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404, cors);
            return res.end('nf');
        }
        res.writeHead(200, cors);
        res.end(fs.readFileSync(file));
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ── Mocked Chrome environment ────────────────────────────────────────────────────
const downloadsDir = path.join(workdir, 'Downloads');
const opfsDir = path.join(workdir, 'opfs');

function makeEnvironment() {
    fs.rmSync(downloadsDir, { recursive: true, force: true });
    fs.rmSync(opfsDir, { recursive: true, force: true });
    fs.mkdirSync(opfsDir, { recursive: true });

    const env = {
        store: { local: {}, sync: { preferredQuality: 'highest' } },
        listeners: { background: [], offscreen: [] },
        tabMessages: [],
        downloadsLog: [],
        downloadState: new Map(),
        downloadChangeListeners: new Set(),
        offscreenContext: null,
        nextDownloadId: 1
    };

    // Deliver a runtime message from one context to the other context's listeners.
    function deliver(target, message, sender = {}) {
        return new Promise(resolve => {
            let answered = false;
            const sendResponse = value => {
                if (!answered) { answered = true; resolve(value); }
            };
            let async = false;
            for (const listener of env.listeners[target]) {
                if (listener(message, sender, sendResponse) === true) async = true;
            }
            if (!async) setImmediate(() => sendResponse(undefined));
        });
    }
    env.deliver = deliver;

    const storageArea = area => ({
        async get(keys) {
            const out = {};
            for (const k of [].concat(keys)) if (k in env.store[area]) out[k] = env.store[area][k];
            return out;
        },
        async set(values) { Object.assign(env.store[area], values); }
    });

    function fire(downloadId, delta) {
        for (const l of [...env.downloadChangeListeners]) l({ id: downloadId, ...delta });
    }

    function runtimeFor(self, other) {
        return {
            sendMessage: message => deliver(other, message, {}),
            onMessage: { addListener: fn => env.listeners[self].push(fn) },
            onInstalled: { addListener() {} },
            getManifest: () => JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')),
            getContexts: async () => (env.offscreenContext ? [{}] : []),
            lastError: undefined
        };
    }

    const backgroundChrome = {
        runtime: runtimeFor('background', 'offscreen'),
        storage: { local: storageArea('local'), sync: storageArea('sync') },
        tabs: {
            sendMessage: async (tabId, message) => { env.tabMessages.push({ tabId, ...message }); },
            create: async () => {}
        },
        offscreen: {
            async createDocument({ url }) {
                assert.strictEqual(url, 'offscreen.html');
                env.offscreenContext = createOffscreenContext();
            },
            async closeDocument() { env.offscreenContext = null; }
        },
        downloads: {
            onChanged: {
                addListener: fn => env.downloadChangeListeners.add(fn),
                removeListener: fn => env.downloadChangeListeners.delete(fn)
            },
            download(options, callback) {
                const id = env.nextDownloadId++;
                env.downloadsLog.push({ id, ...options });
                env.downloadState.set(id, { state: 'in_progress' });
                setImmediate(() => callback(id));
                setTimeout(async () => {
                    try {
                        let bytes;
                        if (options.url.startsWith('blob:')) {
                            const blob = resolveObjectURL(options.url);
                            if (!blob) throw new Error('blob URL could not be resolved (revoked too early?)');
                            bytes = Buffer.from(await blob.arrayBuffer());
                        } else if (options.url.startsWith('data:')) {
                            bytes = Buffer.from(options.url.split(',')[1], 'base64');
                        } else {
                            const res = await fetch(options.url);
                            if (!res.ok) throw new Error('HTTP ' + res.status);
                            bytes = Buffer.from(await res.arrayBuffer());
                        }
                        const out = path.join(downloadsDir, options.filename);
                        fs.mkdirSync(path.dirname(out), { recursive: true });
                        fs.writeFileSync(out, bytes);
                        env.downloadState.set(id, { state: 'complete', fileSize: bytes.length, file: out });
                        fire(id, { state: { current: 'complete' } });
                    } catch (e) {
                        env.downloadState.set(id, { state: 'interrupted', error: 'FAILED' });
                        fire(id, { error: { current: 'FAILED' } });
                    }
                }, 20);
            },
            async search({ id }) {
                const s = env.downloadState.get(id);
                return s ? [{ id, ...s }] : [];
            }
        }
    };

    // Origin-private file system backed by a temp directory
    const opfs = {
        async getFileHandle(name, { create } = {}) {
            const file = path.join(opfsDir, name);
            if (create && !fs.existsSync(file)) fs.writeFileSync(file, '');
            return {
                async createWritable() {
                    const fd = fs.openSync(file, 'w');
                    return {
                        async write(u8) { fs.writeSync(fd, u8); },
                        async close() { fs.closeSync(fd); },
                        async abort() { fs.closeSync(fd); }
                    };
                },
                async getFile() { return fs.openAsBlob(file); }
            };
        },
        async removeEntry(name) { fs.rmSync(path.join(opfsDir, name), { force: true }); },
        async *keys() { for (const n of fs.readdirSync(opfsDir)) yield n; }
    };

    function createOffscreenContext() {
        const sandbox = {
            console, fetch, URL, TextDecoder, Uint8Array, setTimeout, clearTimeout, setImmediate, Promise,
            navigator: { storage: { getDirectory: async () => opfs } },
            chrome: { runtime: runtimeFor('offscreen', 'background') }
        };
        sandbox.self = sandbox;
        vm.createContext(sandbox);
        for (const f of ['hls/hls-parser.js', 'hls/fmp4-mux.js', 'hls/hls-downloader.js', 'offscreen.js']) {
            vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
        }
        return sandbox;
    }

    const bgSandbox = {
        console, URL, setTimeout, clearTimeout, Promise,
        chrome: backgroundChrome
    };
    vm.createContext(bgSandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8'), bgSandbox, { filename: 'background.js' });

    return env;
}

async function waitFor(cond, ms = 60000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        if (await cond()) return;
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('timed out waiting for condition');
}

let failures = 0;
async function test(name, fn) {
    try {
        await fn();
        console.log('PASS  ' + name);
    } catch (e) {
        failures++;
        console.log('FAIL  ' + name + '\n      ' + (e && e.stack || e));
    }
}

function probe(file) {
    const r = run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', file]);
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
}

(async () => {
    const streamDir = path.join(workdir, 'stream');
    generateStream(streamDir);
    const server = await startServer(streamDir);
    const base = 'http://127.0.0.1:' + server.address().port;

    await test('HLS lecture becomes one playable mp4 in Course/Section', async () => {
        const env = makeEnvironment();
        const response = await env.deliver('background', {
            action: 'ashrafee_downloadVideo',
            url: base + '/master.m3u8?sig=abc',
            title: '1. Intro to the Course.mp4',
            courseName: 'LLMOps: Bootcamp',
            sectionName: 'Section 1: Intro'
        }, { tab: { id: 7 } });
        assert.strictEqual(response.success, true);

        await waitFor(async () => (env.store.local.downloadQueue || []).length === 0 && env.downloadsLog.length > 0
            && [...env.downloadState.values()].every(s => s.state !== 'in_progress'));

        assert.strictEqual(env.downloadsLog.length, 1);
        const dl = env.downloadsLog[0];
        assert.ok(dl.url.startsWith('blob:'), 'expected a blob: URL from the offscreen document, got ' + dl.url);
        assert.strictEqual(dl.filename, 'Udemy/LLMOps_ Bootcamp/Section 1_ Intro/1. Intro to the Course.mp4');

        const file = path.join(downloadsDir, dl.filename);
        const info = probe(file);
        assert.deepStrictEqual(info.streams.map(s => s.codec_type).sort(), ['audio', 'video']);
        assert.ok(parseFloat(info.format.duration) > 12);
        const decode = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
        assert.strictEqual(decode.status, 0, decode.stderr);
        assert.strictEqual(decode.stderr.trim(), '');
        assert.ok(fs.statSync(file).size > 100000, 'file is suspiciously small (playlist text?)');

        assert.strictEqual(env.store.local.downloadCount, 1);
        assert.ok(env.store.local.downloadSize > 100000, 'size statistic not recorded');
        const states = env.tabMessages.filter(m => m.tabId === 7).map(m => m.state);
        assert.ok(states.includes('progress') || states.includes('saving'), 'no progress reported: ' + states);
        assert.strictEqual(states[states.length - 1], 'done');
        assert.deepStrictEqual(fs.readdirSync(opfsDir), [], 'temporary OPFS file was not cleaned up');
        assert.strictEqual(env.offscreenContext, null, 'offscreen document should close when the queue is empty');
        console.log('      -> ' + dl.filename + ' (' + fs.statSync(file).size + ' bytes)');
    });

    await test('quality preference 360 is honoured (picks a variant, still plays)', async () => {
        const env = makeEnvironment();
        env.store.sync.preferredQuality = '360';
        await env.deliver('background', {
            action: 'ashrafee_downloadVideo', url: base + '/master.m3u8', title: 'q.mp4', courseName: 'C', sectionName: 'S'
        }, { tab: { id: 1 } });
        await waitFor(async () => env.downloadsLog.length === 1 && env.downloadState.get(1).state === 'complete');
        assert.ok(probe(path.join(downloadsDir, env.downloadsLog[0].filename)).streams.length === 2);
    });

    await test('encrypted stream reports an error and does not save garbage', async () => {
        const env = makeEnvironment();
        await env.deliver('background', {
            action: 'ashrafee_downloadVideo', url: base + '/enc/master.m3u8', title: 'drm.mp4', courseName: 'C', sectionName: 'S'
        }, { tab: { id: 9 } });
        await waitFor(async () => (env.store.local.downloadQueue || []).length === 0 && env.tabMessages.some(m => m.state === 'error'));
        const err = env.tabMessages.find(m => m.state === 'error');
        assert.ok(/encryption|DRM/i.test(err.message), err.message);
        assert.strictEqual(env.downloadsLog.length, 0, 'nothing should be downloaded');
        assert.strictEqual(env.store.local.errorCount, 1);
        assert.ok(!(env.store.local.downloadCount > 0));
    });

    await test('plain mp4 URL still downloads directly', async () => {
        const env = makeEnvironment();
        fs.writeFileSync(path.join(streamDir, 'plain.mp4'), Buffer.alloc(5000, 1));
        await env.deliver('background', {
            action: 'ashrafee_downloadVideo', url: base + '/plain.mp4', title: 'Plain.mp4', courseName: 'C', sectionName: 'S'
        }, { tab: { id: 2 } });
        await waitFor(async () => env.downloadsLog.length === 1 && env.downloadState.get(1).state === 'complete');
        assert.strictEqual(env.downloadsLog[0].filename, 'Udemy/C/S/Plain.mp4');
        assert.strictEqual(env.store.local.downloadSize, 5000);
    });

    await test('resource with an uncommon extension keeps it (no ".mp4" appended)', async () => {
        const env = makeEnvironment();
        fs.writeFileSync(path.join(streamDir, 'code.bin'), Buffer.alloc(100, 2));
        await env.deliver('background', {
            action: 'ashrafee_downloadVideo', url: base + '/code.bin', title: 'Lecture/main.py', courseName: 'C', sectionName: 'S'
        }, { tab: { id: 3 } });
        await waitFor(async () => env.downloadsLog.length === 1);
        assert.strictEqual(env.downloadsLog[0].filename, 'Udemy/C/S/Lecture/main.py');
    });

    server.close();
    console.log(failures ? `\n${failures} test(s) FAILED` : '\nAll tests passed');
    process.exit(failures ? 1 : 0);
})();
