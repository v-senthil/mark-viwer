/**
 * Tauri native helpers — file open/save using Tauri dialog + fs plugins.
 * Falls back gracefully when running in browser (non-Tauri).
 */

let _isTauri = null;

export function isTauri() {
  if (_isTauri === null) {
    _isTauri = !!(window && window.__TAURI_INTERNALS__);
  }
  return _isTauri;
}

/**
 * Open a markdown file using native file dialog.
 * Returns { content, name } or null if cancelled.
 */
export async function nativeOpenFile() {
  if (!isTauri()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const { readTextFile } = await import('@tauri-apps/plugin-fs');

  const selected = await open({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'txt', 'markdown'] }],
  });

  if (!selected) return null;

  const path = typeof selected === 'string' ? selected : selected.path;
  if (!path) return null;

  const content = await readTextFile(path);
  const name = path.split('/').pop();
  return { content, name, path };
}

/**
 * Save content to a file using native save dialog.
 * Returns the saved file path, or null if cancelled.
 */
export async function nativeSaveFile(content, defaultName = 'document.md') {
  if (!isTauri()) return null;
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeTextFile } = await import('@tauri-apps/plugin-fs');

  const filePath = await save({
    defaultPath: defaultName,
    filters: [{ name: 'Markdown', extensions: ['md', 'txt', 'markdown'] }],
  });

  if (!filePath) return null;

  await writeTextFile(filePath, content);
  return filePath;
}
