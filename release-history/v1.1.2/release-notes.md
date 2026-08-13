## 🎉 Initial Public Release — v1.1.2

This is the first official release of the **Udemy One-Click Course Downloader** Chrome Extension. After weeks of development and testing, it is ready to use!

---

## ✨ What This Extension Does

A powerful, safe, and fully automated Chrome Extension that lets you download your **enrolled** Udemy courses directly to your computer — with a single click or fully automatically.

| Feature | Details |
|---|---|
| 🎬 **Video Downloads** | Fetches the highest-quality direct `.mp4` URL via Udemy's internal API |
| 📝 **Text Lectures** | Saves article-based lectures as clean, formatted `.txt` files |
| 🧠 **Full Quiz Extraction** | Navigates every question automatically and saves all Q&A to a `.txt` file |
| 📎 **Attached Resources** | Downloads PDFs, ZIPs, DOCX, and all attached files |
| 🔗 **External Link Lists** | Saves external resource links as a companion `.txt` file |
| 📁 **Perfect Folder Organization** | Mirrors the exact course syllabus structure in your Downloads folder |
| 🛡️ **Safe & Human-like** | Adds realistic delays, processes one file at a time — account-safe |
| 🔒 **100% Private** | Runs entirely locally. No passwords entered. No data sent anywhere. |

---

## 📦 Installation Instructions

> ⚠️ This extension is **not** on the Chrome Web Store. You must load it manually via Developer Mode (takes under 30 seconds).

### Step-by-Step

1. **Download** the `Udemy-One-Click-Course-Downloader.zip` file attached below and **extract** it anywhere on your computer.
2. Open **Google Chrome** and go to `chrome://extensions/`
3. Enable **Developer Mode** using the toggle in the **top-right corner**.
4. Click **"Load unpacked"** in the top-left.
5. Select the **extracted folder** from Step 1.
6. Open any **Udemy course** you are enrolled in — two floating buttons will appear on the right side of the course page!

---

## 🚀 How to Use

- **Download (current lecture):** Click the **"Download"** button to grab just the current lecture, quiz, or text article.
- **Auto Download (full course):** Click **"Auto Download"** to sit back and let the extension automatically navigate and download every item in the course, one by one.
- **Stop anytime:** A **"Stop Auto Download"** button appears during auto mode — click it to stop cleanly at any point.

---

## 📂 Output Folder Structure

Your downloads are perfectly organized to mirror the course:

```
Downloads/
└── Course Name/
    ├── Section 1 - Getting Started/
    │   ├── 1. Introduction.mp4
    │   └── 2. Source Code.zip
    ├── Section 2 - Core Concepts/
    │   ├── 3. Python Basics.mp4
    │   └── 4. Day 2 Quiz.txt   ← Full quiz with all questions & choices
    └── Section 3 - Next Steps/
        └── 5. Conclusion.mp4
```

---

## ⚠️ Known Limitations

- **DRM-protected courses** cannot be downloaded — this is a Udemy restriction, not a bug.
- **Correct quiz answers** are not included — Udemy only reveals them after you personally select each one. The extension uses a non-destructive "Skip" approach to read questions without altering your quiz progress.
- Works on **Google Chrome** and Chromium-based browsers (Edge, Brave).

---

## 🛡️ Is It Safe?

Yes. Built with account safety as the #1 priority:
- **Human Mimicry:** Waits for pages to fully load, adds realistic delays between actions.
- **Sequential Queue:** All downloads are processed strictly one-by-one to prevent race conditions.
- **No Login Required by Extension:** Uses your existing active Chrome session — your credentials are never touched by the extension.

---

**Note:** This tool is for personal, offline educational use only. Respect instructors and do not distribute downloaded content.

---

*Built with ❤️ by [@IamAshrafee](https://github.com/IamAshrafee)*
