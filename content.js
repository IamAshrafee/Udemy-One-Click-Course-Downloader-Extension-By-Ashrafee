// Debounce function to reduce repeated calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Notification durations by type
const NOTIF_DURATION = { success: 4000, error: 5000, info: 2500 };

// CSS for UI elements
const style = document.createElement('style');
style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Udemy+Sans:wght@400;700&display=swap');
    #ashrafee-downloader-toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: flex-end;
        z-index: 2147483647;
    }

    .ashrafee-dl-toast {
        background: #FFFFFF;
        border: 1px solid #d1d7dc;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: "Udemy Sans", "SF Pro Text", -apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", Helvetica, Arial, sans-serif;
        min-width: 280px;
        max-width: 380px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: ashrafee-dl-toast-enter 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .ashrafee-dl-toast-content {
        display: flex;
        align-items: center;
        padding: 14px 18px;
        gap: 12px;
    }
    .ashrafee-dl-toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .ashrafee-dl-toast-icon.success { color: #1e8449; background: #e3f9eb; }
    .ashrafee-dl-toast-icon.error { color: #b32d0f; background: #fcebe9; }
    .ashrafee-dl-toast-icon.info { color: #702BD5; background: #f4f0fa; }
    .ashrafee-dl-toast-icon svg { width: 14px; height: 14px; fill: currentColor; }
    
    .ashrafee-dl-toast-message {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.4;
        color: #1c1d1f;
    }
    .ashrafee-dl-toast-progress-bar {
        height: 3px;
        width: 100%;
        background: #e4e8eb;
    }
    .ashrafee-dl-toast-progress-fill {
        height: 100%;
        width: 100%;
        transform-origin: left;
    }
    .ashrafee-dl-toast-progress-fill.success { background: #1e8449; }
    .ashrafee-dl-toast-progress-fill.error { background: #b32d0f; }
    .ashrafee-dl-toast-progress-fill.info { background: #702BD5; }

    @keyframes ashrafee-dl-toast-enter {
        from { transform: translateX(120%) scale(0.9); opacity: 0; }
        to { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes ashrafee-dl-toast-exit {
        from { transform: translateX(0) scale(1); opacity: 1; }
        to { transform: translateX(120%) scale(0.9); opacity: 0; }
    }

    /* Floating Status Widget */
    #ashrafee-dl-status-widget {
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: #FFFFFF;
        border: 1px solid #d1d7dc;
        border-radius: 4px;
        padding: 10px 16px 10px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #1c1d1f;
        font-family: "Udemy Sans", "SF Pro Text", -apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", Helvetica, Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        animation: ashrafee-dl-widget-enter 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .ashrafee-dl-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #702BD5;
        box-shadow: 0 0 0 0 rgba(112, 43, 213, 0.7);
        animation: ashrafee-dl-pulse 1.5s infinite;
    }
    .ashrafee-dl-stop-btn {
        background: transparent;
        color: #b32d0f;
        border: 1px solid #d1d7dc;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .ashrafee-dl-stop-btn:hover {
        background: #fcebe9;
    }
    @keyframes ashrafee-dl-pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(112, 43, 213, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(112, 43, 213, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(112, 43, 213, 0); }
    }
    @keyframes ashrafee-dl-widget-enter {
        from { transform: translateY(100px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }
    
    /* Active Button Glow */
    .ashrafee-dl-button-active {
        background: #702BD5 !important;
        color: #FFFFFF !important;
        box-shadow: 0 0 15px rgba(112, 43, 213, 0.5) !important;
        animation: ashrafee-dl-glow 2s infinite !important;
    }
    @keyframes ashrafee-dl-glow {
        0% { box-shadow: 0 0 10px rgba(112, 43, 213, 0.3); }
        50% { box-shadow: 0 0 20px rgba(112, 43, 213, 0.7); }
        100% { box-shadow: 0 0 10px rgba(112, 43, 213, 0.3); }
    }
    
    /* Loading Spinner */
    .ashrafee-dl-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: ashrafee-dl-spin 1s ease-in-out infinite;
        display: inline-block;
        opacity: 0.7;
    }
    @keyframes ashrafee-dl-spin {
        to { transform: rotate(360deg); }
    }
    
    @media (max-width: 768px) {
        #ashrafee-downloader-toast-container {
            top: 10px;
            right: 10px;
            left: 10px;
            align-items: center;
        }
        .ashrafee-dl-toast {
            min-width: unset;
            width: 100%;
            max-width: 100%;
        }
        #ashrafee-dl-status-widget {
            bottom: 10px;
            left: 10px;
            right: 10px;
            justify-content: center;
        }
    }
`;
document.head.appendChild(style);

const ICONS = {
    success: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    error: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    info: '<path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>'
};

// Function to show notification toast
function showNotification(message, type = 'info') {
    let container = document.getElementById('ashrafee-downloader-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ashrafee-downloader-toast-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = 'ashrafee-dl-toast';
    notification.dataset.type = type;
    
    notification.innerHTML = `
        <div class="ashrafee-dl-toast-content">
            <div class="ashrafee-dl-toast-icon ${type}">
                <svg viewBox="0 0 24 24">${ICONS[type] || ICONS.info}</svg>
            </div>
            <div class="ashrafee-dl-toast-message">${message}</div>
        </div>
        <div class="ashrafee-dl-toast-progress-bar">
            <div class="ashrafee-dl-toast-progress-fill ${type}"></div>
        </div>
    `;
    
    container.appendChild(notification);

    const duration = NOTIF_DURATION[type] || 3000;
    
    // Animate progress bar
    const progressFill = notification.querySelector('.ashrafee-dl-toast-progress-fill');
    progressFill.animate([
        { transform: 'scaleX(1)' },
        { transform: 'scaleX(0)' }
    ], {
        duration: duration,
        easing: 'linear'
    });

    setTimeout(() => {
        notification.style.animation = 'ashrafee-dl-toast-exit 0.3s cubic-bezier(0.8, 0.2, 0.8, 1) forwards';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Floating Status Widget for Auto-Download
let _statusWidget = null;
function showStatusBar(message) {
    if (!_statusWidget) {
        _statusWidget = document.createElement('div');
        _statusWidget.id = 'ashrafee-dl-status-widget';
        document.body.appendChild(_statusWidget);
    }
    _statusWidget.innerHTML = `
        <div class="ashrafee-dl-pulse-dot"></div>
        <span>${message}</span>
        <button class="ashrafee-dl-stop-btn" onclick="document.querySelector('#ashrafee-downloader-auto-button').click()">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M6 6h12v12H6z"/>
            </svg>
            Stop
        </button>
    `;
}

function hideStatusBar() {
    if (_statusWidget) {
        _statusWidget.remove();
        _statusWidget = null;
    }
}


// Extract lecture ID from URL
function getLectureId() {
    // Try different URL patterns that Udemy might use
    const patterns = [
        /\/lecture\/(\d+)/,           // Standard pattern
        /\/learn\/lecture\/(\d+)/,    // Learn path pattern
        /\/learn\/v4\/t\/lecture\/(\d+)/, // v4 API pattern
        /[?&]lectureId=(\d+)/         // Query parameter pattern
    ];
    
    for (const pattern of patterns) {
        const match = window.location.href.match(pattern);
        if (match) {
            console.log('Found lecture ID:', match[1]);
            return match[1];
        }
    }
    
    // If we're on a video page but can't find the ID in the URL,
    // try to find it in the page content
    try {
        // Look for lecture ID in page data
        const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scriptElements) {
            try {
                const data = JSON.parse(script.textContent);
                if (data && data.url) {
                    const urlMatch = data.url.match(/\/lecture\/(\d+)/);
                    if (urlMatch) {
                        console.log('Found lecture ID in page data:', urlMatch[1]);
                        return urlMatch[1];
                    }
                }
            } catch (e) {
                console.warn('Error parsing JSON in script tag:', e);
            }
        }
        
        // Check for the ud-app-loader data attributes (Most reliable DOM source)
        const appLoader = document.querySelector('.ud-app-loader');
        if (appLoader && appLoader.getAttribute('data-module-args')) {
            try {
                const args = JSON.parse(appLoader.getAttribute('data-module-args'));
                if (args && args.initialCurriculumItemId) {
                    console.log('Found lecture ID in ud-app-loader:', args.initialCurriculumItemId);
                    return args.initialCurriculumItemId.toString();
                }
            } catch(e) {
                console.warn('Error parsing ud-app-loader args:', e);
            }
        }

        // Check if there's a video element on the page
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.id && videoElement.id.includes('lecture-')) {
            const vidMatch = videoElement.id.match(/lecture-(\d+)/);
            if (vidMatch) {
                console.log('Found lecture ID in video element id:', vidMatch[1]);
                return vidMatch[1];
            }
        } else if (videoElement && videoElement.src) {
            console.log('Found video element, but no lecture ID. Using timestamp as fallback ID');
            return `video_${Date.now()}`;
        }
    } catch (e) {
        console.error('Error while searching for lecture ID in page content:', e);
    }
    
    console.warn('Could not find lecture ID in URL or page content');
    return null;
}

// Extract course ID from URL
async function getCourseId() {
    // Try different URL patterns that Udemy might use
    const patterns = [
        /\/course\/([^\/\?]+)/,       // Standard pattern
        /\/learn\/([^\/\?]+)/,        // Learn path pattern
        /[?&]courseId=(\d+)/          // Query parameter pattern
    ];
    
    let coursePath = null;
    
    for (const pattern of patterns) {
        const match = window.location.href.match(pattern);
        if (match) {
            coursePath = match[1];
            console.log('Found course path:', coursePath);
            break;
        }
    }
    
    if (!coursePath) {
        // Try to find course ID in page content
        try {
            // Look for course ID in page data
            const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scriptElements) {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data && data.courseId) {
                        console.log('Found course ID in page data:', data.courseId);
                        return data.courseId;
                    }
                } catch (e) {
                    console.warn('Error parsing JSON in script tag:', e);
                }
            }
            
            // Check for the ud-app-loader data attributes (Most reliable DOM source)
            const appLoader = document.querySelector('.ud-app-loader');
            if (appLoader && appLoader.getAttribute('data-module-args')) {
                const args = JSON.parse(appLoader.getAttribute('data-module-args'));
                if (args && args.courseId) {
                    console.log('Found course ID in ud-app-loader:', args.courseId);
                    return args.courseId.toString();
                }
            }

            // Note: window.__INITIAL_STATE__ cannot be accessed directly in Manifest V3 Content Scripts
            // due to Isolated World security. The above appLoader check replaces it safely.
        } catch (e) {
            console.error('Error while searching for course ID in page content:', e);
        }
        
        console.warn('Could not find course path in URL or page content');
        return null;
    }
    
    // Try to get numeric course ID from API
    try {
        console.log('Fetching course ID for path:', coursePath);
        
        // First try the v2 API
        try {
            const response = await fetch(`https://www.udemy.com/api-2.0/courses/${coursePath}/?fields[course]=id`, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json;charset=UTF-8'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Course data from API v2:', data);
                if (data && data.id) {
                    return data.id;
                }
            } else {
                console.warn('API v2 request failed, status:', response.status);
            }
        } catch (error) {
            console.warn('Error with API v2 request:', error);
        }
        
        // If v2 API fails, try extracting course ID from page content
        const pageContent = document.documentElement.innerHTML;
        const courseIdMatch = pageContent.match(/"courseId"\s*:\s*(\d+)/);
        if (courseIdMatch) {
            console.log('Found course ID in page content:', courseIdMatch[1]);
            return courseIdMatch[1];
        }
        
        // If we still don't have a numeric ID, use the path as a fallback
        console.log('Using course path as fallback ID:', coursePath);
        return coursePath;
        
    } catch (error) {
        console.error('Error getting course ID:', error);
        return null;
    }
}

// DOM-based fallback: try videojs players and script tags for video URLs.
// Extracted into a helper so it can be called from multiple paths in extractVideoUrl().
async function _tryDOMFallbacks() {
    try {
        // Try to extract from window.videojs
        if (window.videojs && window.videojs.getAllPlayers) {
            const players = window.videojs.getAllPlayers();
            for (const player of players) {
                if (player.src() && player.src().includes('.mp4')) {
                    console.log('Found video URL in videojs player:', player.src());
                    return player.src();
                }
            }
        }
        
        // Try to extract from player data in the page
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent;
            if (content.includes('"videoUrl"') || content.includes('"mp4Url"')) {
                const videoUrlMatch = content.match(/"videoUrl"\s*:\s*"([^"]+)"/);
                if (videoUrlMatch) {
                    console.log('Found video URL in script tag:', videoUrlMatch[1]);
                    return videoUrlMatch[1];
                }
                
                const mp4UrlMatch = content.match(/"mp4Url"\s*:\s*"([^"]+)"/);
                if (mp4UrlMatch) {
                    console.log('Found MP4 URL in script tag:', mp4UrlMatch[1]);
                    return mp4UrlMatch[1];
                }
            }
        }
    } catch (e) {
        console.error('Error in DOM fallbacks:', e);
    }
    return null;
}

// Extract video URL from Udemy API
async function extractVideoUrl() {
    try {
        console.log('Starting video URL extraction...');
        
        // Safely fetch preferred quality from settings
        const settings = await new Promise(resolve => {
            try {
                chrome.storage.sync.get(['preferredQuality'], (res) => {
                    if (chrome.runtime.lastError) resolve({});
                    else resolve(res || {});
                });
            } catch (e) {
                resolve({});
            }
        });
        const prefQualityStr = settings.preferredQuality || 'highest';
        
        const selectPreferredVideo = (videoList) => {
            if (!Array.isArray(videoList) || videoList.length === 0) return null;
            // Filter out any invalid items, then sort videos from highest to lowest quality
            const validVideos = videoList.filter(v => v && typeof v === 'object');
            if (validVideos.length === 0) return null;
            
            const sorted = validVideos.sort((a, b) => (parseInt(b.label)||0) - (parseInt(a.label)||0));
            
            if (prefQualityStr === 'highest') {
                return sorted[0];
            } else if (prefQualityStr === 'lowest') {
                return sorted[sorted.length - 1];
            } else {
                const prefQuality = parseInt(prefQualityStr);
                for (const v of sorted) {
                    if ((parseInt(v.label)||0) <= prefQuality) return v;
                }
                return sorted[sorted.length - 1]; // Return lowest if all are above prefQuality
            }
        };
        
        // ── PRIORITY 1: Check <video> element directly (like original extension) ──
        // This catches videos that Udemy marks as "not available for download"
        // but still streams via a direct MP4 URL in the player.
        const videoElement = document.querySelector('video');
        if (videoElement) {
            if (videoElement.src && videoElement.src.includes('.mp4')) {
                console.log('Found direct MP4 URL in video element (Priority 1):', videoElement.src);
                return videoElement.src;
            }
            const earlySourceElements = videoElement.querySelectorAll('source');
            for (const source of earlySourceElements) {
                if (source.src && source.src.includes('.mp4')) {
                    console.log('Found MP4 URL in source element (Priority 1):', source.src);
                    return source.src;
                }
            }
        } else {
            console.warn('No video element found, this might not be a video lecture.');
        }
        
        // ── PRIORITY 2: Try the Udemy API ──
        // Try to get lecture and course IDs
        const lectureId = getLectureId();
        const courseId = await getCourseId();
        
        if (!lectureId || !courseId) {
            console.error('Could not find lecture or course ID');
            
            // Try to extract from player data or page source
            try {
                const playerData = window.UDEMY_PLAYER_DATA;
                if (playerData && playerData.mediaUrl) {
                    console.log('Found video URL in UDEMY_PLAYER_DATA:', playerData.mediaUrl);
                    return playerData.mediaUrl;
                }
                
                // Try to find video URL in the page source
                const pageSource = document.documentElement.innerHTML;
                const videoUrlMatch = pageSource.match(/"(https:\/\/[^"]*\.mp4[^"]*)"/);
                if (videoUrlMatch) {
                    console.log('Found video URL in page source:', videoUrlMatch[1]);
                    return videoUrlMatch[1];
                }
            } catch (e) {
                console.error('Error extracting from player data:', e);
            }
            
            // Even without IDs, try videojs players and script tags before giving up
            const domUrl = await _tryDOMFallbacks();
            if (domUrl) return domUrl;
            
            return null;
        }

        console.log('Fetching video URL for lecture:', lectureId, 'in course:', courseId);

        // Try the v2 API first
        try {
            const response = await fetch(
                `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lectureId}?fields[asset]=asset_type,media_license_token,media_sources,stream_urls,captions,thumbnail_sprite,slides,slide_urls,download_urls`,
                {
                    headers: {
                        'Accept': '*/*',
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Lecture data from API v2:', data);
                
                if (!data.asset) {
                    console.warn('No asset found in API v2 response');
                } else {
                    if (data.asset.asset_type !== 'Video') {
                        console.warn('Asset is not a video:', data.asset.asset_type);
                    } else {
                        // Aggregate all video sources from all possible locations in the API response
                        const allVideos = [];
                        const hlsFallbackVideos = []; // HLS sources as last resort

                        // 1. Check download_urls (direct MP4 download links — best quality)
                        if (data.asset.download_urls && data.asset.download_urls.Video) {
                            data.asset.download_urls.Video.forEach(v => {
                                if (v.file) allVideos.push({ label: v.label, url: v.file });
                            });
                        }

                        // 2. Check media_sources (streaming sources)
                        if (data.asset.media_sources) {
                            data.asset.media_sources.forEach(v => {
                                if (v.type === 'video/mp4' || (v.src && (v.src.includes('.mp4') || v.src.includes('video/mp4')))) {
                                    allVideos.push({ label: v.label, url: v.src });
                                } else if (v.src && (v.type === 'application/x-mpegURL' || v.src.includes('.m3u8') || v.src.includes('hls'))) {
                                    // HLS streams — background.js can convert these via getMP4Url()
                                    hlsFallbackVideos.push({ label: v.label, url: v.src });
                                }
                            });
                        }

                        // 3. Check stream_urls
                        if (data.asset.stream_urls && data.asset.stream_urls.Video) {
                            data.asset.stream_urls.Video.forEach(v => {
                                if (v.type === 'video/mp4' || (v.file && (v.file.includes('.mp4') || v.file.includes('video/mp4')))) {
                                    allVideos.push({ label: v.label, url: v.file });
                                } else if (v.file && (v.type === 'application/x-mpegURL' || v.file.includes('.m3u8') || v.file.includes('hls'))) {
                                    hlsFallbackVideos.push({ label: v.label, url: v.file });
                                }
                            });
                        }

                        // Prefer MP4 sources, fall back to HLS if no MP4 found
                        const videosToUse = allVideos.length > 0 ? allVideos : hlsFallbackVideos;
                        if (videosToUse.length > 0) {
                            console.log('Aggregated video sources:', videosToUse, allVideos.length > 0 ? '(MP4)' : '(HLS fallback)');
                            const selectedVideo = selectPreferredVideo(videosToUse);
                            console.log('Selected video URL based on preferences:', selectedVideo);
                            return selectedVideo ? selectedVideo.url : null;
                        }
                    }
                }
            } else {
                console.warn('API v2 request failed, status:', response.status);
            }
        } catch (error) {
            console.warn('Error with API v2 request:', error);
        }
        
        // If API v2 returned no usable sources, try DOM-based fallbacks
        const domFallbackUrl = await _tryDOMFallbacks();
        if (domFallbackUrl) return domFallbackUrl;
        
        console.warn('No suitable video URL found in any source');
        return null;

    } catch (error) {
        console.error('Error extracting video URL:', error);
        return null;
    }
}

function extractCourseName() {
    try {
        // First try the anchor inside the header
        const anchor = document.querySelector('h1[data-purpose="course-header-title"] a');
        if (anchor && anchor.textContent.trim()) {
            return anchor.textContent.trim();
        }
        
        // Then try just the header text itself (if it's not a link)
        const header = document.querySelector('h1[data-purpose="course-header-title"]');
        if (header && header.textContent.trim()) {
            return header.textContent.trim();
        }
        
        // Fallback to the page title (e.g. "Course Name | Udemy")
        if (document.title) {
            const titleMatch = document.title.split('|')[0].trim();
            if (titleMatch && titleMatch !== 'Udemy') {
                return titleMatch;
            }
        }
    } catch(e) {
        console.error('Error extracting course name:', e);
    }
    return 'Udemy Course';
}

function extractSectionName() {
    try {
        // Find the section panel that contains the currently active lecture
        const currentItem = document.querySelector('[aria-current="true"]') ||
                            document.querySelector('.curriculum-item-link--active');
        if (currentItem) {
            const panel = currentItem.closest('.accordion-panel-module--panel--Eb0it') || 
                          currentItem.closest('[data-purpose^="section-panel"]');
            if (panel) {
                // Try the most specific span first
                const titleSpan = panel.querySelector('.ud-accordion-panel-title .truncate-with-tooltip--ellipsis--YJw4N') ||
                                  panel.querySelector('.ud-accordion-panel-title span');
                if (titleSpan) return titleSpan.textContent.trim();
                const titleEl = panel.querySelector('.ud-accordion-panel-title');
                if (titleEl) return titleEl.textContent.trim();
            }
            // Fallback: try to find via section-heading data-purpose
            const sectionHeading = currentItem.closest('[data-purpose^="section-panel"]');
            if (sectionHeading) {
                const headingText = sectionHeading.querySelector('[data-purpose="section-heading"] .truncate-with-tooltip--ellipsis--YJw4N') ||
                                    sectionHeading.querySelector('[data-purpose="section-heading"] button span');
                if (headingText) return headingText.textContent.trim();
            }
        }
    } catch(e) {}
    return 'Section';
}

// Extract video title from the page
function extractVideoTitle() {
    console.log('Attempting to extract video title...');
    
    // Priority 1: The active sidebar item's data-purpose="item-title" span — most reliable
    const sidebarSelectors = [
        '[aria-current="true"] [data-purpose="item-title"]',
        '.curriculum-item-link--active [data-purpose="item-title"]' // Generic fallback for older layouts
    ];
    for (const sel of sidebarSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const text = el.textContent.trim();
            if (text) {
                console.log('Found title from sidebar [data-purpose="item-title"]:', text);
                return text;
            }
        }
    }

    // Priority 2: lecture aria-label on the section element
    const lectureSection = document.querySelector('section[aria-label]');
    if (lectureSection) {
        const ariaLabel = lectureSection.getAttribute('aria-label') || '';
        // aria-label is like "Section 1: Foo, Lecture 2: Bar" — extract just the lecture part
        const lectureMatch = ariaLabel.match(/Lecture \d+[:.\s]+(.+)$/i);
        if (lectureMatch) {
            console.log('Found title from section aria-label:', lectureMatch[1].trim());
            return lectureMatch[1].trim();
        }
    }

    // Priority 3: Fallback broad selectors (but NOT course-header-title)
    const selectors = [
        '[data-purpose="lecture-title"]',
        '.ud-app-loader.ud-component--course-taking--lecture-view h1',
        '.video-viewer--title-overlay--3Rj55',
        'h1[data-purpose="title"]',
        '[data-purpose="curriculum-item-title"]',
        'main h1:not([data-purpose="course-header-title"])',
        '.video-title',
        'h1.ud-heading-xl',
        'h2[data-purpose="lecture-title"]'
    ];

    // Search through all selectors - take just the direct text, not nested children
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            // Remove any injected buttons from a clone to avoid polluting the text
            const cloned = element.cloneNode(true);
            cloned.querySelectorAll('#ashrafee-downloader-header-button, #ashrafee-downloader-auto-button, #ashrafee-downloader-floating-button').forEach(el => el.remove());

            let rawTitle = cloned.textContent.trim().replace(/\s+/g, ' ');

            // Strip common noise prefixes
            rawTitle = rawTitle.replace(/^Course:\s*/i, '');
            rawTitle = rawTitle.replace(/^Lecture:\s*/i, '');
            rawTitle = rawTitle.replace(/^Video:\s*/i, '');

            if (rawTitle) {
                console.log(`Fallback title via "${selector}":`, rawTitle);
                return rawTitle;
            }
        }
    }

    // Last resort: page title
    const pageTitle = document.title
        .replace(' | Udemy', '')
        .replace(/\s+/g, ' ')
        .trim();

    if (pageTitle && pageTitle !== 'Udemy') {
        console.log('\u26a0\ufe0f Using page title as last resort:', pageTitle);
        return pageTitle;
    }
    
    console.warn('\u274c Could not find video title, using default');
    return 'Udemy_Video';
}

// Extract text content from the page
async function extractTextContent() {
    console.log('Extracting text content...');
    
    try {
        // Find the specific element containing the text
        const textContainer = document.querySelector('.text-viewer--container--TFOCA');
        
        if (textContainer) {
            console.log('Found text container with class text-viewer--container--TFOCA');
            
            // Get text from element
            let textContent = '';
            
            // Extract text from all child elements
            const textElements = textContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, code, blockquote');
            
            if (textElements.length > 0) {
                // Collect text from child elements while preserving basic formatting
                textElements.forEach(element => {
                    const clone = element.cloneNode(true);
                    
                    // Extract links and append their URLs
                    clone.querySelectorAll('a').forEach(a => {
                        const href = a.getAttribute('href');
                        const text = a.textContent.trim();
                        if (href && href !== '#' && !href.startsWith('javascript:')) {
                            const newText = document.createTextNode(`${text} (${href})`);
                            a.parentNode.replaceChild(newText, a);
                        }
                    });

                    const text = clone.textContent.trim();
                    if (!text) return;

                    // Add heading if element is a heading
                    if (element.tagName.match(/^H[1-6]$/)) {
                        textContent += '\n\n' + text + '\n\n';
                    } 
                    // Add code with special formatting
                    else if (element.tagName === 'PRE' || element.tagName === 'CODE') {
                        textContent += '\n\n```\n' + text + '\n```\n\n';
                    } 
                    // Add quote
                    else if (element.tagName === 'BLOCKQUOTE') {
                        textContent += '\n\n> ' + text + '\n\n';
                    } 
                    // Add list item
                    else if (element.tagName === 'LI') {
                        textContent += '\n- ' + text;
                    } 
                    // Add regular paragraph
                    else {
                        textContent += '\n\n' + text;
                    }
                });

                // Extract any embedded iFrames (like YouTube or Vimeo)
                textContainer.querySelectorAll('iframe').forEach(iframe => {
                    const src = iframe.getAttribute('src');
                    if (src) {
                        textContent += `\n\n[Embedded Video: ${src}]\n\n`;
                    }
                });
            } else {
                // If no specific child elements found, use full element text
                const clone = textContainer.cloneNode(true);
                clone.querySelectorAll('a').forEach(a => {
                    const href = a.getAttribute('href');
                    if (href && href !== '#' && !href.startsWith('javascript:')) {
                        const newText = document.createTextNode(`${a.textContent.trim()} (${href})`);
                        a.parentNode.replaceChild(newText, a);
                    }
                });
                textContent = clone.textContent.trim();
                
                // Extract any embedded iFrames in the fallback container
                textContainer.querySelectorAll('iframe').forEach(iframe => {
                    const src = iframe.getAttribute('src');
                    if (src) {
                        textContent += `\n\n[Embedded Video: ${src}]\n\n`;
                    }
                });
            }
            
            // Clean text (remove repeated empty lines, etc)
            textContent = textContent.replace(/\n{3,}/g, '\n\n').trim();
            
            console.log('Text content extracted successfully');
            return textContent;
        }
        
        // If specific element not found, use alternative methods
        
        // Method 2: Search for known content elements
        const contentSelectors = [
            '.lecture-text-container',
            '.lecture-content',
            '[data-purpose="lecture-text-container"]',
            '[data-purpose="text-viewer"]',
            '[data-purpose="lecture-description"]',
            '.article-asset__body',
            '.show-more--content--3H5pT'
        ];
        
        for (const selector of contentSelectors) {
            const contentElement = document.querySelector(selector);
            if (contentElement) {
                console.log(`Found content element with selector: ${selector}`);
                return contentElement.textContent.trim();
            }
        }
        
        console.warn('No text content found matching known selectors.');
        return null;
    } catch (error) {
        console.error('Error extracting text content:', error);
        return null;
    }
}

// Check if current page is a Udemy lecture page
function isUdemyLecturePage() {
    // Check page URL
    const url = window.location.href;
    
    // Check different URL patterns for lecture pages
    const lecturePatterns = [
        /udemy\.com\/course\/.*\/learn/,  // Any /learn/ page
        /udemy\.com\/course\/draft\/.*\/learn/,
        /udemy\.com\/.*\/lecture\//
    ];
    
    // Check if URL matches any pattern
    const isLectureUrl = lecturePatterns.some(pattern => pattern.test(url));
    
    if (!isLectureUrl) {
        console.log('Not a Udemy lecture page URL:', url);
        return false;
    }
    
    console.log('This is a Udemy lecture/course page');
    return true;
}


// Send a text string as a file through background.js (so it lands in the right folder)
function downloadTextViaBackground(textContent, filename, courseName, sectionName) {
    return new Promise((resolve) => {
        try {
            // Encode as base64 data URL so chrome.downloads can handle it
            const b64 = btoa(unescape(encodeURIComponent(textContent)));
            const dataUrl = 'data:text/plain;base64,' + b64;
            chrome.runtime.sendMessage({
                action: 'ashrafee_downloadVideo',   // reuses same handler
                url: dataUrl,
                title: filename,
                courseName: courseName,
                sectionName: sectionName
            }, response => {
                if (chrome.runtime.lastError) {
                    console.warn('Text download via background failed, falling back:', chrome.runtime.lastError);
                    // Fallback: direct browser download
                    const blob = new Blob([textContent], { type: 'text/plain' });
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl; a.download = filename;
                    document.body.appendChild(a); a.click();
                    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 150);
                    resolve(true);
                } else {
                    resolve(true);
                }
            });
        } catch(e) {
            console.error('downloadTextViaBackground error:', e);
            resolve(false);
        }
    });
}

// Detect what type of content is on the current page
function detectPageType() {
    if (document.querySelector('.quiz-view--container--Mgl-c') || document.querySelector('[data-purpose="quiz-view"]')) return 'quiz';
    if (document.querySelector('video')) return 'video';
    if (document.querySelector('.text-viewer--container--TFOCA') || document.querySelector('[data-purpose="text-viewer"]') || document.querySelector('[data-purpose="lecture-text-container"]')) return 'text';
    return 'unknown';
}

// Extract quiz info as a readable text block (fallback for start page only)
function extractQuizText() {
    try {
        const titleEl = document.querySelector('.quiz-view--container--Mgl-c .ud-heading-xxl');
        const title = titleEl ? titleEl.textContent.trim() : 'Quiz';
        const descEl = document.querySelector('[data-purpose^="safely-set-inner-html:start-page:quiz-description"]');
        const desc = descEl ? descEl.textContent.trim() : '';
        const metaEl = document.querySelector('.start-page--quiz-info--gbMDJ');
        const meta = metaEl ? metaEl.textContent.trim() : '';
        return `${title}\n${meta}\n\n${desc}`;
    } catch(e) { return 'Quiz'; }
}

// Helper: click a button using full React-compatible event sequence
function simulateClick(btn) {
    if (!btn) return;
    btn.scrollIntoView({ behavior: 'instant', block: 'center' });
    btn.focus();
    const eventParams = { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1 };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
        const Cls = type.startsWith('pointer') ? PointerEvent : MouseEvent;
        btn.dispatchEvent(new Cls(type, eventParams));
    });
    // Also try React fiber
    try {
        const rKey = Object.keys(btn).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
        if (rKey && btn[rKey] && btn[rKey].onClick) {
            btn[rKey].onClick({ preventDefault: () => {}, stopPropagation: () => {}, target: btn, currentTarget: btn, nativeEvent: new MouseEvent('click') });
        }
    } catch(e) {}
}

// Wait for a DOM condition to become true, with a timeout
function waitForDom(conditionFn, timeoutMs = 5000, intervalMs = 200) {
    return new Promise(resolve => {
        const start = Date.now();
        const check = () => {
            if (conditionFn()) return resolve(true);
            if (Date.now() - start >= timeoutMs) return resolve(false);
            setTimeout(check, intervalMs);
        };
        check();
    });
}

// Extract the full quiz by navigating through all questions using Skip
async function extractFullQuiz(courseName, sectionName) {
    const quizContainer = document.querySelector('.quiz-view--container--Mgl-c');
    if (!quizContainer) return null;

    // --- Determine quiz title ---
    const titleEl = quizContainer.querySelector('.ud-heading-xxl');
    const quizTitle = titleEl ? titleEl.textContent.trim() : extractVideoTitle() || 'Quiz';

    // --- Detect current state ---
    const startBtn = quizContainer.querySelector('button[data-purpose="start-or-resume-quiz"]');
    const questionForm = document.querySelector('form[data-testid="mc-quiz-question"]');

    // Quiz is already finished (no start button, no question form)
    if (!startBtn && !questionForm) {
        console.log('Quiz appears to be finished/results page; cannot extract questions.');
        return null;
    }

    // If on the start page, click Start/Resume first
    if (startBtn && !questionForm) {
        console.log('Quiz start page detected. Clicking start/resume button...');
        showNotification('Starting quiz to extract questions...', 'info');
        simulateClick(startBtn);
        // Wait for the question form to appear
        const appeared = await waitForDom(() => !!document.querySelector('form[data-testid="mc-quiz-question"]'), 6000, 200);
        if (!appeared) {
            console.warn('Timed out waiting for quiz question to appear after clicking start.');
            return null;
        }
    }

    // --- Figure out starting question info ---
    const footerSpan = document.querySelector('footer > span');
    let startingFrom = 1;
    let totalQuestions = null;
    if (footerSpan) {
        // Text like "Question 1 of 8"
        const match = footerSpan.textContent.match(/(\d+)\s+of\s+(\d+)/i);
        if (match) {
            startingFrom = parseInt(match[1], 10);
            totalQuestions = parseInt(match[2], 10);
        }
    }
    console.log(`Quiz: starting from Q${startingFrom}, total: ${totalQuestions}`);

    const isMidQuiz = startingFrom > 1;
    const questions = [];

    // --- Loop through questions using Skip ---
    let safety = 0;
    const maxQuestions = totalQuestions || 200; // hard cap to prevent infinite loops

    while (safety < maxQuestions + 5) {
        safety++;

        const form = document.querySelector('form[data-testid="mc-quiz-question"]');
        if (!form) {
            console.log('No question form found — quiz ended or navigated away.');
            break;
        }

        // Read progress from footer
        const fSpan = document.querySelector('footer > span');
        let currentNum = questions.length + startingFrom;
        let total = totalQuestions;
        if (fSpan) {
            const m = fSpan.textContent.match(/(\d+)\s+of\s+(\d+)/i);
            if (m) { currentNum = parseInt(m[1], 10); total = parseInt(m[2], 10); }
        }

        // Read question text
        const promptEl = form.querySelector('.mc-quiz-question--question-prompt--9cMw2');
        const questionText = promptEl ? promptEl.textContent.trim() : form.querySelector('#question-prompt')?.textContent.trim() || '(Question text not found)';

        // Read all answer choices
        const answerEls = form.querySelectorAll('li.mc-quiz-question--answer--c9L0Q .mc-quiz-answer--answer-body--V-o8d');
        const answers = Array.from(answerEls).map(el => el.textContent.trim()).filter(Boolean);

        questions.push({ number: currentNum, text: questionText, answers });
        console.log(`Captured Q${currentNum}: "${questionText.substring(0, 60)}..." (${answers.length} choices)`);

        // Stop if this was the last question
        if (total && currentNum >= total) {
            console.log('Reached last question.');
            break;
        }

        // Click Skip to go to next question
        const skipBtn = document.querySelector('button[data-purpose="skip-question-button"]');
        if (!skipBtn) {
            console.log('No skip button found — may be end of quiz.');
            break;
        }
        simulateClick(skipBtn);

        // Wait for the next question to render (question number or form changes)
        const prevNum = currentNum;
        await waitForDom(() => {
            const s = document.querySelector('footer > span');
            if (!s) return false;
            const m = s.textContent.match(/(\d+)\s+of\s+(\d+)/i);
            return m && parseInt(m[1], 10) !== prevNum;
        }, 3000, 150);

        // Small extra buffer for React to fully render
        await new Promise(r => setTimeout(r, 300));
    }

    if (questions.length === 0) return null;

    // --- Build formatted output ---
    const ANSWERLETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const SEP80 = '='.repeat(80);
    const SEP80d = '-'.repeat(80);
    const totalStr = totalQuestions ? `${totalQuestions} Questions` : `${questions.length} Questions extracted`;
    const metaEl = document.querySelector('.start-page--quiz-info--gbMDJ');
    const metaText = metaEl ? metaEl.textContent.trim() : '';

    const lines = [
        SEP80,
        `  QUIZ: ${quizTitle}`,
        `  ${metaText || totalStr}  |  Extracted by Udemy Downloader`,
        SEP80,
        '',
        'NOTE: Correct answers are not shown. Udemy only reveals them after you',
        '      select and check each answer. All choices are listed for study.',
    ];

    if (isMidQuiz) {
        lines.push('');
        lines.push(`NOTE: Quiz was in progress. Extraction started from Question ${startingFrom}.`);
        lines.push('      Earlier questions are not included.');
    }

    questions.forEach(q => {
        lines.push('');
        lines.push(SEP80d);
        lines.push(`Question ${q.number}: ${q.text}`);
        lines.push(SEP80d);
        if (q.answers.length === 0) {
            lines.push('  (No answer choices found)');
        } else {
            q.answers.forEach((ans, i) => {
                lines.push(`  ${ANSWERLETTERS[i] || (i + 1) + '.'}) ${ans}`);
            });
        }
    });

    lines.push('');
    lines.push(SEP80);
    lines.push(`  End of Quiz — ${questions.length} question(s) captured`);
    lines.push(SEP80);

    return { title: quizTitle, content: lines.join('\n') };
}

// Extract resources by programmatically opening the Resources dropdown (lazy-rendered)
async function extractDOMResources() {
    const results = { links: [], fileUrls: [] };
    try {
        // Find the active lecture item in the sidebar
        const currentItem = document.querySelector('[aria-current="true"]') || 
                            document.querySelector('.curriculum-item-link--active');
        if (!currentItem) return results;

        // Find the Resources button
        const resourceBtn = currentItem.querySelector('button[aria-label="Resource list"]');
        if (!resourceBtn) return results;  // This lecture has no resources

        const wasOpen = resourceBtn.getAttribute('aria-expanded') === 'true';
        const btnId = resourceBtn.id; // e.g. "dropdown-trigger--36"

        // Helper: find the popup content anywhere in document (handles React portals)
        function findPopperContent() {
            // Strategy 1: by aria-labelledby (most reliable, works even if portaled to body)
            if (btnId) {
                const byLabel = document.querySelector(`[aria-labelledby="${btnId}"][data-testid="popup"]`);
                if (byLabel) return byLabel;
            }
            // Strategy 2: inside the closest popper wrapper
            const wrapper = resourceBtn.closest('.popper-module--popper--mM5Ie');
            if (wrapper) {
                const inWrapper = wrapper.querySelector('[data-testid="popup"]');
                if (inWrapper) return inWrapper;
                // Strategy 3: any dropdown menu in wrapper (no data-testid fallback)
                const menu = wrapper.querySelector('.dropdown-module--menu---dCM1');
                if (menu) return menu;
            }
            return null;
        }

        // Open the dropdown if not already open
        if (!wasOpen) {
            try {
                // Ensure the button is visible and in focus for React's IntersectionObservers
                resourceBtn.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                resourceBtn.focus();

                // 1. Keyboard accessibility click (often bypasses mouse-specific anti-bot checks)
                resourceBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
                resourceBtn.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));

                // 2. Comprehensive Mouse/Pointer sequence
                const eventParams = { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1, clientX: 20, clientY: 20 };
                ['pointerover', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
                    const Cls = type.startsWith('pointer') ? PointerEvent : MouseEvent;
                    resourceBtn.dispatchEvent(new Cls(type, eventParams));
                });

                // 3. React internal props hack (with safe fake event to prevent crashes)
                const reactPropsKey = Object.keys(resourceBtn).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$') || k.startsWith('__reactFiber$'));
                if (reactPropsKey && resourceBtn[reactPropsKey]) {
                    const props = resourceBtn[reactPropsKey];
                    const fakeEvent = {
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        target: resourceBtn,
                        currentTarget: resourceBtn,
                        nativeEvent: new MouseEvent('click')
                    };
                    if (props.onClick) props.onClick(fakeEvent);
                    else if (props.onPointerDown) props.onPointerDown(fakeEvent);
                }
            } catch (e) {
                console.warn('Error during simulated click:', e);
            }

            // Wait up to 5s for React to inject the dropdown content and load its items
            let waited = 0;
            while (waited < 5000) {
                await new Promise(r => setTimeout(r, 200));
                waited += 200;
                const content = findPopperContent();
                if (content && content.querySelector('a[href]')) break;
            }
        }

        // Now read the links from wherever the popup ended up
        const popperContent = findPopperContent();
        const resourceLinks = popperContent ? popperContent.querySelectorAll('a[href]') : [];

        console.log('Popper content found:', !!popperContent, '| Links found:', resourceLinks.length);

        resourceLinks.forEach(a => {
            const href = a.href || a.getAttribute('href') || '';
            const text = (a.querySelector('.ud-block-list-item-content') || a).textContent.trim();
            if (!href) return;

            // File downloads: direct file extension or udemy file CDN
            const isFile = /\.(pdf|zip|rar|docx?|xlsx?|pptx?|mp3|mp4|png|jpg|jpeg|gif|svg|txt|csv)(\?|$)/i.test(href);
            const isUdemyFile = href.includes('udemy.com') && (href.includes('/download') || href.includes('/user-file'));

            if (isFile || isUdemyFile) {
                results.fileUrls.push({ title: text || 'resource', url: href });
            } else {
                results.links.push({ text: text || href, url: href });
            }
        });

        // Close the dropdown if we opened it
        if (!wasOpen && resourceBtn.getAttribute('aria-expanded') === 'true') {
            try {
                resourceBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
                resourceBtn.click();
                const reactPropsKey = Object.keys(resourceBtn).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$') || k.startsWith('__reactFiber$'));
                if (reactPropsKey && resourceBtn[reactPropsKey] && resourceBtn[reactPropsKey].onClick) {
                    resourceBtn[reactPropsKey].onClick({ preventDefault: () => {}, stopPropagation: () => {}, nativeEvent: new Event('click') });
                }
            } catch (e) {}
        }

        const total = results.fileUrls.length + results.links.length;
        if (total > 0) {
            console.log('Resources extracted from DOM:', results.fileUrls.length, 'files,', results.links.length, 'links');
        } else {
            console.log('No resources found in DOM dropdown');
        }
    } catch(e) {
        console.warn('extractDOMResources error:', e);
    }
    return results;
}

// Extract resources via Udemy API (bypasses React UI entirely)
async function extractAPIResources(courseId, lectureId) {
    const results = { links: [], fileUrls: [] };
    if (!courseId || !lectureId) return results;
    
    try {
        console.log('Fetching resources via API...');
        const url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lectureId}/?fields[lecture]=supplementary_assets&fields[asset]=external_url,download_urls,title,asset_type,filename`;
        const res = await fetch(url, {
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        
        if (!res.ok) {
            console.warn('API resource fetch failed with status:', res.status);
            return results;
        }
        
        const data = await res.json();
        console.log('API raw response:', JSON.stringify(data).substring(0, 500));
        
        if (data && data.supplementary_assets && data.supplementary_assets.length > 0) {
            console.log('API returned supplementary_assets:', data.supplementary_assets);
            
            data.supplementary_assets.forEach(asset => {
                const title = asset.title || asset.filename || 'resource';
                
                if (asset.asset_type === 'ExternalLink' || asset.external_url) {
                    const url = asset.external_url || asset.title;
                    if (url && url.startsWith('http')) {
                        results.links.push({ text: title, url: url });
                    }
                } else if (asset.download_urls) {
                    // Try to find the file download URL in the asset
                    let fileUrl = null;
                    if (asset.download_urls.File && asset.download_urls.File.length > 0) {
                        fileUrl = asset.download_urls.File[0].file;
                    } else if (asset.download_urls.Video && asset.download_urls.Video.length > 0) {
                        fileUrl = asset.download_urls.Video[0].file;
                    }
                    
                    if (fileUrl) {
                        results.fileUrls.push({ title: title, url: fileUrl });
                    }
                }
            });
            console.log('Resources extracted from API:', results.fileUrls.length, 'files,', results.links.length, 'links');
        } else {
            console.log('API returned no supplementary assets.');
        }
    } catch(e) {
        console.warn('extractAPIResources error:', e);
    }
    return results;
}



// Save external links as a .txt file in the proper course/section folder
async function saveExternalLinksAsFile(links, lectureTitle, courseName, sectionName) {
    if (!links || links.length === 0) return;
    const lines = ['Resources for: '+ lectureTitle, '='.repeat(40), ''];
    links.forEach(l => lines.push(`• ${l.text}\n  ${l.url}\n`));
    const content = lines.join('\n');
    const filename = lectureTitle + '/External Links.txt';
    await downloadTextViaBackground(content, filename, courseName, sectionName);
    console.log('Saved', links.length, 'external links to:', filename);
}



// Helper for button loading state
function setDownloadButtonLoading(isLoading) {
    document.querySelectorAll('#ashrafee-downloader-header-button, #ashrafee-downloader-button').forEach(btn => {
        if (isLoading) {
            if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = '<span class="ashrafee-dl-spinner" style="margin-right:6px"></span><span class="ud-btn-label">Fetching...</span>';
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.8';
            btn.disabled = true;
        } else {
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
            }
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
            btn.disabled = false;
        }
    });
}

// Prevent duplicate spam
const recentlyQueuedUrls = new Set();

// Helper to send message with error tracking for resources
function safeSendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                console.error('safeSendMessage error:', chrome.runtime.lastError);
                if (!window._hasShownMsgError) {
                    showNotification('Background connection error. Try reloading.', 'error');
                    window._hasShownMsgError = true;
                }
                resolve(false);
            } else if (response && !response.success) {
                console.error('safeSendMessage background error:', response.error);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Handle download button click
function handleDownloadClick() {
    return new Promise(async (resolve, reject) => {
        setDownloadButtonLoading(true);
        const originalResolve = resolve;
        resolve = (value) => {
            setDownloadButtonLoading(false);
            originalResolve(value);
        };
        try {
            console.log('Starting download process...');
            showNotification('Extracting content...', 'info');

            // Open promo link if allowed
            handlePromoLink();

            const courseName = extractCourseName();
            const sectionName = extractSectionName();
            const pageType = detectPageType();

            console.log('Page type detected:', pageType);

            // ── QUIZ ──────────────────────────────────────────────────────────
            if (pageType === 'quiz') {
                showNotification('Extracting quiz questions...', 'info');
                const quizResult = await extractFullQuiz(courseName, sectionName);

                if (!quizResult) {
                    // Quiz already finished or unrecognized state — fall back to start-page text
                    const quizContainer = document.querySelector('.quiz-view--container--Mgl-c');
                    const hasStartBtn = quizContainer && quizContainer.querySelector('button[data-purpose="start-or-resume-quiz"]');
                    if (!hasStartBtn) {
                        // Fully finished / results page
                        showNotification('Quiz already completed. Questions unavailable.', 'error');
                        return resolve(false);
                    }
                    // Could not extract for another reason — save description fallback
                    const titleEl = document.querySelector('.quiz-view--container--Mgl-c .ud-heading-xxl') ||
                                    document.querySelector('[data-purpose="item-title"]');
                    const title = titleEl ? titleEl.textContent.trim() : 'Quiz';
                    const quizText = extractQuizText();
                    showNotification('Saving quiz description: ' + title, 'info');
                    await downloadTextViaBackground(quizText, title + '.txt', courseName, sectionName);
                    showNotification('Quiz description saved: ' + title, 'success');
                    return resolve(true);
                }

                const filename = quizResult.title + '.txt';
                showNotification('Saving quiz: ' + quizResult.title, 'info');
                await downloadTextViaBackground(quizResult.content, filename, courseName, sectionName);
                showNotification('Quiz saved: ' + quizResult.title + ' (' + filename + ')', 'success');
                return resolve(true);
            }

            // ── TEXT LECTURE ──────────────────────────────────────────────────
            if (pageType === 'text') {
                const textContent = await extractTextContent();
                if (!textContent) {
                    showNotification('Text content not found', 'error');
                    return resolve(false);
                }
                const textTitle = extractVideoTitle();
                showNotification('Saving text: '+ textTitle, 'info');
                const ok = await downloadTextViaBackground(textContent, textTitle + '.txt', courseName, sectionName);
                showNotification(ok ? 'Text saved: '+ textTitle : 'Text save failed', ok ? 'success' : 'error');

                // Also grab resources for text lectures (from sidebar DOM)
                try {
                    const lectureTitle = extractVideoTitle();
                    const domRes = await extractDOMResources();
                    // Save external links as a txt file
                    await saveExternalLinksAsFile(domRes.links, lectureTitle, courseName, sectionName);
                    // Download any actual file attachments
                    for (const res of domRes.fileUrls) {
                        if (recentlyQueuedUrls.has(res.url)) continue;
                        recentlyQueuedUrls.add(res.url);
                        setTimeout(() => recentlyQueuedUrls.delete(res.url), 30000);
                        
                        safeSendMessage({
                            action: 'ashrafee_downloadVideo',
                            url: res.url,
                            title: lectureTitle + '/' + res.title,
                            courseName: courseName,
                            sectionName: sectionName
                        });
                        console.log('Queuing resource file:', res.title);
                    }
                } catch(e) { console.warn('Resource extraction error:', e); }

                return resolve(ok);
            }

            // ── VIDEO ─────────────────────────────────────────────────────────
            const videoUrl = await extractVideoUrl();

            if (!videoUrl) {
                // If this was detected as a video page (has <video> element), don't
                // silently fall back to downloading a .txt file — that's the bug.
                // Only try text fallback if there's genuinely no video element.
                if (pageType === 'video') {
                    console.error('Video element present but could not extract downloadable URL.');
                    showNotification('Could not extract video URL. The video may be DRM-protected.', 'error');
                    return resolve(false);
                }
                // For unknown page types, try text as a last resort
                const textContent = await extractTextContent();
                if (textContent) {
                    const textTitle = extractVideoTitle();
                    const ok = await downloadTextViaBackground(textContent, textTitle + '.txt', courseName, sectionName);
                    showNotification(ok ? 'Text saved' : 'Save failed', ok ? 'success' : 'error');
                    return resolve(ok);
                }
                showNotification('Could not extract content', 'error');
                return resolve(false);
            }

            const videoTitle = extractVideoTitle();
            const fullFilename = videoTitle + '.mp4';
            
            // Duplicate prevention
            if (recentlyQueuedUrls.has(videoUrl)) {
                console.log('Video already queued recently:', videoUrl);
                showNotification('Video already queued', 'info');
                return resolve(true);
            }
            recentlyQueuedUrls.add(videoUrl);
            setTimeout(() => recentlyQueuedUrls.delete(videoUrl), 30000);
            
            console.log('Sending video download:', { videoUrl, fullFilename, courseName, sectionName });

            // Download the video
            chrome.runtime.sendMessage({
                action: 'ashrafee_downloadVideo',
                url: videoUrl,
                title: fullFilename,
                courseName: courseName,
                sectionName: sectionName
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    showNotification('Error starting download', 'error');
                    recentlyQueuedUrls.delete(videoUrl);
                    resolve(false);
                } else if (response && response.error) {
                    console.error('Download error:', response.error);
                    if (!response.error.includes('USER_CANCELED')) {
                        showNotification('Download error: '+ response.error, 'error');
                    }
                    recentlyQueuedUrls.delete(videoUrl);
                    resolve(false);
                } else if (response && response.canceled) {
                    recentlyQueuedUrls.delete(videoUrl);
                    resolve(false);
                } else {
                    showNotification('Video queued: '+ videoTitle, 'success');
                    resolve(true);
                }
            });

            // Grab resources from both DOM and API to ensure we don't miss anything
            try {
                const videoTitle2 = extractVideoTitle();
                const currentLectureId = getLectureId();
                const currentCourseId = await getCourseId();
                const [domRes, apiRes] = await Promise.all([
                    extractDOMResources(),
                    extractAPIResources(currentCourseId, currentLectureId)
                ]);
                
                // Merge DOM and API resources, deduplicating by URL
                const mergedLinks = [];
                const mergedFiles = [];
                const seenUrls = new Set();
                
                [...domRes.links, ...apiRes.links].forEach(res => {
                    if (!seenUrls.has(res.url)) {
                        seenUrls.add(res.url);
                        mergedLinks.push(res);
                    }
                });
                
                [...domRes.fileUrls, ...apiRes.fileUrls].forEach(res => {
                    if (!seenUrls.has(res.url)) {
                        seenUrls.add(res.url);
                        mergedFiles.push(res);
                    }
                });

                if (mergedLinks.length > 0 || mergedFiles.length > 0) {
                    console.log(` Total Unique Resources Found: ${mergedFiles.length} files, ${mergedLinks.length} links`);
                    
                    // Save external links as a companion txt file
                    if (mergedLinks.length > 0) {
                        await saveExternalLinksAsFile(mergedLinks, videoTitle2, courseName, sectionName);
                    }
                    
                    // Queue any actual file attachments for download
                    mergedFiles.forEach(res => {
                        if (recentlyQueuedUrls.has(res.url)) return;
                        recentlyQueuedUrls.add(res.url);
                        setTimeout(() => recentlyQueuedUrls.delete(res.url), 30000);
                        
                        safeSendMessage({
                            action: 'ashrafee_downloadVideo',
                            url: res.url,
                            title: videoTitle2 + '/' + res.title,
                            courseName: courseName,
                            sectionName: sectionName
                        });
                        showNotification('Resource: '+ res.title, 'info');
                    });
                }
            } catch(e) { console.warn('Resource extraction error:', e); }

        } catch (error) {
            console.error('Error in handleDownloadClick:', error);
            showNotification('Error downloading content', 'error');
            resolve(false);
        }
    });
}

// Check if promo link should be opened
function shouldOpenPromoLink() {
    const lastOpenTime = localStorage.getItem('udemyDownloaderLastPromo');
    if (!lastOpenTime) {
        return true;
    }

    const lastOpen = new Date(parseInt(lastOpenTime));
    const now = new Date();
    
    // Check if a full day has passed
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return (now - lastOpen) >= oneDayInMs;
}

// Open promo link in new tab
function handlePromoLink() {
    if (shouldOpenPromoLink()) {
        const promoUrl = 'https://dhwnh.com/g/05dgete24s0d08337debb3e3b7aadc/?subid=Udemy+Course+Downloader&ulp=https%3A%2F%2Fwww.udemy.com%2F';
        
        chrome.runtime.sendMessage({
            action: 'openPromoTab',
            url: promoUrl
        });
        
        localStorage.setItem('udemyDownloaderLastPromo', Date.now().toString());
    }
}




let isAutoDownloading = false;
let autoDownloadCount = 0;

// Wait until a condition function returns true, with a timeout
function waitFor(conditionFn, timeoutMs = 10000, intervalMs = 500) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            if (conditionFn()) return resolve(true);
            if (Date.now() - start >= timeoutMs) return resolve(false);
            setTimeout(check, intervalMs);
        };
        check();
    });
}

// Get the current lecture URL for change detection
function getCurrentLectureUrl() {
    return window.location.href;
}

// Find the next lecture button in the sidebar (fallback for quizzes where the main Next button is hidden)
function getNextSidebarLectureBtn() {
    const currentLi = document.querySelector('li[aria-current="true"]');
    if (!currentLi) return null;
    
    // 1. Try next sibling in current section
    let nextLi = currentLi.nextElementSibling;
    if (nextLi) {
        return nextLi.querySelector('[data-purpose^="curriculum-item-"]');
    }
    
    // 2. Try first item in next section
    let currentSection = currentLi.closest('[data-purpose^="section-panel"]');
    if (!currentSection) return null;
    
    let nextSection = currentSection.nextElementSibling;
    while (nextSection) {
        const firstItem = nextSection.querySelector('li [data-purpose^="curriculum-item-"]');
        if (firstItem) {
            return firstItem;
        }
        nextSection = nextSection.nextElementSibling;
    }
    
    return null;
}

function updateAutoButton(text, isActive) {
    const btn = document.querySelector('#ashrafee-downloader-auto-button');
    const label = document.querySelector('#ashrafee-downloader-auto-button .ud-btn-label');
    if (label) label.textContent = text;
    if (btn) {
        if (isActive) {
            btn.classList.add('ashrafee-dl-button-active');
            btn.style.background = '';
        } else {
            btn.classList.remove('ashrafee-dl-button-active');
            btn.style.background = '#FFFFFF';
        }
    }
}

async function startAutoDownload() {
    if (isAutoDownloading) {
        isAutoDownloading = false;
        updateAutoButton('Auto Download', false);
        hideStatusBar();
        showNotification('Auto Download Stopped', 'info');
        return;
    }
    
    const settings = await new Promise(resolve => {
        try {
            chrome.storage.sync.get(['autoDLDelay'], (res) => {
                if (chrome.runtime.lastError) resolve({});
                else resolve(res || {});
            });
        } catch (e) {
            resolve({});
        }
    });
    const delayMs = (parseInt(settings.autoDLDelay) || 3) * 1000;
    
    isAutoDownloading = true;
    autoDownloadCount = 0;
    
    // Estimate total lectures from sidebar
    const totalLecturesEl = document.querySelectorAll('[data-purpose="curriculum-item-title"]');
    const totalLectures = totalLecturesEl.length > 0 ? totalLecturesEl.length : '?';
    
    updateAutoButton('Stop Auto Download', true);
    showNotification(`Auto Download Started! (~${totalLectures} lectures)`, 'success');
    
    while (isAutoDownloading) {
        // Wait for page content to stabilise
        await new Promise(r => setTimeout(r, 2000));
        
        if (!isAutoDownloading) break;
        
        // Wait for the video element or text content to appear (up to 12s)
        const hasContent = await waitFor(() => {
            return !!document.querySelector('video') || 
                   !!document.querySelector('.text-viewer--container--TFOCA') ||
                   !!document.querySelector('[data-purpose="text-viewer"]') ||
                   !!document.querySelector('[data-purpose="curriculum-item-0-0"]');
        }, 12000);

        if (!hasContent) {
            console.warn('Timed out waiting for lecture content, trying to download anyway...');
        }

        autoDownloadCount++;
        const lecTitle = extractVideoTitle();
        showStatusBar(`Queuing lecture ${autoDownloadCount} of ${totalLectures}: ${lecTitle}`);
        showNotification(`Lecture ${autoDownloadCount} of ${totalLectures}: ${lecTitle}`, 'info');
        
        // Trigger download for current lecture (blocking until queued)
        let success = await handleDownloadClick();
        
        // Simple 1-attempt retry on failure
        if (!success && isAutoDownloading) {
            console.warn(`Lecture ${autoDownloadCount} failed. Retrying in 5s...`);
            showStatusBar(`Retrying lecture ${autoDownloadCount}...`);
            await new Promise(r => setTimeout(r, 5000));
            if (!isAutoDownloading) break;
            success = await handleDownloadClick();
            if (!success) {
                console.error(`Lecture ${autoDownloadCount} failed again. Skipping.`);
                showNotification(`Skipped lecture ${autoDownloadCount} (Extraction failed)`, 'error');
            }
        }
        
        if (!isAutoDownloading) break;
        
        // Cooldown Mode: Prevent rate limits by pausing every 25 lectures
        if (autoDownloadCount > 0 && autoDownloadCount % 25 === 0) {
            showStatusBar(`Cooldown: Waiting 60s to prevent rate limits...`);
            showNotification(`Cooldown Mode Activated (60s pause)`, 'info');
            await new Promise(r => setTimeout(r, 60000));
        }

        if (!isAutoDownloading) break;
        
        // Pause before navigating based on user settings + human jitter (0-5s random)
        const jitter = Math.random() * 5000;
        await new Promise(r => setTimeout(r, delayMs + jitter));
        
        if (!isAutoDownloading) break;
        
        // Check if there is a next lecture and it is not disabled
        let nextBtn = document.querySelector('button[data-purpose="go-to-next"], div[data-purpose="go-to-next"]');
        
        // Also check if Udemy is showing the "Course Completed" progress state
        const progressEl = document.querySelector('[data-purpose="progress-popover-text"]');
        const isCompletedByProgress = progressEl && (progressEl.textContent.includes('100%') || 
            (progressEl.textContent.match(/(\d+) of \1 complete/)));

        let isDisabled = nextBtn && (
            nextBtn.disabled || 
            nextBtn.getAttribute('aria-disabled') === 'true' || 
            nextBtn.classList.contains('disabled') ||
            nextBtn.parentElement.classList.contains('disabled')
        );

        if (!nextBtn || isDisabled || isCompletedByProgress) {
            // Fallback: Try to find the next lecture in the sidebar (crucial for quizzes where go-to-next is hidden)
            const sidebarNextBtn = getNextSidebarLectureBtn();
            
            if (sidebarNextBtn && !isCompletedByProgress) {
                console.log('No go-to-next button found (likely in quiz). Falling back to sidebar navigation.');
                nextBtn = sidebarNextBtn;
                isDisabled = false;
            } else {
                isAutoDownloading = false;
                updateAutoButton('Auto Download', false);
                hideStatusBar();
                showNotification('All ' + autoDownloadCount + ' lectures queued! Course Completed.', 'success');
                break;
            }
        }
        
        // Record current URL to detect successful navigation
        const urlBefore = getCurrentLectureUrl();
        
        showNotification('Going to next lecture...', 'info');
        simulateClick(nextBtn);
        
        // Wait for URL to change (Udemy SPA navigation) — up to 10s
        const navigated = await waitFor(() => getCurrentLectureUrl() !== urlBefore, 10000);
        
        if (!navigated) {
            // URL didn't change — we may already be on the last lecture
            console.warn('URL did not change after clicking Next. Stopping auto-download.');
            isAutoDownloading = false;
            updateAutoButton('Auto Download', false);
            hideStatusBar();
            showNotification('Auto Download finished (' + autoDownloadCount + ' lectures).', 'success');
            break;
        }
    }
    
    // Ensure button and status bar are reset if loop exits for any other reason
    if (!isAutoDownloading) {
        updateAutoButton('Auto Download', false);
        hideStatusBar();
    }
}



// Add download button to page
function addDownloadButton() {
    if (document.querySelector('#ashrafee-downloader-floating-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'ashrafee-downloader-floating-widget';
    widget.style.cssText = `
        position: fixed;
        top: 180px;
        right: 24px;
        z-index: 9998;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: "Udemy Sans", "SF Pro Text", -apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", Helvetica, Arial, sans-serif;
        animation: ashrafee-dl-toast-enter 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    `;

    // Download Button
    const downloadButton = document.createElement('button');
    downloadButton.id = 'ashrafee-downloader-header-button';
    downloadButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:8px">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span class="ud-btn-label">Download</span>
    `;
    downloadButton.style.cssText = `
        background: #702BD5;
        color: #FFFFFF;
        border: none;
        border-radius: 4px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    downloadButton.onmouseover = () => downloadButton.style.background = '#5b23ad';
    downloadButton.onmouseout = () => downloadButton.style.background = '#702BD5';
    downloadButton.onclick = (e) => { e.preventDefault(); handleDownloadClick(); };

    // Auto Download Button
    const autoDownloadButton = document.createElement('button');
    autoDownloadButton.id = 'ashrafee-downloader-auto-button';
    autoDownloadButton.innerHTML = '<span class="ud-btn-label">Auto Download</span>';
    autoDownloadButton.style.cssText = `
        background: #FFFFFF;
        color: #702BD5;
        border: 1px solid #702BD5;
        border-radius: 4px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    autoDownloadButton.onmouseover = () => { if (!isAutoDownloading) autoDownloadButton.style.background = '#f4f0fa'; };
    autoDownloadButton.onmouseout = () => { if (!isAutoDownloading) autoDownloadButton.style.background = '#FFFFFF'; };
    autoDownloadButton.onclick = (e) => { e.preventDefault(); startAutoDownload(); };

    widget.appendChild(downloadButton);
    widget.appendChild(autoDownloadButton);
    document.body.appendChild(widget);
    console.log('Floating Download Widget added');
}

// Create debounced version of addDownloadButton
const debouncedAddButton = debounce(addDownloadButton, 500);

// Monitor DOM changes to re-add button if page updates
function observePageChanges() {
    console.log('Setting up DOM observer');
    
    // Create single observer for DOM changes
    const observer = new MutationObserver((mutations) => {
        // Check for the floating widget
        const widget = document.querySelector('#ashrafee-downloader-floating-widget');
        
        // If no widget exists and we're on a lecture page, re-add buttons
        if (!widget && isUdemyLecturePage()) {
            console.log('Download widget not found after DOM change, re-adding');
            debouncedAddButton();
        }
    });
    
    // Start monitoring
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('DOM observer started');
}

// Main function
function init() {
    console.log('Udemy Downloader Extension initialized');
    
    // Check if current page is a Udemy lecture page
    if (isUdemyLecturePage()) {
        console.log('Udemy lecture page detected');
        
        // Add download button
        addDownloadButton();
        
        // Multiple attempts to ensure elements are loaded
        setTimeout(addDownloadButton, 1000);
        setTimeout(addDownloadButton, 2000);
        setTimeout(addDownloadButton, 3000);
        
        // Add observer for DOM changes
        observePageChanges();
    } else {
        console.log('Not a Udemy lecture page, skipping button addition');
    }
}

// Execute main function when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
