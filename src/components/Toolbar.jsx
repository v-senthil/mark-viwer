import { useCallback } from 'react';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Quote, Code, FileCode, Link, Image, Table2,
  ListOrdered, List, CheckSquare, Minus, GitBranch, Sigma, Workflow,
} from 'lucide-react';

function Btn({ icon: Icon, label, onClick, darkMode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={`group relative inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-all duration-100 flex-shrink-0
        ${darkMode
          ? 'text-gray-400 hover:text-white hover:bg-white/[.08]'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
      <Icon size={15} strokeWidth={1.75} />
    </button>
  );
}

function Sep({ darkMode }) {
  return <div className={`w-px h-4 mx-1 ${darkMode ? 'bg-[#21262d]' : 'bg-gray-200'}`} />;
}

export default function Toolbar({ editorRef, darkMode }) {
  const apply = useCallback((type, payload) => {
    const view = editorRef?.current;
    if (!view) return;
    const { state } = view;
    const { from, to } = state.selection.main;
    const selected = state.sliceDoc(from, to);

    if (type === 'wrap') {
      const { before, after } = payload;
      const text = selected || 'text';
      const insert = `${before}${text}${after}`;
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + before.length, head: from + before.length + text.length } });
    } else if (type === 'prefix') {
      const line = state.doc.lineAt(from);
      const insert = `${payload.prefix}${line.text}`;
      view.dispatch({ changes: { from: line.from, to: line.to, insert }, selection: { anchor: line.from + payload.prefix.length, head: line.from + insert.length } });
    } else if (type === 'insert') {
      const insert = payload.text;
      const cursor = payload.cursor ?? insert.length;
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + cursor } });
    }
    view.focus();
  }, [editorRef]);

  const items = [
    { I: Bold, l: 'Bold', a: () => apply('wrap', { before: '**', after: '**' }) },
    { I: Italic, l: 'Italic', a: () => apply('wrap', { before: '_', after: '_' }) },
    { I: Strikethrough, l: 'Strikethrough', a: () => apply('wrap', { before: '~~', after: '~~' }) },
    'sep',
    { I: Heading1, l: 'Heading 1', a: () => apply('prefix', { prefix: '# ' }) },
    { I: Heading2, l: 'Heading 2', a: () => apply('prefix', { prefix: '## ' }) },
    { I: Heading3, l: 'Heading 3', a: () => apply('prefix', { prefix: '### ' }) },
    { I: Heading4, l: 'Heading 4', a: () => apply('prefix', { prefix: '#### ' }) },
    { I: Heading5, l: 'Heading 5', a: () => apply('prefix', { prefix: '##### ' }) },
    { I: Heading6, l: 'Heading 6', a: () => apply('prefix', { prefix: '###### ' }) },
    'sep',
    { I: Quote, l: 'Blockquote', a: () => apply('prefix', { prefix: '> ' }) },
    { I: Code, l: 'Inline Code', a: () => apply('wrap', { before: '`', after: '`' }) },
    { I: FileCode, l: 'Code Block', a: () => apply('insert', { text: '```js\n\n```', cursor: 6 }) },
    'sep',
    { I: Link, l: 'Link', a: () => apply('insert', { text: '[text](url)', cursor: 1 }) },
    { I: Image, l: 'Image', a: () => apply('insert', { text: '![alt](url)', cursor: 2 }) },
    { I: Table2, l: 'Table', a: () => apply('insert', { text: '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n', cursor: 2 }) },
    'sep',
    { I: ListOrdered, l: 'Ordered List', a: () => apply('prefix', { prefix: '1. ' }) },
    { I: List, l: 'Unordered List', a: () => apply('prefix', { prefix: '- ' }) },
    { I: CheckSquare, l: 'Task List', a: () => apply('prefix', { prefix: '- [ ] ' }) },
    { I: Minus, l: 'Horizontal Rule', a: () => apply('insert', { text: '\n---\n' }) },
    'sep',
    { I: GitBranch, l: 'Mermaid Diagram', a: () => apply('insert', { text: '```mermaid\ngraph TD\n    A --> B\n```\n', cursor: 19 }) },
    { I: Workflow, l: 'PlantUML Diagram', a: () => apply('insert', { text: '```plantuml\n@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi\n@enduml\n```\n', cursor: 12 }) },
    { I: Sigma, l: 'Math (KaTeX)', a: () => apply('insert', { text: '$$\nE = mc^2\n$$', cursor: 3 }) },
  ];

  return (
    <div className={`flex items-center gap-0.5 px-1 sm:px-2 h-9 sm:h-10 border-b flex-shrink-0 no-print no-focus overflow-x-auto scrollbar-none
      ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-gray-100'}`}>
      {items.map((item, i) =>
        item === 'sep'
          ? <Sep key={i} darkMode={darkMode} />
          : <Btn key={i} icon={item.I} label={item.l} onClick={item.a} darkMode={darkMode} />
      )}
    </div>
  );
}
