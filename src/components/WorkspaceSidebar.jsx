/**
 * Workspace Sidebar
 * 
 * Left sidebar with:
 * - Workspace selector
 * - File tree with folders
 * - Search across workspace
 * - New file / folder buttons
 * - Bulk operations
 * - Import / Export
 * - OPFS fallback warning
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Plus, Search, FolderOpen, FileText, ChevronRight, ChevronDown,
  MoreVertical, Trash2, Edit2, Pin, PinOff, Download, Upload,
  FolderPlus, AlertTriangle, HardDrive, Check, Loader2, RefreshCw,
  Layers, File, ArrowRight, Copy, CheckSquare, Square
} from 'lucide-react';
import {
  listFiles, readFile, writeFile, deleteFile, renameFile, moveFile,
  listWorkspaces, createWorkspace, switchWorkspace, deleteWorkspace,
  getActiveWorkspace, getFolderTree, searchFiles, togglePin,
  exportWorkspaceAsZip, importWorkspaceFromZip, isOPFSAvailable,
  getStorageInfo, getRecentFiles, createFolder, bulkDelete, bulkMove,
  initStorage, pushRecent,
} from '../lib/storage';

// ── Helpers ──────────────────────────────────────────────
function formatBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i] || 'MB'}`;
}

function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ── File Item ────────────────────────────────────────────
function FileItem({ file, dark, active, onOpen, onDelete, onRename, onTogglePin, selected, onToggleSelect, bulkMode }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(file.name);

  const doRename = () => {
    if (name.trim() && name !== file.name) onRename(file.id, name.trim());
    setRenaming(false);
  };

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[12px]
        ${active
          ? dark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'
          : dark ? 'hover:bg-white/[.04] text-gray-300' : 'hover:bg-gray-50 text-gray-700'
        }
        ${selected ? (dark ? 'ring-1 ring-blue-500/40' : 'ring-1 ring-blue-300') : ''}`}
      onClick={() => bulkMode ? onToggleSelect?.(file.id) : onOpen(file)}
      title={file.path}
    >
      {bulkMode && (
        <button onClick={e => { e.stopPropagation(); onToggleSelect?.(file.id); }}
          className="flex-shrink-0">
          {selected
            ? <CheckSquare size={13} className="text-blue-500" />
            : <Square size={13} className={dark ? 'text-gray-600' : 'text-gray-400'} />}
        </button>
      )}

      {file.pinned && <Pin size={10} className="text-amber-500 flex-shrink-0" />}

      <FileText size={13} className={`flex-shrink-0 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />

      {renaming ? (
        <input value={name} onChange={e => setName(e.target.value)}
          onBlur={doRename} onKeyDown={e => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenaming(false); }}
          onClick={e => e.stopPropagation()} autoFocus
          className={`flex-1 min-w-0 px-1 py-0.5 text-[12px] rounded border outline-none
            ${dark ? 'bg-[#21262d] border-blue-500 text-white' : 'bg-white border-blue-500 text-gray-900'}`} />
      ) : (
        <div className="flex-1 min-w-0 truncate">
          <span className="truncate">{file.title || file.name}</span>
        </div>
      )}

      <span className={`flex-shrink-0 text-[10px] ${dark ? 'text-gray-700' : 'text-gray-400'}`}>
        {timeAgo(file.modified)}
      </span>

      {/* Context menu trigger */}
      <div className="relative flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); setMenu(!menu); }}
          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity
            ${dark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
        >
          <MoreVertical size={12} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenu(false); }} />
            <div className={`absolute right-0 top-full mt-1 z-50 w-36 rounded-lg shadow-lg border py-1
              ${dark ? 'bg-[#1c2128] border-[#30363d]' : 'bg-white border-gray-200'}`}>
              <button onClick={e => { e.stopPropagation(); setRenaming(true); setMenu(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] ${dark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                <Edit2 size={11} /> Rename
              </button>
              <button onClick={e => { e.stopPropagation(); onTogglePin(file.id); setMenu(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] ${dark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                {file.pinned ? <><PinOff size={11} /> Unpin</> : <><Pin size={11} /> Pin</>}
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(file.id); setMenu(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-500 ${dark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Folder Node ──────────────────────────────────────────
function FolderNode({ name, dark, isOpen, onClick, count }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md w-full text-[12px] transition-colors
        ${dark ? 'hover:bg-white/[.04] text-gray-400' : 'hover:bg-gray-50 text-gray-600'}`}>
      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <FolderOpen size={12} className={dark ? 'text-amber-500/70' : 'text-amber-600/70'} />
      <span className="truncate flex-1 text-left">{name}</span>
      <span className={`text-[10px] ${dark ? 'text-gray-700' : 'text-gray-400'}`}>{count}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════
export default function WorkspaceSidebar({
  darkMode: dark,
  isOpen,
  onClose,
  activeFileId,
  onOpenFile,       // (meta, content) => void
  onNewFile,        // () => void — create blank file in editor
  width = 260,
}) {
  // ── State ──────────────────────────────────────────────
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [openFolders, setOpenFolders] = useState(new Set(['']));
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState('modified');
  const [creating, setCreating] = useState(null); // null | 'file' | 'folder'
  const [newName, setNewName] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWs, setActiveWs] = useState('');
  const [wsDropdown, setWsDropdown] = useState(false);
  const [creatingWs, setCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const searchTimeout = useRef(null);

  // ── Load data ──────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const allFiles = listFiles(null, sortBy, 'desc').filter(f => !f._isFolder);
      setFiles(allFiles);
      setFolders(getFolderTree());
      setWorkspaces(listWorkspaces());
      setActiveWs(getActiveWorkspace());
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (e) {
      console.error('WorkspaceSidebar refresh error:', e);
    }
    setLoading(false);
  }, [sortBy]);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  // ── Search ─────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchFiles(query, { searchContent: true });
      setSearchResults(res.filter(f => !f._isFolder));
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  // ── Actions ────────────────────────────────────────────
  const handleOpenFile = async (meta) => {
    try {
      const content = await readFile(meta.id);
      pushRecent(meta);
      onOpenFile?.(meta, content);
    } catch (e) {
      console.error('Failed to read file:', e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return;
    await deleteFile(id);
    refresh();
  };

  const handleRename = async (id, newN) => {
    await renameFile(id, newN);
    refresh();
  };

  const handleTogglePin = async (id) => {
    togglePin(id);
    refresh();
  };

  const handleCreateFile = async () => {
    if (!newName.trim()) return;
    const fname = newName.endsWith('.md') ? newName : `${newName}.md`;
    const content = `# ${newName.replace(/\.md$/, '')}\n\n`;
    const meta = await writeFile(fname, content);
    setCreating(null);
    setNewName('');
    refresh();
    handleOpenFile(meta);
  };

  const handleCreateFolder = () => {
    if (!newName.trim()) return;
    createFolder(newName.trim());
    setCreating(null);
    setNewName('');
    refresh();
  };

  const handleSwitchWorkspace = (name) => {
    switchWorkspace(name);
    setActiveWs(name);
    setWsDropdown(false);
    refresh();
  };

  const handleCreateWorkspace = () => {
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim());
    switchWorkspace(newWsName.trim());
    setCreatingWs(false);
    setNewWsName('');
    refresh();
  };

  const handleDeleteWorkspace = async (name) => {
    if (!confirm(`Delete workspace "${name}" and all its files?`)) return;
    await deleteWorkspace(name);
    refresh();
  };

  const handleExport = async () => { await exportWorkspaceAsZip(); };
  const handleImport = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const count = await importWorkspaceFromZip(f);
      alert(`Imported ${count} files`);
      refresh();
    };
    inp.click();
  };

  // Bulk ops
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} files?`)) return;
    await bulkDelete([...selectedIds]);
    setSelectedIds(new Set());
    setBulkMode(false);
    refresh();
  };

  // ── Build file tree ────────────────────────────────────
  const displayFiles = searchResults !== null ? searchResults : files;
  const pinnedFiles = displayFiles.filter(f => f.pinned);
  const rootFiles = displayFiles.filter(f => !f.pinned && (!f.folder || f.folder === ''));
  const folderMap = {};
  displayFiles.filter(f => !f.pinned && f.folder && f.folder !== '').forEach(f => {
    (folderMap[f.folder] = folderMap[f.folder] || []).push(f);
  });

  const toggleFolder = (f) => {
    setOpenFolders(prev => {
      const n = new Set(prev);
      n.has(f) ? n.delete(f) : n.add(f);
      return n;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`flex-shrink-0 flex flex-col border-r h-full overflow-hidden transition-all
        ${dark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-[#f6f8fa] border-gray-200'}`}
      style={{ width }}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className={`flex items-center justify-between px-3 py-2 border-b
        ${dark ? 'border-[#21262d]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <HardDrive size={13} className={dark ? 'text-blue-400' : 'text-blue-500'} />
          {/* Workspace selector */}
          <div className="relative">
            <button
              onClick={() => setWsDropdown(!wsDropdown)}
              className={`flex items-center gap-1 text-[12px] font-semibold truncate max-w-[140px]
                ${dark ? 'text-white hover:text-blue-300' : 'text-gray-900 hover:text-blue-600'}`}
            >
              {activeWs}
              <ChevronDown size={11} />
            </button>
            {wsDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setWsDropdown(false)} />
                <div className={`absolute left-0 top-full mt-1 z-50 w-48 rounded-lg shadow-lg border py-1
                  ${dark ? 'bg-[#1c2128] border-[#30363d]' : 'bg-white border-gray-200'}`}>
                  {workspaces.map(ws => (
                    <div key={ws} className={`flex items-center justify-between px-3 py-1.5 text-[11px]
                      ${ws === activeWs ? (dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : ''}
                      ${dark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <button onClick={() => handleSwitchWorkspace(ws)} className="flex-1 text-left truncate">
                        {ws} {ws === activeWs && <Check size={10} className="inline ml-1" />}
                      </button>
                      {ws !== 'Default' && (
                        <button onClick={() => handleDeleteWorkspace(ws)}
                          className="p-0.5 opacity-0 hover:opacity-100 text-red-500">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className={`border-t mt-1 pt-1 ${dark ? 'border-[#30363d]' : 'border-gray-100'}`}>
                    {creatingWs ? (
                      <div className="px-2 pb-1 flex gap-1">
                        <input value={newWsName} onChange={e => setNewWsName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateWorkspace(); if (e.key === 'Escape') setCreatingWs(false); }}
                          placeholder="Name..." autoFocus
                          className={`flex-1 text-[11px] px-2 py-1 rounded border outline-none
                            ${dark ? 'bg-[#21262d] border-[#30363d] text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                        <button onClick={handleCreateWorkspace}
                          className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded">Go</button>
                      </div>
                    ) : (
                      <button onClick={() => setCreatingWs(true)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px]
                          ${dark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-50 text-gray-500'}`}>
                        <Plus size={10} /> New workspace
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={refresh} title="Refresh"
            className={`p-1 rounded transition-colors ${dark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}>
            <RefreshCw size={12} />
          </button>
          <button onClick={onClose} title="Close sidebar"
            className={`p-1 rounded transition-colors ${dark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── OPFS warning ────────────────────────────── */}
      {storageInfo && storageInfo.backend !== 'OPFS' && (
        <div className={`mx-2 mt-2 px-2 py-1.5 rounded text-[10px] flex items-start gap-1.5
          ${dark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
          <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
          <span>OPFS unavailable. Using localStorage (limited).</span>
        </div>
      )}

      {/* ── Search ──────────────────────────────────── */}
      <div className={`px-2 pt-2 pb-1`}>
        <div className="relative">
          <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files..."
            className={`w-full text-[11px] pl-7 pr-2 py-1.5 rounded-md border outline-none
              ${dark
                ? 'bg-[#161b22] border-[#30363d] text-white placeholder-gray-600 focus:border-blue-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
          />
          {isSearching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />}
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────── */}
      <div className={`flex items-center gap-1 px-2 py-1`}>
        <button onClick={() => setCreating('file')} title="New file"
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
            ${dark ? 'hover:bg-white/[.06] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
          <Plus size={11} /> File
        </button>
        <button onClick={() => setCreating('folder')} title="New folder"
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
            ${dark ? 'hover:bg-white/[.06] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
          <FolderPlus size={11} /> Folder
        </button>
        <div className="flex-1" />
        <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
          title={bulkMode ? 'Cancel bulk' : 'Bulk select'}
          className={`p-1 rounded text-[10px] ${bulkMode
            ? (dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
            : (dark ? 'hover:bg-white/[.06] text-gray-500' : 'hover:bg-gray-100 text-gray-400')}`}>
          <CheckSquare size={11} />
        </button>
        <button onClick={handleImport} title="Import"
          className={`p-1 rounded ${dark ? 'hover:bg-white/[.06] text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
          <Upload size={11} />
        </button>
        <button onClick={handleExport} title="Export"
          className={`p-1 rounded ${dark ? 'hover:bg-white/[.06] text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
          <Download size={11} />
        </button>
      </div>

      {/* ── Bulk action bar ─────────────────────────── */}
      {bulkMode && selectedIds.size > 0 && (
        <div className={`flex items-center gap-2 px-2 py-1.5 border-t border-b text-[10px]
          ${dark ? 'border-[#21262d] bg-[#161b22]' : 'border-gray-200 bg-gray-50'}`}>
          <span className={dark ? 'text-gray-400' : 'text-gray-600'}>{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
            <Trash2 size={10} /> Delete
          </button>
        </div>
      )}

      {/* ── Create input ────────────────────────────── */}
      {creating && (
        <div className={`px-2 pb-1`}>
          <div className="flex gap-1">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') creating === 'file' ? handleCreateFile() : handleCreateFolder();
                if (e.key === 'Escape') { setCreating(null); setNewName(''); }
              }}
              placeholder={creating === 'file' ? 'filename.md' : 'folder name'}
              autoFocus
              className={`flex-1 text-[11px] px-2 py-1 rounded border outline-none
                ${dark ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
            <button
              onClick={() => creating === 'file' ? handleCreateFile() : handleCreateFolder()}
              className="px-2 py-1 rounded bg-blue-600 text-white text-[10px]">
              Create
            </button>
          </div>
        </div>
      )}

      {/* ── File Tree ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
        {loading ? (
          <div className={`flex justify-center py-8 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : displayFiles.length === 0 ? (
          <div className={`text-center py-8 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            <FileText size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[11px]">{query ? 'No results' : 'No files yet'}</p>
            {!query && (
              <button onClick={() => setCreating('file')}
                className="mt-2 text-[11px] text-blue-500 hover:underline">
                Create your first file
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Pinned */}
            {pinnedFiles.length > 0 && (
              <div className="mb-2">
                <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider
                  ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                  Pinned
                </div>
                {pinnedFiles.map(f => (
                  <FileItem key={f.id} file={f} dark={dark} active={f.id === activeFileId}
                    onOpen={handleOpenFile} onDelete={handleDelete} onRename={handleRename}
                    onTogglePin={handleTogglePin} bulkMode={bulkMode}
                    selected={selectedIds.has(f.id)} onToggleSelect={toggleSelect} />
                ))}
              </div>
            )}

            {/* Root files */}
            {rootFiles.length > 0 && (
              <div className="mb-1">
                {searchResults === null && (
                  <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider
                    ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                    Files
                  </div>
                )}
                {rootFiles.map(f => (
                  <FileItem key={f.id} file={f} dark={dark} active={f.id === activeFileId}
                    onOpen={handleOpenFile} onDelete={handleDelete} onRename={handleRename}
                    onTogglePin={handleTogglePin} bulkMode={bulkMode}
                    selected={selectedIds.has(f.id)} onToggleSelect={toggleSelect} />
                ))}
              </div>
            )}

            {/* Folders */}
            {Object.entries(folderMap).map(([folder, fFiles]) => (
              <div key={folder} className="mb-1">
                <FolderNode
                  name={folder.split('/').pop()}
                  dark={dark}
                  isOpen={openFolders.has(folder)}
                  onClick={() => toggleFolder(folder)}
                  count={fFiles.length}
                />
                {openFolders.has(folder) && (
                  <div className="pl-4">
                    {fFiles.map(f => (
                      <FileItem key={f.id} file={f} dark={dark} active={f.id === activeFileId}
                        onOpen={handleOpenFile} onDelete={handleDelete} onRename={handleRename}
                        onTogglePin={handleTogglePin} bulkMode={bulkMode}
                        selected={selectedIds.has(f.id)} onToggleSelect={toggleSelect} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      {storageInfo && (
        <div className={`px-3 py-1.5 border-t text-[10px] flex items-center justify-between
          ${dark ? 'border-[#21262d] text-gray-600' : 'border-gray-200 text-gray-400'}`}>
          <span>{storageInfo.fileCount} files · {formatBytes(storageInfo.totalSize)}</span>
          <span className={`px-1.5 py-0.5 rounded ${dark ? 'bg-[#161b22]' : 'bg-gray-100'}`}>
            {storageInfo.backend}
          </span>
        </div>
      )}
    </div>
  );
}
