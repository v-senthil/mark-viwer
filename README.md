# MarkViewer

A full-featured, production-ready **real-time Markdown editor** with live preview. Built with React, Tailwind CSS, and CodeMirror 6. No backend — everything runs client-side.

## Features

- **CodeMirror 6** editor with syntax highlighting, line numbers, Vim mode, multiple themes
- **Live Preview** with GitHub Flavored Markdown, KaTeX math, Mermaid diagrams
- **Sharing** via URL with LZ-string compression — no server needed
- **File management** — new, open, save .md, export HTML/PDF, auto-save, recent docs
- **Customization** — font size, font family, line height, editor/preview themes
- **Dark mode**, Focus mode, Zen mode, Presentation mode, Typewriter mode
- Markdown cheatsheet, keyboard shortcuts panel, formatting toolbar
- Resizable split pane, Table of Contents, drag & drop .md files
- Paste images from clipboard as base64
- Mobile responsive

## Tech Stack

| Technology      | Purpose                  |
| --------------- | ------------------------ |
| React 18        | UI framework             |
| Tailwind CSS 4  | Styling                  |
| CodeMirror 6    | Editor                   |
| marked.js       | Markdown parsing         |
| DOMPurify       | HTML sanitization        |
| highlight.js    | Code syntax highlighting |
| KaTeX           | Math rendering           |
| Mermaid.js      | Diagrams                 |
| lz-string       | URL compression          |
| react-hot-toast | Notifications            |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Build for Production

```bash
npm run build
```

Output in `dist/`.

## Desktop App (Tauri)

### Build Desktop App

```bash
npm run tauri build
```

### macOS Installation

When downloading the app, macOS may show **"MarkViewer is damaged and can't be opened"**. This happens because the app isn't signed with an Apple Developer certificate.

**Easy Fix:** Extract the ZIP and double-click `install-markviewer.sh` — it removes the quarantine flag and launches the app.

**Manual Fix:** Open Terminal and run:

```bash
xattr -cr /path/to/MarkViewer.app
open /path/to/MarkViewer.app
```

Or: Right-click the app → **Open** → click **Open** in the security dialog.

## Sharing Documents

Click **🔗 Share** — the document is LZ-compressed into the URL hash. Anyone with the link sees the same content instantly, no server required.

## Keyboard Shortcuts

| Shortcut     | Action              |
| ------------ | ------------------- |
| Ctrl+S       | Save                |
| Ctrl+H       | Find & Replace      |
| Ctrl+Shift+K | Toggle dark mode    |
| Escape       | Exit Zen/Focus mode |

## License

MIT
