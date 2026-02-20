/**
 * AI Panel Component
 * 
 * Interactive side panel for AI-powered writing assistance:
 * - Quick action buttons (Continue, Summarize, Fix Grammar, etc.)
 * - Custom prompt input
 * - Streaming response display
 * - Diff preview for grammar fixes
 * - Accept/Reject changes
 * - Abort ongoing requests
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Zap, Pencil, FileText, CheckCircle, Scissors, Maximize2,
  List, HelpCircle, MessageSquare, Loader2, Square, Settings,
  Copy, Check, ArrowRight, RotateCcw, AlertCircle, Sparkles
} from 'lucide-react';
import { getAIClient, PROMPT_TEMPLATES, loadAISettings, PROVIDERS } from '../lib/aiClient';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Map action icons
const ACTION_ICONS = {
  continue: Pencil,
  summarize: FileText,
  fixGrammar: CheckCircle,
  makeConcise: Scissors,
  expand: Maximize2,
  generateOutline: List,
  explain: HelpCircle,
  custom: MessageSquare,
};

// Action button component
function ActionButton({ action, template, onClick, dark, disabled }) {
  const Icon = ACTION_ICONS[action] || Sparkles;
  
  return (
    <button
      onClick={() => onClick(action)}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
        ${dark 
          ? 'bg-[#21262d] text-gray-300 hover:bg-[#30363d] hover:text-white border border-[#30363d]' 
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
    >
      <Icon size={14} />
      {template.name}
    </button>
  );
}

// Streaming response display with markdown support
function ResponseDisplay({ content, isStreaming, error, dark }) {
  const containerRef = useRef(null);

  // Auto-scroll while streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  // Render markdown content
  const renderedContent = useMemo(() => {
    if (!content) return '';
    try {
      const html = marked(content, { breaks: true, gfm: true });
      return DOMPurify.sanitize(html);
    } catch {
      return content;
    }
  }, [content]);

  if (error) {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg text-[13px]
        ${dark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'}`}>
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative max-h-[400px] overflow-y-auto rounded-lg border p-4
        ${dark ? 'bg-[#161b22] border-[#30363d]' : 'bg-gray-50 border-gray-200'}`}
    >
      {/* Streaming indicator */}
      {isStreaming && (
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 text-[11px]
          ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Generating...
        </div>
      )}

      {/* Content - Rendered Markdown */}
      <div 
        className={`ai-response-content prose prose-sm max-w-none
          ${dark ? 'prose-invert' : ''}
          [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
          [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:mb-2
          [&_ul]:text-[13px] [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5
          [&_ol]:text-[13px] [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-1
          [&_code]:text-[12px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
          [&_pre]:text-[12px] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-2
          ${dark 
            ? '[&_code]:bg-[#21262d] [&_pre]:bg-[#21262d] [&_code]:text-gray-300' 
            : '[&_code]:bg-gray-100 [&_pre]:bg-gray-100 [&_code]:text-gray-700'}
          [&_strong]:font-semibold [&_em]:italic
          [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2
          ${dark ? '[&_blockquote]:border-gray-600 [&_blockquote]:text-gray-400' : '[&_blockquote]:border-gray-300 [&_blockquote]:text-gray-600'}`}
        dangerouslySetInnerHTML={{ __html: renderedContent + (isStreaming ? '<span class="animate-pulse">▌</span>' : '') }}
      />
    </div>
  );
}

// Diff preview for grammar fixes
function DiffPreview({ original, corrected, onAccept, onReject, dark }) {
  // Simple word-based diff visualization
  const renderDiff = () => {
    // For now, just show side by side
    return (
      <div className="space-y-3">
        <div>
          <span className={`text-[10px] uppercase tracking-wider font-semibold
            ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Original
          </span>
          <div className={`mt-1 p-3 rounded-lg text-[13px] line-through opacity-70
            ${dark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700'}`}>
            {original}
          </div>
        </div>
        <div>
          <span className={`text-[10px] uppercase tracking-wider font-semibold
            ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Corrected
          </span>
          <div className={`mt-1 p-3 rounded-lg text-[13px]
            ${dark ? 'bg-green-500/10 text-green-300' : 'bg-green-50 text-green-700'}`}>
            {corrected}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-lg border p-4 ${dark ? 'bg-[#161b22] border-[#30363d]' : 'bg-gray-50 border-gray-200'}`}>
      {renderDiff()}
      
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#30363d]">
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium
            bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <Check size={14} />
          Accept
        </button>
        <button
          onClick={onReject}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors
            ${dark 
              ? 'bg-[#21262d] text-gray-300 hover:bg-[#30363d] border border-[#30363d]' 
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
        >
          <X size={14} />
          Reject
        </button>
      </div>
    </div>
  );
}

export default function AIPanel({ 
  darkMode: dark, 
  onClose, 
  content, 
  selectedText,
  onInsertText,
  onReplaceSelection,
  onOpenSettings 
}) {
  const [settings] = useState(loadAISettings);
  const [customPrompt, setCustomPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [originalText, setOriginalText] = useState('');
  
  const clientRef = useRef(null);

  // Get the text to process (selected or full document)
  const textToProcess = selectedText?.trim() || content;
  const hasSelection = !!selectedText?.trim();

  // Check if AI is configured
  const isConfigured = () => {
    const provider = PROVIDERS[settings.provider];
    if (!provider?.requiresKey) return true;
    return !!settings.apiKey;
  };

  // Execute an AI action
  const handleAction = useCallback(async (action) => {
    if (!isConfigured()) {
      setError('Please configure your AI provider in settings.');
      return;
    }

    // Reset state
    setResponse('');
    setError(null);
    setIsStreaming(true);
    setLastAction(action);
    setShowDiff(false);

    // Store original for diff
    if (action === 'fixGrammar') {
      setOriginalText(textToProcess);
    }

    const client = getAIClient();
    clientRef.current = client;

    const options = {
      customPrompt,
      onChunk: (chunk, full) => {
        setResponse(full);
      },
      onComplete: (fullResponse) => {
        setIsStreaming(false);
        // Show diff preview for grammar fixes
        if (action === 'fixGrammar' && fullResponse) {
          setShowDiff(true);
        }
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

  // Copy response to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  // Insert response at cursor
  const handleInsert = () => {
    if (response && onInsertText) {
      onInsertText(response);
    }
  };

  // Accept grammar fix
  const handleAcceptFix = () => {
    if (response && onReplaceSelection) {
      onReplaceSelection(response);
      setShowDiff(false);
      setResponse('');
    }
  };

  // Reject grammar fix
  const handleRejectFix = () => {
    setShowDiff(false);
  };

  // Clear response
  const handleClear = () => {
    setResponse('');
    setError(null);
    setShowDiff(false);
    setLastAction(null);
  };

  // Handle custom prompt submit
  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      handleAction('custom');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/30" 
        onClick={onClose} 
      />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 bottom-0 w-[400px] max-w-full z-50 flex flex-col
        ${dark ? 'bg-[#0d1117] border-l border-[#21262d]' : 'bg-white border-l border-gray-200'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0
          ${dark ? 'border-[#21262d]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2.5">
            <Zap size={16} strokeWidth={1.75} className={dark ? 'text-purple-400' : 'text-purple-500'} />
            <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
              AI Assistant
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className={`p-1.5 rounded-md transition-colors
                ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
              title="AI Settings"
            >
              <Settings size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors
                ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Configuration warning */}
          {!isConfigured() && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-[12px]
              ${dark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>AI not configured.</strong>
                <button
                  onClick={onOpenSettings}
                  className="ml-1 underline hover:no-underline"
                >
                  Open settings
                </button>
                to add your API key.
              </div>
            </div>
          )}

          {/* Context indicator */}
          <div className={`px-3 py-2 rounded-lg text-[12px] flex items-center gap-2
            ${dark ? 'bg-[#161b22] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
            <ArrowRight size={12} />
            {hasSelection ? (
              <span>Using <strong>selected text</strong> ({selectedText.length} chars)</span>
            ) : (
              <span>Using <strong>full document</strong> ({content.length} chars)</span>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className={`text-[10px] uppercase tracking-wider font-semibold mb-2
              ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PROMPT_TEMPLATES)
                .filter(([key]) => key !== 'custom')
                .map(([key, template]) => (
                  <ActionButton
                    key={key}
                    action={key}
                    template={template}
                    onClick={handleAction}
                    dark={dark}
                    disabled={isStreaming || !isConfigured()}
                  />
                ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <h3 className={`text-[10px] uppercase tracking-wider font-semibold mb-2
              ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              Custom Prompt
            </h3>
            <form onSubmit={handleCustomSubmit}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Translate to Spanish..."
                  disabled={isStreaming}
                  className={`flex-1 text-[13px] px-3 py-2 rounded-lg border outline-none transition-colors
                    ${dark 
                      ? 'bg-[#21262d] border-[#30363d] text-white placeholder-gray-600 focus:border-blue-500' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                />
                <button
                  type="submit"
                  disabled={!customPrompt.trim() || isStreaming || !isConfigured()}
                  className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all
                    ${(!customPrompt.trim() || isStreaming || !isConfigured())
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-[1.02] active:scale-[0.98]'}
                    bg-purple-600 text-white hover:bg-purple-700`}
                >
                  <Sparkles size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* Response Area */}
          {(response || isStreaming || error) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className={`text-[10px] uppercase tracking-wider font-semibold
                  ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Response
                </h3>
                
                {/* Action buttons */}
                {!isStreaming && response && !showDiff && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopy}
                      className={`p-1.5 rounded-md transition-colors text-[11px] flex items-center gap-1
                        ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                      title="Copy to clipboard"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={handleInsert}
                      className={`p-1.5 rounded-md transition-colors text-[11px] flex items-center gap-1
                        ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                      title="Insert at cursor"
                    >
                      <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={handleClear}
                      className={`p-1.5 rounded-md transition-colors text-[11px] flex items-center gap-1
                        ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                      title="Clear"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                )}

                {/* Abort button */}
                {isStreaming && (
                  <button
                    onClick={handleAbort}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium
                      bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Square size={10} fill="currentColor" />
                    Stop
                  </button>
                )}
              </div>

              {/* Diff preview for grammar fixes */}
              {showDiff && lastAction === 'fixGrammar' ? (
                <DiffPreview
                  original={originalText}
                  corrected={response}
                  onAccept={handleAcceptFix}
                  onReject={handleRejectFix}
                  dark={dark}
                />
              ) : (
                <ResponseDisplay
                  content={response}
                  isStreaming={isStreaming}
                  error={error}
                  dark={dark}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t flex-shrink-0
          ${dark ? 'border-[#21262d]' : 'border-gray-200'}`}>
          <div className={`text-[11px] text-center ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            {settings.provider === 'ollama' ? (
              <span>Using Ollama ({settings.ollamaModel})</span>
            ) : (
              <span>Using {PROVIDERS[settings.provider]?.name} ({settings.model})</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
