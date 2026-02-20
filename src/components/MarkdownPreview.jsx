import { useMemo, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import plantumlEncoder from 'plantuml-encoder';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

// Configure marked with custom renderer (marked v12+ API)
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    // Code blocks with syntax highlighting, mermaid & PlantUML support
    code(token) {
      // Handle both object form and legacy positional args
      const code = typeof token === 'string' ? token : (token?.text || token?.code || '');
      const lang = typeof token === 'string' ? arguments[1] : (token?.lang || '');
      
      if (!code && code !== '') {
        return '<pre><code></code></pre>';
      }
      
      if (lang === 'mermaid') {
        const id = 'mermaid-' + Math.random().toString(36).slice(2, 10);
        return `<div class="mermaid-diagram" data-mermaid-id="${id}">${code}</div>`;
      }
      if (lang === 'plantuml' || lang === 'planttext' || lang === 'puml') {
        try {
          const encoded = plantumlEncoder.encode(code);
          const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
          return `<div class="plantuml-diagram"><img src="${url}" alt="PlantUML Diagram" style="max-width:100%;background:white;border-radius:8px;padding:8px" /></div>`;
        } catch (e) {
          return `<pre class="text-red-500 text-sm">PlantUML Error: ${e.message}</pre>`;
        }
      }
      
      let highlighted;
      try {
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(code, { language: lang }).value;
        } else {
          highlighted = hljs.highlightAuto(code).value;
        }
      } catch (e) {
        // Fallback to plain text if highlighting fails
        highlighted = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>`;
    },

    // Links open in new tab
    link(token) {
      const href = typeof token === 'string' ? token : (token?.href || '');
      const title = typeof token === 'string' ? arguments[1] : (token?.title || '');
      const text = typeof token === 'string' ? arguments[2] : (token?.text || '');
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  }
});

// KaTeX processing
function processKaTeX(html) {
  // Display math: $$...$$ (must have content, not just whitespace)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    if (!tex.trim()) return '$$$$';
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch (e) {
      return `<span class="text-red-500">KaTeX Error: ${e.message}</span>`;
    }
  });
  // Inline math: $...$ 
  // - Not preceded by $ (to avoid matching $$)
  // - Not followed by digit (to avoid $15 currency)
  // - Content cannot start with digit (currency) or space
  // - Content cannot contain HTML tags (< or >)
  // - Must end with $ not followed by digit
  html = html.replace(/(?<!\$)\$(?!\d)([^$<>\n]+?)\$(?!\d)/g, (match, tex) => {
    // Skip if it looks like currency or is empty
    if (!tex.trim() || /^\d/.test(tex.trim())) return match;
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return match; // Return original if KaTeX fails
    }
  });
  return html;
}

// Footnote processing
function processFootnotes(html) {
  const footnotes = {};
  // Find footnote definitions [^x]: content
  html = html.replace(/<p>\[\^(\w+)\]:\s*(.*?)<\/p>/g, (_, id, content) => {
    footnotes[id] = content;
    return '';
  });
  // Replace footnote references [^x]
  html = html.replace(/\[\^(\w+)\]/g, (_, id) => {
    if (footnotes[id]) {
      return `<sup class="text-blue-500 cursor-help" title="${footnotes[id]}">[${id}]</sup>`;
    }
    return `<sup>[${id}]</sup>`;
  });
  // Add footnotes section at bottom
  const fnEntries = Object.entries(footnotes);
  if (fnEntries.length > 0) {
    html += '<hr><section class="text-sm opacity-75"><h4>Footnotes</h4><ol>';
    for (const [id, content] of fnEntries) {
      html += `<li id="fn-${id}">${content}</li>`;
    }
    html += '</ol></section>';
  }
  return html;
}

export default function MarkdownPreview({ content, settings, onTOC }) {
  const previewRef = useRef(null);
  const onTOCRef = useRef(onTOC);
  useEffect(() => { onTOCRef.current = onTOC; }, [onTOC]);

  const html = useMemo(() => {
    if (!content) return '';

    let raw = marked.parse(content);
    raw = processKaTeX(raw);
    raw = processFootnotes(raw);

    // Sanitize
    const clean = DOMPurify.sanitize(raw, {
      ADD_TAGS: ['foreignObject', 'desc', 'title', 'svg', 'path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'image', 'style', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'input'],
      ADD_ATTR: ['xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'transform', 'points', 'marker-end', 'marker-start', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'data-mermaid-id', 'class', 'id', 'style', 'src', 'alt', 'type', 'checked', 'disabled', 'colspan', 'rowspan', 'scope'],
      ALLOW_UNKNOWN_PROTOCOLS: true,
    });

    return clean;
  }, [content]);

  // Extract TOC headings
  useEffect(() => {
    if (!content) return;
    const headings = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].replace(/[*_~`]/g, ''),
          id: match[2].toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, ''),
        });
      }
    }
    if (onTOCRef.current) onTOCRef.current(headings);
  }, [content]);

  // Render mermaid diagrams
  useEffect(() => {
    if (!previewRef.current) return;
    const mermaidDivs = previewRef.current.querySelectorAll('.mermaid-diagram');
    mermaidDivs.forEach(async (div) => {
      const code = div.textContent;
      const id = div.getAttribute('data-mermaid-id') || 'mermaid-' + Math.random().toString(36).slice(2, 10);
      try {
        const { svg } = await mermaid.render(id, code);
        div.innerHTML = svg;
      } catch (e) {
        div.innerHTML = `<pre class="text-red-500 text-sm">Mermaid Error: ${e.message}</pre>`;
      }
    });
  }, [html]);

  // Add IDs to headings for TOC navigation
  useEffect(() => {
    if (!previewRef.current) return;
    const headings = previewRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((h) => {
      if (!h.id) {
        h.id = h.textContent.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
      }
    });
  }, [html]);

  const previewThemeClass = {
    github: '',
    notion: 'preview-notion',
    minimal: 'preview-minimal',
  }[settings.previewTheme] || '';

  const previewStyle = {
    fontSize: settings.previewFontSize ? `${settings.previewFontSize}px` : undefined,
    lineHeight: settings.previewLineHeight || undefined,
    fontFamily: settings.previewFontFamily || undefined,
  };

  return (
    <div
      ref={previewRef}
      data-scroll-target="preview"
      className={`h-full overflow-auto p-6 ${previewThemeClass} ${
        settings.darkMode ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'
      }`}
    >
      <div
        className="preview-content prose dark:prose-invert max-w-none"
        style={previewStyle}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
