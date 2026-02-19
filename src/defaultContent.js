export const DEFAULT_MARKDOWN = `# 🚀 Welcome to MarkViewer

> A beautiful, real-time Markdown editor with live preview. Start typing to see the magic!

---

## ✨ Features Showcase

### Text Formatting

You can write **bold text**, *italic text*, ~~strikethrough~~, and \`inline code\`.

You can also combine them: ***bold and italic***, **~~bold strikethrough~~**.

### Links & Images

- [Visit GitHub](https://github.com)
- [MarkViewer Documentation](#)

![Sample Image](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop)

---

## 📋 Lists

### Ordered List
1. First item
2. Second item
3. Third item
   1. Nested item
   2. Another nested item

### Unordered List
- Item one
- Item two
  - Sub-item A
  - Sub-item B
- Item three

### Task List
- [x] Create the Markdown editor
- [x] Add live preview
- [x] Syntax highlighting for code blocks
- [ ] Add collaborative editing
- [ ] Mobile app version

---

## 📊 Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Live Preview | ✅ Done | High |
| Dark Mode | ✅ Done | High |
| Export PDF | ✅ Done | Medium |
| Vim Mode | ✅ Done | Low |
| Mermaid Diagrams | ✅ Done | Medium |

---

## 💻 Code Blocks

### JavaScript
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Generate first 10 Fibonacci numbers
const sequence = Array.from({ length: 10 }, (_, i) => fibonacci(i));
console.log(sequence); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

### Python
\`\`\`python
class MarkdownParser:
    def __init__(self, text):
        self.text = text
        self.tokens = []

    def parse(self):
        for line in self.text.split('\\n'):
            if line.startswith('# '):
                self.tokens.append(('h1', line[2:]))
            elif line.startswith('## '):
                self.tokens.append(('h2', line[3:]))
        return self.tokens
\`\`\`

### Shell
\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

---

## 💡 Blockquotes

> "The best way to predict the future is to invent it."
> — Alan Kay

> **Note:** MarkViewer supports nested blockquotes too!
>
> > This is a nested blockquote. You can go as deep as you want.

---

## 🔢 Math Equations (KaTeX)

Inline math: $E = mc^2$

The quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Display math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

---

## 📈 Mermaid Diagrams

### Flowchart
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Ship it! 🚀]
\`\`\`

### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Editor
    participant Preview
    User->>Editor: Types Markdown
    Editor->>Preview: Renders HTML
    Preview-->>User: Shows formatted output
\`\`\`

---

## 🌿 PlantUML Diagrams

### Class Diagram
\`\`\`plantuml
@startuml
skinparam style strictuml
skinparam classAttributeIconSize 0

class MarkdownEditor {
  - content: String
  - settings: Settings
  + render(): HTML
  + save(): void
}

class Preview {
  + update(html: String): void
}

class Settings {
  + darkMode: Boolean
  + fontSize: Number
}

MarkdownEditor --> Preview : renders
MarkdownEditor --> Settings : uses
@enduml
\`\`\`

### Sequence Diagram
\`\`\`plantuml
@startuml
actor User
participant "Editor" as E
participant "Preview" as P

User -> E: Types Markdown
E -> P: Renders HTML
P --> User: Shows output
@enduml
\`\`\`

---

## 📌 Footnotes

Here's a sentence with a footnote[^1] and another one[^2].

[^1]: This is the first footnote content.
[^2]: This is the second footnote with more detail.

---

## 🎯 Horizontal Rules

You can create horizontal rules with three or more dashes:

---

Or with asterisks:

***

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+S\` | Save document |
| \`Ctrl+H\` | Find & Replace |
| \`Ctrl+B\` | Bold |
| \`Ctrl+I\` | Italic |
| \`Ctrl+Shift+K\` | Toggle dark mode |

---

*Made with ❤️ using MarkViewer — the ultimate Markdown editing experience.*
`;
