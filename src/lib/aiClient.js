/**
 * AI Client Module
 * 
 * Provides a unified interface for multiple AI providers:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic Claude
 * - Ollama (local)
 * - Custom OpenAI-compatible endpoints
 * 
 * Features:
 * - Streaming responses with AbortController support
 * - BYOK (Bring Your Own Key) model
 * - Secure key handling (never logged)
 * - Friendly error messages
 */

// Storage key for AI settings
export const AI_SETTINGS_KEY = 'markviewer_ai_settings';

// Default settings
export const DEFAULT_AI_SETTINGS = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  customEndpoint: '',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  temperature: 0.7,
  maxTokens: 2048,
};

// Provider configurations
export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requiresKey: true,
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
    endpoint: 'https://api.anthropic.com/v1/messages',
    requiresKey: true,
    corsWarning: true, // Browser CORS restrictions apply
  },
  ollama: {
    name: 'Ollama (Local)',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'llama3.1', name: 'Llama 3.1' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'codellama', name: 'Code Llama' },
      { id: 'phi3', name: 'Phi-3' },
    ],
    requiresKey: false,
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    models: [],
    requiresKey: true,
  },
};

// Prompt templates for AI actions
export const PROMPT_TEMPLATES = {
  continue: {
    name: 'Continue Writing',
    icon: 'pencil',
    prompt: `Continue writing the following markdown document naturally. Maintain the same style, tone, and formatting. Only output the continuation, not the original content.

Document:
{content}

Continue from where it left off:`,
  },
  summarize: {
    name: 'Summarize',
    icon: 'file-text',
    prompt: `Provide a concise summary of the following markdown document. Include key points and main ideas. Format as bullet points.

Document:
{content}

Summary:`,
  },
  fixGrammar: {
    name: 'Fix Grammar',
    icon: 'check-circle',
    prompt: `Fix any grammar, spelling, and punctuation errors in the following text. Preserve the original markdown formatting. Return the corrected text only.

Text:
{content}

Corrected text:`,
  },
  makeConcise: {
    name: 'Make Concise',
    icon: 'scissors',
    prompt: `Rewrite the following text to be more concise while preserving the key information and markdown formatting. Remove redundancy and unnecessary words.

Text:
{content}

Concise version:`,
  },
  expand: {
    name: 'Expand',
    icon: 'maximize-2',
    prompt: `Expand the following text with more details, examples, and explanations. Maintain the same markdown formatting style.

Text:
{content}

Expanded version:`,
  },
  generateOutline: {
    name: 'Generate Outline',
    icon: 'list',
    prompt: `Generate a detailed markdown outline for a document about the following topic. Use proper heading levels (##, ###) and bullet points.

Topic:
{content}

Outline:`,
  },
  explain: {
    name: 'Explain',
    icon: 'help-circle',
    prompt: `Explain the following content in simple terms. Break down complex concepts and provide examples where helpful.

Content:
{content}

Explanation:`,
  },
  custom: {
    name: 'Custom Prompt',
    icon: 'message-square',
    prompt: '{customPrompt}\n\nContent:\n{content}',
  },
};

/**
 * Load AI settings from localStorage
 */
export function loadAISettings() {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load AI settings:', e);
  }
  return { ...DEFAULT_AI_SETTINGS };
}

/**
 * Save AI settings to localStorage
 * NOTE: API keys are stored - user is responsible for their own security
 */
export function saveAISettings(settings) {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save AI settings:', e);
  }
}

/**
 * Mask API key for display (show first 4 and last 4 characters)
 */
export function maskApiKey(key) {
  if (!key || key.length < 12) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}

/**
 * Build the request body for different providers
 */
function buildRequestBody(provider, model, messages, settings) {
  const { temperature, maxTokens } = settings;

  switch (provider) {
    case 'anthropic':
      // Anthropic uses a different format
      return {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content,
        })),
      };
    
    case 'ollama':
      return {
        model: settings.ollamaModel || model,
        messages,
        stream: true,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      };
    
    case 'openai':
    case 'custom':
    default:
      return {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      };
  }
}

/**
 * Build request headers for different providers
 */
function buildHeaders(provider, apiKey) {
  const headers = {
    'Content-Type': 'application/json',
  };

  switch (provider) {
    case 'anthropic':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      // Note: anthropic-dangerous-direct-browser-access would be needed
      // but is not recommended for production
      break;
    
    case 'openai':
    case 'custom':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    
    case 'ollama':
      // No auth needed for local Ollama
      break;
  }

  return headers;
}

/**
 * Get the endpoint URL for a provider
 */
function getEndpoint(provider, settings) {
  switch (provider) {
    case 'anthropic':
      return PROVIDERS.anthropic.endpoint;
    
    case 'ollama':
      return `${settings.ollamaEndpoint || 'http://localhost:11434'}/api/chat`;
    
    case 'custom':
      return settings.customEndpoint;
    
    case 'openai':
    default:
      return PROVIDERS.openai.endpoint;
  }
}

/**
 * Parse streaming response from different providers
 * @param {string} chunk - Raw chunk from stream
 * @param {string} provider - Provider name
 * @returns {{ content: string, done: boolean }}
 */
function parseStreamChunk(chunk, provider) {
  const lines = chunk.split('\n').filter(line => line.trim());
  let content = '';
  let done = false;

  for (const line of lines) {
    // Handle SSE format
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      
      if (data === '[DONE]') {
        done = true;
        continue;
      }

      try {
        const parsed = JSON.parse(data);
        
        switch (provider) {
          case 'anthropic':
            if (parsed.type === 'content_block_delta') {
              content += parsed.delta?.text || '';
            } else if (parsed.type === 'message_stop') {
              done = true;
            }
            break;
          
          case 'openai':
          case 'custom':
          default:
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              content += delta.content;
            }
            if (parsed.choices?.[0]?.finish_reason) {
              done = true;
            }
            break;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    } else if (provider === 'ollama') {
      // Ollama uses newline-delimited JSON
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) {
          content += parsed.message.content;
        }
        if (parsed.done) {
          done = true;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  return { content, done };
}

/**
 * Format error messages for users
 */
function formatError(error, provider) {
  const message = error.message || String(error);
  
  // Common error patterns
  if (message.includes('401') || message.includes('Unauthorized')) {
    return 'Invalid API key. Please check your settings.';
  }
  if (message.includes('403') || message.includes('Forbidden')) {
    return 'Access denied. Your API key may not have access to this model.';
  }
  if (message.includes('429') || message.includes('rate limit')) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return 'The AI service is temporarily unavailable. Please try again later.';
  }
  if (message.includes('CORS') || message.includes('Failed to fetch')) {
    if (provider === 'anthropic') {
      return 'CORS error: Claude API cannot be called directly from browsers. Consider using a proxy or the OpenAI API instead.';
    }
    if (provider === 'ollama') {
      return 'Cannot connect to Ollama. Make sure Ollama is running locally and CORS is enabled.';
    }
    return 'Network error. Please check your internet connection.';
  }
  if (message.includes('AbortError') || message.includes('aborted')) {
    return 'Request cancelled.';
  }
  
  return `Error: ${message}`;
}

/**
 * AI Client class for making requests
 */
export class AIClient {
  constructor(settings = null) {
    this.settings = settings || loadAISettings();
    this.abortController = null;
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    saveAISettings(this.settings);
  }

  /**
   * Test connection to the AI provider
   * @returns {Promise<{ success: boolean, message: string, model?: string }>}
   */
  async testConnection() {
    const { provider, apiKey, model, customEndpoint, ollamaEndpoint } = this.settings;
    
    // Validate settings
    if (PROVIDERS[provider]?.requiresKey && !apiKey) {
      return { success: false, message: 'API key is required' };
    }
    if (provider === 'custom' && !customEndpoint) {
      return { success: false, message: 'Custom endpoint URL is required' };
    }

    try {
      // For Ollama, check if the server is running
      if (provider === 'ollama') {
        const response = await fetch(`${ollamaEndpoint || 'http://localhost:11434'}/api/tags`, {
          method: 'GET',
        });
        if (!response.ok) throw new Error('Failed to connect to Ollama');
        const data = await response.json();
        const models = data.models?.map(m => m.name) || [];
        return { 
          success: true, 
          message: `Connected! Available models: ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`,
          models,
        };
      }

      // For other providers, make a minimal request
      const endpoint = getEndpoint(provider, this.settings);
      const headers = buildHeaders(provider, apiKey);
      const body = buildRequestBody(provider, model, [
        { role: 'user', content: 'Say "OK" to confirm connection.' }
      ], { ...this.settings, maxTokens: 10 });

      // Don't stream for test
      delete body.stream;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      return { success: true, message: `Connected successfully to ${PROVIDERS[provider]?.name || provider}!` };
    } catch (error) {
      return { success: false, message: formatError(error, provider) };
    }
  }

  /**
   * Send a streaming chat completion request
   * @param {string} prompt - The prompt to send
   * @param {function} onChunk - Callback for each streamed chunk
   * @param {function} onComplete - Callback when complete
   * @param {function} onError - Callback on error
   * @returns {AbortController} Controller to abort the request
   */
  async streamCompletion(prompt, { onChunk, onComplete, onError }) {
    // Create abort controller for this request
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const { provider, apiKey, model } = this.settings;
    
    // Validate
    if (PROVIDERS[provider]?.requiresKey && !apiKey) {
      onError?.('API key not configured. Please open AI Settings.');
      return this.abortController;
    }

    try {
      const endpoint = getEndpoint(provider, this.settings);
      const headers = buildHeaders(provider, apiKey);
      
      // Build messages array
      const messages = [
        { role: 'system', content: 'You are a helpful writing assistant. Respond in markdown format when appropriate.' },
        { role: 'user', content: prompt },
      ];

      const body = buildRequestBody(provider, model, messages, this.settings);

      // For Anthropic, we need to enable streaming differently
      if (provider === 'anthropic') {
        body.stream = true;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const { content, done: streamDone } = parseStreamChunk(chunk, provider);
        
        if (content) {
          fullContent += content;
          onChunk?.(content, fullContent);
        }
        
        if (streamDone) break;
      }

      onComplete?.(fullContent);
    } catch (error) {
      if (error.name === 'AbortError') {
        onError?.('Request cancelled.');
      } else {
        onError?.(formatError(error, provider));
      }
    }

    return this.abortController;
  }

  /**
   * Cancel the current request
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Execute an AI action with the given content
   * @param {string} action - Action key from PROMPT_TEMPLATES
   * @param {string} content - Document or selected content
   * @param {object} options - Additional options
   */
  async executeAction(action, content, options = {}) {
    const template = PROMPT_TEMPLATES[action];
    if (!template) {
      options.onError?.(`Unknown action: ${action}`);
      return;
    }

    let prompt = template.prompt
      .replace('{content}', content)
      .replace('{customPrompt}', options.customPrompt || '');

    return this.streamCompletion(prompt, options);
  }
}

// Singleton instance
let clientInstance = null;

/**
 * Get the AI client instance
 */
export function getAIClient() {
  if (!clientInstance) {
    clientInstance = new AIClient();
  }
  return clientInstance;
}

/**
 * Reset the AI client (useful after settings change)
 */
export function resetAIClient() {
  clientInstance = null;
}

export default AIClient;
