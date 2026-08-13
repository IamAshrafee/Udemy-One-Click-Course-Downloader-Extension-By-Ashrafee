// Global variables
let lastSelectedPath = '';
let isProcessingQueue = false;
let currentDownloadId = null;
let totalDownloaded = 0;
let totalErrors = 0;
let queueUpdatePromise = Promise.resolve();

// Cross-browser support
const browserApi = typeof browser !== 'undefined' ? browser : chrome;

// Storage queue helpers
async function getQueue() {
    return new Promise(resolve => {
        chrome.storage.local.get(['downloadQueue'], (result) => {
            resolve(result.downloadQueue || []);
        });
    });
}

async function setQueue(queue) {
    return new Promise(resolve => {
        chrome.storage.local.set({ downloadQueue: queue }, resolve);
    });
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

// Log when background script starts
console.log('Background script loaded - Udemy One Click Course Downloader v1.1.1');
processDownloadQueue(); // Resume any pending downloads on wake up

// Clean folder name for safe path
function sanitizeFolderName(name) {
    if (!name) return 'Unknown';
    let clean = name.replace(/[<>:"/\\|?*]/g, '_').trim();
    return clean.length > 50 ? clean.substring(0, 50).trim() : clean;
}

// Clean filename for safe download (single filename)
function sanitizeFileName(name) {
    if (!name) return 'video';
    
    // Extract extension - handle all common resource types
    const extensionMatch = name.match(/\.(mp4|txt|pdf|zip|rar|docx?|xlsx?|pptx?|mp3|png|jpe?g|gif|svg|csv)$/i);
    const extension = extensionMatch ? extensionMatch[0] : '.mp4';
    
    // Remove extension temporarily
    let baseName = name.replace(/\.(mp4|txt|pdf|zip|rar|docx?|xlsx?|pptx?|mp3|png|jpe?g|gif|svg|csv)$/i, '');
    
    // Replace invalid characters with space or underscore
    let cleanName = baseName
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace completely invalid chars with _
        .replace(/\s+/g, ' ')           // Normalize spaces
        .trim();

    // Limit length to 100 characters (leaving room for folder and extension)
    if (cleanName.length > 80) {
        cleanName = cleanName.substring(0, 100).trim();
    }

    // Remove leading/trailing dots and spaces
    cleanName = cleanName.replace(/^[\s.]+|[\s.]+$/g, '');
    
    // Ensure we have a valid name
    if (!cleanName) {
        cleanName = 'video';
    }

    // Add extension
    return cleanName + extension;
}

// Clean full path containing slashes
function sanitizeFilePath(path) {
    if (!path) return 'Udemy/Udemy_Video.mp4';
    
    const parts = path.split('/');
    const sanitizedParts = parts.map((part, index) => {
        if (index === parts.length - 1) {
            return sanitizeFileName(part); // Last part is filename
        }
        return sanitizeFolderName(part);   // Other parts are folders
    });
    
    return sanitizedParts.join('/');
}


// Wait for specified duration
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Update statistics
async function updateStats(fileSize) {
    try {
        const stats = await new Promise(resolve => {
            chrome.storage.local.get(['downloadCount', 'downloadSize', 'errorCount'], resolve);
        });
        
        const newStats = {
            downloadCount: (stats.downloadCount || 0) + 1,
            downloadSize: (stats.downloadSize || 0) + (fileSize || 0),
            errorCount: (stats.errorCount || 0) + totalErrors
        };
        
        await new Promise(resolve => {
            chrome.storage.local.set(newStats, resolve);
        });

        console.log('Download Statistics:');
        console.log(`- Files Downloaded: ${newStats.downloadCount}`);
        console.log(`- Total Size: ${(newStats.downloadSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`- Total Errors: ${newStats.errorCount}`);
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Show progress percentage
function showProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    console.log(`\nProgress: ${progressBar} ${percentage}%`);
    console.log(`Downloaded ${current} of ${total} files`);
    if (totalErrors > 0) {
        console.log(`Errors: ${totalErrors}`);
    }
}

// Function to download and parse M3U8 file
async function downloadM3U8(url) {
    try {
        console.log('Downloading M3U8 from:', url);
        const response = await fetchWithRetry(url, {
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://www.udemy.com',
                'Referer': 'https://www.udemy.com/',
                'Connection': 'keep-alive'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch M3U8: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        console.log('M3U8 content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error downloading M3U8:', error);
        throw error;
    }
}

// Function to fetch content with CORS handling
async function fetchWithCORS(url, options = {}) {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];
    
    let lastError = null;
    
    for (const proxyUrl of proxies) {
        try {
            console.log('Fetching through CORS proxy:', proxyUrl);
            const response = await fetch(proxyUrl, {
                ...options,
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': 'https://www.udemy.com',
                    'Referer': 'https://www.udemy.com/',
                    ...(options.headers || {})
                }
            });
            if (response.ok) return response;
            if (response.status === 401 || response.status === 403) {
                // If unauthorized, don't keep trying proxies
                return response;
            }
        } catch (error) {
            console.log('Proxy failed:', proxyUrl, error.message);
            lastError = error;
        }
    }

    throw lastError || new Error('All CORS proxies failed');
}

// Function to fetch content with retry
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Attempt ${i + 1}/${maxRetries} to fetch:`, url);
            
            // First try direct fetch
            try {
                const directResponse = await fetch(url, {
                    ...options,
                    headers: {
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Origin': 'https://www.udemy.com',
                        'Referer': 'https://www.udemy.com/',
                        ...(options.headers || {})
                    }
                });
                
                if (directResponse.ok) {
                    return directResponse;
                }
                if (directResponse.status === 401 || directResponse.status === 403) {
                    console.error(`Authentication error (${directResponse.status}). Stopping retries.`);
                    throw new Error(`Authentication required (${directResponse.status}). Please ensure you are logged in.`);
                }
            } catch (directError) {
                if (directError.message && directError.message.includes('Authentication required')) {
                    throw directError; // Rethrow auth errors
                }
                console.log('Direct fetch failed, trying CORS proxy...');
            }

            // If direct fetch fails, try through CORS proxy
            const proxyResponse = await fetchWithCORS(url, options);
            if (proxyResponse.ok) return proxyResponse;
            if (proxyResponse.status === 401 || proxyResponse.status === 403) {
                 throw new Error(`Authentication required (${proxyResponse.status}). Please ensure you are logged in.`);
            }
            throw new Error(`HTTP error! status: ${proxyResponse.status} ${proxyResponse.statusText}`);

        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            lastError = error;
            if (error.message && error.message.includes('Authentication required')) {
                throw error; // Abort retries if authentication fails
            }
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000;
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

// Function to extract TS URLs from M3U8 content
function extractTsUrls(m3u8Content, baseUrl) {
    const lines = m3u8Content.split('\n');
    const tsUrls = [];
    let currentQuality = '';
    let isTargetQuality = false;

    for (const line of lines) {
        if (line.includes('#EXT-X-STREAM-INF')) {
            // Extract quality from STREAM-INF line
            const qualityMatch = line.match(/RESOLUTION=\d+x(\d+)/);
            if (qualityMatch) {
                currentQuality = qualityMatch[1];
                // We want 720p quality
                isTargetQuality = currentQuality === '720';
            }
        } else if (!line.startsWith('#') && line.trim() !== '') {
            if (isTargetQuality) {
                // If URL is relative, convert to absolute
                const tsUrl = line.startsWith('http') ? line : new URL(line, baseUrl).toString();
                tsUrls.push(tsUrl);
            }
        }
    }

    return tsUrls;
}

// Function to download all TS files
async function downloadAllTs(tsUrls, baseFilename) {
    let downloadCount = 0;
    const totalFiles = tsUrls.length;

    for (const [index, url] of tsUrls.entries()) {
        try {
            const paddedIndex = String(index + 1).padStart(5, '0');
            const filename = `${baseFilename}_${paddedIndex}.ts`;

            await downloadFile(url, filename);
            downloadCount++;
            
            // Update progress
            console.log(`Downloaded ${downloadCount}/${totalFiles} segments`);
        } catch (error) {
            console.error(`Error downloading segment ${index + 1}:`, error);
            // Continue with next file even if one fails
        }
    }

    return downloadCount;
}

// Function to convert HLS URL to MP4 URL
async function getMP4Url(url) {
    if (url.includes('hls-c.udemycdn.com')) {
        // Extract MP4 URL from HLS URL
        const baseUrl = url.split('/hls-c.udemycdn.com/')[0];
        const videoId = url.split('/video-')[1]?.split('/')[0];
        if (videoId) {
            return `${baseUrl}/mp4-c.udemycdn.com/video-${videoId}/1080.mp4`;
        }
    }
    return url;
}

// Basic download function
async function downloadFile(url, filename, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 3000;

    return new Promise(async (resolve, reject) => {
        try {
            // Convert HLS URL to direct MP4 URL if needed
            const actualUrl = await getMP4Url(url);

            // Clean the filename
            const cleanedFilename = sanitizeFilePath(filename);
            console.log('Starting download for:', cleanedFilename);
            console.log('Original filename:', filename);
            console.log('URL:', actualUrl);

            // Configure download options
            const downloadOptions = {
                url: actualUrl,
                filename: cleanedFilename,
                conflictAction: 'uniquify',
                saveAs: false  // Don't show save dialog, use the filename directly
            };

            console.log('Starting chrome download with options:', downloadOptions);
            console.log('Tip: If download is canceled, check Chrome download settings or disable "Ask where to save each file"');

            chrome.downloads.download(downloadOptions, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('Download error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }

                if (downloadId === undefined) {
                    console.error('Download failed - invalid download ID');
                    reject(new Error('Invalid download ID'));
                    return;
                }

                chrome.downloads.onChanged.addListener(function onChanged(delta) {
                    if (delta.id === downloadId) {
                        if (delta.state && delta.state.current === 'complete') {
                            chrome.downloads.onChanged.removeListener(onChanged);
                            console.log('Successfully downloaded:', cleanedFilename);
                            resolve(true);
                        } else if (delta.error) {
                            chrome.downloads.onChanged.removeListener(onChanged);
                            
                            // Extract error message properly
                            let errorMessage = 'Unknown error';
                            if (typeof delta.error === 'object' && delta.error !== null) {
                                errorMessage = delta.error.current || JSON.stringify(delta.error);
                            } else if (typeof delta.error === 'string') {
                                errorMessage = delta.error;
                            }
                            
                            // Check if error is user cancellation
                            if (errorMessage === 'USER_CANCELED') {
                                console.log('ℹ️ Download was canceled by the user');
                                resolve({ canceled: true });
                            } else {
                                console.error('Download error:', errorMessage);
                                reject(new Error(`Download failed: ${errorMessage}`));
                            }
                        }
                    }
                });
            });

        } catch (error) {
            console.error('Error in download process:', error);
            if (retryCount < maxRetries) {
                console.log(`Retrying download (${retryCount + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, retryDelay));
                // Wait for the retry to complete and resolve/reject the current promise
                try {
                    const result = await downloadFile(url, filename, retryCount + 1);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
                return;
            }
            reject(error);
        }
    });
}

// Function to download single video
async function handleSingleDownload(videoUrl, title) {
    if (!videoUrl) {
        throw new Error('Video URL is missing');
    }

    let filename = title || 'video';
    filename = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    if (videoUrl.includes('hls-c.udemycdn.com')) {
        filename += '.m3u8';
    } else {
        filename += '.mp4';
    }

    try {
        await downloadFile(videoUrl, filename);
    } catch (error) {
        if (error.message === 'USER_CANCELED') {
            console.log('Download canceled by user');
            return; // Don't retry if canceled intentionally
        }
        throw error; // Re-throw other errors
    }
}

// Handle bulk video download
async function handleBulkDownload(videos, courseName) {
    if (!videos?.length) {
        throw new Error('No videos to download');
    }

    const cleanCourseName = sanitizeFileName(courseName);
    
    // Add videos to download queue
    videos.forEach((video, index) => {
        if (!video?.url) {
            console.error('Video URL is missing:', video);
            return;
        }
        
        downloadQueue.push({
            video,
            courseName: cleanCourseName,
            sectionName: video.sectionName || 'Section',
            index,
            total: videos.length
        });
    });

    // Start processing download queue
    await processDownloadQueue();
}

// Process download queue
async function processDownloadQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    let queue = await getQueue();
    if (queue.length === 0) {
        isProcessingQueue = false;
        return;
    }

    totalDownloaded = 0;
    totalErrors = 0;
    
    console.log(`\n Starting persistent download queue. Items: ${queue.length}`);

    while (queue.length > 0) {
        const item = queue[0];
        
        try {
            console.log(`\n Downloading from queue: ${item.filename}`);
            await downloadFile(item.url, item.filename);
            console.log(`Successfully downloaded`);
            totalDownloaded++;
            
            // showProgress is defined elsewhere, we can pass queue lengths
            showProgress(totalDownloaded, totalDownloaded + queue.length - 1);
            
            // Wait between downloads slightly
            if (queue.length > 1) {
                await wait(2000);
            }
        } catch (error) {
            if (error.message === 'USER_CANCELED') {
                console.log('Download canceled by user. Clearing queue.');
                queue = [];
                await setQueue(queue);
                break; // Stop download if canceled intentionally
            }
            console.error(`Error downloading:`, error.message || error);
            totalErrors++;
        } finally {
            // Get fresh queue from storage to avoid overwriting newly added items
            let currentQueue = await getQueue();
            if (currentQueue.length > 0) {
                currentQueue.shift();
                await setQueue(currentQueue);
            }
            queue = currentQueue;
        }
    }
    
    isProcessingQueue = false;
    await updateStats();
    
    if (totalErrors === 0 && totalDownloaded > 0) {
        console.log('\n All files downloaded successfully!');
    } else if (totalDownloaded === 0) {
        console.log('\n️ Download canceled');
    } else {
        console.log(`\n️ Download completed with ${totalErrors} errors`);
    }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background: Message received:', request);

    if (request.action === 'ashrafee_downloadVideo') {
        console.log('Background: Processing downloadVideo request');
        
        const { url, title, courseName, sectionName } = request;
        
        if (!url) {
            console.error('Background: No URL provided');
            sendResponse({ success: false, error: 'No URL provided' });
            return false;
        }

        let filename = title;
        if (courseName && sectionName) {
            const cleanCourseName = sanitizeFolderName(courseName);
            const cleanSectionName = sanitizeFolderName(sectionName);
            filename = `Udemy/${cleanCourseName}/${cleanSectionName}/${title}`;
        }

        console.log('Background: Queuing download:', { url, filename });
        
        addToQueue({ url, filename }).then(() => {
            console.log('Background: Queued successfully');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('Background: Queue failed:', error);
            sendResponse({ success: false, error: error.message });
        });

        // Return true to indicate response will be sent asynchronously
        console.log('Background: Returning true for async response');
        return true;
    } else if (request.action === 'openPromoTab') {
        chrome.tabs.create({
            url: request.url,
            active: false // New tab won't be active (won't switch to it)
        });
    }
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
