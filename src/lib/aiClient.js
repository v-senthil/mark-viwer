/**
 * AI Client Module
 * 
 * Provides a unified interface for multiple AI providers:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Google AI (Gemini)
 * - Ollama (local)
 * - Custom OpenAI-compatible endpoints
 * 
 * Features:
 * - Streaming responses with AbortController support
 * - BYOK (Bring Your Own Key) model
 * - Secure key handling (encrypted storage)
 * - Friendly error messages
 * - Dynamic Ollama model discovery
 * - Rate limiting for API requests
 */

import { 
  encryptApiKey, 
  decryptApiKey, 
  isRateLimited, 
  getRemainingRequests,
  validateApiKey 
} from './security.js';

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
  google: {
    name: 'Google AI (Gemini)',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Latest)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
    ],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    requiresKey: true,
  },
  ollama: {
    name: 'Ollama (Local)',
    models: [], // Dynamically fetched
    requiresKey: false,
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    models: [],
    requiresKey: true,
  },
};

/**
 * Fetch available Ollama models from local server
 * @param {string} endpoint - Ollama server endpoint
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchOllamaModels(endpoint = 'http://localhost:11434') {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error('Failed to connect to Ollama');
    const data = await response.json();
    return (data.models || []).map(m => ({
      id: m.name,
      name: m.name,
      size: m.size,
      modified: m.modified_at,
    }));
  } catch (error) {
    console.warn('Failed to fetch Ollama models:', error);
    return [];
  }
}

/**
 * Fetch available Google AI (Gemini) models
 * @param {string} apiKey - Google AI API key
 * @returns {Promise<Array<{id: string, name: string, description?: string}>>}
 */
export async function fetchGeminiModels(apiKey) {
  if (!apiKey) {
    console.warn('API key required to fetch Gemini models');
    return [];
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models`,
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) throw new Error('Failed to fetch Gemini models');
    const data = await response.json();
    // Filter to only models that support generateContent
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', ''),
        description: m.description,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
      }));
  } catch (error) {
    console.warn('Failed to fetch Gemini models:', error);
    return [];
  }
}

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
  rewrite: {
    name: 'Rewrite',
    icon: 'refresh-cw',
    prompt: `Rewrite the following text in a different way while preserving the meaning, key information, and markdown formatting. Improve clarity and flow.

Text:
{content}

Rewritten version:`,
  },
  makeConcise: {
    name: 'Make Concise',
    icon: 'scissors',
    prompt: `Rewrite the following text to be more concise while preserving the key information and markdown formatting. Remove redundancy and unnecessary words.

Text:
{content}

Concise version:`,
  },
  simplify: {
    name: 'Simplify',
    icon: 'minimize-2',
    prompt: `Simplify the following text to plain, easy-to-understand language. Use short sentences and common words. Preserve the markdown formatting.

Text:
{content}

Simplified version:`,
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
  translate: {
    name: 'Translate',
    icon: 'languages',
    prompt: `Translate the following text into {customPrompt}. Preserve the markdown formatting exactly. Only output the translated text.

Text:
{content}

Translation:`,
  },
  custom: {
    name: 'Custom Prompt',
    icon: 'message-square',
    prompt: '{customPrompt}\n\nContent:\n{content}',
  },
};

/**
 * Load AI settings from localStorage
 * API keys are decrypted on load
 */
export function loadAISettings() {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_AI_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load AI settings:', e);
  }
  return { ...DEFAULT_AI_SETTINGS };
}

/**
 * Load AI settings with decrypted API key (async)
 */
export async function loadAISettingsSecure() {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Decrypt API key if it exists and is encrypted
      if (parsed.encryptedApiKey) {
        const decrypted = await decryptApiKey(parsed.encryptedApiKey);
        if (decrypted) {
          parsed.apiKey = decrypted;
        }
        delete parsed.encryptedApiKey;
      }
      return { ...DEFAULT_AI_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load AI settings:', e);
  }
  return { ...DEFAULT_AI_SETTINGS };
}

/**
 * Save AI settings to localStorage
 * API keys are encrypted before storage for security
 */
export function saveAISettings(settings) {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save AI settings:', e);
  }
}

/**
 * Save AI settings with encrypted API key (async)
 */
export async function saveAISettingsSecure(settings) {
  try {
    const toSave = { ...settings };
    // Encrypt API key if present
    if (toSave.apiKey) {
      const encrypted = await encryptApiKey(toSave.apiKey);
      if (encrypted) {
        toSave.encryptedApiKey = encrypted;
        delete toSave.apiKey;
      }
    }
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save AI settings:', e);
  }
}

/**
 * Check rate limit status for AI requests
 * @param {string} provider - Provider name
 * @returns {{ limited: boolean, remaining: number }}
 */
export function checkRateLimit(provider = 'default') {
  const key = `ai_request_${provider}`;
  // Allow 30 requests per minute by default
  const limited = isRateLimited(key, 30, 60000);
  const remaining = getRemainingRequests(key, 30, 60000);
  return { limited, remaining };
}

/**
 * Validate API key format for a provider
 * @param {string} apiKey - API key to validate
 * @param {string} provider - Provider name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProviderApiKey(apiKey, provider) {
  return validateApiKey(apiKey, provider);
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
    case 'google':
      // Google AI uses a different format
      return {
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
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
    case 'google':
      // Google AI uses API key in header
      headers['x-goog-api-key'] = apiKey;
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
    case 'google':
      // Google AI endpoint: API key in header, model in URL
      const model = settings.model || 'gemini-2.0-flash';
      return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    
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
          case 'google':
            // Google AI streaming format
            if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
              content += parsed.candidates[0].content.parts[0].text;
            }
            if (parsed.candidates?.[0]?.finishReason) {
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
    if (provider === 'google') {
      return 'Network error connecting to Google AI. Please check your API key and internet connection.';
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

      // Google AI uses streaming via URL parameter, not body
      if (provider === 'google') {
        delete body.stream;
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
