import { Keyboard, X } from 'lucide-react';

const groups = [
  { title: 'General', items: [
    { keys: ['⌘', 'S'], desc: 'Save document' },
    { keys: ['⌘', 'N'], desc: 'New document' },
    { keys: ['⌘', 'O'], desc: 'Open file' },
    { keys: ['⌘', '/'], desc: 'Keyboard shortcuts' },
    { keys: ['⌘', '⇧', 'K'], desc: 'Toggle dark mode' },
    { keys: ['⌘', '⇧', 'A'], desc: 'AI Assistant' },
    { keys: ['Esc'], desc: 'Exit current mode' },
  ]},
  { title: 'Formatting', items: [
    { keys: ['⌘', 'B'], desc: 'Bold' },
    { keys: ['⌘', 'I'], desc: 'Italic' },
    { keys: ['⌘', '⇧', 'X'], desc: 'Strikethrough' },
    { keys: ['⌘', 'E'], desc: 'Inline code' },
  ]},
  { title: 'View', items: [
    { keys: ['⌘', '1'], desc: 'Split view' },
    { keys: ['⌘', '2'], desc: 'Editor only' },
    { keys: ['⌘', '3'], desc: 'Preview only' },
  ]},
];

export default function ShortcutsPanel({ darkMode: dark, onClose }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className={`drawer-panel ${dark ? 'bg-[#0d1117] border-l border-[#21262d]' : 'bg-white border-l border-gray-200'}`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Keyboard size={16} strokeWidth={1.75} className={dark ? 'text-gray-400' : 'text-gray-500'} />
              <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Keyboard Shortcuts</h2>
            </div>
            <button onClick={onClose} className={`drawer-close-btn ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="space-y-4">
            {groups.map(g => (
              <div key={g.title}>
                <h3 className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{g.title}</h3>
                <div className={`rounded-lg border overflow-hidden ${dark ? 'border-[#21262d]' : 'border-gray-100'}`}>
                  {g.items.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5
                      ${i > 0 ? (dark ? 'border-t border-[#21262d]' : 'border-t border-gray-50') : ''}
                      ${dark ? 'hover:bg-white/[.02]' : 'hover:bg-gray-50/50'}`}>
                      <span className={`text-[13px] ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{item.desc}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, j) => (
                          <kbd key={j} className={`kbd-key ${dark ? 'bg-[#21262d] border-[#30363d] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>{k}</kbd>
                        ))}
                      </div>
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
