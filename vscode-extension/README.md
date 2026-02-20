# MarkViewer VS Code Extension

AI-powered Markdown editor with real-time preview, document analytics, and smart navigation.

## Features

### 📖 Real-time Preview
- Beautiful preview with multiple themes (GitHub, Notion, Minimal, Academic, Developer)
- Side-by-side editing with synchronized scrolling
- Customizable font size and line height

### 🤖 AI Writing Assistance
- **Continue Writing** - AI continues your text naturally
- **Summarize** - Generate concise summaries
- **Fix Grammar** - Correct spelling and grammar errors
- **Make Concise** - Reduce verbosity while keeping meaning
- **Expand** - Add more details and examples
- **Generate Outline** - Create structured outlines
- **Explain** - Simplify complex text

Supports multiple AI providers:
- **Ollama** (local, free) - Default
- **OpenAI** (GPT-4, GPT-4o-mini)
- **Google AI** (Gemini 2.0 Flash, Gemini 1.5 Pro)

### 📊 Document Analytics
- Word count, character count, reading time
- Flesch Reading Ease score
- Structure analysis (headings, links, images)
- Status bar integration

### ✏️ Editing Helpers
- Insert table snippets
- Insert code blocks
- Format document
- Export as HTML

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch Extension Development Host

Or install from VSIX:
```bash
npm run package
code --install-extension markviewer-1.0.0.vsix
```

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `markviewer.previewTheme` | Preview theme style | `github` |
| `markviewer.ai.provider` | AI provider | `ollama` |
| `markviewer.ai.apiKey` | API key for OpenAI/Google | `` |
| `markviewer.ai.model` | AI model to use | `llama3.2:latest` |
| `markviewer.ai.ollamaEndpoint` | Ollama API endpoint | `http://localhost:11434` |
| `markviewer.analytics.showInStatusBar` | Show word count | `true` |
| `markviewer.preview.fontSize` | Preview font size | `16` |
| `markviewer.preview.lineHeight` | Preview line height | `1.6` |

## Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Ctrl+Shift+V` | Open preview to the side |
| `Ctrl+Shift+A` | AI assist on selection |

## Requirements

- VS Code 1.80.0 or higher
- For AI features: Ollama running locally, or API keys for OpenAI/Google

## License

MIT
