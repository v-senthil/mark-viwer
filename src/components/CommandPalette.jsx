import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Command, ArrowUp, ArrowDown, CornerDownLeft, X } from 'lucide-react';
import { extractSymbols, searchAll, PALETTE_COMMANDS } from '../lib/navigation';
import { listFiles } from '../lib/storage';

// Icon mapping for symbol types
const symbolIcons = {
  heading: '📑',
  code: '💻',
  link: '🔗',
  image: '🖼️',
  table: '📊',
  task: '✅',
  footnote: '📎',
};

// Icon mapping for command categories
const categoryColors = {
  View: 'text-blue-500',
  Theme: 'text-purple-500',
  Mode: 'text-green-500',
  Editor: 'text-yellow-500',
  Panel: 'text-cyan-500',
  Help: 'text-gray-500',
  File: 'text-orange-500',
  Share: 'text-pink-500',
};

function ResultItem({ item, selected, onSelect, darkMode }) {
  const isCommand = item.type === 'command';
  
  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selected
          ? darkMode
            ? 'bg-blue-500/20 text-white'
            : 'bg-blue-50 text-blue-900'
          : darkMode
            ? 'hover:bg-slate-800 text-slate-300'
            : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0">
        {isCommand ? '⚡' : item.icon || symbolIcons[item.type] || '📄'}
      </span>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`truncate ${selected ? 'font-medium' : ''}`}>
            {item.label || item.text}
          </span>
          {item.level && (
            <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              H{item.level}
            </span>
          )}
        </div>
        {isCommand && item.category && (
          <span className={`text-xs ${categoryColors[item.category] || 'text-gray-500'}`}>
            {item.category}
          </span>
        )}
        {!isCommand && item.line && (
          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            Line {item.line}
          </span>
        )}
      </div>
      
      {/* Keyboard hint when selected */}
      {selected && (
        <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
          <CornerDownLeft size={12} />
        </span>
      )}
    </button>
  );
}

export default function CommandPalette({
  isOpen,
  onClose,
  content,
  darkMode,
  // Handlers for commands
  onCommand,
  onNavigateToLine,
  onOpenFile,       // (fileMeta) => void — open workspace file
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  
  // Extract symbols from content
  const symbols = useMemo(() => extractSymbols(content || ''), [content]);
  
  // Workspace files for search
  const wsFiles = useMemo(() => {
    try { return listFiles(); } catch { return []; }
  }, [isOpen]);

  // Search results
  const results = useMemo(() => {
    // Handle :lineNumber navigation
    const lineMatch = query.match(/^:(\d+)$/);
    if (lineMatch) {
      const lineNum = parseInt(lineMatch[1], 10);
      return [{
        type: 'symbol',
        text: `Go to line ${lineNum}`,
        line: lineNum,
        kind: 'line',
        score: 100,
      }];
    }
    if (!query.trim()) {
      // Show recent/popular commands when empty
      return PALETTE_COMMANDS.slice(0, 8).map(cmd => ({
        type: 'command',
        ...cmd,
        score: 0,
      }));
    }
    const commandAndSymbol = searchAll(query, symbols);
    // Search workspace files by name
    const q = query.toLowerCase();
    const fileResults = wsFiles
      .filter(f => f.name?.toLowerCase().includes(q) || f.title?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(f => ({
        type: 'file',
        text: f.title || f.name,
        label: f.name,
        icon: '📄',
        meta: f,
        score: f.name?.toLowerCase().startsWith(q) ? 90 : 70,
      }));
    return [...fileResults, ...commandAndSymbol].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [query, symbols, wsFiles]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex];
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);
  
  const handleSelect = useCallback((item) => {
    if (item.type === 'command') {
      onCommand?.(item.id);
    } else if (item.type === 'file') {
      onOpenFile?.(item.meta);
    } else {
      // Navigate to line
      onNavigateToLine?.(item.line);
    }
    onClose();
  }, [onCommand, onNavigateToLine, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className={`fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 rounded-xl shadow-2xl border overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          darkMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <Search size={18} className={darkMode ? 'text-slate-500' : 'text-gray-400'} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, headings, links..."
            className={`flex-1 bg-transparent outline-none text-sm ${
              darkMode ? 'text-white placeholder:text-slate-500' : 'text-gray-900 placeholder:text-gray-400'
            }`}
          />
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Results */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className={`px-4 py-8 text-center ${
              darkMode ? 'text-slate-500' : 'text-gray-400'
            }`}>
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            results.map((item, i) => (
              <ResultItem
                key={`${item.type}-${item.id || item.line || i}`}
                item={item}
                selected={i === selectedIndex}
                onSelect={handleSelect}
                darkMode={darkMode}
              />
            ))
          )}
        </div>
        
        {/* Footer hints */}
        <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${
          darkMode ? 'border-slate-700 bg-slate-800/50 text-slate-500' : 'border-gray-100 bg-gray-50 text-gray-400'
        }`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowUp size={12} /><ArrowDown size={12} /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={12} /> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 border rounded">Esc</kbd> Close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={12} />
            <span>P</span>
          </div>
        </div>
      </div>
    </>
  );
}
