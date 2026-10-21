// Global state
let isProcessingQueue = false;
let queueUpdatePromise = Promise.resolve();
const jobTabs = new Map(); // HLS jobId -> { tabId, title } so progress can be shown on the right tab

// ── Storage queue helpers ───────────────────────────────────────────────────────
async function getQueue() {
    const result = await chrome.storage.local.get(['downloadQueue']);
    return result.downloadQueue || [];
}

async function setQueue(queue) {
    await chrome.storage.local.set({ downloadQueue: queue });
}

function addToQueue(item) {
    queueUpdatePromise = queueUpdatePromise.then(async () => {
        const queue = await getQueue();
        queue.push(item);
        await setQueue(queue);
        processDownloadQueue(); // Start processing if not already
    });
    return queueUpdatePromise;
}

console.log('Background script loaded - Udemy One Click Course Downloader v' + chrome.runtime.getManifest().version);
processDownloadQueue(); // Resume any pending downloads on wake up

// ── Filename helpers ────────────────────────────────────────────────────────────
function sanitizeFolderName(name) {
    if (!name) return 'Unknown';
    const clean = name.replace(/[<>:"/\\|?*]/g, '_').trim();
    return clean.length > 50 ? clean.substring(0, 50).trim() : clean;
}

// Clean a single file name; keeps whatever extension it already has.
function sanitizeFileName(name) {
    if (!name) return 'video';

    const extMatch = name.match(/\.[A-Za-z0-9]{1,5}$/);
    const extension = extMatch ? extMatch[0].toLowerCase() : '';
    const base = extMatch ? name.slice(0, -extMatch[0].length) : name;

    let cleanName = base
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();

    if (cleanName.length > 80) {
        cleanName = cleanName.substring(0, 80).trim();
    }

    cleanName = cleanName.replace(/^[\s.]+|[\s.]+$/g, '');
    if (!cleanName) cleanName = 'video';

    return cleanName + extension;
}

// Clean a full path containing slashes
function sanitizeFilePath(path) {
    if (!path) return 'Udemy/Udemy_Video.mp4';

    const parts = path.split('/');
    return parts.map((part, index) =>
        index === parts.length - 1 ? sanitizeFileName(part) : sanitizeFolderName(part)
    ).join('/');
}

function swapExtension(filename, ext) {
    return filename.replace(/\.[A-Za-z0-9]{1,5}$/, '') + '.' + ext;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Statistics ──────────────────────────────────────────────────────────────────
async function updateStats({ fileSize = 0, isError = false } = {}) {
    try {
        const stats = await chrome.storage.local.get(['downloadCount', 'downloadSize', 'errorCount']);
        await chrome.storage.local.set({
            downloadCount: (stats.downloadCount || 0) + (isError ? 0 : 1),
            downloadSize: (stats.downloadSize || 0) + fileSize,
            errorCount: (stats.errorCount || 0) + (isError ? 1 : 0)
        });
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

async function getDownloadedSize(downloadId) {
    try {
        const [item] = await chrome.downloads.search({ id: downloadId });
        return (item && (item.fileSize > 0 ? item.fileSize : item.totalBytes)) || 0;
    } catch (e) {
        return 0;
    }
}

// ── Tab progress ────────────────────────────────────────────────────────────────
function notifyTab(tabId, payload) {
    if (tabId === undefined || tabId === null) return;
    chrome.tabs.sendMessage(tabId, Object.assign({ action: 'ashrafee_progress' }, payload)).catch(() => {});
}

// ── Plain file download through chrome.downloads ───────────────────────────────
function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        const cleanedFilename = sanitizeFilePath(filename);
        console.log('Starting download for:', cleanedFilename);

        chrome.downloads.download({
            url,
            filename: cleanedFilename,
            conflictAction: 'uniquify',
            saveAs: false // use the filename directly, no save dialog
        }, downloadId => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (downloadId === undefined) {
                reject(new Error('Invalid download ID'));
                return;
            }

            let settled = false;
            const finish = (error, value) => {
                if (settled) return;
                settled = true;
                chrome.downloads.onChanged.removeListener(onChanged);
                if (error) reject(error); else resolve(value);
            };
            const failWith = code => finish(new Error(code === 'USER_CANCELED' ? 'USER_CANCELED' : 'Download failed: ' + code));

            const onChanged = delta => {
                if (delta.id !== downloadId) return;
                if (delta.state && delta.state.current === 'complete') {
                    finish(null, { id: downloadId });
                } else if (delta.error) {
                    failWith((delta.error && delta.error.current) || 'Unknown error');
                }
            };
            chrome.downloads.onChanged.addListener(onChanged);

            // Small items (data: URLs) can finish before the listener was attached
            chrome.downloads.search({ id: downloadId }).then(([item]) => {
                if (!item) return;
                if (item.state === 'complete') finish(null, { id: downloadId });
                else if (item.state === 'interrupted') failWith(item.error || 'Unknown error');
            }).catch(() => {});
        });
    });
}

// ── HLS (m3u8) downloads via the offscreen document ────────────────────────────
function isHlsUrl(url) {
    if (!url || url.startsWith('data:')) return false;
    try {
        return /\.m3u8$/i.test(new URL(url).pathname);
    } catch (e) {
        return false;
    }
}

let offscreenReady = null;
function ensureOffscreen() {
    if (!offscreenReady) {
        offscreenReady = (async () => {
            const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
            if (existing.length) return;
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['BLOBS'],
                justification: 'Assemble downloaded video segments into a single file'
            });
        })().catch(error => {
            offscreenReady = null;
            throw error;
        });
    }
    return offscreenReady;
}

async function closeOffscreen() {
    offscreenReady = null;
    try { await chrome.offscreen.closeDocument(); } catch (e) { /* not open */ }
}

async function downloadHlsItem(item) {
    const { preferredQuality } = await chrome.storage.sync.get(['preferredQuality']);
    await ensureOffscreen();

    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const title = item.filename.split('/').pop().replace(/\.[A-Za-z0-9]{1,5}$/, '');
    jobTabs.set(jobId, { tabId: item.tabId, title });

    let result;
    try {
        result = await chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'hls-start',
            jobId,
            url: item.url,
            quality: preferredQuality || 'highest'
        });
    } finally {
        jobTabs.delete(jobId);
    }

    if (!result || !result.ok) {
        const error = new Error((result && result.error) || 'HLS download failed');
        error.code = result && result.code;
        throw error;
    }

    console.log('HLS ready:', title, result.segments + ' segments,', result.bytes + ' bytes,', (result.height || '?') + 'p');
    notifyTab(item.tabId, { state: 'saving', title });

    try {
        return await downloadFile(result.blobUrl, swapExtension(item.filename, result.ext));
    } finally {
        chrome.runtime.sendMessage({ target: 'offscreen', type: 'hls-cleanup', jobId }).catch(() => {});
    }
}

// ── Queue processing ────────────────────────────────────────────────────────────
async function processDownloadQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    let queue = await getQueue();
    if (queue.length === 0) {
        isProcessingQueue = false;
        return;
    }

    let totalDownloaded = 0;
    let totalErrors = 0;
    console.log('Starting persistent download queue. Items:', queue.length);

    while (queue.length > 0) {
        const item = queue[0];

        try {
            console.log('Downloading from queue:', item.filename);
            const hls = isHlsUrl(item.url);
            const done = hls ? await downloadHlsItem(item) : await downloadFile(item.url, item.filename);
            totalDownloaded++;
            await updateStats({ fileSize: await getDownloadedSize(done.id) });
            if (hls) notifyTab(item.tabId, { state: 'done', title: item.filename.split('/').pop() });

            if (queue.length > 1) await wait(2000);
        } catch (error) {
            if (error.message === 'USER_CANCELED') {
                console.log('Download canceled by user. Clearing queue.');
                await setQueue([]);
                queue = [];
                break;
            }
            console.error('Error downloading', item.filename, '-', error.message || error);
            totalErrors++;
            await updateStats({ isError: true });
            notifyTab(item.tabId, {
                state: 'error',
                title: item.filename.split('/').pop(),
                message: error.message || 'Download failed'
            });
        } finally {
            // Re-read from storage so items added meanwhile are not overwritten
            const currentQueue = await getQueue();
            if (currentQueue.length > 0) {
                currentQueue.shift();
                await setQueue(currentQueue);
            }
            queue = currentQueue;
        }
    }

    isProcessingQueue = false;
    closeOffscreen();
    console.log('Queue finished. Downloaded:', totalDownloaded, 'Errors:', totalErrors);
}

// ── Messages ────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Progress reports from the offscreen document
    if (request.target === 'background' && request.type === 'hls-progress') {
        const job = jobTabs.get(request.jobId);
        if (job) {
            const p = request.progress || {};
            let text = 'Reading playlist...';
            if (p.stage === 'segments') {
                const pct = Math.floor((p.done / p.total) * 100);
                const mb = (p.bytes / (1024 * 1024)).toFixed(1);
                text = pct + '% (' + p.done + '/' + p.total + ' segments, ' + mb + ' MB)';
            }
            notifyTab(job.tabId, { state: 'progress', title: job.title, text });
        }
        return false;
    }

    if (request.action === 'ashrafee_downloadVideo') {
        const { url, title, courseName, sectionName } = request;

        if (!url) {
            sendResponse({ success: false, error: 'No URL provided' });
            return false;
        }

        let filename = title;
        if (courseName && sectionName) {
            filename = 'Udemy/' + sanitizeFolderName(courseName) + '/' + sanitizeFolderName(sectionName) + '/' + title;
        }

        addToQueue({ url, filename, tabId: sender.tab ? sender.tab.id : null }).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            console.error('Background: Queue failed:', error);
            sendResponse({ success: false, error: error.message });
        });

        return true; // async response
    } else if (request.action === 'openPromoTab') {
        chrome.tabs.create({
            url: request.url,
            active: false // New tab won't be active (won't switch to it)
        });
    }
    return false;
});

// Open link when extension is installed
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open URL in new tab
        chrome.tabs.create({
            url: 'https://dhwnh.com/g/05dgete24s0d08337debb3e3b7aadc/?subid=udemy-downloader&ulp=https%3A%2F%2Fwww.udemy.com%2F'
        });
    }
});
