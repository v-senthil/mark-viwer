import { useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULT_MARKDOWN } from '../defaultContent';
import LZString from 'lz-string';

const STORAGE_KEY = 'markviewer_content';
const SETTINGS_KEY = 'markviewer_settings';
const RECENT_KEY = 'markviewer_recent';
const AUTOSAVE_INTERVAL = 30000;

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
  splitRatio: 50,
};

function loadFromHash() {
  try {
    const hash = window.location.hash.slice(1);
    if (hash && hash.startsWith('doc=')) {
      const compressed = hash.slice(4);
      const decoded = LZString.decompressFromEncodedURIComponent(compressed);
      if (decoded) return decoded;
    }
  } catch (e) {
    console.warn('Failed to load from URL:', e);
  }
  return null;
}

function loadContent() {
  const fromHash = loadFromHash();
  if (fromHash) {
    window.history.replaceState(null, '', window.location.pathname);
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
  const contentRef = useRef(content);

  useEffect(() => { contentRef.current = content; }, [content]);

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

  // Autosave
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(STORAGE_KEY, contentRef.current);
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const updateContent = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettingsRaw(prev => ({ ...prev, ...updates }));
  }, []);

  const saveNow = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, contentRef.current);
    setLastSaved(Date.now());
    setHasUnsavedChanges(false);
  }, []);

  const addToRecent = useCallback((title, content) => {
    const entry = {
      title: title || 'Untitled',
      preview: content.slice(0, 100),
      content,
      timestamp: Date.now(),
    };
    setRecentDocs(prev => {
      const next = [entry, ...prev.filter(d => d.title !== title)].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const newDocument = useCallback(() => {
    if (hasUnsavedChanges) {
      const firstLine = contentRef.current.split('\n')[0].replace(/^#+\s*/, '') || 'Untitled';
      addToRecent(firstLine, contentRef.current);
    }
    setContent('# Untitled Document\n\nStart writing here...\n');
    saveNow();
  }, [hasUnsavedChanges, addToRecent, saveNow]);

  const getShareUrl = useCallback(() => {
    const compressed = LZString.compressToEncodedURIComponent(contentRef.current);
    return `${window.location.origin}${window.location.pathname}#doc=${compressed}`;
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
  };
}
