// Offscreen document: downloads HLS streams segment by segment and assembles them into
// one file. Segments are written to the origin-private file system (disk backed) so a
// long lecture never has to fit in memory. The finished file is exposed as a blob: URL
// that background.js hands to chrome.downloads.

const jobs = new Map(); // jobId -> { name, blobUrl }

async function fetchBytes(url, range) {
    const headers = {};
    if (range) headers.Range = 'bytes=' + range.offset + '-' + (range.offset + range.length - 1);
    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) {
        const error = new Error('HTTP ' + res.status + ' for ' + url.split('?')[0]);
        // 4xx (except 429) will not fix itself on retry, e.g. an expired signed URL
        if (res.status >= 400 && res.status < 500 && res.status !== 429) error.fatal = true;
        throw error;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    // Server ignored the Range header and sent the whole file
    if (range && res.status === 200) return bytes.slice(range.offset, range.offset + range.length);
    return bytes;
}

function createOpfsSink(jobId) {
    return async ext => {
        const root = await navigator.storage.getDirectory();
        const name = 'job-' + jobId + '.' + ext;
        const handle = await root.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        jobs.set(jobId, { name, blobUrl: null });
        return {
            async write(bytes) {
                await writable.write(bytes);
            },
            async close() {
                await writable.close();
                const file = await handle.getFile();
                const blobUrl = URL.createObjectURL(file);
                jobs.get(jobId).blobUrl = blobUrl;
                return { blobUrl, name };
            },
            async abort() {
                try { await writable.abort(); } catch (e) { /* ignore */ }
                try { await root.removeEntry(name); } catch (e) { /* ignore */ }
                jobs.delete(jobId);
            }
        };
    };
}

async function cleanupJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) return;
    jobs.delete(jobId);
    if (job.blobUrl) URL.revokeObjectURL(job.blobUrl);
    try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(job.name);
    } catch (e) { /* already gone */ }
}

// Remove leftovers from jobs that were interrupted (service worker restart, crash).
async function purgeStaleFiles() {
    try {
        const root = await navigator.storage.getDirectory();
        for await (const name of root.keys()) {
            if (name.startsWith('job-')) await root.removeEntry(name);
        }
    } catch (e) { /* ignore */ }
}
purgeStaleFiles();

let lastProgressAt = 0;
function reportProgress(jobId, progress) {
    const now = Date.now();
    // Throttle, but always pass the first/last events and keep the service worker awake.
    const finished = progress.stage === 'segments' && progress.done === progress.total;
    if (!finished && now - lastProgressAt < 400) return;
    lastProgressAt = now;
    chrome.runtime.sendMessage({ target: 'background', type: 'hls-progress', jobId, progress }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return false;

    if (message.type === 'hls-start') {
        const { jobId, url, quality } = message;
        HlsDownloader.downloadHls({
            url,
            quality,
            fetchBytes,
            createSink: createOpfsSink(jobId),
            onProgress: progress => reportProgress(jobId, progress)
        }).then(result => {
            sendResponse({
                ok: true,
                blobUrl: result.sinkResult.blobUrl,
                ext: result.ext,
                bytes: result.bytes,
                height: result.height,
                segments: result.segments
            });
        }).catch(error => {
            sendResponse({ ok: false, code: error.code || 'FAILED', error: error.message || String(error) });
        });
        return true; // async response
    }

    if (message.type === 'hls-cleanup') {
        cleanupJob(message.jobId).then(() => sendResponse({ ok: true }));
        return true;
    }

    return false;
});
