/**
 * Smart Navigation System
 * 
 * Provides:
 * - Fuzzy search for quick document navigation
 * - Symbol extraction (headings, code blocks, links, etc.)
 * - Command palette actions
 * - Breadcrumb generation
 */

/**
 * Simple fuzzy matching algorithm
 * Returns match score (higher = better match), -1 if no match
 */
export function fuzzyMatch(pattern, text) {
  if (!pattern || !text) return -1;
  
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();
  
  if (text.includes(pattern)) {
    // Exact substring match gets high score
    return 100 + (text.length - pattern.length);
  }
  
  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;
  
  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
      score += 10;
      
      // Consecutive matches get bonus
      if (lastMatchIdx === i - 1) {
        score += 5;
      }
      
      // Word boundary matches get bonus
      if (i === 0 || /\W/.test(text[i - 1])) {
        score += 10;
      }
      
      lastMatchIdx = i;
    }
  }
  
  // All pattern characters must be found
  if (patternIdx !== pattern.length) {
    return -1;
  }
  
  return score;
}

/**
 * Symbol types for navigation
 */
export const SYMBOL_TYPES = {
  HEADING: 'heading',
  CODE_BLOCK: 'code',
  LINK: 'link',
  IMAGE: 'image',
  TABLE: 'table',
  TASK: 'task',
  FOOTNOTE: 'footnote',
};

/**
 * Extract all navigable symbols from Markdown
 */
export function extractSymbols(text) {
  const symbols = [];
  const lines = text.split('\n');
  
  let inCodeBlock = false;
  let codeBlockStart = -1;
  let codeBlockLang = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = lineNum;
        codeBlockLang = line.slice(3).trim() || 'plain';
      } else {
        symbols.push({
          type: SYMBOL_TYPES.CODE_BLOCK,
          text: `Code: ${codeBlockLang}`,
          language: codeBlockLang,
          line: codeBlockStart,
          icon: '💻',
        });
        inCodeBlock = false;
        codeBlockLang = '';
      }
      continue;
    }
    
    if (inCodeBlock) continue;
    
    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      symbols.push({
        type: SYMBOL_TYPES.HEADING,
        text: headingMatch[2].trim(),
        level: headingMatch[1].length,
        line: lineNum,
        icon: ['📄', '📑', '📝', '📋', '📌', '📍'][headingMatch[1].length - 1],
      });
      continue;
    }
    
    // Links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      symbols.push({
        type: SYMBOL_TYPES.LINK,
        text: linkMatch[1],
        url: linkMatch[2],
        line: lineNum,
        icon: '🔗',
      });
    }
    
    // Images
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imageMatch;
    while ((imageMatch = imageRegex.exec(line)) !== null) {
      symbols.push({
        type: SYMBOL_TYPES.IMAGE,
        text: imageMatch[1] || 'Image',
        url: imageMatch[2],
        line: lineNum,
        icon: '🖼️',
      });
    }
    
    // Tables (detect by pipe at start)
    if (line.match(/^\|.*\|$/)) {
      // Only add if previous line wasn't already a table
      const prevLine = i > 0 ? lines[i - 1] : '';
      if (!prevLine.match(/^\|.*\|$/)) {
        symbols.push({
          type: SYMBOL_TYPES.TABLE,
          text: 'Table',
          line: lineNum,
          icon: '📊',
        });
      }
    }
    
    // Task items
    const taskMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.+)$/i);
    if (taskMatch) {
      symbols.push({
        type: SYMBOL_TYPES.TASK,
        text: taskMatch[2].trim(),
        completed: taskMatch[1].toLowerCase() === 'x',
        line: lineNum,
        icon: taskMatch[1].toLowerCase() === 'x' ? '✅' : '⬜',
      });
    }
    
    // Footnotes
    const footnoteMatch = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (footnoteMatch) {
      symbols.push({
        type: SYMBOL_TYPES.FOOTNOTE,
        text: `Footnote: ${footnoteMatch[1]}`,
        line: lineNum,
        icon: '📎',
      });
    }
  }
  
  return symbols;
}

/**
 * Command palette actions
 */
export const PALETTE_COMMANDS = [
  // View commands
  { id: 'view-split', label: 'View: Split Mode', category: 'View', keywords: 'split editor preview' },
  { id: 'view-editor', label: 'View: Editor Only', category: 'View', keywords: 'editor write' },
  { id: 'view-preview', label: 'View: Preview Only', category: 'View', keywords: 'preview read' },
  
  // Mode commands
  { id: 'toggle-dark', label: 'Toggle Dark Mode', category: 'Theme', keywords: 'dark light theme' },
  { id: 'toggle-focus', label: 'Toggle Focus Mode', category: 'Mode', keywords: 'focus distraction free' },
  { id: 'toggle-zen', label: 'Toggle Zen Mode', category: 'Mode', keywords: 'zen fullscreen' },
  { id: 'toggle-vim', label: 'Toggle Vim Mode', category: 'Editor', keywords: 'vim keybindings modal' },
  { id: 'toggle-typewriter', label: 'Toggle Typewriter Mode', category: 'Mode', keywords: 'typewriter center cursor' },
  
  // Panel commands
  { id: 'open-settings', label: 'Open Settings', category: 'Panel', keywords: 'settings preferences config' },
  { id: 'open-ai', label: 'Open AI Assistant', category: 'Panel', keywords: 'ai chat assistant' },
  { id: 'open-analytics', label: 'Open Document Analytics', category: 'Panel', keywords: 'analytics stats words' },
  { id: 'open-themes', label: 'Open Theme Manager', category: 'Panel', keywords: 'themes colors style' },
  { id: 'open-toc', label: 'Open Table of Contents', category: 'Panel', keywords: 'toc contents headings' },
  { id: 'open-cheatsheet', label: 'Open Markdown Cheatsheet', category: 'Help', keywords: 'cheatsheet markdown syntax' },
  { id: 'open-shortcuts', label: 'Open Keyboard Shortcuts', category: 'Help', keywords: 'shortcuts keyboard hotkeys' },
  
  // File commands
  { id: 'file-new', label: 'New Document', category: 'File', keywords: 'new create document' },
  { id: 'file-open', label: 'Open File', category: 'File', keywords: 'open file load' },
  { id: 'file-save', label: 'Save Document', category: 'File', keywords: 'save store' },
  { id: 'file-download', label: 'Download as Markdown', category: 'File', keywords: 'download export md' },
  { id: 'file-export-html', label: 'Export as HTML', category: 'File', keywords: 'export html web' },
  { id: 'file-print', label: 'Print / Export PDF', category: 'File', keywords: 'print pdf export' },
  
  // Share
  { id: 'share-permanent', label: 'Share: Permanent Link', category: 'Share', keywords: 'share link url permanent' },
  { id: 'share-1hour', label: 'Share: 1 Hour Link', category: 'Share', keywords: 'share link temporary' },
  { id: 'share-1day', label: 'Share: 1 Day Link', category: 'Share', keywords: 'share link temporary' },
  
  // Presentation
  { id: 'presentation', label: 'Start Presentation', category: 'View', keywords: 'presentation slideshow fullscreen' },
];

/**
 * Search commands and symbols together
 */
export function searchAll(query, symbols) {
  const results = [];
  
  // Search commands
  for (const cmd of PALETTE_COMMANDS) {
    const searchText = `${cmd.label} ${cmd.category} ${cmd.keywords || ''}`;
    const score = fuzzyMatch(query, searchText);
    if (score >= 0) {
      results.push({
        type: 'command',
        ...cmd,
        score,
      });
    }
  }
  
  // Search symbols
  for (const symbol of symbols) {
    const score = fuzzyMatch(query, symbol.text);
    if (score >= 0) {
      results.push({
        type: 'symbol',
        ...symbol,
        score,
      });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, 20); // Limit to 20 results
}

/**
 * Generate breadcrumb path from headings
 */
export function generateBreadcrumbs(headings, currentLine) {
  if (!headings.length || !currentLine) return [];
  
  const breadcrumbs = [];
  let currentLevel = 0;
  
  // Find all headings before current line
  const relevantHeadings = headings.filter(h => h.line <= currentLine);
  
  // Build breadcrumb trail
  for (const heading of relevantHeadings) {
    // If this heading is same or higher level, reset the trail
    while (breadcrumbs.length > 0 && breadcrumbs[breadcrumbs.length - 1].level >= heading.level) {
      breadcrumbs.pop();
    }
    breadcrumbs.push(heading);
  }
  
  return breadcrumbs;
}

/**
 * Find next/previous heading for navigation
 */
export function findAdjacentHeading(headings, currentLine, direction = 'next') {
  if (!headings.length) return null;
  
  if (direction === 'next') {
    return headings.find(h => h.line > currentLine) || null;
  } else {
    const prev = [...headings].reverse().find(h => h.line < currentLine);
    return prev || null;
  }
}

/**
 * Group symbols by type
 */
export function groupSymbolsByType(symbols) {
  const grouped = {};
  
  for (const symbol of symbols) {
    if (!grouped[symbol.type]) {
      grouped[symbol.type] = [];
    }
    grouped[symbol.type].push(symbol);
  }
  
  return grouped;
}

export default {
  fuzzyMatch,
  extractSymbols,
  searchAll,
  generateBreadcrumbs,
  findAdjacentHeading,
  groupSymbolsByType,
  SYMBOL_TYPES,
  PALETTE_COMMANDS,
};
