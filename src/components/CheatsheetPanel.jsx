import { BookOpen, X } from 'lucide-react';

const sections = [
  { title: 'Text Formatting', items: [
    { syntax: '**bold**', desc: 'Bold' },
    { syntax: '_italic_', desc: 'Italic' },
    { syntax: '~~strike~~', desc: 'Strikethrough' },
    { syntax: '`code`', desc: 'Inline code' },
  ]},
  { title: 'Headings', items: [
    { syntax: '# H1', desc: 'Heading 1' },
    { syntax: '## H2', desc: 'Heading 2' },
    { syntax: '### H3', desc: 'Heading 3' },
  ]},
  { title: 'Lists', items: [
    { syntax: '- item', desc: 'Unordered' },
    { syntax: '1. item', desc: 'Ordered' },
    { syntax: '- [ ] task', desc: 'Task list' },
  ]},
  { title: 'Links & Media', items: [
    { syntax: '[text](url)', desc: 'Link' },
    { syntax: '![alt](url)', desc: 'Image' },
  ]},
  { title: 'Blocks', items: [
    { syntax: '> quote', desc: 'Blockquote' },
    { syntax: '```lang ...```', desc: 'Code block' },
    { syntax: '---', desc: 'Horizontal rule' },
  ]},
  { title: 'Tables', items: [
    { syntax: '| H | H |', desc: 'Table header' },
    { syntax: '|---|---|', desc: 'Table divider' },
  ]},
  { title: 'Extensions', items: [
    { syntax: '$E=mc^2$', desc: 'Inline math' },
    { syntax: '$$...$$', desc: 'Block math' },
    { syntax: '```mermaid```', desc: 'Diagram' },
    { syntax: '[^1]', desc: 'Footnote' },
  ]},
];

export default function CheatsheetPanel({ darkMode: dark, onClose }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className={`drawer-panel ${dark ? 'bg-[#0d1117] border-l border-[#21262d]' : 'bg-white border-l border-gray-200'}`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <BookOpen size={16} strokeWidth={1.75} className={dark ? 'text-gray-400' : 'text-gray-500'} />
              <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Markdown Cheatsheet</h2>
            </div>
            <button onClick={onClose} className={`drawer-close-btn ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="space-y-4">
            {sections.map(sec => (
              <div key={sec.title}>
                <h3 className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{sec.title}</h3>
                <div className={`rounded-lg border overflow-hidden ${dark ? 'border-[#21262d]' : 'border-gray-100'}`}>
                  {sec.items.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 text-[13px]
                      ${i > 0 ? (dark ? 'border-t border-[#21262d]' : 'border-t border-gray-50') : ''}
                      ${dark ? 'hover:bg-white/[.02]' : 'hover:bg-gray-50/50'}`}>
                      <code className={`font-mono text-[12px] ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{item.syntax}</code>
                      <span className={dark ? 'text-gray-500' : 'text-gray-500'}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
