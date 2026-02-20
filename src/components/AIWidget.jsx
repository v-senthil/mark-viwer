/**
 * AI Widget Component
 * 
 * A draggable, floating AI assistant widget that can be moved around the screen.
 * Features:
 * - Drag and drop positioning
 * - Minimizable/expandable
 * - Quick AI actions
 * - Markdown-rendered responses
 * - Keyboard shortcut toggle (Ctrl/Cmd + .)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  X, Zap, Pencil, FileText, CheckCircle, Scissors, Maximize2,
  List, HelpCircle, MessageSquare, Square, GripHorizontal,
  Copy, Check, ArrowRight, RotateCcw, AlertCircle, Sparkles,
  Minimize2, ChevronDown, ChevronUp, Send, RefreshCw, Languages, ArrowLeftRight
} from 'lucide-react';
import { getAIClient, PROMPT_TEMPLATES, loadAISettings, PROVIDERS } from '../lib/aiClient';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Compact action icons
const ACTION_ICONS = {
  continue: Pencil,
  summarize: FileText,
  rewrite: RefreshCw,
  fixGrammar: CheckCircle,
  makeConcise: Scissors,
  simplify: Minimize2,
  expand: Maximize2,
  generateOutline: List,
  explain: HelpCircle,
  translate: Languages,
  custom: MessageSquare,
};

function AIWidgetComponent({
  darkMode: dark,
  onClose,
  content,
  selectedText,
  onInsertText,
  onReplaceSelection,
}) {
  const [settings] = useState(loadAISettings);
  const [customPrompt, setCustomPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Drag state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('aiWidgetPosition');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: window.innerWidth - 380, y: 100 };
      }
    }
    return { x: window.innerWidth - 380, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const widgetRef = useRef(null);
  const clientRef = useRef(null);
  const responseRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const pendingResponseRef = useRef('');
  const userScrolledUpRef = useRef(false);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('aiWidgetPosition', JSON.stringify(position));
  }, [position]);

  // Auto-scroll response — only if user hasn't scrolled up
  useEffect(() => {
    if (isStreaming && responseRef.current && !userScrolledUpRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, isStreaming]);

  // Reset scroll lock when streaming starts/stops
  useEffect(() => {
    if (isStreaming) userScrolledUpRef.current = false;
  }, [isStreaming]);

  const handleResponseScroll = useCallback(() => {
    const el = responseRef.current;
    if (!el || !isStreaming) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledUpRef.current = !atBottom;
  }, [isStreaming]);

  // Get the text to process
  const hasSelection = useMemo(() => !!selectedText?.trim(), [selectedText]);
  const textToProcess = useMemo(() => selectedText?.trim() || content, [selectedText, content]);
  const selectionLength = useMemo(() => hasSelection ? selectedText.trim().length : 0, [hasSelection, selectedText]);

  // Check if AI is configured
  const isConfigured = () => {
    const provider = PROVIDERS[settings.provider];
    if (!provider?.requiresKey) return true;
    return !!settings.apiKey;
  };

  // Render markdown content
  const renderedContent = useMemo(() => {
    if (!response) return '';
    try {
      const html = marked(response, { breaks: true, gfm: true });
      return DOMPurify.sanitize(html);
    } catch {
      return response;
    }
  }, [response]);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
      return;
    }
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      e.preventDefault(); // Prevent text selection during drag
      const newX = Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Execute an AI action
  const handleAction = useCallback(async (action) => {
    if (!isConfigured()) {
      setError('Configure AI provider first.');
      return;
    }

    setResponse('');
    setError(null);
    setIsStreaming(true);
    setShowQuickActions(false);
    pendingResponseRef.current = '';
    lastUpdateRef.current = 0;

    const client = getAIClient();
    clientRef.current = client;

    const options = {
      customPrompt,
      onChunk: (chunk, full) => {
        // Debounce updates to reduce lag - update every 50ms max
        pendingResponseRef.current = full;
        const now = Date.now();
        if (now - lastUpdateRef.current > 50) {
          lastUpdateRef.current = now;
          setResponse(full);
        }
      },
      onComplete: () => {
        // Ensure final response is set
        setResponse(pendingResponseRef.current);
        setIsStreaming(false);
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
      },
    };

    await client.executeAction(action, textToProcess, options);
  }, [textToProcess, customPrompt]);

  // Abort current request
  const handleAbort = () => {
    if (clientRef.current) {
      clientRef.current.abort();
      setIsStreaming(false);
    }
  };

  // Copy response
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  // Insert response
  const handleInsert = () => {
    if (response && onInsertText) {
      onInsertText(response);
    }
  };

  // Replace selection with response
  const handleReplace = () => {
    if (response && onReplaceSelection) {
      onReplaceSelection(response);
    }
  };

  // Handle custom prompt submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      handleAction('custom');
    }
  };

  // Clear response
  const handleClear = () => {
    setResponse('');
    setError(null);
  };

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      className={`shadow-2xl rounded-xl overflow-hidden transition-all duration-200
        ${isMinimized ? 'w-[200px]' : 'w-[360px]'}
        ${dark ? 'bg-[#161b22] border border-[#30363d]' : 'bg-white border border-gray-200'}`}
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleDragStart}
        className={`flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing select-none
          ${dark ? 'bg-[#21262d]' : 'bg-gray-50'}`}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className={dark ? 'text-gray-600' : 'text-gray-400'} />
          <Zap size={14} className={dark ? 'text-purple-400' : 'text-purple-500'} />
          <span className={`text-xs font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
            AI Widget
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`p-1 rounded transition-colors
              ${dark ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors
              ${dark ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content - Collapsible */}
      {!isMinimized && (
        <div className="p-3 space-y-3">
          {/* Selection/Document Info */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px]
            ${hasSelection 
              ? (dark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200')
              : (dark ? 'bg-gray-800/50 text-gray-400 border border-gray-700' : 'bg-gray-50 text-gray-500 border border-gray-200')}`}>
            <FileText size={11} className="flex-shrink-0" />
            {hasSelection ? (
              <span>Working on <strong>selected text</strong> ({selectionLength} chars)</span>
            ) : (
              <span>Working on <strong>entire document</strong> ({content?.length || 0} chars)</span>
            )}
          </div>

          {/* Quick Actions Dropdown */}
          <div>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              disabled={isStreaming}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${dark 
                  ? 'bg-[#21262d] text-gray-300 hover:bg-[#30363d] border border-[#30363d]' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={12} />
                Quick Actions
              </span>
              {showQuickActions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            
            {showQuickActions && (
              <div className={`mt-2 grid grid-cols-2 gap-1.5 p-2 rounded-lg
                ${dark ? 'bg-[#0d1117]' : 'bg-gray-50'}`}>
                {Object.entries(PROMPT_TEMPLATES)
                  .filter(([key]) => key !== 'custom')
                  .map(([key, template]) => {
                    const Icon = ACTION_ICONS[key] || Sparkles;
                    return (
                      <button
                        key={key}
                        onClick={() => handleAction(key)}
                        disabled={isStreaming || !isConfigured()}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-colors
                          ${isStreaming || !isConfigured() ? 'opacity-50 cursor-not-allowed' : ''}
                          ${dark 
                            ? 'text-gray-400 hover:text-white hover:bg-[#21262d]' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                      >
                        <Icon size={10} />
                        {template.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Custom Prompt Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Ask AI anything..."
              disabled={isStreaming}
              className={`flex-1 text-xs px-3 py-2 rounded-lg border outline-none transition-colors
                ${dark 
                  ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'}`}
            />
            <button
              type="submit"
              disabled={!customPrompt.trim() || isStreaming || !isConfigured()}
              className={`px-3 py-2 rounded-lg transition-all
                ${(!customPrompt.trim() || isStreaming || !isConfigured())
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'}
                bg-purple-600 text-white`}
            >
              <Send size={12} />
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className={`flex items-start gap-2 p-2 rounded-lg text-[11px]
              ${dark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Response */}
          {(response || isStreaming) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-semibold
                  ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                  Response
                </span>
                
                <div className="flex items-center gap-1">
                  {isStreaming ? (
                    <button
                      onClick={handleAbort}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                        bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <Square size={8} fill="currentColor" />
                      Stop
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCopy}
                        className={`p-1 rounded transition-colors
                          ${dark ? 'text-gray-600 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                        title="Copy"
                      >
                        {copied ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                      <button
                        onClick={handleInsert}
                        className={`p-1 rounded transition-colors
                          ${dark ? 'text-gray-600 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                        title="Insert at cursor"
                      >
                        <ArrowRight size={10} />
                      </button>
                      {hasSelection && (
                        <button
                          onClick={handleReplace}
                          className={`p-1 rounded transition-colors
                            ${dark ? 'text-gray-600 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                          title="Replace selection"
                        >
                          <ArrowLeftRight size={10} />
                        </button>
                      )}
                      <button
                        onClick={handleClear}
                        className={`p-1 rounded transition-colors
                          ${dark ? 'text-gray-600 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                        title="Clear"
                      >
                        <RotateCcw size={10} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div
                ref={responseRef}
                onScroll={handleResponseScroll}
                className={`max-h-[200px] overflow-y-auto rounded-lg border p-3 text-xs
                  ${dark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-gray-50 border-gray-200'}`}
              >
                {isStreaming && (
                  <div className={`flex items-center gap-1.5 text-[10px] mb-2
                    ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                    Generating...
                  </div>
                )}
                
                <div 
                  className={`ai-widget-response prose prose-sm max-w-none
                    ${dark ? 'prose-invert' : ''}
                    [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2
                    [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2
                    [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1
                    [&_p]:text-xs [&_p]:leading-relaxed [&_p]:mb-1.5
                    [&_ul]:text-xs [&_ul]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4
                    [&_ol]:text-xs [&_ol]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4
                    [&_li]:mb-0.5
                    [&_code]:text-[10px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                    [&_pre]:text-[10px] [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:mb-1.5
                    ${dark 
                      ? '[&_code]:bg-[#21262d] [&_pre]:bg-[#21262d] [&_code]:text-gray-300' 
                      : '[&_code]:bg-gray-100 [&_pre]:bg-gray-100 [&_code]:text-gray-700'}
                    [&_strong]:font-semibold [&_em]:italic
                    [&_blockquote]:border-l-2 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:my-1
                    ${dark ? '[&_blockquote]:border-gray-600 [&_blockquote]:text-gray-400' : '[&_blockquote]:border-gray-300 [&_blockquote]:text-gray-600'}`}
                  dangerouslySetInnerHTML={{ __html: renderedContent + (isStreaming ? '<span class="animate-pulse">▌</span>' : '') }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={`text-[10px] text-center pt-1
            ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            {settings.provider === 'ollama' 
              ? `Ollama (${settings.ollamaModel})`
              : `${PROVIDERS[settings.provider]?.name || settings.provider}`}
            <span className="mx-1">•</span>
            <kbd className={`px-1 py-0.5 rounded text-[9px]
              ${dark ? 'bg-[#21262d]' : 'bg-gray-100'}`}>
              Ctrl+.
            </kbd>
            to toggle
          </div>
        </div>
      )}

      {/* Minimized state info */}
      {isMinimized && (
        <div className={`px-3 py-2 text-[10px] text-center
          ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {isStreaming ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
              Generating...
            </span>
          ) : response ? (
            'Response ready'
          ) : (
            'Click to expand'
          )}
        </div>
      )}
    </div>
  );
}

// Memoize the component for performance
const AIWidget = memo(AIWidgetComponent);
export default AIWidget;
