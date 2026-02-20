/**
 * FileTabs — horizontal file tab bar
 *
 * Features:
 * - Drag-to-reorder
 * - Unsaved dot indicator
 * - Close buttons
 * - Active tab highlight
 * - Scroll overflow with arrows
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

function Tab({ tab, active, dark, unsaved, onActivate, onClose, onDragStart, onDragOver, onDrop }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(tab.id); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(tab.id); }}
      onDrop={(e) => { e.preventDefault(); onDrop(tab.id); }}
      onClick={() => onActivate(tab.id)}
      className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none
        border-r whitespace-nowrap min-w-0 max-w-[160px] text-[11px] transition-colors
        ${active
          ? dark
            ? 'bg-[#0d1117] text-white border-[#21262d] border-b-transparent'
            : 'bg-white text-gray-900 border-gray-200 border-b-transparent'
          : dark
            ? 'bg-[#161b22] text-gray-500 border-[#21262d] hover:text-gray-300 hover:bg-[#1c2128]'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-gray-700 hover:bg-gray-100'
        }`}
      title={tab.path || tab.name}
    >
      <FileText size={11} className={`flex-shrink-0 ${active ? (dark ? 'text-blue-400' : 'text-blue-500') : ''}`} />
      <span className="truncate flex-1">{tab.name}</span>
      {unsaved && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" title="Unsaved changes" />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
        aria-label={`Close ${tab.name}`}
        className={`flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity
          ${dark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
      >
        <X size={10} />
      </button>
    </div>
  );
}

export default function FileTabs({
  tabs,           // Array<{ id, name, path }>
  activeTabId,    // string | null
  unsavedIds,     // Set<string>
  darkMode: dark,
  onActivate,     // (id) => void
  onClose,        // (id) => void
  onReorder,      // (newTabs) => void
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragRef = useRef(null);

  // Check scroll overflow
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, tabs]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  // Drag and drop reorder
  const handleDragStart = (id) => { dragRef.current = id; };
  const handleDragOver = (id) => { /* visual feedback could go here */ };
  const handleDrop = (targetId) => {
    const sourceId = dragRef.current;
    if (!sourceId || sourceId === targetId) return;
    const newTabs = [...tabs];
    const srcIdx = newTabs.findIndex(t => t.id === sourceId);
    const tgtIdx = newTabs.findIndex(t => t.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const [moved] = newTabs.splice(srcIdx, 1);
    newTabs.splice(tgtIdx, 0, moved);
    onReorder(newTabs);
    dragRef.current = null;
  };

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={`flex items-stretch border-b relative
      ${dark ? 'bg-[#161b22] border-[#21262d]' : 'bg-gray-50 border-gray-200'}`}
      style={{ height: 30 }}>

      {/* Left scroll button */}
      {canScrollLeft && (
        <button onClick={() => scroll(-1)} aria-label="Scroll tabs left"
          className={`flex-shrink-0 px-1 z-10 border-r
            ${dark ? 'bg-[#161b22] border-[#21262d] text-gray-500 hover:text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'}`}>
          <ChevronLeft size={12} />
        </button>
      )}

      {/* Tabs */}
      <div ref={scrollRef}
        className="flex-1 flex overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <div key={tab.id} data-tab-id={tab.id}>
            <Tab
              tab={tab}
              active={tab.id === activeTabId}
              dark={dark}
              unsaved={unsavedIds?.has(tab.id)}
              onActivate={onActivate}
              onClose={onClose}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          </div>
        ))}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button onClick={() => scroll(1)} aria-label="Scroll tabs right"
          className={`flex-shrink-0 px-1 z-10 border-l
            ${dark ? 'bg-[#161b22] border-[#21262d] text-gray-500 hover:text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'}`}>
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}
