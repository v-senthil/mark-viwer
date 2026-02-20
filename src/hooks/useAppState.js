import { useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULT_MARKDOWN } from '../defaultContent';
import LZString from 'lz-string';
import toast from 'react-hot-toast';
import {
  initStorage, listFiles, readFile, writeFile, deleteFile,
  getRecentFiles, pushRecent, getActiveWorkspace,
} from '../lib/storage';

const STORAGE_KEY = 'markviewer_content';
const SETTINGS_KEY = 'markviewer_settings';
const RECENT_KEY = 'markviewer_recent';
const AUTOSAVE_INTERVAL = 10000;
const TABS_KEY = 'markviewer_open_tabs';

const defaultSettings = {
  darkMode: true,
  viewMode: 'split', // 'split' | 'editor' | 'preview'
  editorFontSize: 14,
  previewFontSize: 16,
  previewLineHeight: 1.7,
  previewFontFamily: 'sans-serif',
  editorTheme: 'github',
  previewTheme: 'github',
  vimMode: false,
  focusMode: false,
  zenMode: false,
  typewriterMode: false,
  autoScroll: true,
  splitRatio: 50,
};

let _sharedLinkExpired = false;

function loadFromHash() {
  try {
    const hash = window.location.hash.slice(1);
    if (hash && hash.startsWith('doc=')) {
      const compressed = hash.slice(4);
      const decoded = LZString.decompressFromEncodedURIComponent(compressed);
      if (decoded) {
        // Try new JSON format { c: content, exp?: timestamp }
        try {
          const data = JSON.parse(decoded);
          if (data && data.c) {
            if (data.exp && Date.now() > data.exp) {
              // Link has expired — clear hash
              _sharedLinkExpired = true;
              window.history.replaceState(null, '', window.location.pathname);
              return null;
            }
            return data.c;
          }
        } catch {
          // Old format — plain compressed text, treat as permanent
          return decoded;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load from URL:', e);
  }
  return null;
}

function loadContent() {
  const fromHash = loadFromHash();
  if (fromHash) {
    // Keep the URL hash intact so the user can copy/reuse it
    return fromHash;
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved || DEFAULT_MARKDOWN;
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (e) { /* ignore */ }
  return defaultSettings;
}

function loadRecent() {
  try {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
}

export function useAppState() {
  const [content, setContent] = useState(loadContent);
  const [settings, setSettingsRaw] = useState(loadSettings);
  const [recentDocs, setRecentDocs] = useState(loadRecent);
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [showRecentDocs, setShowRecentDocs] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAIWidget, setShowAIWidget] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => {
    try { return localStorage.getItem('mv_show_sidebar') === 'true'; } catch { return false; }
  });
  const [currentDocId, setCurrentDocId] = useState(null);
  const [openTabs, setOpenTabs] = useState(() => {
    try {
      const saved = localStorage.getItem(TABS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeTabId, setActiveTabId] = useState(() => {
    try { return localStorage.getItem('mv_active_tab') || null; } catch { return null; }
  });
  const [unsavedIds, setUnsavedIds] = useState(new Set());
  const [storageReady, setStorageReady] = useState(false);
  const contentRef = useRef(content);

  useEffect(() => { contentRef.current = content; }, [content]);

  // Show toast if a shared link was expired on load
  useEffect(() => {
    if (_sharedLinkExpired) {
      _sharedLinkExpired = false;
      setTimeout(() => toast.error('This shared link has expired'), 100);
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--editor-font-size', `${settings.editorFontSize}px`);
    root.style.setProperty('--preview-font-size', `${settings.previewFontSize}px`);
    root.style.setProperty('--preview-line-height', String(settings.previewLineHeight));
    const families = {
      'serif': 'Georgia, "Times New Roman", serif',
      'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'monospace': '"JetBrains Mono", "Fira Code", Consolas, monospace',
    };
    root.style.setProperty('--preview-font-family', families[settings.previewFontFamily] || families['sans-serif']);
  }, [settings.editorFontSize, settings.previewFontSize, settings.previewLineHeight, settings.previewFontFamily]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Autosave — saves to localStorage AND to OPFS/storage if a file is active
  useEffect(() => {
    const interval = setInterval(async () => {
      localStorage.setItem(STORAGE_KEY, contentRef.current);
      // Also persist to storage API if we have an active file
      if (activeTabId && storageReady) {
        const tab = openTabs.find(t => t.id === activeTabId);
        if (tab) {
          try {
            await writeFile(tab.path || tab.name, contentRef.current);
          } catch (e) {
            console.warn('Autosave to storage failed:', e);
          }
        }
      }
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
      setUnsavedIds(new Set());
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [activeTabId, openTabs, storageReady]);

  // Init storage on mount
  useEffect(() => {
    initStorage().then(() => {
      setStorageReady(true);
      // Populate recent docs from storage
      const recent = getRecentFiles(10);
      if (recent.length > 0) {
        setRecentDocs(recent.map(r => ({
          title: r.title || r.name,
          preview: r.preview || '',
          id: r.id,
          workspace: r.workspace,
          timestamp: r.modified,
        })));
      }
    }).catch(e => console.error('Storage init failed:', e));
  }, []);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('mv_show_sidebar', showSidebar ? 'true' : 'false');
  }, [showSidebar]);

  // Persist open tabs
  useEffect(() => {
    localStorage.setItem(TABS_KEY, JSON.stringify(openTabs));
  }, [openTabs]);

  // Persist active tab
  useEffect(() => {
    if (activeTabId) localStorage.setItem('mv_active_tab', activeTabId);
  }, [activeTabId]);

  const updateContent = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    if (activeTabId) {
      setUnsavedIds(prev => new Set(prev).add(activeTabId));
    }
  }, [activeTabId]);

  const updateSettings = useCallback((updates) => {
    setSettingsRaw(prev => ({ ...prev, ...updates }));
  }, []);

  const saveNow = useCallback(async () => {
    localStorage.setItem(STORAGE_KEY, contentRef.current);
    // Persist to storage API if a file is active
    if (activeTabId && storageReady) {
      const tab = openTabs.find(t => t.id === activeTabId);
      if (tab) {
        try {
          await writeFile(tab.path || tab.name, contentRef.current);
        } catch (e) {
          console.warn('Save to storage failed:', e);
        }
      }
    }
    setLastSaved(Date.now());
    setHasUnsavedChanges(false);
    if (activeTabId) {
      setUnsavedIds(prev => {
        const n = new Set(prev);
        n.delete(activeTabId);
        return n;
      });
    }
  }, [activeTabId, openTabs, storageReady]);

  const addToRecent = useCallback((title, content) => {
    const entry = {
      title: title || 'Untitled',
      preview: content.slice(0, 100),
      content,
      timestamp: Date.now(),
    };
    setRecentDocs(prev => {
      const next = [entry, ...prev.filter(d => d.title !== title)].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Tab / File management helpers ─────────────────────
  const openFileInTab = useCallback((meta, fileContent) => {
    setContent(fileContent);
    setCurrentDocId(meta.id);
    setActiveTabId(meta.id);
    // Ensure tab exists
    setOpenTabs(prev => {
      if (prev.some(t => t.id === meta.id)) return prev;
      return [...prev, { id: meta.id, name: meta.name || meta.title || 'untitled.md', path: meta.path || '' }];
    });
    // Add to recent
    addToRecent(meta.title || meta.name, fileContent);
  }, [addToRecent]);

  const closeTab = useCallback(async (id) => {
    // If unsaved, save automatically
    if (unsavedIds.has(id) && storageReady) {
      const tab = openTabs.find(t => t.id === id);
      if (tab && id === activeTabId) {
        try { await writeFile(tab.path || tab.name, contentRef.current); } catch { /* ignore */ }
      }
    }
    setOpenTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (id === activeTabId) {
        // Switch to adjacent tab
        const idx = prev.findIndex(t => t.id === id);
        const next = filtered[Math.min(idx, filtered.length - 1)];
        if (next) {
          setActiveTabId(next.id);
          setCurrentDocId(next.id);
          // Load that file's content
          readFile(next.id).then(c => setContent(c)).catch(() => {});
        } else {
          setActiveTabId(null);
          setCurrentDocId(null);
          setContent(loadContent());
        }
      }
      return filtered;
    });
    setUnsavedIds(prev => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, [activeTabId, openTabs, unsavedIds, storageReady]);

  const switchTab = useCallback(async (id) => {
    if (id === activeTabId) return;
    // Auto-save current tab before switching
    if (activeTabId && unsavedIds.has(activeTabId) && storageReady) {
      const tab = openTabs.find(t => t.id === activeTabId);
      if (tab) {
        try { await writeFile(tab.path || tab.name, contentRef.current); } catch { /* ignore */ }
      }
    }
    setActiveTabId(id);
    setCurrentDocId(id);
    try {
      const fileContent = await readFile(id);
      setContent(fileContent);
    } catch (e) {
      console.warn('Failed to read tab file:', e);
    }
  }, [activeTabId, openTabs, unsavedIds, storageReady]);

  const reorderTabs = useCallback((newTabs) => {
    setOpenTabs(newTabs);
  }, []);

  const refreshRecentDocs = useCallback(() => {
    const recent = getRecentFiles(10);
    setRecentDocs(recent.map(r => ({
      title: r.title || r.name,
      preview: r.preview || '',
      content: null, // loaded on demand
      id: r.id,
      workspace: r.workspace,
      timestamp: r.modified,
    })));
  }, []);

  const newDocument = useCallback(() => {
    if (hasUnsavedChanges) {
      const firstLine = contentRef.current.split('\n')[0].replace(/^#+\s*/, '') || 'Untitled';
      addToRecent(firstLine, contentRef.current);
    }
    setContent('# Untitled Document\n\nStart writing here...\n');
    saveNow();
  }, [hasUnsavedChanges, addToRecent, saveNow]);

  const getShareUrl = useCallback((validityMs = null) => {
    const payload = validityMs
      ? JSON.stringify({ c: contentRef.current, exp: Date.now() + validityMs })
      : JSON.stringify({ c: contentRef.current });
    const compressed = LZString.compressToEncodedURIComponent(payload);
    const url = `${window.location.origin}${window.location.pathname}#doc=${compressed}`;
    // Update the current page URL hash as well
    window.history.replaceState(null, '', `#doc=${compressed}`);
    return url;
  }, []);

  return {
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
    // New workspace/tabs state
    openTabs, setOpenTabs,
    activeTabId, setActiveTabId,
    unsavedIds,
    storageReady,
    openFileInTab,
    closeTab,
    switchTab,
    reorderTabs,
    refreshRecentDocs,
  };
}
