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
import AIPanel from './components/AIPanel';
import AISettings from './components/AISettings';
import AIWidget from './components/AIWidget';
import AnalyticsPanel from './components/AnalyticsPanel';
import ThemePanel from './components/ThemePanel';
import CommandPalette from './components/CommandPalette';
import WorkspacePanel from './components/WorkspacePanel';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import FileTabs from './components/FileTabs';
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
    showAIPanel, setShowAIPanel,
    showAISettings, setShowAISettings,
    showAIWidget, setShowAIWidget,
    showAnalytics, setShowAnalytics,
    showThemes, setShowThemes,
    showCommandPalette, setShowCommandPalette,
    showWorkspace, setShowWorkspace,
    showSidebar, setShowSidebar,
    currentDocId, setCurrentDocId,
    openTabs, openFileInTab, closeTab, switchTab, reorderTabs,
    activeTabId, unsavedIds, refreshRecentDocs,
  } = state;

  const isMobile = useIsMobile();
  const editorRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const [stats, setStats] = useState({ lines: 0, words: 0, chars: 0 });
  const [capturedSelection, setCapturedSelection] = useState('');
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
      // Ctrl+Shift+A: Open AI panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setShowAIPanel(prev => !prev);
      }
      // Ctrl+Shift+D: Open Analytics panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShowAnalytics(prev => !prev);
      }
      // Ctrl+. : Toggle AI Widget
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        // Capture selection when opening
        const editor = editorRef.current;
        if (editor) {
          const selected = editor.getSelection?.() || '';
          setCapturedSelection(selected);
        } else {
          setCapturedSelection('');
        }
        setShowAIWidget(prev => !prev);
      }
      // Ctrl+P or Cmd+K: Open command palette
      if (((e.ctrlKey || e.metaKey) && e.key === 'p') || ((e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Ctrl+Shift+W: Open workspace panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        setShowWorkspace(prev => !prev);
      }
      // Ctrl+B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
      // Escape: Exit zen/focus/presentation mode or close panels
      if (e.key === 'Escape') {
        if (showCommandPalette) setShowCommandPalette(false);
        else if (showWorkspace) setShowWorkspace(false);
        else if (showThemes) setShowThemes(false);
        else if (showAnalytics) setShowAnalytics(false);
        else if (showAIWidget) setShowAIWidget(false);
        else if (showAIPanel) setShowAIPanel(false);
        else if (showAISettings) setShowAISettings(false);
        else if (settings.zenMode) updateSettings({ zenMode: false });
        else if (settings.focusMode) updateSettings({ focusMode: false });
        else if (presentationMode) setPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNow, settings.darkMode, settings.zenMode, settings.focusMode, presentationMode, updateSettings, setPresentationMode, showAIPanel, showAISettings, showAIWidget, showAnalytics, showThemes, showCommandPalette, showWorkspace, setShowAIPanel, setShowAISettings, setShowAIWidget, setShowAnalytics, setShowThemes, setShowCommandPalette, setShowWorkspace, setShowSidebar]);

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

  // Presentation mode with slide navigation
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = useMemo(() => {
    if (!presentationMode) return [];
    // Split on --- (horizontal rule) or ## headings
    return debouncedContent.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
  }, [debouncedContent, presentationMode]);

  useEffect(() => {
    if (presentationMode) setSlideIndex(0);
  }, [presentationMode]);

  useEffect(() => {
    if (!presentationMode) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setSlideIndex(i => Math.min(i + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSlideIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Escape') {
        setPresentationMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentationMode, slides.length, setPresentationMode]);

  if (presentationMode) {
    const totalSlides = slides.length || 1;
    const currentSlide = slides[slideIndex] || debouncedContent;
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${
        settings.darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {slideIndex + 1} / {totalSlides}
          </span>
          <button
            onClick={() => setPresentationMode(false)}
            className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
          >
            Exit Presentation
          </button>
        </div>
        {/* Slide content */}
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <div className="max-w-4xl w-full p-8">
            <MarkdownPreview content={currentSlide} settings={settings} />
          </div>
        </div>
        {/* Navigation controls */}
        <div className="flex items-center justify-center gap-4 py-3 flex-shrink-0">
          <button
            onClick={() => setSlideIndex(i => Math.max(i - 1, 0))}
            disabled={slideIndex === 0}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              slideIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : settings.darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ← Prev
          </button>
          <button
            onClick={() => setSlideIndex(i => Math.min(i + 1, totalSlides - 1))}
            disabled={slideIndex >= totalSlides - 1}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              slideIndex >= totalSlides - 1
                ? 'opacity-30 cursor-not-allowed'
                : settings.darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Next →
          </button>
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

  // Handler to open AI widget with captured selection
  const handleOpenAIWidget = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      const selected = editor.getSelection?.() || '';
      setCapturedSelection(selected);
    } else {
      setCapturedSelection('');
    }
    setShowAIWidget(prev => !prev);
  }, [setShowAIWidget]);

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
        setShowAIPanel={setShowAIPanel}
        onOpenAIWidget={handleOpenAIWidget}
        showAIWidget={showAIWidget}
        setShowAnalytics={setShowAnalytics}
        setShowThemes={setShowThemes}
        isMobile={isMobile}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
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

      {/* File Tabs */}
      {openTabs.length > 0 && (
        <FileTabs
          tabs={openTabs}
          activeTabId={activeTabId}
          unsavedIds={unsavedIds}
          darkMode={dark}
          onActivate={switchTab}
          onClose={closeTab}
          onReorder={reorderTabs}
        />
      )}

      {/* Main Content — sidebar + editor/preview */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Sidebar */}
        <WorkspaceSidebar
          darkMode={dark}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          activeFileId={activeTabId || currentDocId}
          onOpenFile={(meta, fileContent) => {
            openFileInTab(meta, fileContent);
          }}
          onDeleteFile={(id) => closeTab(id)}
          onNewFile={newDocument}
        />

        {/* Editor + Preview area */}
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
      {showAIPanel && (
        <AIPanel
          darkMode={dark}
          onClose={() => setShowAIPanel(false)}
          content={content}
          selectedText={editorRef.current?.getSelection?.() || ''}
          onInsertText={(text) => editorRef.current?.insertText?.(text)}
          onReplaceSelection={(text) => editorRef.current?.replaceSelection?.(text)}
          onOpenSettings={() => {
            setShowAIPanel(false);
            setShowAISettings(true);
          }}
        />
      )}
      {showAISettings && (
        <AISettings
          darkMode={dark}
          onClose={() => setShowAISettings(false)}
        />
      )}
      {showAnalytics && (
        <AnalyticsPanel
          content={content}
          darkMode={dark}
          onClose={() => setShowAnalytics(false)}
        />
      )}
      {showAIWidget && (
        <AIWidget
          darkMode={dark}
          onClose={() => setShowAIWidget(false)}
          content={content}
          selectedText={capturedSelection}
          onInsertText={(text) => {
            const view = editorRef.current;
            if (view) {
              const pos = view.state.selection.main.head;
              view.dispatch({ changes: { from: pos, insert: text } });
            }
          }}
          onReplaceSelection={(text) => {
            const view = editorRef.current;
            if (view) {
              const sel = view.state.selection.main;
              view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
            }
          }}
        />
      )}
      {showThemes && (
        <ThemePanel
          settings={settings}
          updateSettings={updateSettings}
          darkMode={dark}
          onClose={() => setShowThemes(false)}
        />
      )}
      {showWorkspace && (
        <WorkspacePanel
          darkMode={dark}
          onClose={() => setShowWorkspace(false)}
          currentDocId={currentDocId}
          onOpenDocument={(doc) => {
            openFileInTab(
              { id: doc.id, name: doc.title || 'untitled.md', path: doc.path || '', title: doc.title },
              doc.content
            );
            setShowWorkspace(false);
          }}
        />
      )}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        content={content}
        darkMode={dark}
        onCommand={(cmdId) => {
          const commandActions = {
            'view-split': () => updateSettings({ viewMode: 'split' }),
            'view-editor': () => updateSettings({ viewMode: 'editor' }),
            'view-preview': () => updateSettings({ viewMode: 'preview' }),
            'toggle-dark': () => updateSettings({ darkMode: !settings.darkMode }),
            'toggle-focus': () => updateSettings({ focusMode: !settings.focusMode }),
            'toggle-zen': () => updateSettings({ zenMode: !settings.zenMode }),
            'toggle-vim': () => updateSettings({ vimMode: !settings.vimMode }),
            'toggle-typewriter': () => updateSettings({ typewriterMode: !settings.typewriterMode }),
            'open-settings': () => setShowSettings(true),
            'open-ai': () => setShowAIPanel(true),
            'open-ai-widget': () => handleOpenAIWidget(),
            'open-analytics': () => setShowAnalytics(true),
            'open-themes': () => setShowThemes(true),
            'open-toc': () => setShowTOC(true),
            'open-cheatsheet': () => setShowCheatsheet(true),
            'open-shortcuts': () => setShowShortcuts(true),
            'open-workspace': () => setShowWorkspace(true),
            'toggle-sidebar': () => setShowSidebar(prev => !prev),
            'file-new': () => newDocument(),
            'file-save': () => saveNow(),
            'file-download': () => {
              const b = new Blob([content], { type: 'text/markdown' });
              const u = URL.createObjectURL(b);
              const a = document.createElement('a');
              a.href = u; a.download = 'document.md'; a.click();
              URL.revokeObjectURL(u);
            },
            'file-print': () => window.print(),
            'presentation': () => setPresentationMode(true),
          };
          const action = commandActions[cmdId];
          if (action) action();
        }}
        onNavigateToLine={(line) => {
          // Navigate to line in editor
          const view = editorRef.current;
          if (view && view.state) {
            const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines));
            view.dispatch({
              selection: { anchor: lineInfo.from },
              scrollIntoView: true,
            });
            view.focus();
          }
        }}
        onOpenFile={async (meta) => {
          try {
            const { readFile } = await import('./lib/storage');
            const fileContent = await readFile(meta.id);
            openFileInTab(meta, fileContent);
          } catch (e) {
            console.error('Failed to open file from palette:', e);
          }
        }}
      />
    </div>
  );
}
