# MarkViewer

A full-featured, production-ready **AI-powered Markdown IDE** with live preview, workspace management, and desktop app. Built with React, Tailwind CSS, and CodeMirror 6. No backend — everything runs client-side.

## Features

### Editor
- **CodeMirror 6** editor with syntax highlighting, line numbers, bracket matching, multiple themes
- **Vim mode** toggle for modal editing
- **Formatting toolbar** with Bold, Italic, Strikethrough, Headings (H1–H6), Blockquote, Code, Links, Images, Tables, Lists, HR, Mermaid, PlantUML, and Math blocks
- **Find & Replace** (Ctrl+H)
- Paste images from clipboard as base64
- Drag & drop `.md` files to open

### Live Preview
- **GitHub Flavored Markdown** with full spec support
- **KaTeX** math rendering (inline `$...$` and block `$$...$$`)
- **Mermaid** diagrams
- **PlantUML** diagrams (via plantuml-encoder)
- **Syntax highlighting** for 180+ languages (highlight.js)
- Footnotes, task lists, tables, emoji

### AI Integration
- **3 AI Providers**: OpenAI, Google Gemini, and Ollama (local)
- **AI Panel** — side panel with streaming responses, diff preview, and one-click insert/replace
- **AI Widget** — floating draggable assistant with quick actions
- **Prompt templates**: Continue, Summarize, Rewrite, Fix Grammar, Make Concise, Simplify, Expand, Outline, Explain, Translate, Custom
- Gemini model auto-detection, Ollama local model listing

### Workspace & Files (OPFS)
- **Origin Private File System** storage with localStorage fallback
- Multiple workspaces with create, rename, switch, delete
- File tree sidebar with folders, search, pinning, bulk operations
- Move files between folders, rename, delete
- Import/export workspaces as ZIP
- Tabbed editing with drag-to-reorder, unsaved indicators

### Sharing
- **Public Share URLs** — LZ-compressed content embedded in the URL hash
- Expiry options: Permanent, 1 Hour, 1 Day, 1 Week, 30 Days
- No server, no database — paste the link and it renders instantly

### Modes
- **Dark / Light mode**
- **Focus mode** — hides toolbar and status bar
- **Zen mode** — distraction-free full-screen editor
- **Presentation mode** — slide navigation with `---` separators and arrow keys
- **Typewriter mode** — keeps cursor centered

### Command Palette
- **Ctrl+P / ⌘K** — fuzzy search for commands, in-document symbols, and workspace files
- **`:42`** syntax to jump to any line number

### Accessibility
- Keyboard-navigable with `aria-label` on all icon buttons
- Focus-visible rings for keyboard users
- Error Boundary with graceful recovery

### Cross-Tab Sync
- Settings sync across browser tabs via BroadcastChannel

### Desktop App (Tauri)
- Native macOS app (18 MB)
- Same full feature set as the web version

## Tech Stack

| Technology       | Purpose                      |
| ---------------- | ---------------------------- |
| React 18         | UI framework                 |
| Tailwind CSS 4   | Styling                      |
| CodeMirror 6     | Editor                       |
| marked.js        | Markdown parsing             |
| DOMPurify        | HTML sanitization            |
| highlight.js     | Code syntax highlighting     |
| KaTeX            | Math rendering               |
| Mermaid.js       | Diagrams                     |
| plantuml-encoder | PlantUML diagrams            |
| lz-string        | URL compression for sharing  |
| react-hot-toast  | Notifications                |
| Tauri 2          | Desktop app framework        |

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

## Keyboard Shortcuts

| Shortcut          | Action                  |
| ----------------- | ----------------------- |
| Ctrl+S / ⌘S       | Save                    |
| Ctrl+P / ⌘K       | Command Palette         |
| Ctrl+H            | Find & Replace          |
| Ctrl+Shift+K      | Toggle dark mode        |
| Ctrl+Shift+F      | Toggle focus mode       |
| Ctrl+Shift+Z      | Toggle zen mode         |
| Ctrl+.            | Open AI Widget          |
| Ctrl+Shift+A      | Open AI Panel           |
| Ctrl+B            | Toggle sidebar          |
| Escape            | Exit Zen/Focus/Present  |

## License

MIT
