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
import { PenLine, Eye } from 'lucide-react';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

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

  const isMobile = useIsMobile();
  const editorRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const [stats, setStats] = useState({ lines: 0, words: 0, chars: 0 });
  const [headings, setHeadings] = useState([]);
  const [splitRatio, setSplitRatio] = useState(settings.splitRatio || 50);
  const [isResizing, setIsResizing] = useState(false);
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [mobileTab, setMobileTab] = useState('editor');

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

  // On mobile, force single-pane based on mobileTab when in split mode
  const mobileShowEditor = isMobile
    ? (viewMode === 'editor' || (viewMode === 'split' && mobileTab === 'editor'))
    : showEditor;
  const mobileShowPreview = isMobile
    ? (viewMode === 'preview' || (viewMode === 'split' && mobileTab === 'preview'))
    : showPreview;
  const showMobileTabBar = isMobile && viewMode === 'split';

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
        isMobile={isMobile}
      />

      {/* Toolbar */}
      {mobileShowEditor && (
        <Toolbar editorRef={editorRef} darkMode={dark} />
      )}

      {/* Mobile Tab Bar */}
      {showMobileTabBar && (
        <div className={`mobile-tab-bar border-b ${dark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={() => setMobileTab('editor')}
            className={`${mobileTab === 'editor'
              ? dark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
              : dark ? 'text-gray-500' : 'text-gray-400'}`}
          >
            <PenLine size={14} strokeWidth={1.75} />
            Editor
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`${mobileTab === 'preview'
              ? dark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
              : dark ? 'text-gray-500' : 'text-gray-400'}`}
          >
            <Eye size={14} strokeWidth={1.75} />
            Preview
          </button>
        </div>
      )}

      {/* Main Content */}
      <div id="split-container" className="flex-1 flex overflow-hidden relative">
        {/* TOC Panel */}
        {showTOC && (
          <TOCPanel
            headings={headings}
            darkMode={dark}
            onClose={() => setShowTOC(false)}
            isMobile={isMobile}
          />
        )}

        {/* Editor */}
        {mobileShowEditor && (
          <div
            ref={editorWrapperRef}
            className={`overflow-hidden ${dark ? 'bg-slate-900' : 'bg-white'}`}
            style={{
              width: (!isMobile && viewMode === 'split') ? `${splitRatio}%` : '100%',
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
        {!isMobile && viewMode === 'split' && (
          <div
            className={`resizer ${isResizing ? 'active' : ''}`}
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Preview */}
        {mobileShowPreview && (
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
      <StatusBar stats={stats} settings={settings} darkMode={dark} isMobile={isMobile} />

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
