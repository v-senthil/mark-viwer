/**
 * Document Analytics Module
 * 
 * Provides comprehensive real-time document analysis:
 * - Basic stats (words, characters, sentences, paragraphs, lines)
 * - Readability scores (Flesch Reading Ease, Flesch-Kincaid Grade)
 * - Vocabulary analysis (unique words, lexical density, top words)
 * - Structure analysis (headings, sections, paragraphs)
 * - Link checking (internal anchors vs external links)
 * - Word goals with progress tracking
 */

// Common English stop words for vocabulary analysis
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'i', 'you',
  'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'this',
  'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'would', 'could', 'ought', 'im', 'youre', 'hes', 'shes', 'its', 'were',
  'theyre', 'ive', 'youve', 'weve', 'theyve', 'id', 'youd', 'hed', 'shed',
  'wed', 'theyd', 'ill', 'youll', 'hell', 'shell', 'well', 'theyll',
  'isnt', 'arent', 'wasnt', 'werent', 'hasnt', 'havent', 'hadnt', 'doesnt',
  'dont', 'didnt', 'wont', 'wouldnt', 'shant', 'shouldnt', 'cant', 'cannot',
  'couldnt', 'mustnt', 'lets', 'thats', 'whos', 'whats', 'heres', 'theres',
  'whens', 'wheres', 'whys', 'hows', 'because', 'as', 'until', 'while',
  'also', 'over', 'any', 'both', 'either', 'neither', 'much', 'many',
]);

// Storage key for word goals
export const GOALS_STORAGE_KEY = 'markviewer_word_goals';

/**
 * Count syllables in a word (English approximation)
 * Based on the CMU algorithm with improvements
 */
function countSyllables(word) {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;
  
  // Remove trailing 'e' (silent e)
  word = word.replace(/(?:[^leas]e|ed|[^aeiou]e)$/, '');
  word = word.replace(/^re/, 're'); // Keep 're' prefix
  
  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  
  // Adjustments for common patterns
  if (word.endsWith('le') && word.length > 2 && !/[aeiou]le$/.test(word)) count++;
  if (word.endsWith('les') && word.length > 3) count--;
  if (word.endsWith('es') || word.endsWith('ed')) count = Math.max(1, count - 1);
  
  return Math.max(1, count);
}

/**
 * Extract plain text from Markdown, removing syntax
 */
function stripMarkdown(text) {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove blockquotes
    .replace(/^\s*>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove task list markers
    .replace(/^\s*[-*+]\s*\[[ x]\]\s*/gm, '')
    // Remove table formatting
    .replace(/\|/g, ' ')
    .replace(/^[-:| ]+$/gm, '')
    // Remove footnotes
    .replace(/\[\^[^\]]+\]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract words from text
 */
function extractWords(text) {
  const plainText = stripMarkdown(text);
  return plainText
    .toLowerCase()
    .split(/[\s\-—]+/)
    .map(w => w.replace(/[^a-z0-9']/gi, ''))
    .filter(w => w.length > 0);
}

/**
 * Extract sentences from text
 */
function extractSentences(text) {
  const plainText = stripMarkdown(text);
  return plainText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Extract paragraphs from Markdown
 */
function extractParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.match(/^```/) && !p.match(/^[-*_]{3,}$/));
}

/**
 * Extract headings from Markdown
 */
function extractHeadings(text) {
  const headings = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: lines.indexOf(line) + 1,
      });
    }
  }
  
  return headings;
}

/**
 * Extract code blocks from Markdown
 */
function extractCodeBlocks(text) {
  const blocks = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'plain',
      content: match[2],
      lines: match[2].split('\n').length,
    });
  }
  
  return blocks;
}

/**
 * Extract links from Markdown
 */
function extractLinks(text) {
  const links = [];
  
  // Standard links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    const url = match[2];
    links.push({
      text: match[1],
      url,
      type: url.startsWith('#') ? 'anchor' 
          : url.startsWith('mailto:') ? 'email'
          : url.startsWith('http') ? 'external' 
          : 'internal',
    });
  }
  
  // Reference-style links
  const refRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;
  while ((match = refRegex.exec(text)) !== null) {
    const url = match[2].trim();
    links.push({
      text: match[1],
      url,
      type: url.startsWith('#') ? 'anchor' 
          : url.startsWith('mailto:') ? 'email'
          : url.startsWith('http') ? 'external' 
          : 'internal',
    });
  }
  
  return links;
}

/**
 * Extract images from Markdown
 */
function extractImages(text) {
  const images = [];
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
      isBase64: match[2].startsWith('data:'),
    });
  }
  
  return images;
}

/**
 * Extract tables from Markdown
 */
function extractTables(text) {
  const tables = [];
  const lines = text.split('\n');
  let tableStart = -1;
  let tableLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableLine = line.startsWith('|') && line.endsWith('|');
    const isSeparator = /^\|[-: |]+\|$/.test(line);
    
    if (isTableLine || isSeparator) {
      if (tableStart === -1) tableStart = i;
      tableLines.push(line);
    } else if (tableStart !== -1) {
      // End of table
      if (tableLines.length >= 2) {
        const rows = tableLines.filter(l => !/^[-: |]+$/.test(l)).length;
        const cols = (tableLines[0].match(/\|/g) || []).length - 1;
        tables.push({
          startLine: tableStart + 1,
          rows,
          columns: Math.max(1, cols),
        });
      }
      tableStart = -1;
      tableLines = [];
    }
  }
  
  // Handle table at end of document
  if (tableStart !== -1 && tableLines.length >= 2) {
    const rows = tableLines.filter(l => !/^[-: |]+$/.test(l)).length;
    const cols = (tableLines[0].match(/\|/g) || []).length - 1;
    tables.push({
      startLine: tableStart + 1,
      rows,
      columns: Math.max(1, cols),
    });
  }
  
  return tables;
}

/**
 * Calculate Flesch Reading Ease score
 * Higher = easier to read (0-100 scale, can exceed)
 */
function calculateFleschReadingEase(words, sentences, syllables) {
  if (words === 0 || sentences === 0) return 0;
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  return 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Returns US grade level needed to understand text
 */
function calculateFleschKincaidGrade(words, sentences, syllables) {
  if (words === 0 || sentences === 0) return 0;
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  return (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
}

/**
 * Get reading ease interpretation
 */
function getReadingEaseLabel(score) {
  if (score >= 90) return { label: 'Very Easy', color: 'green' };
  if (score >= 80) return { label: 'Easy', color: 'green' };
  if (score >= 70) return { label: 'Fairly Easy', color: 'blue' };
  if (score >= 60) return { label: 'Standard', color: 'blue' };
  if (score >= 50) return { label: 'Fairly Difficult', color: 'yellow' };
  if (score >= 30) return { label: 'Difficult', color: 'orange' };
  return { label: 'Very Difficult', color: 'red' };
}

/**
 * Get top words (excluding stop words)
 */
function getTopWords(words, limit = 10) {
  const wordCounts = {};
  
  for (const word of words) {
    if (word.length < 2 || STOP_WORDS.has(word) || /^\d+$/.test(word)) continue;
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Check for skipped heading levels (e.g., h1 -> h3 without h2)
 */
function checkHeadingStructure(headings) {
  const warnings = [];
  
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    
    if (curr > prev + 1) {
      warnings.push({
        type: 'skipped_level',
        message: `Heading jumps from H${prev} to H${curr}`,
        line: headings[i].line,
        heading: headings[i].text,
      });
    }
  }
  
  // Check for multiple H1s
  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count > 1) {
    warnings.push({
      type: 'multiple_h1',
      message: `Document has ${h1Count} H1 headings (recommended: 1)`,
    });
  }
  
  return warnings;
}

/**
 * Calculate section word counts (words between headings)
 */
function getSectionWordCounts(text, headings) {
  if (headings.length === 0) {
    return [{ heading: '(No heading)', words: extractWords(text).length }];
  }
  
  const sections = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < headings.length; i++) {
    const startLine = headings[i].line;
    const endLine = i < headings.length - 1 ? headings[i + 1].line - 1 : lines.length;
    
    const sectionText = lines.slice(startLine, endLine).join('\n');
    const words = extractWords(sectionText).length;
    
    sections.push({
      heading: headings[i].text,
      level: headings[i].level,
      words,
    });
  }
  
  // Content before first heading
  if (headings.length > 0 && headings[0].line > 1) {
    const preContent = lines.slice(0, headings[0].line - 1).join('\n');
    const preWords = extractWords(preContent).length;
    if (preWords > 0) {
      sections.unshift({
        heading: '(Introduction)',
        level: 0,
        words: preWords,
      });
    }
  }
  
  return sections;
}

/**
 * Find longest and shortest paragraphs
 */
function getParagraphStats(paragraphs) {
  if (paragraphs.length === 0) {
    return { longest: null, shortest: null };
  }
  
  const withCounts = paragraphs.map(p => ({
    text: p.slice(0, 100) + (p.length > 100 ? '...' : ''),
    words: extractWords(p).length,
    full: p,
  }));
  
  const sorted = [...withCounts].sort((a, b) => b.words - a.words);
  
  return {
    longest: sorted[0],
    shortest: sorted[sorted.length - 1],
    average: Math.round(withCounts.reduce((sum, p) => sum + p.words, 0) / paragraphs.length),
  };
}

/**
 * Load word goal from localStorage
 */
export function loadWordGoal() {
  try {
    const saved = localStorage.getItem(GOALS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load word goal:', e);
  }
  return { target: 0, notified: false };
}

/**
 * Save word goal to localStorage
 */
export function saveWordGoal(goal) {
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goal));
  } catch (e) {
    console.warn('Failed to save word goal:', e);
  }
}

/**
 * Main analytics function - computes all metrics
 * @param {string} text - The Markdown document content
 * @returns {Object} Comprehensive analytics object
 */
export function analyzeDocument(text) {
  // Basic extraction
  const words = extractWords(text);
  const sentences = extractSentences(text);
  const paragraphs = extractParagraphs(text);
  const headings = extractHeadings(text);
  const codeBlocks = extractCodeBlocks(text);
  const links = extractLinks(text);
  const images = extractImages(text);
  const tables = extractTables(text);
  
  // Syllable count for readability
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  // Unique words
  const uniqueWords = new Set(words);
  
  // Readability scores
  const fleschReadingEase = calculateFleschReadingEase(words.length, sentences.length, totalSyllables);
  const fleschKincaidGrade = calculateFleschKincaidGrade(words.length, sentences.length, totalSyllables);
  const readingEaseInfo = getReadingEaseLabel(fleschReadingEase);
  
  // Estimated reading time (average 200-250 wpm)
  const readingTimeMinutes = Math.ceil(words.length / 225);
  const speakingTimeMinutes = Math.ceil(words.length / 150);
  
  // Top words
  const topWords = getTopWords(words, 10);
  
  // Heading structure check
  const headingWarnings = checkHeadingStructure(headings);
  
  // Section analysis
  const sectionWordCounts = getSectionWordCounts(text, headings);
  
  // Paragraph stats
  const paragraphStats = getParagraphStats(paragraphs);
  
  // Link categorization
  const linksByType = {
    external: links.filter(l => l.type === 'external'),
    internal: links.filter(l => l.type === 'internal'),
    anchor: links.filter(l => l.type === 'anchor'),
    email: links.filter(l => l.type === 'email'),
  };
  
  return {
    // Basic stats
    basic: {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      lines: text.split('\n').length,
    },
    
    // Content breakdown
    content: {
      headings: headings.length,
      headingsByLevel: {
        h1: headings.filter(h => h.level === 1).length,
        h2: headings.filter(h => h.level === 2).length,
        h3: headings.filter(h => h.level === 3).length,
        h4: headings.filter(h => h.level === 4).length,
        h5: headings.filter(h => h.level === 5).length,
        h6: headings.filter(h => h.level === 6).length,
      },
      codeBlocks: codeBlocks.length,
      codeBlocksByLanguage: codeBlocks.reduce((acc, b) => {
        acc[b.language] = (acc[b.language] || 0) + 1;
        return acc;
      }, {}),
      totalCodeLines: codeBlocks.reduce((sum, b) => sum + b.lines, 0),
      links: links.length,
      linksByType,
      images: images.length,
      imagesBase64: images.filter(i => i.isBase64).length,
      tables: tables.length,
    },
    
    // Readability
    readability: {
      fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
      fleschReadingEaseLabel: readingEaseInfo.label,
      fleschReadingEaseColor: readingEaseInfo.color,
      fleschKincaidGrade: Math.round(Math.max(0, fleschKincaidGrade) * 10) / 10,
      avgSyllablesPerWord: words.length > 0 ? Math.round((totalSyllables / words.length) * 100) / 100 : 0,
      avgWordsPerSentence: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
      readingTime: readingTimeMinutes,
      speakingTime: speakingTimeMinutes,
    },
    
    // Vocabulary
    vocabulary: {
      uniqueWords: uniqueWords.size,
      lexicalDensity: words.length > 0 ? Math.round((uniqueWords.size / words.length) * 100) : 0,
      topWords,
    },
    
    // Structure
    structure: {
      headings,
      headingWarnings,
      sections: sectionWordCounts,
      paragraphStats,
    },
    
    // Raw data for advanced use
    raw: {
      words,
      sentences,
      paragraphs,
      headings,
      codeBlocks,
      links,
      images,
      tables,
    },
  };
}

/**
 * Generate a summary string for status bar
 */
export function getAnalyticsSummary(analytics) {
  const { basic, readability } = analytics;
  return `${basic.words} words · ${basic.sentences} sentences · ${readability.readingTime} min read`;
}

export default analyzeDocument;
