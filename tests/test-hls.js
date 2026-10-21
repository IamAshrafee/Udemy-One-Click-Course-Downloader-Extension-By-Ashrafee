// Run with:  node tests/test-hls.js [workdir]
// Needs ffmpeg + ffprobe on PATH. Generates small HLS streams, serves them over HTTP,
// downloads them with hls/hls-downloader.js and verifies the output files with ffprobe/ffmpeg.
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const Parser = require('../hls/hls-parser.js');
const { downloadHls } = require('../hls/hls-downloader.js');

const workdir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'hls-test-'));
fs.mkdirSync(workdir, { recursive: true });

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

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
    if (r.error) throw r.error;
    return r;
}

// --- Fixture: the master playlist the extension used to save as "video.mp4" -----------
const REAL_MASTER = `#EXTM3U
# Created with Bento4 mp4-dash.py, VERSION=2.0.0-641
#
#EXT-X-VERSION:6

# Media Playlists

# Audio
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="und",NAME="Unknown",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="2",URI="audio/und/mp4a.40.2/media.m3u8"

# Video
#EXT-X-STREAM-INF:AUDIO="audio",AVERAGE-BANDWIDTH=833980,BANDWIDTH=1250520,VIDEO-RANGE=SDR,CODECS="avc1.42C01E,mp4a.40.2",RESOLUTION=640x360,FRAME-RATE=30.000
video/avc1/1/media.m3u8
#EXT-X-STREAM-INF:AUDIO="audio",AVERAGE-BANDWIDTH=1003601,BANDWIDTH=1770344,VIDEO-RANGE=SDR,CODECS="avc1.4D401F,mp4a.40.2",RESOLUTION=854x480,FRAME-RATE=30.000
video/avc1/2/media.m3u8
#EXT-X-STREAM-INF:AUDIO="audio",AVERAGE-BANDWIDTH=1916390,BANDWIDTH=3462412,VIDEO-RANGE=SDR,CODECS="avc1.640028,mp4a.40.2",RESOLUTION=1280x720,FRAME-RATE=30.000
video/avc1/3/media.m3u8
#EXT-X-STREAM-INF:AUDIO="audio",AVERAGE-BANDWIDTH=3618934,BANDWIDTH=6998208,VIDEO-RANGE=SDR,CODECS="avc1.640029,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=30.000
video/avc1/4/media.m3u8

# I-Frame Playlists
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=222752,BANDWIDTH=405830,VIDEO-RANGE=SDR,CODECS="avc1.42C01E",RESOLUTION=640x360,URI="video/avc1/1/iframes.m3u8"
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=1325825,BANDWIDTH=2477180,VIDEO-RANGE=SDR,CODECS="avc1.640029",RESOLUTION=1920x1080,URI="video/avc1/4/iframes.m3u8"
`;

function startServer(dir) {
    const server = http.createServer((req, res) => {
        const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404);
            return res.end('not found');
        }
        const data = fs.readFileSync(file);
        const range = req.headers.range && req.headers.range.match(/bytes=(\d+)-(\d+)?/);
        if (range) {
            const start = parseInt(range[1], 10);
            const end = range[2] ? parseInt(range[2], 10) : data.length - 1;
            res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${data.length}` });
            return res.end(data.subarray(start, end + 1));
        }
        res.writeHead(200);
        res.end(data);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function fetchBytes(url, range) {
    const headers = {};
    if (range) headers.Range = `bytes=${range.offset}-${range.offset + range.length - 1}`;
    const res = await fetch(url, { headers });
    if (!res.ok && res.status !== 206) {
        const e = new Error('HTTP ' + res.status);
        if (res.status >= 400 && res.status < 500) e.fatal = true;
        throw e;
    }
    return new Uint8Array(await res.arrayBuffer());
}

function fileSink(outBase) {
    return async ext => {
        const file = outBase + '.' + ext;
        const fd = fs.openSync(file, 'w');
        return {
            file,
            async write(u8) { fs.writeSync(fd, u8); },
            async close() { fs.closeSync(fd); return file; },
            async abort() { fs.closeSync(fd); }
        };
    };
}

function probe(file) {
    const r = run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height:format=duration',
        '-of', 'json', file]);
    assert.strictEqual(r.status, 0, 'ffprobe failed: ' + r.stderr);
    return JSON.parse(r.stdout);
}

function decodeClean(file) {
    const r = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
    assert.strictEqual(r.status, 0, 'ffmpeg decode failed: ' + r.stderr);
    assert.strictEqual(r.stderr.trim(), '', 'decode printed errors: ' + r.stderr);
}

function generate(name, extraArgs) {
    const dir = path.join(workdir, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const base = ['-y', '-v', 'error',
        '-f', 'lavfi', '-i', 'testsrc=duration=14:size=640x360:rate=30',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=14',
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
        '-c:a', 'aac', '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod'];
    const r = run('ffmpeg', [...base, ...extraArgs], { cwd: dir });
    assert.strictEqual(r.status, 0, 'ffmpeg generate failed: ' + r.stderr);
    return dir;
}

(async () => {
    // ---- Parser unit tests against the real playlist ---------------------------------
    await test('parseMaster reads the real Udemy master playlist', () => {
        const base = 'https://mp4-c.udemycdn.com/2024/abc/hls/master.m3u8?token=XYZ';
        const m = Parser.parseMaster(REAL_MASTER, base);
        assert.strictEqual(m.variants.length, 4, 'I-frame playlists must not be treated as variants');
        assert.deepStrictEqual(m.variants.map(v => v.height), [360, 480, 720, 1080]);
        assert.ok(m.variants[3].url.startsWith('https://mp4-c.udemycdn.com/2024/abc/hls/video/avc1/4/media.m3u8'));
        assert.ok(m.variants[3].url.includes('token=XYZ'), 'signed query should be inherited');
        const audio = Parser.pickAudio(m, m.variants[0]);
        assert.ok(audio && audio.uri.includes('audio/und/mp4a.40.2/media.m3u8'));
    });

    await test('pickVariant honours the quality preference', () => {
        const m = Parser.parseMaster(REAL_MASTER, 'https://x.test/master.m3u8');
        assert.strictEqual(Parser.pickVariant(m.variants, 'highest').height, 1080);
        assert.strictEqual(Parser.pickVariant(m.variants, 'lowest').height, 360);
        assert.strictEqual(Parser.pickVariant(m.variants, '720').height, 720);
        assert.strictEqual(Parser.pickVariant(m.variants, '600').height, 480);
        assert.strictEqual(Parser.pickVariant(m.variants, '100').height, 360);
    });

    await test('parseMedia flags encryption', () => {
        const t = '#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://x"\n#EXTINF:4,\na.ts\n#EXT-X-ENDLIST';
        assert.strictEqual(Parser.parseMedia(t, 'https://x.test/a.m3u8').encrypted, 'SAMPLE-AES');
        const ok = '#EXTM3U\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:4,\na.ts\n#EXT-X-ENDLIST';
        assert.strictEqual(Parser.parseMedia(ok, 'https://x.test/a.m3u8').encrypted, null);
    });

    // ---- End-to-end against real generated streams -----------------------------------
    const cases = [
        {
            name: 'fmp4_separate_audio',
            args: ['-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init_%v.mp4',
                '-var_stream_map', 'v:0,agroup:aud a:0,agroup:aud,default:yes',
                '-master_pl_name', 'master.m3u8', '-hls_segment_filename', 'seg_%v_%03d.m4s', 'media_%v.m3u8'],
            expectExt: 'mp4', expectAudio: true
        },
        {
            name: 'fmp4_muxed',
            args: ['-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4',
                '-master_pl_name', 'master.m3u8', '-hls_segment_filename', 'seg_%03d.m4s', 'media.m3u8'],
            expectExt: 'mp4', expectAudio: true
        },
        {
            name: 'mpegts_muxed',
            args: ['-hls_segment_type', 'mpegts',
                '-master_pl_name', 'master.m3u8', '-hls_segment_filename', 'seg_%03d.ts', 'media.m3u8'],
            expectExt: 'ts', expectAudio: true
        }
    ];

    for (const c of cases) {
        await test('download ' + c.name, async () => {
            const dir = generate(c.name, c.args);
            const server = await startServer(dir);
            try {
                const port = server.address().port;
                const url = `http://127.0.0.1:${port}/${fs.existsSync(path.join(dir, 'master.m3u8')) ? 'master' : 'media'}.m3u8`;
                const progress = [];
                const result = await downloadHls({
                    url,
                    quality: 'highest',
                    fetchBytes,
                    createSink: fileSink(path.join(workdir, c.name + '_out')),
                    onProgress: p => progress.push(p)
                });
                assert.strictEqual(result.ext, c.expectExt);
                const info = probe(result.sinkResult);
                const types = info.streams.map(s => s.codec_type).sort();
                assert.ok(types.includes('video'), 'no video stream in output: ' + JSON.stringify(info));
                if (c.expectAudio) assert.ok(types.includes('audio'), 'no audio stream in output: ' + JSON.stringify(info));
                assert.strictEqual(types.filter(t => t === 'video').length, 1);
                const duration = parseFloat(info.format.duration);
                assert.ok(duration > 12 && duration < 16, 'unexpected duration ' + duration);
                decodeClean(result.sinkResult);
                assert.ok(progress.some(p => p.stage === 'segments' && p.done === p.total), 'progress never reached 100%');
                console.log('      -> ' + path.basename(result.sinkResult) + ': ' + result.bytes + ' bytes, ' +
                    types.join('+') + ', ' + duration.toFixed(2) + 's');
            } finally {
                server.close();
            }
        });
    }

    await test('encrypted stream is refused', async () => {
        const dir = path.join(workdir, 'encrypted');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'master.m3u8'),
            '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=640x360\nmedia.m3u8\n');
        fs.writeFileSync(path.join(dir, 'media.m3u8'),
            '#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://key"\n#EXTINF:4,\nseg.ts\n#EXT-X-ENDLIST\n');
        const server = await startServer(dir);
        try {
            await downloadHls({
                url: `http://127.0.0.1:${server.address().port}/master.m3u8`,
                fetchBytes,
                createSink: async () => { throw new Error('sink must not be created for encrypted streams'); }
            }).then(() => assert.fail('should have thrown'), e => assert.strictEqual(e.code, 'ENCRYPTED'));
        } finally {
            server.close();
        }
    });

    await test('HTML error page is not saved as a video', async () => {
        const dir = path.join(workdir, 'badseg');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'media.m3u8'), '#EXTM3U\n#EXTINF:4,\nseg.ts\n#EXT-X-ENDLIST\n');
        fs.writeFileSync(path.join(dir, 'seg.ts'), '<html>403 Forbidden</html>');
        const server = await startServer(dir);
        try {
            await downloadHls({
                url: `http://127.0.0.1:${server.address().port}/media.m3u8`,
                fetchBytes,
                createSink: fileSink(path.join(workdir, 'badseg_out'))
            }).then(() => assert.fail('should have thrown'), e => assert.strictEqual(e.code, 'BAD_SEGMENT'));
        } finally {
            server.close();
        }
    });

    console.log(failures ? `\n${failures} test(s) FAILED` : '\nAll tests passed');
    process.exit(failures ? 1 : 0);
})();
