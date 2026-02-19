import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppState } from './hooks/useAppState';
import Navbar from './components/Navbar';
import Toolbar from './components/Toolbar';
import MarkdownEditor from './components/MarkdownEditor';
import MarkdownPreview from './components/MarkdownPreview';
import StatusBar from './components/StatusBar';
import SettingsPanel from './components/SettingsPanel';
import CheatsheetPanel from './components/CheatsheetPanel';
import ShortcutsPanel from './components/ShortcutsPanel';
import TOCPanel from './components/TOCPanel';
import RecentDocsPanel from './components/RecentDocsPanel';

export default function App() {
  const state = useAppState();
  const {
    content, updateContent, settings, updateSettings,
    lastSaved, hasUnsavedChanges, saveNow,
    newDocument, addToRecent, getShareUrl,
    recentDocs, setContent,
    showCheatsheet, setShowCheatsheet,
    showShortcuts, setShowShortcuts,
    showSettings, setShowSettings,
    showTOC, setShowTOC,
    showRecentDocs, setShowRecentDocs,
    presentationMode, setPresentationMode,
  } = state;

  const editorRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const [stats, setStats] = useState({ lines: 0, words: 0, chars: 0 });
  const [headings, setHeadings] = useState([]);
  const [splitRatio, setSplitRatio] = useState(settings.splitRatio || 50);
  const [isResizing, setIsResizing] = useState(false);
  const [debouncedContent, setDebouncedContent] = useState(content);

  // Debounce content for preview (150ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(content), 150);
    return () => clearTimeout(timer);
  }, [content]);

  // Synchronized scrolling
  useEffect(() => {
    if (!settings.autoScroll || settings.viewMode !== 'split') return;

    const editorEl = editorWrapperRef.current;
    const previewEl = previewWrapperRef.current;
    if (!editorEl || !previewEl) return;

    const editorScroller = editorEl.querySelector('.cm-scroller');
    const previewScroller = previewEl.querySelector('[data-scroll-target="preview"]');
    if (!editorScroller || !previewScroller) return;

    let scrollSource = null;
    let scrollTimeout = null;

    const syncScroll = (source, target, which) => {
      if (scrollSource && scrollSource !== which) return;
      scrollSource = which;
      clearTimeout(scrollTimeout);
      const maxScroll = source.scrollHeight - source.clientHeight;
      const ratio = maxScroll > 0 ? source.scrollTop / maxScroll : 0;
      target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
      scrollTimeout = setTimeout(() => { scrollSource = null; }, 80);
    };

    const onEditorScroll = () => syncScroll(editorScroller, previewScroller, 'editor');
    const onPreviewScroll = () => syncScroll(previewScroller, editorScroller, 'preview');

    editorScroller.addEventListener('scroll', onEditorScroll, { passive: true });
    previewScroller.addEventListener('scroll', onPreviewScroll, { passive: true });

    return () => {
      editorScroller.removeEventListener('scroll', onEditorScroll);
      previewScroller.removeEventListener('scroll', onPreviewScroll);
      clearTimeout(scrollTimeout);
    };
  }, [settings.autoScroll, settings.viewMode, debouncedContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
      // Ctrl+Shift+K: Toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        updateSettings({ darkMode: !settings.darkMode });
      }
      // Escape: Exit zen/focus/presentation mode
      if (e.key === 'Escape') {
        if (settings.zenMode) updateSettings({ zenMode: false });
        if (settings.focusMode) updateSettings({ focusMode: false });
        if (presentationMode) setPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNow, settings.darkMode, settings.zenMode, settings.focusMode, presentationMode, updateSettings, setPresentationMode]);

  // Resizable split pane
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startRatio = splitRatio;

    const handleMouseMove = (e) => {
      const container = document.getElementById('split-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.max(20, Math.min(80, newRatio)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [splitRatio]);

  // Presentation mode
  if (presentationMode) {
    return (
      <div className={`fixed inset-0 z-50 overflow-auto ${
        settings.darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        <button
          onClick={() => setPresentationMode(false)}
          className="fixed top-4 right-4 z-50 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
        >
          Exit Presentation
        </button>
        <div className="max-w-4xl mx-auto p-8">
          <MarkdownPreview content={debouncedContent} settings={settings} />
        </div>
      </div>
    );
  }

  const dark = settings.darkMode;
  const { viewMode, zenMode, focusMode } = settings;

  // Zen mode: just the editor, fullscreen
  if (zenMode) {
    return (
      <div className={`zen-mode flex flex-col ${dark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex-1 max-w-3xl mx-auto w-full">
          <MarkdownEditor
            content={content}
            onChange={updateContent}
            settings={settings}
            onStats={setStats}
            editorRef={editorRef}
          />
        </div>
        <div className={`text-center py-2 text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
          Press <kbd className="px-1 border rounded">Esc</kbd> to exit Zen Mode
        </div>
      </div>
    );
  }

  const showEditor = viewMode === 'split' || viewMode === 'editor';
  const showPreview = viewMode === 'split' || viewMode === 'preview';

  return (
    <div className={`h-full flex flex-col ${dark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'} ${
      focusMode ? 'focus-mode' : ''
    }`}>
      {/* Navbar */}
      <Navbar
        settings={settings}
        updateSettings={updateSettings}
        saveNow={saveNow}
        newDocument={newDocument}
        getShareUrl={getShareUrl}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSaved={lastSaved}
        content={content}
        setContent={setContent}
        addToRecent={addToRecent}
        setShowCheatsheet={setShowCheatsheet}
        setShowShortcuts={setShowShortcuts}
        setShowSettings={setShowSettings}
        setShowTOC={setShowTOC}
        setShowRecentDocs={setShowRecentDocs}
        setPresentationMode={setPresentationMode}
      />

      {/* Toolbar */}
      {showEditor && (
        <Toolbar editorRef={editorRef} darkMode={dark} />
      )}

      {/* Main Content */}
      <div id="split-container" className="flex-1 flex overflow-hidden relative">
        {/* TOC Panel */}
        {showTOC && (
          <TOCPanel
            headings={headings}
            darkMode={dark}
            onClose={() => setShowTOC(false)}
          />
        )}

        {/* Editor */}
        {showEditor && (
          <div
            ref={editorWrapperRef}
            className={`overflow-hidden ${dark ? 'bg-slate-900' : 'bg-white'}`}
            style={{
              width: viewMode === 'split' ? `${splitRatio}%` : '100%',
              flexShrink: 0,
            }}
          >
            <MarkdownEditor
              content={content}
              onChange={updateContent}
              settings={settings}
              onStats={setStats}
              editorRef={editorRef}
            />
          </div>
        )}

        {/* Resizer */}
        {viewMode === 'split' && (
          <div
            className={`resizer ${isResizing ? 'active' : ''}`}
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Preview */}
        {showPreview && (
          <div ref={previewWrapperRef} className="flex-1 overflow-hidden">
            <MarkdownPreview
              content={debouncedContent}
              settings={settings}
              onTOC={setHeadings}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar stats={stats} settings={settings} darkMode={dark} />

      {/* Panels / Drawers */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          updateSettings={updateSettings}
          darkMode={dark}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showCheatsheet && (
        <CheatsheetPanel
          darkMode={dark}
          onClose={() => setShowCheatsheet(false)}
        />
      )}
      {showShortcuts && (
        <ShortcutsPanel
          darkMode={dark}
          onClose={() => setShowShortcuts(false)}
        />
      )}
      {showRecentDocs && (
        <RecentDocsPanel
          docs={recentDocs}
          darkMode={dark}
          onClose={() => setShowRecentDocs(false)}
          onOpen={setContent}
        />
      )}
    </div>
  );
}
