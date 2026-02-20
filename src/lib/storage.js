/**
 * Unified Storage API
 * 
 * Provides a single async interface for workspace/file management.
 * Uses OPFS (Origin Private File System) when available, falls back to localStorage.
 * 
 * API:
 *   listWorkspaces()
 *   createWorkspace(name)
 *   switchWorkspace(name)
 *   deleteWorkspace(name)
 *   listFiles(folder?)
 *   readFile(path)
 *   writeFile(path, content)
 *   deleteFile(path)
 *   renameFile(oldPath, newPath)
 *   moveFile(path, newFolder)
 *   searchFiles(query)
 *   getRecentFiles(limit?)
 *   exportWorkspaceAsZip()
 *   importWorkspaceFromZip(file)
 *   getStorageInfo()
 */

// ── Constants ────────────────────────────────────────────
const WS_LIST_KEY = 'mv_workspaces';
const ACTIVE_WS_KEY = 'mv_active_workspace';
const INDEX_PREFIX = 'mv_index_';
const DOC_PREFIX = 'mv_doc_';
const RECENT_KEY = 'mv_recent_files';
const DEFAULT_WS = 'Default';

// ── OPFS Detection ───────────────────────────────────────
let _opfsAvailable = null;

export async function detectOPFS() {
  if (_opfsAvailable !== null) return _opfsAvailable;
  try {
    if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
      _opfsAvailable = false;
      return false;
    }
    const root = await navigator.storage.getDirectory();
    // Quick write/read test
    const testHandle = await root.getFileHandle('__mv_opfs_test__', { create: true });
    const w = await testHandle.createWritable();
    await w.write('ok');
    await w.close();
    await root.removeEntry('__mv_opfs_test__');
    _opfsAvailable = true;
  } catch {
    _opfsAvailable = false;
  }
  return _opfsAvailable;
}

export function isOPFSAvailable() {
  return _opfsAvailable === true;
}

// ── Helpers ──────────────────────────────────────────────
function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractTitle(content) {
  const m = content.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : '';
}

function extractPreview(content, max = 120) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, max);
}

function now() { return Date.now(); }

// ── File metadata ────────────────────────────────────────
/**
 * @typedef {Object} FileMeta
 * @property {string}   id
 * @property {string}   name      - Filename (e.g. "notes.md")
 * @property {string}   path      - Full path inside workspace (e.g. "projects/notes.md")
 * @property {string}   folder    - Parent folder ("projects" or "")
 * @property {number}   created
 * @property {number}   modified
 * @property {number}   size
 * @property {string}   preview
 * @property {string}   title     - Extracted markdown title
 * @property {boolean}  pinned
 */

// ── Internal index helpers ───────────────────────────────
function indexKey(ws) { return INDEX_PREFIX + (ws || getActiveWorkspace()); }

function loadIndex(ws) {
  try {
    const raw = localStorage.getItem(indexKey(ws));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveIndex(index, ws) {
  localStorage.setItem(indexKey(ws), JSON.stringify(index));
}

function findInIndex(id, ws) {
  const idx = loadIndex(ws);
  const pos = idx.findIndex(f => f.id === id);
  return { idx, pos, meta: pos >= 0 ? idx[pos] : null };
}

// ── Workspace list helpers ───────────────────────────────
function loadWorkspaceList() {
  try {
    const raw = localStorage.getItem(WS_LIST_KEY);
    return raw ? JSON.parse(raw) : [DEFAULT_WS];
  } catch { return [DEFAULT_WS]; }
}

function saveWorkspaceList(list) {
  localStorage.setItem(WS_LIST_KEY, JSON.stringify(list));
}

// ── OPFS directory helpers ───────────────────────────────
async function opfsRoot() {
  return navigator.storage.getDirectory();
}

async function opfsWsDir(ws) {
  const root = await opfsRoot();
  const top = await root.getDirectoryHandle('markviewer', { create: true });
  return top.getDirectoryHandle(ws || getActiveWorkspace(), { create: true });
}

// ── RECENT FILES ─────────────────────────────────────────
function loadRecentRaw() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentRaw(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

/**
 * Push a file to the recent list (dedup by id, max 20)
 */
export function pushRecent(meta) {
  const list = loadRecentRaw().filter(r => r.id !== meta.id);
  list.unshift({
    id: meta.id,
    name: meta.name,
    path: meta.path,
    title: meta.title || '',
    preview: meta.preview || '',
    modified: meta.modified || now(),
    workspace: getActiveWorkspace(),
  });
  saveRecentRaw(list.slice(0, 20));
}

/**
 * Get recent files (across workspaces)
 */
export function getRecentFiles(limit = 10) {
  return loadRecentRaw().slice(0, limit);
}

/**
 * Clear recent files
 */
export function clearRecentFiles() {
  saveRecentRaw([]);
}

// ══════════════════════════════════════════════════════════
//  PUBLIC API — Workspaces
// ══════════════════════════════════════════════════════════

export function listWorkspaces() {
  return loadWorkspaceList();
}

export function getActiveWorkspace() {
  return localStorage.getItem(ACTIVE_WS_KEY) || DEFAULT_WS;
}

export function createWorkspace(name) {
  const list = loadWorkspaceList();
  if (list.includes(name)) return false;
  list.push(name);
  saveWorkspaceList(list);
  // Initialize empty index for the workspace
  saveIndex([], name);
  return true;
}

export function switchWorkspace(name) {
  const list = loadWorkspaceList();
  if (!list.includes(name)) return false;
  localStorage.setItem(ACTIVE_WS_KEY, name);
  return true;
}

export async function deleteWorkspace(name) {
  if (name === DEFAULT_WS) return false;
  // Remove all files
  const index = loadIndex(name);
  if (isOPFSAvailable()) {
    try {
      const root = await opfsRoot();
      const top = await root.getDirectoryHandle('markviewer', { create: true });
      await top.removeEntry(name, { recursive: true });
    } catch { /* ignore */ }
  } else {
    for (const f of index) {
      localStorage.removeItem(DOC_PREFIX + f.id);
    }
  }
  // Remove index
  localStorage.removeItem(indexKey(name));
  // Update list
  const list = loadWorkspaceList().filter(w => w !== name);
  saveWorkspaceList(list);
  // Switch if was active
  if (getActiveWorkspace() === name) {
    switchWorkspace(list[0] || DEFAULT_WS);
  }
  return true;
}

// ══════════════════════════════════════════════════════════
//  PUBLIC API — File operations
// ══════════════════════════════════════════════════════════

/**
 * List all files, optionally filtered by folder
 */
export function listFiles(folder = null, sortBy = 'modified', sortOrder = 'desc') {
  let files = loadIndex();
  if (folder !== null && folder !== '') {
    files = files.filter(f => f.folder === folder);
  }
  files.sort((a, b) => {
    const av = sortBy === 'name' ? a.name.toLowerCase() : a[sortBy] || 0;
    const bv = sortBy === 'name' ? b.name.toLowerCase() : b[sortBy] || 0;
    return sortOrder === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
  });
  return files;
}

/**
 * Get the folder tree
 */
export function getFolderTree() {
  const files = loadIndex();
  const folders = new Set(['']);
  files.forEach(f => {
    if (f.folder) {
      const parts = f.folder.split('/');
      for (let i = 1; i <= parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    }
  });
  return Array.from(folders).sort();
}

/**
 * Read file content
 */
export async function readFile(id) {
  if (isOPFSAvailable()) {
    const dir = await opfsWsDir();
    try {
      const fh = await dir.getFileHandle(`${id}.md`);
      const file = await fh.getFile();
      return await file.text();
    } catch (e) {
      throw new Error(`File not found: ${id}`);
    }
  } else {
    const raw = localStorage.getItem(DOC_PREFIX + id);
    if (raw === null) throw new Error(`File not found: ${id}`);
    return raw;
  }
}

/**
 * Write (create or update) a file
 */
export async function writeFile(path, content, opts = {}) {
  const ws = getActiveWorkspace();
  const parts = path.split('/');
  const name = parts.pop();
  const folder = parts.join('/');
  const index = loadIndex();
  let existing = index.find(f => f.path === path);

  if (existing) {
    // Update existing
    if (isOPFSAvailable()) {
      const dir = await opfsWsDir();
      const fh = await dir.getFileHandle(`${existing.id}.md`, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
    } else {
      localStorage.setItem(DOC_PREFIX + existing.id, content);
    }
    existing.modified = now();
    existing.size = new Blob([content]).size;
    existing.preview = extractPreview(content);
    existing.title = extractTitle(content) || existing.name;
    saveIndex(index, ws);
    pushRecent(existing);
    return existing;
  } else {
    // Create new
    const id = uid();
    const meta = {
      id,
      name: name || 'untitled.md',
      path,
      folder,
      created: now(),
      modified: now(),
      size: new Blob([content]).size,
      preview: extractPreview(content),
      title: extractTitle(content) || (name || 'untitled').replace(/\.md$/, ''),
      pinned: opts.pinned || false,
    };

    if (isOPFSAvailable()) {
      const dir = await opfsWsDir();
      const fh = await dir.getFileHandle(`${id}.md`, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
    } else {
      localStorage.setItem(DOC_PREFIX + id, content);
    }

    index.push(meta);
    saveIndex(index, ws);
    pushRecent(meta);
    return meta;
  }
}

/**
 * Delete a file by id
 */
export async function deleteFile(id) {
  const ws = getActiveWorkspace();
  if (isOPFSAvailable()) {
    try {
      const dir = await opfsWsDir();
      await dir.removeEntry(`${id}.md`);
    } catch { /* ignore */ }
  } else {
    localStorage.removeItem(DOC_PREFIX + id);
  }
  const index = loadIndex().filter(f => f.id !== id);
  saveIndex(index, ws);
  return true;
}

/**
 * Rename a file
 */
export async function renameFile(id, newName) {
  const ws = getActiveWorkspace();
  const index = loadIndex();
  const f = index.find(x => x.id === id);
  if (!f) throw new Error('File not found');
  f.name = newName;
  f.path = f.folder ? `${f.folder}/${newName}` : newName;
  f.modified = now();
  saveIndex(index, ws);
  return f;
}

/**
 * Move a file to a different folder
 */
export async function moveFile(id, newFolder) {
  const ws = getActiveWorkspace();
  const index = loadIndex();
  const f = index.find(x => x.id === id);
  if (!f) throw new Error('File not found');
  f.folder = newFolder;
  f.path = newFolder ? `${newFolder}/${f.name}` : f.name;
  f.modified = now();
  saveIndex(index, ws);
  return f;
}

/**
 * Create a new folder (just creates a placeholder meta entry — folders are virtual)
 */
export function createFolder(folderPath) {
  // Folders are implicit from file paths. This just ensures the folder shows up in the tree.
  // We store a minimal marker in the index.
  const ws = getActiveWorkspace();
  const index = loadIndex();
  // Don't create if any file already lives in this folder
  if (index.some(f => f.folder === folderPath || f.folder?.startsWith(folderPath + '/'))) return;
  // Add an invisible marker
  index.push({
    id: `folder_${uid()}`,
    name: '.folder',
    path: `${folderPath}/.folder`,
    folder: folderPath,
    created: now(),
    modified: now(),
    size: 0,
    preview: '',
    title: '',
    pinned: false,
    _isFolder: true,
  });
  saveIndex(index, ws);
}

/**
 * Search files by query (matches name, title, preview and optionally content)
 */
export async function searchFiles(query, { searchContent = false } = {}) {
  const q = query.toLowerCase();
  const index = loadIndex();
  const results = [];

  for (const f of index) {
    if (f._isFolder) continue;
    if (
      f.name.toLowerCase().includes(q) ||
      (f.title || '').toLowerCase().includes(q) ||
      (f.preview || '').toLowerCase().includes(q)
    ) {
      results.push(f);
      continue;
    }
    if (searchContent) {
      try {
        const content = await readFile(f.id);
        if (content.toLowerCase().includes(q)) {
          results.push(f);
        }
      } catch { /* skip */ }
    }
  }
  return results;
}

/**
 * Toggle pinned status
 */
export function togglePin(id) {
  const ws = getActiveWorkspace();
  const index = loadIndex();
  const f = index.find(x => x.id === id);
  if (!f) return null;
  f.pinned = !f.pinned;
  saveIndex(index, ws);
  return f;
}

// ══════════════════════════════════════════════════════════
//  Export / Import
// ══════════════════════════════════════════════════════════

/**
 * Export workspace as a JSON blob (ZIP alternative without extra deps)
 */
export async function exportWorkspaceAsZip() {
  const index = loadIndex().filter(f => !f._isFolder);
  const docs = [];
  for (const meta of index) {
    try {
      const content = await readFile(meta.id);
      docs.push({ ...meta, content });
    } catch { /* skip */ }
  }
  const data = {
    version: 2,
    workspace: getActiveWorkspace(),
    exported: now(),
    files: docs,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `markviewer-${getActiveWorkspace()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import workspace from a JSON file
 */
export async function importWorkspaceFromZip(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data.files || !Array.isArray(data.files)) {
    throw new Error('Invalid workspace export');
  }
  let count = 0;
  for (const doc of data.files) {
    await writeFile(doc.path || doc.name, doc.content);
    count++;
  }
  return count;
}

// ══════════════════════════════════════════════════════════
//  Bulk operations
// ══════════════════════════════════════════════════════════

export async function bulkDelete(ids) {
  for (const id of ids) {
    await deleteFile(id);
  }
  return ids.length;
}

export async function bulkMove(ids, newFolder) {
  for (const id of ids) {
    await moveFile(id, newFolder);
  }
  return ids.length;
}

// ══════════════════════════════════════════════════════════
//  Storage info
// ══════════════════════════════════════════════════════════

export async function getStorageInfo() {
  const index = loadIndex().filter(f => !f._isFolder);
  const totalSize = index.reduce((s, f) => s + (f.size || 0), 0);
  let quota = null;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      quota = { usage: est.usage, quota: est.quota };
    }
  } catch { /* ignore */ }

  return {
    backend: isOPFSAvailable() ? 'OPFS' : 'localStorage',
    workspace: getActiveWorkspace(),
    fileCount: index.length,
    totalSize,
    folders: getFolderTree().filter(f => f !== '').length,
    quota,
  };
}

// ══════════════════════════════════════════════════════════
//  Init — detect OPFS on first load, ensure default workspace
// ══════════════════════════════════════════════════════════

export async function initStorage() {
  await detectOPFS();
  // Ensure default workspace exists
  const list = loadWorkspaceList();
  if (!list.includes(DEFAULT_WS)) {
    list.unshift(DEFAULT_WS);
    saveWorkspaceList(list);
  }
  if (!localStorage.getItem(ACTIVE_WS_KEY)) {
    localStorage.setItem(ACTIVE_WS_KEY, DEFAULT_WS);
  }
  return { opfs: isOPFSAvailable(), workspace: getActiveWorkspace() };
}
