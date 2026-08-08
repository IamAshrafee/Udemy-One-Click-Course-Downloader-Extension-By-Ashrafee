# Udemy Course Downloader by Ashrafee

A powerful, safe, and fully automated Chrome Extension that lets you download your enrolled Udemy courses directly to your computer. It grabs the videos, text lectures, and attached resources, and saves them into perfectly organized folders.

---

## 📸 Walkthrough & Features

Here is a quick look at how the extension integrates into Udemy:

### 1. The Floating Action Buttons
<div align="center">
  <img src="Screenshoots/A%20screenshoot%20of%20floading%20buttons%20to%20start%20download.png" alt="Floating Buttons" width="600" />
</div>

When you open a course, two native-looking buttons appear on the right side of the screen over the course content sidebar. 
- Click **Download** to grab the current lecture.
- Click **Auto Download** to start downloading the entire course automatically.

### 2. Live Notification System
<div align="center">
  <img src="Screenshoots/when%20auto%20downloading%20is%20started%20-%20showing%20some%20nitifications.png" alt="Auto Download Notifications" width="600" />
</div>

During an Auto Download, the buttons change to show the "Fetching..." and "Stop Auto Download" states. Clean toast notifications stack at the top right to tell you exactly which lecture is being processed and what action is happening (e.g., "Extracting content...").

---

## ✨ Features Summary

- **Download an entire course:** Click "Auto Download" and step away. The extension handles everything else.
- **Gets everything:** It doesn't just download `.mp4` videos. It also saves text lectures, quizzes, PDFs, and ZIP files attached to the course.
- **Zero Configuration:** No need to pass cookies or tokens. It uses your active Chrome session securely.

## 📂 Perfect Folder Organization

Never deal with a messy downloads folder again. The extension automatically sanitizes file names and creates folders on your computer matching the course syllabus. It looks exactly like this:
```text
Downloads/
└── Course Name/
    ├── Section 1/
    │   ├── 1. Introduction.mp4
    │   └── 2. Source Code.zip
    └── Section 2/
        └── 3. Next Steps.mp4
```

## 🛡️ Is it safe to use?

Yes. This extension was built with account safety as the #1 priority to ensure your Udemy account never gets flagged.
- **Human Mimicry:** It waits for pages to load, implements delays between clicks, and doesn't spam Udemy's servers.
- **Background Queue:** If an auto-download queues up 50 videos, a background manager processes them strictly one by one. This prevents your browser from crashing and keeps your network bandwidth stable.
- **100% Local & Private:** It runs entirely on your local machine. You do not type your password into the extension, and absolutely no data is sent to third-party servers.

## 🚀 Step-by-Step Installation Guide

Because this extension is not published on the Chrome Web Store, you must load it manually via Developer Mode. It takes less than 30 seconds:

1. Download this repository as a `.zip` file (Click the green `Code` button -> `Download ZIP`) and extract it somewhere on your computer.
2. Open Google Chrome and type `chrome://extensions/` into the URL bar.
3. Turn on **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the folder you just extracted in Step 1.
6. Open any Udemy course you are enrolled in, and you will see the floating download buttons appear on the right side of the screen!

## 💻 For Developers (Technical Architecture)

If you want to fork this project or contribute, here is a deeper dive into how the core logic operates under the hood (built on Manifest V3):

- **State Extraction (`content.js`):** We don't rely purely on scraping HTML elements because Udemy's UI changes frequently. Instead, the script hunts for the `__INITIAL_STATE__` object or `JSON-LD` script tags embedded in the page source to reliably extract the current `courseId` and `lectureId`.
- **API Fetching (`content.js`):** Once we have the IDs, we send a request to Udemy's internal API (`/api-2.0/users/me/subscribed-courses/...`). Because the extension runs directly on the page, we use `credentials: 'include'` to automatically attach the user's active session cookies. This grants us authorized access to the raw `.mp4` video URLs.
- **DOM Fallbacks:** If the API fails or the structure changes, the script falls back to directly scraping the HTML5 `<video>` source tags or hooking into the `window.videojs` player object.
- **The Queue Manager (`background.js`):** We use a background Service Worker to handle the actual file saving via the `chrome.downloads` API. It maintains a strict, array-based download queue. It listens for download payloads from `content.js`, pushes them to the queue, and processes them sequentially to prevent browser lock-ups. It also automatically sanitizes filenames to prevent OS-level path errors.

### Troubleshooting & FAQ

- **Why did a lecture download as a `.txt` file?** If the lecture is just an article or a quiz, the extension extracts the text content and saves it as a `.txt` file so you don't miss any information.
- **Some videos failed to download.** Occasionally, Udemy encrypts specific courses with DRM (Digital Rights Management). This extension uses standard API extraction and cannot bypass DRM encryption.

### Contributing
Pull requests are always welcome! Udemy updates their UI and API occasionally, which can break the extension. If you find a bug or want to add a feature, feel free to open an issue or submit a fix.

---
**Note:** This tool is for personal, offline educational use. Don't use it to pirate or distribute courses. Respect the instructors.
