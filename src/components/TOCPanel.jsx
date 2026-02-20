import { List, X } from 'lucide-react';

export default function TOCPanel({ headings, darkMode: dark, onClose, isMobile }) {
  const scrollTo = (text) => {
    const el = document.querySelector('.preview-content');
    if (!el) return;
    for (const h of el.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      if (h.textContent.trim() === text) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
    }
  };

  const panelContent = (
    <>
      <div className={`sticky top-0 flex items-center justify-between px-3 py-2.5 border-b backdrop-blur-sm
        ${dark ? 'bg-[#0d1117]/90 border-[#21262d]' : 'bg-gray-50/90 border-gray-200'}`}>
        <div className="flex items-center gap-1.5">
          <List size={14} strokeWidth={1.75} className={dark ? 'text-gray-500' : 'text-gray-400'} />
          <span className={`text-[12px] font-semibold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Contents</span>
        </div>
        <button onClick={onClose}
          className={`p-1 rounded-md transition-colors ${dark ? 'text-gray-600 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="py-2">
        {headings.length === 0 ? (
          <p className={`px-3 py-6 text-center text-[12px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>No headings found</p>
        ) : headings.map((h, i) => (
          <button key={i} onClick={() => { scrollTo(h.text); if (isMobile) onClose(); }}
            className={`w-full text-left px-3 py-1.5 text-[12px] truncate transition-colors rounded-none
              ${dark ? 'text-gray-500 hover:text-blue-400 hover:bg-white/[.03]' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50/50'}`}
            style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
            title={h.text}>
            {h.text}
          </button>
        ))}
      </div>
    </>
  );

  // On mobile, render as a full-screen overlay
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
        <div className={`fixed top-0 left-0 bottom-0 w-[75vw] max-w-[280px] z-50 overflow-y-auto
          ${dark ? 'bg-[#0d1117]' : 'bg-gray-50'}`}>
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <div className={`w-56 flex-shrink-0 border-r overflow-y-auto
      ${dark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-gray-50/60 border-gray-200'}`}>
      {panelContent}
    </div>
  );
}
