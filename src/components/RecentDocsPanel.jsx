import { Clock, X, FileText } from 'lucide-react';

export default function RecentDocsPanel({ docs, darkMode: dark, onClose, onOpen }) {
  const openDoc = (doc) => { onOpen(doc.content); onClose(); };

  const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className={`drawer-panel ${dark ? 'bg-[#0d1117] border-l border-[#21262d]' : 'bg-white border-l border-gray-200'}`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Clock size={16} strokeWidth={1.75} className={dark ? 'text-gray-400' : 'text-gray-500'} />
              <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Recent Documents</h2>
            </div>
            <button onClick={onClose} className={`drawer-close-btn ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {docs.length === 0 ? (
            <div className={`flex flex-col items-center py-16 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              <FileText size={32} strokeWidth={1.25} className="mb-3 opacity-40" />
              <p className="text-[13px]">No recent documents</p>
            </div>
          ) : (
            <div className="space-y-1">
              {docs.map((doc, i) => (
                <button key={i} onClick={() => openDoc(doc)}
                  className={`w-full text-left p-3 rounded-lg transition-colors
                    ${dark ? 'hover:bg-white/[.04]' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[13px] font-medium truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{doc.title}</span>
                    <span className={`text-[11px] flex-shrink-0 ml-3 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{timeAgo(doc.timestamp)}</span>
                  </div>
                  <p className={`text-[12px] line-clamp-2 leading-relaxed ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{doc.preview}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
