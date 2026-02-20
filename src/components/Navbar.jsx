import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { isTauri, nativeOpenFile, nativeSaveFile } from '../tauriHelpers';
import {
  FilePlus2, FolderOpen, Save, Download, FileCode2, Printer, Clock,
  Columns2, PenLine, Eye, Share2, List, BookOpen, Keyboard,
  Presentation, Target, Maximize2, Terminal, AlignCenter,
  Settings, Sun, Moon, ChevronDown, Link, Timer, ArrowUpDown,
  Menu, X, Zap,
} from 'lucide-react';

/* ── Dropdown ───────────────────────────────────────────── */
function Dropdown({ label, children, dark }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1 h-7 px-2.5 text-[13px] font-medium rounded-md transition-all
          ${open
            ? dark ? 'bg-white/[.08] text-white' : 'bg-gray-100 text-gray-900'
            : dark ? 'text-gray-400 hover:bg-white/[.06] hover:text-gray-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
        {label}
        <ChevronDown size={12} className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 min-w-[232px] rounded-xl border py-1.5 z-50 menu-enter
          ${dark ? 'bg-[#161b22] border-[#30363d] shadow-xl shadow-black/50' : 'bg-white border-gray-200 shadow-xl shadow-gray-100'}`}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/* ── Menu helpers ───────────────────────────────────────── */
function MI({ icon: Icon, label, shortcut, onClick, dark, active }) {
  return (
    <button onClick={onClick}
      className={`group w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg text-[13px] transition-colors
        ${active
          ? dark ? 'bg-blue-500/[.12] text-blue-400' : 'bg-blue-50 text-blue-600'
          : dark ? 'text-gray-300 hover:bg-white/[.06]' : 'text-gray-700 hover:bg-gray-50'}`}>
      {Icon && <Icon size={15} strokeWidth={1.75} className={active ? '' : 'opacity-40 group-hover:opacity-60'} />}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className={`text-[11px] font-mono ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{shortcut}</span>}
      {active && <div className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-blue-400' : 'bg-blue-500'}`} />}
    </button>
  );
}

function MDivider({ dark }) {
  return <div className={`my-1.5 h-px mx-3 ${dark ? 'bg-[#30363d]' : 'bg-gray-100'}`} />;
}

function MLabel({ dark, children }) {
  return <div className={`px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{children}</div>;
}

/* ── Navbar ──────────────────────────────────────────────── */
export default function Navbar({
  settings, updateSettings, saveNow, newDocument, getShareUrl,
  hasUnsavedChanges, lastSaved, content, setContent, addToRecent,
  setShowCheatsheet, setShowShortcuts, setShowSettings,
  setShowTOC, setShowRecentDocs, setPresentationMode,
  setShowAIPanel,
  isMobile,
}) {
  const fileRef = useRef(null);
  const dark = settings.darkMode;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNew = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    newDocument(); toast.success('New document created');
  }, [hasUnsavedChanges, newDocument]);

  const handleOpen = useCallback(async () => {
    if (isTauri()) {
      try {
        const result = await nativeOpenFile();
        if (result) { setContent(result.content); toast.success(`Opened ${result.name}`); }
      } catch (e) { toast.error('Failed to open file'); }
    } else {
      fileRef.current?.click();
    }
  }, [setContent]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { setContent(r.result); toast.success(`Opened ${file.name}`); };
    r.readAsText(file); e.target.value = '';
  }, [setContent]);

  const handleDownload = useCallback(async () => {
    if (isTauri()) {
      try {
        const path = await nativeSaveFile(content);
        if (path) { saveNow(); toast.success('Saved to disk'); }
      } catch (e) { toast.error('Failed to save file'); }
    } else {
      const b = new Blob([content], { type: 'text/markdown' });
      const u = URL.createObjectURL(b); const a = document.createElement('a');
      a.href = u; a.download = 'document.md'; a.click(); URL.revokeObjectURL(u);
      saveNow(); toast.success('Downloaded');
    }
  }, [content, saveNow]);

  const handleExportHTML = useCallback(() => {
    const el = document.querySelector('.preview-content'); if (!el) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Document</title><style>body{font-family:system-ui,sans-serif;max-width:768px;margin:auto;padding:2rem;line-height:1.7;color:#1e293b}pre{background:#f8fafc;padding:1rem;border-radius:8px;overflow-x:auto}code:not(pre code){background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.9em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:8px 12px}th{background:#f8fafc}blockquote{border-left:3px solid #3b82f6;padding:.5em 1em;background:#eff6ff;margin:1em 0}img{max-width:100%;border-radius:8px}a{color:#3b82f6}</style></head><body>${el.innerHTML}</body></html>`;
    const b = new Blob([html], { type: 'text/html' }); const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = 'document.html'; a.click();
    URL.revokeObjectURL(u); toast.success('Exported HTML');
  }, []);

  const handleShare = useCallback(async (validityMs = null) => {
    const url = getShareUrl(validityMs);
    try { await navigator.clipboard.writeText(url); } catch { prompt('Copy this link:', url); }
    const label = validityMs === null ? 'permanent'
      : validityMs <= 3600000 ? '1 hour'
      : validityMs <= 86400000 ? '1 day'
      : validityMs <= 604800000 ? '1 week' : '30 days';
    toast.success(`Share link copied! (${label})`);
  }, [getShareUrl]);

  const setView = useCallback((m) => updateSettings({ viewMode: m }), [updateSettings]);

  const timeSince = () => {
    const s = Math.floor((Date.now() - lastSaved) / 1000);
    if (s < 5) return 'just now'; if (s < 60) return `${s}s ago`; return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <nav className={`flex items-center justify-between h-11 px-2 sm:px-3 border-b flex-shrink-0 no-print select-none
      ${dark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-gray-200'}`}>

      <input ref={fileRef} type="file" accept=".md,.txt,.markdown" onChange={handleFileChange} className="hidden" />

      {/* Left */}
      <div className="flex items-center gap-0.5">
        <div className={`flex items-center gap-1.5 sm:gap-2 mr-1.5 sm:mr-2.5 pr-1.5 sm:pr-2.5 border-r ${dark ? 'border-[#21262d]' : 'border-gray-200'}`}>
          <div className={`w-6 h-6 rounded-[7px] flex items-center justify-center ${dark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
            <BookOpen size={13} className="text-blue-500" strokeWidth={2.25} />
          </div>
          <span className={`hidden sm:inline text-[13px] font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>MarkViewer</span>
        </div>

        {/* Desktop dropdowns */}
        <div className="hidden sm:flex items-center gap-0.5">
          <Dropdown label="File" dark={dark}>
            {(close) => (<>
              <MI icon={FilePlus2} label="New Document" shortcut="⌘N" dark={dark} onClick={() => { handleNew(); close(); }} />
              <MI icon={FolderOpen} label="Open File…" shortcut="⌘O" dark={dark} onClick={() => { handleOpen(); close(); }} />
              <MI icon={Clock} label="Recent Documents" dark={dark} onClick={() => { setShowRecentDocs(true); close(); }} />
              <MDivider dark={dark} />
              <MI icon={Save} label="Save" shortcut="⌘S" dark={dark} onClick={() => { saveNow(); toast.success('Saved'); close(); }} />
              <MI icon={Download} label="Download .md" dark={dark} onClick={() => { handleDownload(); close(); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Export</MLabel>
              <MI icon={FileCode2} label="Export as HTML" dark={dark} onClick={() => { handleExportHTML(); close(); }} />
              <MI icon={Printer} label="Print / PDF" dark={dark} onClick={() => { window.print(); close(); }} />
            </>)}
          </Dropdown>

          <Dropdown label="View" dark={dark}>
            {(close) => (<>
              <MLabel dark={dark}>Layout</MLabel>
              <MI icon={Columns2} label="Split View" dark={dark} active={settings.viewMode==='split'} onClick={() => { setView('split'); close(); }} />
              <MI icon={PenLine} label="Editor Only" dark={dark} active={settings.viewMode==='editor'} onClick={() => { setView('editor'); close(); }} />
              <MI icon={Eye} label="Preview Only" dark={dark} active={settings.viewMode==='preview'} onClick={() => { setView('preview'); close(); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Panels</MLabel>
              <MI icon={Presentation} label="Presentation" dark={dark} onClick={() => { setPresentationMode(true); close(); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Modes</MLabel>
              <MI icon={Target} label="Focus Mode" dark={dark} active={settings.focusMode} onClick={() => { updateSettings({ focusMode: !settings.focusMode }); close(); }} />
              <MI icon={Maximize2} label="Zen Mode" dark={dark} active={settings.zenMode} onClick={() => { updateSettings({ zenMode: !settings.zenMode }); close(); }} />
              <MI icon={AlignCenter} label="Typewriter" dark={dark} active={settings.typewriterMode} onClick={() => { updateSettings({ typewriterMode: !settings.typewriterMode }); close(); }} />
              <MI icon={Terminal} label="Vim Mode" dark={dark} active={settings.vimMode} onClick={() => { updateSettings({ vimMode: !settings.vimMode }); close(); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Scrolling</MLabel>
              <MI icon={ArrowUpDown} label="Auto Scroll" dark={dark} active={settings.autoScroll} onClick={() => { updateSettings({ autoScroll: !settings.autoScroll }); close(); }} />
            </>)}
          </Dropdown>

          <Dropdown label="Help" dark={dark}>
            {(close) => (<>
              <MI icon={BookOpen} label="Markdown Cheatsheet" dark={dark} onClick={() => { setShowCheatsheet(true); close(); }} />
              <MI icon={Keyboard} label="Keyboard Shortcuts" shortcut="⌘/" dark={dark} onClick={() => { setShowShortcuts(true); close(); }} />
            </>)}
          </Dropdown>
        </div>

        {/* Mobile: hamburger menu */}
        <button
          onClick={() => setMobileMenuOpen(v => !v)}
          className={`sm:hidden inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors
            ${dark ? 'text-gray-400 hover:bg-white/[.06]' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Center – view switcher (desktop only) */}
      <div className="hidden sm:flex items-center">
        <div className={`inline-flex items-center p-[3px] rounded-lg gap-px ${dark ? 'bg-white/[.04]' : 'bg-gray-100'}`}>
          {[
            { m: 'split', I: Columns2, t: 'Split' },
            { m: 'editor', I: PenLine, t: 'Editor' },
            { m: 'preview', I: Eye, t: 'Preview' },
          ].map(({ m, I, t }) => (
            <button key={m} onClick={() => setView(m)} title={t}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all
                ${settings.viewMode === m
                  ? dark ? 'bg-white/[.1] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                  : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
              <I size={14} strokeWidth={1.75} />
            </button>
          ))}
        </div>
        {settings.viewMode === 'split' && (
          <button
            onClick={() => updateSettings({ autoScroll: !settings.autoScroll })}
            title={settings.autoScroll ? 'Disable Auto Scroll' : 'Enable Auto Scroll'}
            className={`inline-flex items-center gap-1 h-7 px-2 ml-1.5 rounded-md text-[11px] font-medium transition-all
              ${settings.autoScroll
                ? dark ? 'bg-blue-500/[.12] text-blue-400' : 'bg-blue-50 text-blue-600'
                : dark ? 'text-gray-500 hover:bg-white/[.06]' : 'text-gray-400 hover:bg-gray-100'}`}>
            <ArrowUpDown size={12} strokeWidth={2} />
            <span className="hidden lg:inline">Sync</span>
          </button>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium mr-1
          ${hasUnsavedChanges ? dark ? 'text-amber-400/80' : 'text-amber-600/80' : dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <span className={`w-[5px] h-[5px] rounded-full ${hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
          {hasUnsavedChanges ? 'Unsaved' : `Saved ${timeSince()}`}
        </div>

        {!isTauri() && (
          <div className="relative">
            <Dropdown dark={dark} label={
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium
                ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                <Share2 size={13} strokeWidth={2} />
                <span className="hidden sm:inline">Share</span>
              </span>
            }>
              {(close) => (<>
                <MLabel dark={dark}>Link Validity</MLabel>
                <MI icon={Link} label="Permanent" dark={dark} onClick={() => { handleShare(null); close(); }} />
                <MDivider dark={dark} />
                <MI icon={Timer} label="1 Hour" dark={dark} onClick={() => { handleShare(3600000); close(); }} />
                <MI icon={Timer} label="1 Day" dark={dark} onClick={() => { handleShare(86400000); close(); }} />
                <MI icon={Timer} label="1 Week" dark={dark} onClick={() => { handleShare(604800000); close(); }} />
                <MI icon={Timer} label="30 Days" dark={dark} onClick={() => { handleShare(2592000000); close(); }} />
              </>)}
            </Dropdown>
          </div>
        )}

        <div className={`hidden sm:block w-px h-4 mx-0.5 ${dark ? 'bg-[#21262d]' : 'bg-gray-200'}`} />

        <button onClick={() => setShowAIPanel?.(true)} title="AI Assistant"
          className={`nav-icon-btn ${dark ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/[.12]' : 'text-purple-500 hover:text-purple-600 hover:bg-purple-50'}`}>
          <Zap size={15} strokeWidth={1.75} />
        </button>

        <button onClick={() => setShowTOC(v => !v)} title="Table of Contents"
          className={`nav-icon-btn ${dark ? 'text-gray-500 hover:text-gray-200 hover:bg-white/[.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
          <List size={15} strokeWidth={1.75} />
        </button>

        <button onClick={() => setShowSettings(v => !v)} title="Settings"
          className={`nav-icon-btn ${dark ? 'text-gray-500 hover:text-gray-200 hover:bg-white/[.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
          <Settings size={15} strokeWidth={1.75} />
        </button>

        <button onClick={() => updateSettings({ darkMode: !dark })} title={dark ? 'Light mode' : 'Dark mode'}
          className={`nav-icon-btn ${dark ? 'text-gray-500 hover:text-amber-300 hover:bg-white/[.06]' : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-100'}`}>
          {dark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
        </button>
      </div>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <>
          <div className="sm:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className={`sm:hidden fixed top-11 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto border-b rounded-b-2xl
            ${dark ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-gray-200 shadow-xl'}`}>
            <div className="py-2">
              <MLabel dark={dark}>File</MLabel>
              <MI icon={FilePlus2} label="New Document" dark={dark} onClick={() => { handleNew(); setMobileMenuOpen(false); }} />
              <MI icon={FolderOpen} label="Open File…" dark={dark} onClick={() => { handleOpen(); setMobileMenuOpen(false); }} />
              <MI icon={Clock} label="Recent Documents" dark={dark} onClick={() => { setShowRecentDocs(true); setMobileMenuOpen(false); }} />
              <MI icon={Save} label="Save" dark={dark} onClick={() => { saveNow(); toast.success('Saved'); setMobileMenuOpen(false); }} />
              <MI icon={Download} label="Download .md" dark={dark} onClick={() => { handleDownload(); setMobileMenuOpen(false); }} />
              <MI icon={FileCode2} label="Export as HTML" dark={dark} onClick={() => { handleExportHTML(); setMobileMenuOpen(false); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Layout</MLabel>
              <MI icon={Columns2} label="Split View" dark={dark} active={settings.viewMode==='split'} onClick={() => { setView('split'); setMobileMenuOpen(false); }} />
              <MI icon={PenLine} label="Editor Only" dark={dark} active={settings.viewMode==='editor'} onClick={() => { setView('editor'); setMobileMenuOpen(false); }} />
              <MI icon={Eye} label="Preview Only" dark={dark} active={settings.viewMode==='preview'} onClick={() => { setView('preview'); setMobileMenuOpen(false); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Panels</MLabel>
              <MI icon={List} label="Table of Contents" dark={dark} onClick={() => { setShowTOC(v => !v); setMobileMenuOpen(false); }} />
              <MI icon={Zap} label="AI Assistant" dark={dark} onClick={() => { setShowAIPanel?.(true); setMobileMenuOpen(false); }} />
              <MI icon={Presentation} label="Presentation" dark={dark} onClick={() => { setPresentationMode(true); setMobileMenuOpen(false); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Modes</MLabel>
              <MI icon={Target} label="Focus Mode" dark={dark} active={settings.focusMode} onClick={() => { updateSettings({ focusMode: !settings.focusMode }); setMobileMenuOpen(false); }} />
              <MI icon={Maximize2} label="Zen Mode" dark={dark} active={settings.zenMode} onClick={() => { updateSettings({ zenMode: !settings.zenMode }); setMobileMenuOpen(false); }} />
              <MI icon={AlignCenter} label="Typewriter" dark={dark} active={settings.typewriterMode} onClick={() => { updateSettings({ typewriterMode: !settings.typewriterMode }); setMobileMenuOpen(false); }} />
              <MI icon={ArrowUpDown} label="Auto Scroll" dark={dark} active={settings.autoScroll} onClick={() => { updateSettings({ autoScroll: !settings.autoScroll }); setMobileMenuOpen(false); }} />
              <MDivider dark={dark} />
              <MLabel dark={dark}>Help</MLabel>
              <MI icon={BookOpen} label="Markdown Cheatsheet" dark={dark} onClick={() => { setShowCheatsheet(true); setMobileMenuOpen(false); }} />
              <MI icon={Keyboard} label="Keyboard Shortcuts" dark={dark} onClick={() => { setShowShortcuts(true); setMobileMenuOpen(false); }} />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
