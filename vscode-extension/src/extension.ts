/**
 * MarkViewer VS Code Extension
 * 
 * AI-powered Markdown editor with:
 * - Real-time preview with custom themes
 * - AI writing assistance (OpenAI, Google AI, Ollama)
 * - Document analytics
 * - Smart navigation
 */

import * as vscode from 'vscode';
import { marked } from 'marked';

// ═══════════════════════════════════════════════════════════════
// EXTENSION ACTIVATION
// ═══════════════════════════════════════════════════════════════

export function activate(context: vscode.ExtensionContext) {
    console.log('MarkViewer extension is now active');

    // Register preview commands
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.openPreview', () => {
            openPreview(context, false);
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.openPreviewSplit', () => {
            openPreview(context, true);
        })
    );

    // Register AI assist command
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.aiAssist', async () => {
            await showAIAssistQuickPick();
        })
    );

    // Register analytics command
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.showAnalytics', () => {
            showDocumentAnalytics();
        })
    );

    // Register export HTML command
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.exportHtml', async () => {
            await exportAsHtml();
        })
    );

    // Register insert commands
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.insertTable', () => {
            insertTable();
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.insertCodeBlock', () => {
            insertCodeBlock();
        })
    );

    // Register format command
    context.subscriptions.push(
        vscode.commands.registerCommand('markviewer.formatDocument', () => {
            formatMarkdownDocument();
        })
    );

    // Status bar item for word count
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'markviewer.showAnalytics';
    context.subscriptions.push(statusBarItem);

    // Update status bar on document change
    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateStatusBar(statusBarItem, editor);
    });
    
    vscode.workspace.onDidChangeTextDocument(e => {
        if (vscode.window.activeTextEditor?.document === e.document) {
            updateStatusBar(statusBarItem, vscode.window.activeTextEditor);
        }
    });

    // Initial update
    updateStatusBar(statusBarItem, vscode.window.activeTextEditor);
}

export function deactivate() {}

// ═══════════════════════════════════════════════════════════════
// PREVIEW PANEL
// ═══════════════════════════════════════════════════════════════

let previewPanel: vscode.WebviewPanel | undefined;

function openPreview(context: vscode.ExtensionContext, split: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('MarkViewer: Please open a Markdown file first');
        return;
    }

    const column = split 
        ? vscode.ViewColumn.Beside 
        : vscode.ViewColumn.Active;

    if (previewPanel) {
        previewPanel.reveal(column);
    } else {
        previewPanel = vscode.window.createWebviewPanel(
            'markviewerPreview',
            'MarkViewer Preview',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        previewPanel.onDidDispose(() => {
            previewPanel = undefined;
        });
    }

    updatePreview(editor.document);

    // Listen for document changes
    vscode.workspace.onDidChangeTextDocument(e => {
        if (previewPanel && e.document === editor.document) {
            updatePreview(e.document);
        }
    });
}

function updatePreview(document: vscode.TextDocument) {
    if (!previewPanel) return;
    
    const config = vscode.workspace.getConfiguration('markviewer');
    const theme = config.get<string>('previewTheme', 'github');
    const fontSize = config.get<number>('preview.fontSize', 16);
    const lineHeight = config.get<number>('preview.lineHeight', 1.6);
    
    const content = document.getText();
    const html = marked.parse(content) as string;
    
    previewPanel.webview.html = getPreviewHtml(html, theme, fontSize, lineHeight);
}

function getPreviewHtml(content: string, theme: string, fontSize: number, lineHeight: number): string {
    const themeStyles = getThemeStyles(theme);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MarkViewer Preview</title>
    <style>
        :root {
            --font-size: ${fontSize}px;
            --line-height: ${lineHeight};
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            font-size: var(--font-size);
            line-height: var(--line-height);
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }
        
        h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        
        code {
            background: rgba(0,0,0,0.05);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Fira Code', Consolas, Monaco, monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #f6f8fa;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
        }
        
        pre code {
            background: none;
            padding: 0;
        }
        
        blockquote {
            border-left: 4px solid #ddd;
            margin: 1em 0;
            padding-left: 1em;
            color: #666;
        }
        
        img {
            max-width: 100%;
            height: auto;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 0.5em 1em;
            text-align: left;
        }
        
        th {
            background: #f6f8fa;
        }
        
        a {
            color: #0366d6;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        ${themeStyles}
    </style>
</head>
<body class="theme-${theme}">
    ${content}
</body>
</html>`;
}

function getThemeStyles(theme: string): string {
    switch (theme) {
        case 'notion':
            return `
                body { font-family: 'Inter', system-ui, sans-serif; }
                h1, h2, h3 { font-weight: 700; }
                h1 { border-bottom: none; }
                h2 { border-bottom: none; }
            `;
        case 'minimal':
            return `
                body { max-width: 600px; }
                h1, h2, h3 { font-weight: 500; }
            `;
        case 'academic':
            return `
                body { font-family: 'Times New Roman', Georgia, serif; }
                h1 { text-align: center; border-bottom: none; }
                p { text-align: justify; text-indent: 2em; }
            `;
        case 'developer':
            return `
                code:not(pre code) { background: rgba(59,130,246,0.1); color: #3b82f6; }
                h1 { border-bottom: 2px solid #3b82f6; }
            `;
        default: // github
            return '';
    }
}

// ═══════════════════════════════════════════════════════════════
// AI ASSIST
// ═══════════════════════════════════════════════════════════════

async function showAIAssistQuickPick() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showWarningMessage('Please select some text first');
        return;
    }

    const actions = [
        { label: '✏️ Continue Writing', action: 'continue' },
        { label: '📝 Summarize', action: 'summarize' },
        { label: '✅ Fix Grammar', action: 'fixGrammar' },
        { label: '✂️ Make Concise', action: 'makeConcise' },
        { label: '📖 Expand', action: 'expand' },
        { label: '📋 Generate Outline', action: 'outline' },
        { label: '❓ Explain', action: 'explain' },
    ];

    const selected = await vscode.window.showQuickPick(actions, {
        placeHolder: 'Select an AI action for the selected text',
    });

    if (selected) {
        await executeAIAction(selected.action, selectedText, editor);
    }
}

async function executeAIAction(action: string, text: string, editor: vscode.TextEditor) {
    const config = vscode.workspace.getConfiguration('markviewer.ai');
    const provider = config.get<string>('provider', 'ollama');
    const model = config.get<string>('model', 'llama3.2:latest');
    const apiKey = config.get<string>('apiKey', '');
    const ollamaEndpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `MarkViewer AI: ${action}...`,
        cancellable: true,
    }, async (progress, token) => {
        try {
            const prompt = getPromptForAction(action, text);
            let result: string;

            if (provider === 'ollama') {
                result = await callOllama(ollamaEndpoint, model, prompt);
            } else if (provider === 'openai') {
                result = await callOpenAI(apiKey, model, prompt);
            } else if (provider === 'google') {
                result = await callGoogleAI(apiKey, model, prompt);
            } else {
                throw new Error(`Unknown provider: ${provider}`);
            }

            // Show result in a new editor or replace selection
            const choice = await vscode.window.showQuickPick([
                { label: 'Replace Selection', value: 'replace' },
                { label: 'Insert Below', value: 'insert' },
                { label: 'Copy to Clipboard', value: 'copy' },
            ], { placeHolder: 'What would you like to do with the result?' });

            if (choice?.value === 'replace') {
                await editor.edit(editBuilder => {
                    editBuilder.replace(editor.selection, result);
                });
            } else if (choice?.value === 'insert') {
                const position = editor.selection.end;
                await editor.edit(editBuilder => {
                    editBuilder.insert(position, '\n\n' + result);
                });
            } else if (choice?.value === 'copy') {
                await vscode.env.clipboard.writeText(result);
                vscode.window.showInformationMessage('Copied to clipboard');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`AI Error: ${error.message}`);
        }
    });
}

function getPromptForAction(action: string, text: string): string {
    const prompts: Record<string, string> = {
        continue: `Continue writing the following text naturally:\n\n${text}`,
        summarize: `Summarize the following text concisely:\n\n${text}`,
        fixGrammar: `Fix any grammar, spelling, and punctuation errors in the following text. Return only the corrected text:\n\n${text}`,
        makeConcise: `Make the following text more concise while keeping the key information:\n\n${text}`,
        expand: `Expand on the following text with more details and examples:\n\n${text}`,
        outline: `Generate a structured outline for the following content:\n\n${text}`,
        explain: `Explain the following text in simpler terms:\n\n${text}`,
    };
    return prompts[action] || `Process the following text:\n\n${text}`;
}

async function callOllama(endpoint: string, model: string, prompt: string): Promise<string> {
    const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }
    
    const data = await response.json() as { response: string };
    return data.response;
}

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
    if (!apiKey) {
        throw new Error('OpenAI API key not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI error: ${response.statusText}`);
    }
    
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
}

async function callGoogleAI(apiKey: string, model: string, prompt: string): Promise<string> {
    if (!apiKey) {
        throw new Error('Google AI API key not configured');
    }
    
    const modelId = model || 'gemini-2.0-flash';
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        }
    );
    
    if (!response.ok) {
        throw new Error(`Google AI error: ${response.statusText}`);
    }
    
    const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    return data.candidates[0]?.content?.parts[0]?.text || '';
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

function showDocumentAnalytics() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const text = editor.document.getText();
    const stats = analyzeDocument(text);
    
    const panel = vscode.window.createWebviewPanel(
        'markviewerAnalytics',
        'Document Analytics',
        vscode.ViewColumn.Beside,
        {}
    );
    
    panel.webview.html = getAnalyticsHtml(stats);
}

interface DocumentStats {
    words: number;
    characters: number;
    sentences: number;
    paragraphs: number;
    readingTime: string;
    fleschScore: number;
    fleschGrade: string;
    headings: number;
    links: number;
    images: number;
    codeBlocks: number;
}

function analyzeDocument(text: string): DocumentStats {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const characters = text.length;
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    const readingMinutes = Math.ceil(words / 200);
    
    // Flesch Reading Ease
    const syllables = countSyllables(text);
    const flesch = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    
    let grade = 'College Graduate';
    if (flesch >= 90) grade = '5th Grade';
    else if (flesch >= 80) grade = '6th Grade';
    else if (flesch >= 70) grade = '7th Grade';
    else if (flesch >= 60) grade = '8-9th Grade';
    else if (flesch >= 50) grade = '10-12th Grade';
    else if (flesch >= 30) grade = 'College';
    
    return {
        words,
        characters,
        sentences,
        paragraphs,
        readingTime: `${readingMinutes} min`,
        fleschScore: Math.round(flesch),
        fleschGrade: grade,
        headings: (text.match(/^#{1,6}\s/gm) || []).length,
        links: (text.match(/\[.+?\]\(.+?\)/g) || []).length,
        images: (text.match(/!\[.*?\]\(.+?\)/g) || []).length,
        codeBlocks: (text.match(/```/g) || []).length / 2,
    };
}

function countSyllables(text: string): number {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    let count = 0;
    
    for (const word of words) {
        if (word.length <= 3) {
            count += 1;
            continue;
        }
        
        const vowelGroups = word.match(/[aeiouy]+/g) || [];
        let syllables = vowelGroups.length;
        
        if (word.endsWith('e') && !word.endsWith('le')) {
            syllables = Math.max(1, syllables - 1);
        }
        
        count += Math.max(1, syllables);
    }
    
    return count;
}

function getAnalyticsHtml(stats: DocumentStats): string {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: system-ui, sans-serif; 
            padding: 2rem; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        h1 { margin-bottom: 1.5rem; font-size: 1.5rem; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .stat { 
            background: var(--vscode-input-background); 
            padding: 1rem; 
            border-radius: 8px;
        }
        .stat-value { font-size: 1.5rem; font-weight: 600; }
        .stat-label { font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem; }
    </style>
</head>
<body>
    <h1>📊 Document Analytics</h1>
    <div class="grid">
        <div class="stat">
            <div class="stat-value">${stats.words}</div>
            <div class="stat-label">Words</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.characters}</div>
            <div class="stat-label">Characters</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.sentences}</div>
            <div class="stat-label">Sentences</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.paragraphs}</div>
            <div class="stat-label">Paragraphs</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.readingTime}</div>
            <div class="stat-label">Reading Time</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.fleschScore}</div>
            <div class="stat-label">Flesch Score (${stats.fleschGrade})</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.headings}</div>
            <div class="stat-label">Headings</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.links}</div>
            <div class="stat-label">Links</div>
        </div>
    </div>
</body>
</html>`;
}

function updateStatusBar(statusBarItem: vscode.StatusBarItem, editor: vscode.TextEditor | undefined) {
    const config = vscode.workspace.getConfiguration('markviewer.analytics');
    if (!config.get<boolean>('showInStatusBar', true)) {
        statusBarItem.hide();
        return;
    }
    
    if (!editor || editor.document.languageId !== 'markdown') {
        statusBarItem.hide();
        return;
    }
    
    const text = editor.document.getText();
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(words / 200);
    
    statusBarItem.text = `$(book) ${words} words · ${readingTime} min read`;
    statusBarItem.tooltip = 'Click for detailed analytics';
    statusBarItem.show();
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

async function exportAsHtml() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Please open a Markdown file first');
        return;
    }
    
    const content = editor.document.getText();
    const html = marked.parse(content) as string;
    const fullHtml = getPreviewHtml(html, 'github', 16, 1.6);
    
    const uri = await vscode.window.showSaveDialog({
        filters: { 'HTML': ['html'] },
        defaultUri: vscode.Uri.file(editor.document.fileName.replace('.md', '.html')),
    });
    
    if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(fullHtml));
        vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
    }
}

// ═══════════════════════════════════════════════════════════════
// INSERT HELPERS
// ═══════════════════════════════════════════════════════════════

function insertTable() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const table = `| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;
    
    editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, table);
    });
}

function insertCodeBlock() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const codeBlock = `\`\`\`javascript
// Your code here
\`\`\`
`;
    
    editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, codeBlock);
    });
}

function formatMarkdownDocument() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const document = editor.document;
    const text = document.getText();
    
    // Simple formatting rules
    let formatted = text
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Ensure headers have a blank line before
        .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
        // Ensure headers have a blank line after
        .replace(/(#{1,6}\s.+)\n([^#\n])/g, '$1\n\n$2')
        // Remove multiple blank lines
        .replace(/\n{3,}/g, '\n\n')
        // Trim trailing whitespace
        .replace(/[ \t]+$/gm, '');
    
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
    );
    
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, formatted);
    });
    
    vscode.window.showInformationMessage('Document formatted');
}
