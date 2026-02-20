/**
 * Workspace Manager Module
 * 
 * Browser-based file storage using Origin Private File System (OPFS)
 * 
 * Features:
 * - Create, read, update, delete documents
 * - Folder organization
 * - Document metadata (created, modified, tags)
 * - Search across all documents
 * - Import/export workspace
 * - Auto-save with versioning
 */

// Storage keys
const WORKSPACE_META_KEY = 'markviewer_workspace_meta';
const WORKSPACE_INDEX_KEY = 'markviewer_document_index';

/**
 * Check if OPFS is supported
 */
export function isOPFSSupported() {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * Get the OPFS root directory
 */
async function getOPFSRoot() {
  if (!isOPFSSupported()) {
    throw new Error('OPFS is not supported in this browser');
  }
  return await navigator.storage.getDirectory();
}

/**
 * Get or create the markviewer workspace directory
 */
async function getWorkspaceDir() {
  const root = await getOPFSRoot();
  return await root.getDirectoryHandle('markviewer-workspace', { create: true });
}

/**
 * Document metadata structure
 * @typedef {Object} DocumentMeta
 * @property {string} id - Unique document ID
 * @property {string} name - Document name
 * @property {string} path - Virtual path (folder/name)
 * @property {number} created - Creation timestamp
 * @property {number} modified - Last modified timestamp
 * @property {number} size - Content size in bytes
 * @property {string[]} tags - Document tags
 * @property {string} preview - First 200 chars of content
 */

/**
 * Load document index from localStorage
 * @returns {DocumentMeta[]}
 */
export function loadDocumentIndex() {
  try {
    const saved = localStorage.getItem(WORKSPACE_INDEX_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load document index:', e);
    return [];
  }
}

/**
 * Save document index to localStorage
 * @param {DocumentMeta[]} index 
 */
export function saveDocumentIndex(index) {
  try {
    localStorage.setItem(WORKSPACE_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('Failed to save document index:', e);
  }
}

/**
 * Generate a unique document ID
 */
function generateDocId() {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract preview text from markdown content
 */
function extractPreview(content, maxLength = 200) {
  // Strip markdown syntax for preview
  const plain = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text
    .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // Remove bold/italic
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
  
  return plain.length > maxLength ? plain.slice(0, maxLength) + '...' : plain;
}

/**
 * Create a new document
 * @param {string} name - Document name
 * @param {string} content - Initial content
 * @param {string} folder - Virtual folder path (optional)
 * @param {string[]} tags - Document tags (optional)
 * @returns {Promise<DocumentMeta>}
 */
export async function createDocument(name, content = '', folder = '', tags = []) {
  const workspace = await getWorkspaceDir();
  const id = generateDocId();
  const path = folder ? `${folder}/${name}` : name;
  
  // Create the file in OPFS
  const fileHandle = await workspace.getFileHandle(`${id}.md`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  // Create metadata
  const meta = {
    id,
    name,
    path,
    created: Date.now(),
    modified: Date.now(),
    size: new Blob([content]).size,
    tags,
    preview: extractPreview(content),
  };
  
  // Update index
  const index = loadDocumentIndex();
  index.push(meta);
  saveDocumentIndex(index);
  
  return meta;
}

/**
 * Read a document's content
 * @param {string} id - Document ID
 * @returns {Promise<string>}
 */
export async function readDocument(id) {
  const workspace = await getWorkspaceDir();
  
  try {
    const fileHandle = await workspace.getFileHandle(`${id}.md`);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (e) {
    console.error('Failed to read document:', e);
    throw new Error(`Document not found: ${id}`);
  }
}

/**
 * Update a document's content
 * @param {string} id - Document ID
 * @param {string} content - New content
 * @returns {Promise<DocumentMeta>}
 */
export async function updateDocument(id, content) {
  const workspace = await getWorkspaceDir();
  
  try {
    const fileHandle = await workspace.getFileHandle(`${id}.md`);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    
    // Update metadata
    const index = loadDocumentIndex();
    const docIndex = index.findIndex(d => d.id === id);
    
    if (docIndex !== -1) {
      index[docIndex].modified = Date.now();
      index[docIndex].size = new Blob([content]).size;
      index[docIndex].preview = extractPreview(content);
      saveDocumentIndex(index);
      return index[docIndex];
    }
    
    throw new Error('Document metadata not found');
  } catch (e) {
    console.error('Failed to update document:', e);
    throw e;
  }
}

/**
 * Rename a document
 * @param {string} id - Document ID
 * @param {string} newName - New document name
 * @returns {Promise<DocumentMeta>}
 */
export async function renameDocument(id, newName) {
  const index = loadDocumentIndex();
  const docIndex = index.findIndex(d => d.id === id);
  
  if (docIndex === -1) {
    throw new Error('Document not found');
  }
  
  // Update path, keeping the folder structure
  const folder = index[docIndex].path.split('/').slice(0, -1).join('/');
  index[docIndex].name = newName;
  index[docIndex].path = folder ? `${folder}/${newName}` : newName;
  index[docIndex].modified = Date.now();
  
  saveDocumentIndex(index);
  return index[docIndex];
}

/**
 * Delete a document
 * @param {string} id - Document ID
 * @returns {Promise<boolean>}
 */
export async function deleteDocument(id) {
  const workspace = await getWorkspaceDir();
  
  try {
    await workspace.removeEntry(`${id}.md`);
    
    // Remove from index
    const index = loadDocumentIndex();
    const newIndex = index.filter(d => d.id !== id);
    saveDocumentIndex(newIndex);
    
    return true;
  } catch (e) {
    console.error('Failed to delete document:', e);
    return false;
  }
}

/**
 * Move a document to a different folder
 * @param {string} id - Document ID
 * @param {string} newFolder - New folder path
 * @returns {Promise<DocumentMeta>}
 */
export async function moveDocument(id, newFolder) {
  const index = loadDocumentIndex();
  const docIndex = index.findIndex(d => d.id === id);
  
  if (docIndex === -1) {
    throw new Error('Document not found');
  }
  
  index[docIndex].path = newFolder ? `${newFolder}/${index[docIndex].name}` : index[docIndex].name;
  index[docIndex].modified = Date.now();
  
  saveDocumentIndex(index);
  return index[docIndex];
}

/**
 * Update document tags
 * @param {string} id - Document ID
 * @param {string[]} tags - New tags
 * @returns {Promise<DocumentMeta>}
 */
export async function updateDocumentTags(id, tags) {
  const index = loadDocumentIndex();
  const docIndex = index.findIndex(d => d.id === id);
  
  if (docIndex === -1) {
    throw new Error('Document not found');
  }
  
  index[docIndex].tags = tags;
  index[docIndex].modified = Date.now();
  
  saveDocumentIndex(index);
  return index[docIndex];
}

/**
 * Get all unique folders from documents
 * @returns {string[]}
 */
export function getAllFolders() {
  const index = loadDocumentIndex();
  const folders = new Set();
  
  index.forEach(doc => {
    const parts = doc.path.split('/');
    if (parts.length > 1) {
      // Add all parent folders
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    }
  });
  
  return Array.from(folders).sort();
}

/**
 * Get all unique tags from documents
 * @returns {string[]}
 */
export function getAllTags() {
  const index = loadDocumentIndex();
  const tags = new Set();
  
  index.forEach(doc => {
    (doc.tags || []).forEach(tag => tags.add(tag));
  });
  
  return Array.from(tags).sort();
}

/**
 * Search documents by query
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<DocumentMeta[]>}
 */
export async function searchDocuments(query, options = {}) {
  const { searchContent = true, folder = null, tags = [] } = options;
  const index = loadDocumentIndex();
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  for (const doc of index) {
    // Filter by folder
    if (folder && !doc.path.startsWith(folder)) continue;
    
    // Filter by tags
    if (tags.length > 0 && !tags.some(t => doc.tags?.includes(t))) continue;
    
    // Search in name and preview
    if (doc.name.toLowerCase().includes(lowerQuery) ||
        doc.preview.toLowerCase().includes(lowerQuery)) {
      results.push(doc);
      continue;
    }
    
    // Search in content
    if (searchContent) {
      try {
        const content = await readDocument(doc.id);
        if (content.toLowerCase().includes(lowerQuery)) {
          results.push(doc);
        }
      } catch (e) {
        // Skip if can't read
      }
    }
  }
  
  return results;
}

/**
 * Get documents sorted by various criteria
 * @param {Object} options - Sort options
 * @returns {DocumentMeta[]}
 */
export function getDocuments(options = {}) {
  const { 
    folder = null, 
    tags = [], 
    sortBy = 'modified', 
    sortOrder = 'desc',
    limit = null 
  } = options;
  
  let docs = loadDocumentIndex();
  
  // Filter by folder
  if (folder) {
    docs = docs.filter(d => d.path.startsWith(folder));
  }
  
  // Filter by tags
  if (tags.length > 0) {
    docs = docs.filter(d => tags.some(t => d.tags?.includes(t)));
  }
  
  // Sort
  docs.sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'created':
        aVal = a.created;
        bVal = b.created;
        break;
      case 'size':
        aVal = a.size;
        bVal = b.size;
        break;
      case 'modified':
      default:
        aVal = a.modified;
        bVal = b.modified;
        break;
    }
    
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
  
  // Limit
  if (limit && limit > 0) {
    docs = docs.slice(0, limit);
  }
  
  return docs;
}

/**
 * Export entire workspace as JSON
 * @returns {Promise<Object>}
 */
export async function exportWorkspace() {
  const index = loadDocumentIndex();
  const documents = [];
  
  for (const meta of index) {
    try {
      const content = await readDocument(meta.id);
      documents.push({
        ...meta,
        content,
      });
    } catch (e) {
      console.warn(`Failed to export document ${meta.id}:`, e);
    }
  }
  
  return {
    version: 1,
    exported: Date.now(),
    documents,
  };
}

/**
 * Import workspace from JSON
 * @param {Object} data - Exported workspace data
 * @param {boolean} merge - Merge with existing or replace
 * @returns {Promise<number>} Number of imported documents
 */
export async function importWorkspace(data, merge = true) {
  if (!data?.documents || !Array.isArray(data.documents)) {
    throw new Error('Invalid workspace data format');
  }
  
  if (!merge) {
    // Clear existing workspace
    const index = loadDocumentIndex();
    for (const doc of index) {
      await deleteDocument(doc.id);
    }
  }
  
  let imported = 0;
  
  for (const doc of data.documents) {
    try {
      await createDocument(
        doc.name,
        doc.content,
        doc.path?.split('/').slice(0, -1).join('/') || '',
        doc.tags || []
      );
      imported++;
    } catch (e) {
      console.warn(`Failed to import document ${doc.name}:`, e);
    }
  }
  
  return imported;
}

/**
 * Get workspace statistics
 * @returns {Object}
 */
export function getWorkspaceStats() {
  const index = loadDocumentIndex();
  
  return {
    totalDocuments: index.length,
    totalSize: index.reduce((sum, d) => sum + d.size, 0),
    folders: getAllFolders().length,
    tags: getAllTags().length,
    recentlyModified: index
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 5),
  };
}

/**
 * Create a version/backup of a document
 * @param {string} id - Document ID
 * @returns {Promise<string>} Version ID
 */
export async function createDocumentVersion(id) {
  const workspace = await getWorkspaceDir();
  const versionsDir = await workspace.getDirectoryHandle('_versions', { create: true });
  const content = await readDocument(id);
  
  const versionId = `${id}_v${Date.now()}`;
  const fileHandle = await versionsDir.getFileHandle(`${versionId}.md`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  return versionId;
}

/**
 * Get all versions of a document
 * @param {string} id - Document ID
 * @returns {Promise<string[]>} Version IDs
 */
export async function getDocumentVersions(id) {
  try {
    const workspace = await getWorkspaceDir();
    const versionsDir = await workspace.getDirectoryHandle('_versions');
    const versions = [];
    
    for await (const [name] of versionsDir.entries()) {
      if (name.startsWith(id + '_v')) {
        versions.push(name.replace('.md', ''));
      }
    }
    
    return versions.sort().reverse();
  } catch (e) {
    return [];
  }
}

/**
 * Restore a document version
 * @param {string} id - Document ID
 * @param {string} versionId - Version ID to restore
 * @returns {Promise<DocumentMeta>}
 */
export async function restoreDocumentVersion(id, versionId) {
  const workspace = await getWorkspaceDir();
  const versionsDir = await workspace.getDirectoryHandle('_versions');
  
  const fileHandle = await versionsDir.getFileHandle(`${versionId}.md`);
  const file = await fileHandle.getFile();
  const content = await file.text();
  
  return await updateDocument(id, content);
}

// Fallback to localStorage if OPFS not supported
class LocalStorageFallback {
  constructor() {
    this.prefix = 'markviewer_doc_';
  }
  
  async createDocument(name, content = '', folder = '', tags = []) {
    const id = generateDocId();
    const path = folder ? `${folder}/${name}` : name;
    
    localStorage.setItem(this.prefix + id, content);
    
    const meta = {
      id,
      name,
      path,
      created: Date.now(),
      modified: Date.now(),
      size: new Blob([content]).size,
      tags,
      preview: extractPreview(content),
    };
    
    const index = loadDocumentIndex();
    index.push(meta);
    saveDocumentIndex(index);
    
    return meta;
  }
  
  async readDocument(id) {
    const content = localStorage.getItem(this.prefix + id);
    if (content === null) {
      throw new Error(`Document not found: ${id}`);
    }
    return content;
  }
  
  async updateDocument(id, content) {
    localStorage.setItem(this.prefix + id, content);
    
    const index = loadDocumentIndex();
    const docIndex = index.findIndex(d => d.id === id);
    
    if (docIndex !== -1) {
      index[docIndex].modified = Date.now();
      index[docIndex].size = new Blob([content]).size;
      index[docIndex].preview = extractPreview(content);
      saveDocumentIndex(index);
      return index[docIndex];
    }
    
    throw new Error('Document metadata not found');
  }
  
  async deleteDocument(id) {
    localStorage.removeItem(this.prefix + id);
    
    const index = loadDocumentIndex();
    const newIndex = index.filter(d => d.id !== id);
    saveDocumentIndex(newIndex);
    
    return true;
  }
}

// Export the appropriate implementation
export const workspace = isOPFSSupported() 
  ? { createDocument, readDocument, updateDocument, deleteDocument, renameDocument, moveDocument }
  : new LocalStorageFallback();

export default {
  isOPFSSupported,
  createDocument,
  readDocument,
  updateDocument,
  deleteDocument,
  renameDocument,
  moveDocument,
  updateDocumentTags,
  getAllFolders,
  getAllTags,
  searchDocuments,
  getDocuments,
  exportWorkspace,
  importWorkspace,
  getWorkspaceStats,
  createDocumentVersion,
  getDocumentVersions,
  restoreDocumentVersion,
  loadDocumentIndex,
};
