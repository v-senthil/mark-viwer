/**
 * Advanced Theming System
 * 
 * Provides:
 * - Multiple editor themes with light/dark variants
 * - Preview themes with customizable CSS
 * - Theme presets (editor + preview combos)
 * - Custom theme creation via CSS variables
 * - Theme import/export
 */

// ═══════════════════════════════════════════════════════════════
// EDITOR THEME DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const EDITOR_THEMES = [
  { id: 'github', name: 'GitHub', description: 'Clean and professional' },
  { id: 'dracula', name: 'Dracula', description: 'Dark purple aesthetic' },
  { id: 'nord', name: 'Nord', description: 'Arctic, bluish color palette' },
  { id: 'solarized', name: 'Solarized', description: 'Low contrast, eye-friendly' },
  { id: 'monokai', name: 'Monokai', description: 'Classic Sublime Text theme' },
  { id: 'gruvbox', name: 'Gruvbox', description: 'Retro groove colors' },
  { id: 'tokyo-night', name: 'Tokyo Night', description: 'Clean dark theme' },
  { id: 'material', name: 'Material', description: 'Google Material Design' },
  { id: 'ayu', name: 'Ayu', description: 'Minimal and elegant' },
  { id: 'catppuccin', name: 'Catppuccin', description: 'Pastel theme' },
];

// ═══════════════════════════════════════════════════════════════
// PREVIEW THEME DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const PREVIEW_THEMES = [
  { 
    id: 'github', 
    name: 'GitHub', 
    description: 'GitHub Markdown style',
    cssClass: 'preview-theme-github',
  },
  { 
    id: 'notion', 
    name: 'Notion', 
    description: 'Clean Notion-like style',
    cssClass: 'preview-theme-notion',
  },
  { 
    id: 'minimal', 
    name: 'Minimal', 
    description: 'Ultra-clean minimal design',
    cssClass: 'preview-theme-minimal',
  },
  { 
    id: 'academic', 
    name: 'Academic', 
    description: 'Scholarly paper style',
    cssClass: 'preview-theme-academic',
  },
  { 
    id: 'typewriter', 
    name: 'Typewriter', 
    description: 'Vintage typewriter aesthetic',
    cssClass: 'preview-theme-typewriter',
  },
  { 
    id: 'newspaper', 
    name: 'Newspaper', 
    description: 'Multi-column news layout',
    cssClass: 'preview-theme-newspaper',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Optimized for technical docs',
    cssClass: 'preview-theme-developer',
  },
];

// ═══════════════════════════════════════════════════════════════
// THEME PRESETS (Editor + Preview combinations)
// ═══════════════════════════════════════════════════════════════

export const THEME_PRESETS = [
  {
    id: 'default-light',
    name: 'Default Light',
    editorTheme: 'github',
    previewTheme: 'github',
    darkMode: false,
    description: 'Clean and professional light theme',
  },
  {
    id: 'default-dark',
    name: 'Default Dark',
    editorTheme: 'github',
    previewTheme: 'github',
    darkMode: true,
    description: 'Clean and professional dark theme',
  },
  {
    id: 'dracula',
    name: 'Dracula Night',
    editorTheme: 'dracula',
    previewTheme: 'github',
    darkMode: true,
    description: 'Purple-tinted dark theme',
  },
  {
    id: 'nord-aurora',
    name: 'Nord Aurora',
    editorTheme: 'nord',
    previewTheme: 'minimal',
    darkMode: true,
    description: 'Arctic bluish palette',
  },
  {
    id: 'academic',
    name: 'Academic Writer',
    editorTheme: 'github',
    previewTheme: 'academic',
    darkMode: false,
    description: 'Perfect for papers and essays',
  },
  {
    id: 'developer',
    name: 'Developer Focus',
    editorTheme: 'monokai',
    previewTheme: 'developer',
    darkMode: true,
    description: 'Optimized for technical documentation',
  },
  {
    id: 'vintage',
    name: 'Vintage Writer',
    editorTheme: 'gruvbox',
    previewTheme: 'typewriter',
    darkMode: false,
    description: 'Classic typewriter aesthetic',
  },
  {
    id: 'material',
    name: 'Material You',
    editorTheme: 'material',
    previewTheme: 'notion',
    darkMode: true,
    description: 'Google Material Design inspired',
  },
];

// ═══════════════════════════════════════════════════════════════
// PREVIEW THEME CSS (injected dynamically)
// ═══════════════════════════════════════════════════════════════

export const PREVIEW_THEME_CSS = {
  academic: `
    .preview-theme-academic {
      font-family: 'Times New Roman', 'Georgia', serif;
      max-width: 700px;
      margin: 0 auto;
    }
    .preview-theme-academic h1 {
      text-align: center;
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    .preview-theme-academic h2 {
      border-bottom: none;
      font-size: 1.3rem;
      margin-top: 2rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .preview-theme-academic p {
      text-align: justify;
      text-indent: 2em;
      line-height: 2;
    }
    .preview-theme-academic p:first-of-type {
      text-indent: 0;
    }
    .preview-theme-academic blockquote {
      font-style: italic;
      border-left: 2px solid #666;
      padding-left: 1.5em;
      margin-left: 0;
    }
    .preview-theme-academic code {
      font-family: 'Courier New', monospace;
    }
  `,
  
  typewriter: `
    .preview-theme-typewriter {
      font-family: 'Courier New', 'Courier', monospace;
      background: #faf8f5;
      color: #2d2d2d;
      max-width: 650px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.8;
    }
    .dark .preview-theme-typewriter {
      background: #1a1a1a;
      color: #d4d4d4;
    }
    .preview-theme-typewriter h1,
    .preview-theme-typewriter h2,
    .preview-theme-typewriter h3 {
      font-weight: normal;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-top: 2em;
    }
    .preview-theme-typewriter h1 {
      text-align: center;
      border-bottom: 1px solid currentColor;
      padding-bottom: 0.5em;
    }
    .preview-theme-typewriter blockquote {
      border-left: 3px solid #999;
      padding-left: 1em;
      font-style: italic;
    }
    .preview-theme-typewriter hr {
      border: none;
      text-align: center;
      margin: 2em 0;
    }
    .preview-theme-typewriter hr::before {
      content: '* * *';
      color: #999;
    }
  `,
  
  newspaper: `
    .preview-theme-newspaper {
      font-family: 'Georgia', serif;
      max-width: 900px;
      margin: 0 auto;
    }
    .preview-theme-newspaper h1 {
      font-family: 'Times New Roman', serif;
      font-size: 2.5rem;
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .dark .preview-theme-newspaper h1 {
      border-bottom-color: #666;
    }
    .preview-theme-newspaper h2 {
      font-size: 1.4rem;
      border-bottom: 1px solid #ccc;
    }
    .preview-theme-newspaper > p {
      column-count: 2;
      column-gap: 2rem;
      text-align: justify;
    }
    @media (max-width: 600px) {
      .preview-theme-newspaper > p {
        column-count: 1;
      }
    }
    .preview-theme-newspaper blockquote {
      font-style: italic;
      border-left: 4px solid #333;
      padding-left: 1rem;
      margin: 1rem 0;
    }
  `,
  
  developer: `
    .preview-theme-developer {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .preview-theme-developer h1,
    .preview-theme-developer h2,
    .preview-theme-developer h3 {
      font-weight: 600;
    }
    .preview-theme-developer h1 {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.5rem;
    }
    .preview-theme-developer code:not(pre code) {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .dark .preview-theme-developer code:not(pre code) {
      background: rgba(96, 165, 250, 0.15);
      color: #60a5fa;
    }
    .preview-theme-developer pre {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .dark .preview-theme-developer pre {
      border-color: #374151;
    }
    .preview-theme-developer blockquote {
      border-left: 4px solid #3b82f6;
      background: rgba(59, 130, 246, 0.05);
      padding: 1rem;
      border-radius: 0 8px 8px 0;
    }
    .preview-theme-developer table {
      border: 1px solid #e5e7eb;
    }
    .dark .preview-theme-developer table {
      border-color: #374151;
    }
    .preview-theme-developer th {
      background: #f3f4f6;
    }
    .dark .preview-theme-developer th {
      background: #1f2937;
    }
  `,
};

// ═══════════════════════════════════════════════════════════════
// CUSTOM THEME SYSTEM
// ═══════════════════════════════════════════════════════════════

export const CUSTOM_THEME_STORAGE_KEY = 'markviewer_custom_themes';

/**
 * Custom theme structure
 */
export const createCustomTheme = (name, overrides = {}) => ({
  id: `custom-${Date.now()}`,
  name,
  isCustom: true,
  createdAt: Date.now(),
  colors: {
    // Editor colors
    editorBackground: overrides.editorBackground || '#1e1e1e',
    editorForeground: overrides.editorForeground || '#d4d4d4',
    editorLineNumber: overrides.editorLineNumber || '#858585',
    editorSelection: overrides.editorSelection || '#264f78',
    editorCursor: overrides.editorCursor || '#aeafad',
    
    // Preview colors
    previewBackground: overrides.previewBackground || '#ffffff',
    previewForeground: overrides.previewForeground || '#1e293b',
    previewHeading: overrides.previewHeading || '#0f172a',
    previewLink: overrides.previewLink || '#3b82f6',
    previewCode: overrides.previewCode || '#f1f5f9',
    previewBlockquote: overrides.previewBlockquote || '#eff6ff',
    
    // UI colors  
    uiBackground: overrides.uiBackground || '#0d1117',
    uiBorder: overrides.uiBorder || '#21262d',
    uiAccent: overrides.uiAccent || '#3b82f6',
  },
});

/**
 * Load custom themes from localStorage
 */
export function loadCustomThemes() {
  try {
    const saved = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load custom themes:', e);
    return [];
  }
}

/**
 * Save custom themes to localStorage
 */
export function saveCustomThemes(themes) {
  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(themes));
  } catch (e) {
    console.warn('Failed to save custom themes:', e);
  }
}

/**
 * Apply custom theme colors as CSS variables
 */
export function applyCustomThemeColors(theme) {
  const root = document.documentElement;
  const { colors } = theme;
  
  if (!colors) return;
  
  // Apply CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
}

/**
 * Export theme as JSON for sharing
 */
export function exportTheme(theme) {
  const data = JSON.stringify(theme, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import theme from JSON file
 */
export function importTheme(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const theme = JSON.parse(e.target.result);
        if (!theme.name || !theme.colors) {
          reject(new Error('Invalid theme format'));
          return;
        }
        // Assign new ID to avoid conflicts
        theme.id = `custom-${Date.now()}`;
        theme.isCustom = true;
        theme.createdAt = Date.now();
        resolve(theme);
      } catch (err) {
        reject(new Error('Failed to parse theme file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ═══════════════════════════════════════════════════════════════
// INJECT PREVIEW THEME STYLES
// ═══════════════════════════════════════════════════════════════

let injectedStyleEl = null;

/**
 * Inject preview theme CSS into the document
 */
export function injectPreviewThemeStyles() {
  if (injectedStyleEl) return; // Already injected
  
  const css = Object.values(PREVIEW_THEME_CSS).join('\n');
  injectedStyleEl = document.createElement('style');
  injectedStyleEl.id = 'markviewer-preview-themes';
  injectedStyleEl.textContent = css;
  document.head.appendChild(injectedStyleEl);
}

// Auto-inject on import
if (typeof document !== 'undefined') {
  injectPreviewThemeStyles();
}

export default {
  EDITOR_THEMES,
  PREVIEW_THEMES,
  THEME_PRESETS,
  PREVIEW_THEME_CSS,
  createCustomTheme,
  loadCustomThemes,
  saveCustomThemes,
  applyCustomThemeColors,
  exportTheme,
  importTheme,
  injectPreviewThemeStyles,
};
