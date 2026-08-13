# Udemy Course Downloader by Ashrafee

A powerful, safe, and fully automated Chrome Extension that lets you download your enrolled Udemy courses directly to your computer. It grabs videos, text lectures, **full quizzes**, PDFs, ZIP files, and all attached resources — and saves them into perfectly organized folders.

---

## 📸 Walkthrough & Features

Here is a quick look at how the extension integrates into Udemy:

### 1. The Floating Action Buttons
<div align="center">
  <img src="Screenshoots/A%20screenshoot%20of%20floading%20buttons%20to%20start%20download.png" alt="Floating Buttons" width="600" />
</div>

When you open a course, two native-looking buttons appear on the right side of the screen over the course content sidebar.
- Click **Download** to grab the current lecture, quiz, or text article.
- Click **Auto Download** to start downloading the entire course automatically.

### 2. Live Notification System
<div align="center">
  <img src="Screenshoots/when%20auto%20downloading%20is%20started%20-%20showing%20some%20nitifications.png" alt="Auto Download Notifications" width="600" />
</div>

During an Auto Download, the buttons change to show the "Fetching..." and "Stop Auto Download" states. Clean toast notifications stack at the top right to tell you exactly what is being processed (e.g., "Extracting quiz questions...", "Video queued: Introduction.mp4").

---

## ✨ Features Summary

| Feature | Description |
|---|---|
| **Full Course Auto-Download** | Click "Auto Download" and step away — the extension handles the rest |
| **Video Downloads** | Fetches the highest-quality direct `.mp4` URL via Udemy's internal API |
| **Full Quiz Extraction** | Automatically starts the quiz, navigates through every question, and saves all Q&A choices to a `.txt` file |
| **Text Lectures** | Saves article-based lectures as formatted `.txt` files |
| **Attached Resources** | Detects and downloads PDFs, ZIPs, DOCX, and other attached files |
| **External Link Lists** | Saves any external resource links as a companion `.txt` file |
| **Zero Configuration** | No cookies or tokens needed — uses your active Chrome session securely |
| **Safe & Human-like** | Adds delays between actions, processes downloads one-by-one to avoid account flags |

---

## 📋 Quiz Extraction (New!)

Udemy quizzes are no longer just saved as a one-line title. The extension now performs a full extraction:

1. Automatically clicks **"Start Quiz"** or **"Resume Quiz"** on the intro page
2. Reads every question and all answer choices as they appear
3. Uses the **"Skip question"** button to advance — this is **non-destructive** and does not submit or alter your quiz state
4. Saves all questions as a clean, readable `.txt` file

**Example output:**
```
================================================================================
  QUIZ: Day 2 Quiz
  Quiz 1 | 8 questions  |  Extracted by Udemy Downloader
================================================================================

NOTE: Correct answers are not shown. Udemy only reveals them after you
      select and check each answer. All choices are listed for study.

--------------------------------------------------------------------------------
Question 1: What's a stock?
--------------------------------------------------------------------------------
  A) A loan given to a company that must be repaid with interest
  B) A form of government-issued currency
  C) A security that represents fractional ownership in a company
  D) A type of savings account

...
================================================================================
  End of Quiz — 8 question(s) captured
================================================================================
```

> **Why no correct answers?** Udemy hides the correct answer until you personally click "Check Answer". The Skip approach is the only way to read all questions without permanently altering your quiz progress.

---

## 📂 Perfect Folder Organization

Never deal with a messy downloads folder again. The extension automatically sanitizes file names and creates folders matching the course syllabus:

```text
Downloads/
└── Course Name/
    ├── Section 1/
    │   ├── 1. Introduction.mp4
    │   └── 2. Source Code.zip
    ├── Section 2/
    │   ├── 3. Python Basics.mp4
    │   ├── 3. Python Basics/
    │   │   └── External Links.txt
    │   └── 4. Day 2 Quiz.txt       ← Full quiz with all questions & choices
    └── Section 3/
        └── 5. Next Steps.mp4
```

---

## 🛡️ Is it safe to use?

Yes. This extension was built with account safety as the #1 priority.

- **Human Mimicry:** It waits for pages to fully load, implements realistic delays between actions, and never spams Udemy's servers.
- **Sequential Download Queue:** A background manager processes all queued files strictly one-by-one. Concurrent queue writes are serialized to prevent race conditions and ensure no file is ever duplicated or skipped.
- **100% Local & Private:** Runs entirely on your local machine. No passwords are entered into the extension, and no data is sent to any third-party servers.

---

## 🚀 Step-by-Step Installation Guide

Because this extension is not published on the Chrome Web Store, you must load it manually via Developer Mode. It takes less than 30 seconds:

1. Download this repository as a `.zip` file (Click the green `Code` button → `Download ZIP`) and extract it somewhere on your computer.
2. Open Google Chrome and type `chrome://extensions/` into the URL bar.
3. Turn on **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the folder you extracted in Step 1.
6. Open any Udemy course you are enrolled in — the floating download buttons will appear on the right side of the screen!

---

## 💻 For Developers (Technical Architecture)

Built on **Manifest V3**. Core components:

- **State Extraction (`content.js`):** Hunts for the `__INITIAL_STATE__` object or `JSON-LD` script tags to reliably extract `courseId` and `lectureId` without depending on brittle DOM scraping.
- **API Fetching (`content.js`):** Calls Udemy's internal API (`/api-2.0/users/me/subscribed-courses/...`) using `credentials: 'include'` to attach the user's active session cookies — granting authorized access to direct `.mp4` URLs.
- **DOM Fallbacks (`content.js`):** If the API fails, falls back to scraping the HTML5 `<video>` source tags or hooking into the `window.videojs` player object.
- **Quiz Navigator (`content.js` — `extractFullQuiz()`):** Uses a loop of `simulateClick()` + `waitForDom()` to navigate through all quiz questions non-destructively via the "Skip" button, capturing each question and its choices before advancing.
- **The Queue Manager (`background.js`):** A background Service Worker handles file saving via `chrome.downloads`. A `queueUpdatePromise` chain ensures all reads/writes to the persistent `chrome.storage.local` queue are strictly sequential — preventing race conditions where multiple concurrent downloads could overwrite each other or cause the same file to be downloaded multiple times.

### Troubleshooting & FAQ

- **Why did a quiz save without questions?** If the quiz was already in a "finished/results" state when you clicked Download, the questions are no longer visible in the DOM. Start a fresh attempt or resume the quiz first, then click Download.
- **Why are correct answers missing from the quiz file?** Udemy never renders correct answers in the DOM until you personally select and check each one. The extension uses the "Skip" button to avoid altering your quiz state — correct answers cannot be extracted.
- **Some videos failed to download.** Occasionally, Udemy encrypts specific courses with DRM (Digital Rights Management). This extension uses standard API extraction and cannot bypass DRM encryption.
- **Why did a text lecture download as a `.txt` file?** That's intentional — article-based lectures are extracted and saved as `.txt` so you don't miss any information.

### Contributing

Pull requests are always welcome! Udemy updates their UI and API occasionally, which can break the extension. If you find a bug or want to add a feature, feel free to open an issue or submit a fix.

---
**Note:** This tool is for personal, offline educational use. Don't use it to pirate or distribute courses. Respect the instructors.
