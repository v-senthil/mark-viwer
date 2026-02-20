/**
 * Workspace Panel Component
 * 
 * File manager UI for browser-based document storage using OPFS
 * 
 * Features:
 * - Document list with sorting/filtering
 * - Folder navigation
 * - Create, rename, delete documents
 * - Tags management
 * - Search functionality
 * - Import/export workspace
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X, FolderOpen, File, Plus, Search, MoreVertical,
  Trash2, Edit2, Tag, Download, Upload, Clock, 
  SortAsc, SortDesc, ChevronRight, FolderPlus,
  FileText, AlertCircle, Check, Loader2
} from 'lucide-react';
import {
  isOPFSSupported,
  getDocuments,
  createDocument,
  readDocument,
  deleteDocument,
  renameDocument,
  getAllFolders,
  getAllTags,
  searchDocuments,
  exportWorkspace,
  importWorkspace,
  getWorkspaceStats,
  loadDocumentIndex
} from '../lib/workspace';

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date to relative time
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return new Date(timestamp).toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

// Document item component
function DocumentItem({ doc, dark, onOpen, onDelete, onRename, selected }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(doc.name);
  
  const handleRename = () => {
    if (newName && newName !== doc.name) {
      onRename(doc.id, newName);
    }
    setIsRenaming(false);
  };
  
  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
        ${selected 
          ? dark ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          : dark ? 'hover:bg-[#161b22]' : 'hover:bg-gray-50'
        }`}
      onClick={() => !isRenaming && onOpen(doc)}
    >
      <FileText size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />
      
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className={`w-full px-1 py-0.5 text-[13px] rounded border outline-none
              ${dark 
                ? 'bg-[#21262d] border-blue-500 text-white' 
                : 'bg-white border-blue-500 text-gray-900'
              }`}
          />
        ) : (
          <>
            <div className={`text-[13px] truncate ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
              {doc.name}
            </div>
            <div className={`text-[11px] truncate ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              {formatRelativeTime(doc.modified)} · {formatBytes(doc.size)}
            </div>
          </>
        )}
      </div>
      
      {/* Tags */}
      {doc.tags?.length > 0 && (
        <div className="flex gap-1">
          {doc.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className={`text-[10px] px-1.5 py-0.5 rounded
                ${dark ? 'bg-[#21262d] text-gray-400' : 'bg-gray-100 text-gray-500'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Actions */}
      <div className="relative">
        <button
          onClick={e => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
            ${dark ? 'hover:bg-[#21262d] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
        >
          <MoreVertical size={14} />
        </button>
        
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={e => {
                e.stopPropagation();
                setShowMenu(false);
              }} 
            />
            <div className={`absolute right-0 top-full mt-1 z-50 w-36 rounded-lg shadow-lg border py-1
              ${dark ? 'bg-[#21262d] border-[#30363d]' : 'bg-white border-gray-200'}`}>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px]
                  ${dark ? 'hover:bg-[#30363d] text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Edit2 size={12} /> Rename
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete(doc.id);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-500
                  ${dark ? 'hover:bg-[#30363d]' : 'hover:bg-gray-50'}`}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePanel({ darkMode: dark, onClose, onOpenDocument, currentDocId }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('modified');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isCreating, setIsCreating] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  
  // Check OPFS support
  const opfsSupported = isOPFSSupported();
  
  // Load documents
  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (searchQuery) {
        const results = await searchDocuments(searchQuery, { folder: currentFolder || null });
        setDocuments(results);
      } else {
        const docs = getDocuments({
          folder: currentFolder || null,
          sortBy,
          sortOrder,
        });
        setDocuments(docs);
      }
      
      setFolders(getAllFolders());
      setStats(getWorkspaceStats());
    } catch (e) {
      console.error('Failed to load documents:', e);
      setError(e.message);
    }
    
    setIsLoading(false);
  }, [searchQuery, currentFolder, sortBy, sortOrder]);
  
  useEffect(() => {
    loadDocs();
  }, [loadDocs]);
  
  // Create new document
  const handleCreate = async () => {
    if (!newDocName.trim()) return;
    
    try {
      const doc = await createDocument(
        newDocName.endsWith('.md') ? newDocName : `${newDocName}.md`,
        '# ' + newDocName.replace('.md', '') + '\n\n',
        currentFolder
      );
      setIsCreating(false);
      setNewDocName('');
      loadDocs();
      onOpenDocument?.(doc);
    } catch (e) {
      console.error('Failed to create document:', e);
      setError(e.message);
    }
  };
  
  // Open document
  const handleOpen = async (doc) => {
    try {
      const content = await readDocument(doc.id);
      onOpenDocument?.({ ...doc, content });
    } catch (e) {
      console.error('Failed to open document:', e);
      setError(e.message);
    }
  };
  
  // Delete document
  const handleDelete = async (id) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    
    try {
      await deleteDocument(id);
      loadDocs();
    } catch (e) {
      console.error('Failed to delete document:', e);
      setError(e.message);
    }
  };
  
  // Rename document
  const handleRename = async (id, newName) => {
    try {
      await renameDocument(id, newName);
      loadDocs();
    } catch (e) {
      console.error('Failed to rename document:', e);
      setError(e.message);
    }
  };
  
  // Export workspace
  const handleExport = async () => {
    try {
      const data = await exportWorkspace();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `markviewer-workspace-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export workspace:', e);
      setError(e.message);
    }
  };
  
  // Import workspace
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const count = await importWorkspace(data, true);
        alert(`Imported ${count} documents`);
        loadDocs();
      } catch (err) {
        console.error('Failed to import workspace:', err);
        setError(err.message);
      }
    };
    input.click();
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Panel */}
      <div className={`fixed top-0 left-0 bottom-0 w-[380px] max-w-full z-50 flex flex-col
        ${dark ? 'bg-[#0d1117] border-r border-[#21262d]' : 'bg-white border-r border-gray-200'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b
          ${dark ? 'border-[#21262d]' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5">
            <FolderOpen size={16} strokeWidth={1.75} className={dark ? 'text-blue-400' : 'text-blue-500'} />
            <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
              Workspace
            </h2>
            {stats && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded
                ${dark ? 'bg-[#21262d] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                {stats.totalDocuments} docs
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors
              ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        
        {/* OPFS Warning */}
        {!opfsSupported && (
          <div className={`mx-4 mt-3 p-3 rounded-lg flex items-start gap-2 text-[12px]
            ${dark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Limited Storage:</strong> Your browser doesn't support OPFS. Documents will be stored in localStorage with limited capacity.
            </div>
          </div>
        )}
        
        {/* Toolbar */}
        <div className={`p-3 border-b ${dark ? 'border-[#21262d]' : 'border-gray-100'}`}>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2
              ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className={`w-full text-[13px] pl-9 pr-3 py-2 rounded-lg border outline-none
                ${dark 
                  ? 'bg-[#21262d] border-[#30363d] text-white placeholder-gray-600 focus:border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                }`}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} /> New
            </button>
            <button
              onClick={handleImport}
              className={`p-1.5 rounded-lg transition-colors
                ${dark ? 'hover:bg-[#21262d] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Import workspace"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={handleExport}
              className={`p-1.5 rounded-lg transition-colors
                ${dark ? 'hover:bg-[#21262d] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Export workspace"
            >
              <Download size={14} />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className={`p-1.5 rounded-lg transition-colors
                ${dark ? 'hover:bg-[#21262d] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
            </button>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className={`text-[11px] px-2 py-1 rounded border outline-none cursor-pointer
                ${dark ? 'bg-[#21262d] border-[#30363d] text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <option value="modified">Modified</option>
              <option value="created">Created</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
        
        {/* New Document Input */}
        {isCreating && (
          <div className={`p-3 border-b ${dark ? 'border-[#21262d]' : 'border-gray-100'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder="Document name..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                className={`flex-1 text-[13px] px-3 py-2 rounded-lg border outline-none
                  ${dark 
                    ? 'bg-[#21262d] border-[#30363d] text-white placeholder-gray-600 focus:border-blue-500' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  }`}
              />
              <button
                onClick={handleCreate}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className={`px-3 py-2 rounded-lg text-[12px] font-medium
                  ${dark ? 'bg-[#21262d] text-gray-400 hover:bg-[#30363d]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Folder Navigation */}
        {folders.length > 0 && (
          <div className={`px-3 py-2 border-b flex items-center gap-1 overflow-x-auto
            ${dark ? 'border-[#21262d]' : 'border-gray-100'}`}>
            <button
              onClick={() => setCurrentFolder('')}
              className={`text-[11px] px-2 py-1 rounded transition-colors
                ${!currentFolder
                  ? dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                  : dark ? 'hover:bg-[#21262d] text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
            >
              All
            </button>
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setCurrentFolder(folder)}
                className={`text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1
                  ${currentFolder === folder
                    ? dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                    : dark ? 'hover:bg-[#21262d] text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
              >
                <FolderOpen size={10} /> {folder}
              </button>
            ))}
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className={`mx-4 mt-3 p-3 rounded-lg flex items-center gap-2 text-[12px]
            ${dark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
            <AlertCircle size={14} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        )}
        
        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className={`flex items-center justify-center py-8 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className={`text-center py-8 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">
                {searchQuery ? 'No documents found' : 'No documents yet'}
              </p>
              <p className="text-[11px] mt-1">
                {searchQuery ? 'Try a different search' : 'Create your first document'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {documents.map(doc => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  dark={dark}
                  selected={doc.id === currentDocId}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer Stats */}
        {stats && (
          <div className={`p-3 border-t text-[11px] flex items-center gap-4
            ${dark ? 'border-[#21262d] text-gray-600' : 'border-gray-100 text-gray-400'}`}>
            <span>{stats.totalDocuments} documents</span>
            <span>{formatBytes(stats.totalSize)}</span>
            {stats.folders > 0 && <span>{stats.folders} folders</span>}
          </div>
        )}
      </div>
    </>
  );
}
