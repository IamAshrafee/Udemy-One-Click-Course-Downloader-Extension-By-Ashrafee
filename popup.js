document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const statusBadge = document.getElementById('statusBadge');
    const statusContent = document.getElementById('statusContent');
    const downloadCount = document.getElementById('downloadCount');
    const downloadSize = document.getElementById('downloadSize');
    const prefQualitySelect = document.getElementById('prefQuality');
    const autoDLDelayInput = document.getElementById('autoDLDelay');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    // Load settings
    chrome.storage.sync.get(['preferredQuality', 'autoDLDelay'], (result) => {
        if (result.preferredQuality) prefQualitySelect.value = result.preferredQuality;
        if (result.autoDLDelay) autoDLDelayInput.value = result.autoDLDelay;
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', () => {
        const quality = prefQualitySelect.value;
        const delay = parseInt(autoDLDelayInput.value) || 3;
        
        chrome.storage.sync.set({
            preferredQuality: quality,
            autoDLDelay: delay
        }, () => {
            const originalText = saveSettingsBtn.textContent;
            saveSettingsBtn.textContent = 'Saved!';
            saveSettingsBtn.style.background = 'var(--success-color)';
            setTimeout(() => {
                saveSettingsBtn.textContent = originalText;
                saveSettingsBtn.style.background = 'var(--primary-color)';
            }, 1500);
        });
    });

    // Check connection status
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentUrl = tabs[0].url;
        if (currentUrl.includes('udemy.com/course')) {
            statusBadge.textContent = 'Ready';
            statusBadge.classList.add('success');
            statusContent.textContent = 'You can now download videos from this course';
        } else {
            statusBadge.textContent = 'Not Ready';
            statusBadge.classList.add('error');
            statusContent.textContent = 'Please navigate to a Udemy course page';
        }
    });

    // Show/hide settings panel
    settingsButton.addEventListener('click', () => {
        settingsPanel.classList.toggle('show');
        if (settingsPanel.classList.contains('show')) {
            updateStats();
        }
    });

    // Update statistics
    function updateStats() {
        chrome.storage.local.get(['downloadCount', 'downloadSize'], (result) => {
            downloadCount.textContent = result.downloadCount || 0;
            const sizeInMB = ((result.downloadSize || 0) / (1024 * 1024)).toFixed(2);
            downloadSize.textContent = `${sizeInMB} MB`;
        });
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateStats') {
            updateStats();
        }
    });

    // Update statistics when popup is opened
    updateStats();
});
