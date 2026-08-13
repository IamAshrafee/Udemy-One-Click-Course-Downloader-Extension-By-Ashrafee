---
name: udemy-extension-release
description: >-
  Automates the full GitHub release workflow for the Udemy One-Click Course
  Downloader Chrome Extension. Use this skill when the user wants to publish
  a new version release. It reads the version from manifest.json, creates a
  versioned zip, writes professional release notes into the release-history
  tracking folder, and publishes a GitHub release — all in one flow.
---

# Udemy Extension Release Skill

## Overview

This skill automates the **entire release pipeline** for the Udemy One-Click Course Downloader Extension. It should be activated whenever the user says something like:
- "Release the new version"
- "Publish a new release"
- "Create a GitHub release"
- "Let's ship v1.x.x"

---

## Step 0 — Understand Context

Before doing anything, gather context:

1. Read `manifest.json` to get the current `version` field. This is the **release version**.
2. Check the `release-history/` folder. List all existing version folders (e.g., `v1.1.2/`).
3. If a folder for the current version **already exists**, warn the user:
   > ⚠️ A release for `v{VERSION}` already exists in `release-history/`. Did you bump the version in `manifest.json` before releasing? Ask the user to confirm before proceeding.
4. Ask the user: **"What changed in this release?"** — collect a bullet-point list of changes/features/fixes. This is the **changelog** for the release notes.
   - If the user says "you figure it out" or "check the code", do a `git log --oneline` from the last tag to HEAD and summarize the commits as the changelog.

---

## Step 1 — Prepare Release History Folder

Create the versioned folder in `release-history/`:

```
release-history/
└── v{VERSION}/
    └── release-notes.md
```

The `release-notes.md` file must be a **professional, well-structured GitHub release document**. Follow this template:

```markdown
## 🚀 What's New in v{VERSION}

{BRIEF_ONE_LINE_SUMMARY_OF_THE_UPDATE}

---

## ✨ Changes in This Release

{CHANGELOG_BULLET_POINTS — formatted nicely, grouped by: New Features / Bug Fixes / Improvements if applicable}

---

## 📦 Installation Instructions

> ⚠️ This extension is **not** on the Chrome Web Store. Load it manually via Developer Mode (takes under 30 seconds).

1. **Download** the `Udemy-One-Click-Course-Downloader-v{VERSION}.zip` file attached below and **extract** it anywhere on your computer.
2. Open **Google Chrome** and go to `chrome://extensions/`
3. Enable **Developer Mode** using the toggle in the **top-right corner**.
4. Click **"Load unpacked"** — select the extracted folder.
5. Open any **Udemy course** you are enrolled in. The floating buttons will appear!

> 💡 **Updating from a previous version?** Remove the old unpacked extension first, then load the new folder.

---

## 🚀 How to Use

- **Download button** — grabs the current lecture, quiz, or text article.
- **Auto Download button** — automatically navigates and downloads the entire course, one item at a time.
- **Stop Auto Download** — appears during auto mode to cleanly halt at any point.

---

## ⚠️ Known Limitations

- **DRM-protected courses** cannot be downloaded — this is a Udemy-side restriction.
- **Correct quiz answers** are not shown — Udemy hides them until you personally answer. The extension uses a non-destructive "Skip" approach to extract questions.
- Compatible with **Google Chrome** and Chromium-based browsers (Edge, Brave).

---

*Built with ❤️ by [@IamAshrafee](https://github.com/IamAshrafee)*
```

Replace all `{PLACEHOLDERS}` with actual content.

---

## Step 2 — Create the Versioned Zip

Run the packaging script via PowerShell, **without** the pause at the end (use `-Command` piping to avoid interactive pause). The correct approach is to call it directly:

```powershell
# Read version from manifest
$version = (Get-Content manifest.json | ConvertFrom-Json).version
$zipName = "Udemy-One-Click-Course-Downloader-v$version.zip"
$zipPath = "release\$zipName"

# Remove old zip if exists
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create release dir
New-Item -ItemType Directory -Force -Path "release" | Out-Null

# Zip the extension files
Compress-Archive -Path 'manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js', 'images' -DestinationPath $zipPath -Force

Write-Host "Zipped to: $zipPath"
```

Confirm the zip file exists at `release/Udemy-One-Click-Course-Downloader-v{VERSION}.zip` before proceeding.

---

## Step 3 — Publish the GitHub Release

Use the **GitHub CLI** (`gh`). The PATH must be refreshed first in PowerShell:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

Then create the release:

```powershell
gh release create "v{VERSION}" `
  ".\release\Udemy-One-Click-Course-Downloader-v{VERSION}.zip" `
  --repo "IamAshrafee/Udemy-One-Click-Course-Downloader-Extension-By-Ashrafee" `
  --title "v{VERSION} — {SHORT_TITLE}" `
  --notes-file ".\release-history\v{VERSION}\release-notes.md" `
  --latest
```

- The `--title` should be punchy and descriptive. Examples:
  - `v1.2.0 — Quiz Extraction & Auto Download` 
  - `v1.1.3 — Bug Fixes & Stability`
  - `v2.0.0 — Major Rewrite 🔥`
- If `gh` is not found, install it first: `winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements` and then check auth with `gh auth status`. If not logged in, run `gh auth login --web -h github.com -p https` and show the user the one-time code.

---

## Step 4 — Verify & Report

After publishing:

1. Confirm the release URL was printed (it should end with `/releases/tag/v{VERSION}`).
2. Output a clean summary to the user:

```
✅ Release v{VERSION} published successfully!

📦 Zip:        release/Udemy-One-Click-Course-Downloader-v{VERSION}.zip
📝 Notes:      release-history/v{VERSION}/release-notes.md
🌐 GitHub:     https://github.com/IamAshrafee/Udemy-One-Click-Course-Downloader-Extension-By-Ashrafee/releases/tag/v{VERSION}
```

---

## Important Rules

- **Never skip the `release-history/` step.** Every release MUST have its notes tracked locally.
- **Always read the version from `manifest.json`.** Never guess or hardcode the version.
- **The zip must be versioned** — filename format: `Udemy-One-Click-Course-Downloader-v{VERSION}.zip`
- **If `gh auth status` fails**, walk the user through login before proceeding.
- **If a tag already exists on GitHub**, the `gh release create` will fail. In that case, ask the user if they want to delete the existing release and re-publish, or abort.
- **Keep the release notes professional** — they are public-facing. Use proper markdown, emojis for sections, and clear language.
- The workspace root is: `d:\Projects FINAL\Web Development\Browser extension\Udemy One-Click Course Downloader Extension By Ashrafee`
