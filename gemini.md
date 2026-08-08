# Udemy One-Click Course Downloader Extension

## Overview
This is a Google Chrome browser extension designed to help users easily download course content from Udemy. It allows downloading videos, text lectures, quizzes, and attached resources. It also includes an "Auto DL" (Auto Download) feature to sequentially download an entire course.

**Author:** Ashrafee
**Version:** 1.1.1
**Permissions:** `downloads`, `storage`, `activeTab`

## Architecture & Components

The extension is built using Manifest V3 and consists of three main components:

### 1. Content Script (`content.js`)
- **Injection:** Runs automatically on `https://www.udemy.com/course/*`.
- **UI Modifications:** Injects an independent floating widget (Download and Auto Download buttons) aligned to the right side using a flat design system (Udemy's native colors `#702BD5` and `#FFFFFF`, fonts, and zero emojis). Features a custom toast notification stacking system (`#udemy-downloader-toast-container`) and a bottom-left status indicator during Auto-Download loops.
- **Extraction Logic:** 
  - Retrieves `courseId` and `lectureId` from the URL or page metadata (`__INITIAL_STATE__`, JSON-LD).
  - Uses the Udemy API v2 (`/api-2.0/users/me/subscribed-courses/...`) to fetch the highest quality direct MP4 video URLs.
  - Fallbacks to scraping the `<video>` elements or `window.videojs` players if the API fails.
  - Extracts text contents from text-based lectures and quiz descriptions.
  - Automatically fetches supplementary assets (resources) via DOM parsing and API fetching, saving them as files or `.txt` lists of external links.
- **Auto-Download:** Features a loop that triggers a download, waits, clicks the "Next" lecture button, and repeats until the course is finished.

### 2. Background Service Worker (`background.js`)
- **Download Management:** Listens for `downloadVideo` messages from the content script and uses the `chrome.downloads.download` API to save files.
- **Queueing:** Implements a download queue (`downloadQueue`) to handle bulk downloads, ensuring files are downloaded one by one with a delay to prevent rate-limiting or overwhelming the browser.
- **File Organization:** Cleans and sanitizes filenames and automatically organizes downloads into folders by `Course Name/Section Name/Video Title`.
- **Statistics:** Tracks the total number of downloaded files, total size, and errors, saving them to `chrome.storage.local`.
- **Promo Links:** Opens promotional/affiliate links upon installation or occasionally during usage.

### 3. Popup Interface (`popup.html` & `popup.js`)
- **Status Indication:** Shows whether the user is currently on a valid Udemy course page ("Ready" or "Not Ready").
- **Statistics Panel:** Displays the download count and total size in MB retrieved from local storage.
- **Styling:** Fully aligns with Udemy's flat design, removing emojis and using SVGs, native fonts, and precise Udemy color variables.

## Key Workflows

- **Single Video Download:** 
  1. User clicks "Download".
  2. `content.js` determines the page type (video, text, quiz).
  3. For video, it fetches the MP4 URL via API.
  4. Sends a message to `background.js` with the URL and sanitized path.
  5. `background.js` triggers `chrome.downloads`.
- **Text/Quiz Download:**
  1. `content.js` scrapes the text container.
  2. Encodes the text into a Base64 Data URL.
  3. Sends to `background.js` to be downloaded as a `.txt` file.
- **Auto Download:**
  1. User clicks "Auto DL".
  2. `content.js` begins a loop: downloads current lecture -> waits -> clicks Next -> waits for navigation -> repeats.

## Future Context / Developer Notes
- The extension heavily relies on Udemy's DOM structure (`data-purpose` attributes, specific classes like `.text-viewer--container--TFOCA`). If Udemy updates their UI, these selectors may break and need updating.
- API requests use `credentials: 'include'` to utilize the user's active Udemy session cookies.
- M3U8 handling exists in the background script, but the primary method favors extracting direct `.mp4` URLs from the API.
