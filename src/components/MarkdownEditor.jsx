import { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { vim } from '@replit/codemirror-vim';

// Theme imports
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { nord } from '@uiw/codemirror-theme-nord';

const editorThemes = {
  github: { light: githubLight, dark: githubDark },
  dracula: { light: dracula, dark: dracula },
  solarized: { light: githubLight, dark: oneDark }, // fallback
  nord: { light: nord, dark: nord },
};

export default function MarkdownEditor({ content, onChange, settings, onStats, editorRef: externalRef }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onStatsRef = useRef(onStats);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onStatsRef.current = onStats; }, [onStats]);

  const getThemeExtension = useCallback(() => {
    const themeSet = editorThemes[settings.editorTheme] || editorThemes.github;
    return settings.darkMode ? themeSet.dark : themeSet.light;
  }, [settings.editorTheme, settings.darkMode]);

  // Build extensions
  const getExtensions = useCallback(() => {
    const exts = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightSelectionMatches(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorState.tabSize.of(2),
      keymap.of([
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
      ]),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      getThemeExtension(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const doc = update.state.doc.toString();
          onChangeRef.current(doc);
          if (onStatsRef.current) {
            const text = doc;
            const lines = update.state.doc.lines;
            const chars = text.length;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            onStatsRef.current({ lines, chars, words });
          }
        }
      }),
      EditorView.lineWrapping,
      placeholder('Start writing Markdown here...'),
    ];

    if (settings.vimMode) {
      exts.unshift(vim());
    }

    return exts;
  }, [settings.vimMode, getThemeExtension]);

  // Create editor
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: getExtensions(),
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    
    // Expose helper methods for external access (e.g., AI panel)
    if (externalRef) {
      externalRef.current = {
        view,
        // Proxy state for direct access (Toolbar, App.jsx, etc.)
        get state() { return view.state; },
        // Get currently selected text
        getSelection: () => {
          const state = view.state;
          const { from, to } = state.selection.main;
          return from !== to ? state.sliceDoc(from, to) : '';
        },
        // Insert text at cursor position
        insertText: (text) => {
          const pos = view.state.selection.main.head;
          view.dispatch({ changes: { from: pos, insert: text } });
          view.focus();
        },
        // Replace current selection with text
        replaceSelection: (text) => {
          const { from, to } = view.state.selection.main;
          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
          });
          view.focus();
        },
        // Focus the editor
        focus: () => view.focus(),
        // Execute a CodeMirror command
        dispatch: (...args) => view.dispatch(...args),
      };
    }

    // Initial stats
    if (onStatsRef.current) {
      const text = content;
      const lines = state.doc.lines;
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      onStatsRef.current({ lines, chars, words });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only rebuild on settings that require rebuilding the editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.vimMode, settings.editorTheme, settings.darkMode]);

  // Sync content from external changes (e.g. opening a file)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: content },
      });
    }
  }, [content]);

  // Handle paste image
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result;
            const view = viewRef.current;
            if (view) {
              const pos = view.state.selection.main.head;
              const insert = `![pasted image](${base64})\n`;
              view.dispatch({ changes: { from: pos, insert } });
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    container.addEventListener('paste', handlePaste);
    return () => container.removeEventListener('paste', handlePaste);
  }, []);

  // Handle drop .md files
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
        const reader = new FileReader();
        reader.onload = () => {
          onChangeRef.current(reader.result);
          const view = viewRef.current;
          if (view) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: reader.result },
            });
          }
        };
        reader.readAsText(file);
      }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-hidden ${settings.typewriterMode ? 'typewriter-mode' : ''}`}
    />
  );
}
