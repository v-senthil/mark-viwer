/**
 * Security Module
 * 
 * Comprehensive security hardening for MarkViewer:
 * - HTML sanitization configuration
 * - Content Security Policy setup
 * - API key encryption/storage
 * - Input validation
 * - Rate limiting for AI requests
 * - XSS prevention
 */

import DOMPurify from 'dompurify';

// ═══════════════════════════════════════════════════════════════
// DOM PURIFY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Configure DOMPurify with secure defaults
 */
export function configureDOMPurify() {
  // Allow safe HTML elements for Markdown rendering
  const allowedTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'em', 'strong', 'del', 's', 'ins', 'mark',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
    'sup', 'sub',
    'details', 'summary',
    'kbd', 'abbr', 'dfn',
    'input', // For checkboxes in task lists
  ];

  // Allow safe attributes
  const allowedAttr = [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel',
    'colspan', 'rowspan',
    'type', 'checked', 'disabled', // For checkboxes
    'data-*', // Allow data attributes for syntax highlighting
    'start', // For ordered lists
  ];

  // Configure DOMPurify hooks for additional security
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Add rel="noopener noreferrer" to external links
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (href.startsWith('http://') || href.startsWith('https://')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      // Remove javascript: URLs
      if (href.toLowerCase().startsWith('javascript:')) {
        node.removeAttribute('href');
      }
    }

    // Proxy external images through a safe source (optional)
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      // Validate image URLs
      if (!isValidImageUrl(src)) {
        node.removeAttribute('src');
        node.setAttribute('alt', '[Invalid image URL]');
      }
    }
  });

  return {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttr,
    ALLOW_DATA_ATTR: true,
    ADD_TAGS: ['iframe'], // Disabled by default, enable for embeds if needed
    FORBID_TAGS: ['script', 'style', 'form', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus'],
    USE_PROFILES: { html: true },
  };
}

/**
 * Sanitize HTML with secure configuration
 */
export function sanitizeHtml(dirty, options = {}) {
  const config = configureDOMPurify();
  return DOMPurify.sanitize(dirty, { ...config, ...options });
}

/**
 * Validate if a URL is a valid image URL
 */
function isValidImageUrl(url) {
  if (!url) return false;
  
  // Allow data URIs for base64 images
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }
  
  // Validate HTTP/HTTPS URLs
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// API KEY ENCRYPTION
// ═══════════════════════════════════════════════════════════════

const ENCRYPTION_KEY_NAME = 'markviewer_encryption_key';

/**
 * Generate or retrieve encryption key for API keys
 */
async function getEncryptionKey() {
  // Try to get existing key from IndexedDB
  const existingKey = await getStoredKey();
  if (existingKey) {
    return existingKey;
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Store the key
  await storeKey(key);
  return key;
}

/**
 * Store encryption key in IndexedDB
 */
async function storeKey(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('markviewer_security', 1);
    
    request.onerror = () => reject(new Error('Failed to open security database'));
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      const tx = db.transaction('keys', 'readwrite');
      const store = tx.objectStore('keys');
      
      const exported = await crypto.subtle.exportKey('raw', key);
      store.put(exported, ENCRYPTION_KEY_NAME);
      
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
}

/**
 * Retrieve encryption key from IndexedDB
 */
async function getStoredKey() {
  return new Promise((resolve) => {
    const request = indexedDB.open('markviewer_security', 1);
    
    request.onerror = () => resolve(null);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('keys')) {
        db.close();
        resolve(null);
        return;
      }
      
      const tx = db.transaction('keys', 'readonly');
      const store = tx.objectStore('keys');
      const getRequest = store.get(ENCRYPTION_KEY_NAME);
      
      getRequest.onsuccess = async () => {
        const rawKey = getRequest.result;
        if (!rawKey) {
          db.close();
          resolve(null);
          return;
        }
        
        try {
          const key = await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          db.close();
          resolve(key);
        } catch {
          db.close();
          resolve(null);
        }
      };
    };
  });
}

/**
 * Encrypt an API key
 */
export async function encryptApiKey(apiKey) {
  if (!apiKey) return null;
  
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(apiKey);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Encryption failed:', e);
    return null;
  }
}

/**
 * Decrypt an API key
 */
export async function decryptApiKey(encryptedKey) {
  if (!encryptedKey) return null;
  
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

const rateLimitStore = new Map();

/**
 * Check if an action is rate limited
 * @param {string} key - Rate limit key (e.g., 'ai_request')
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if rate limited, false if allowed
 */
export function isRateLimited(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get or create request timestamps array
  let timestamps = rateLimitStore.get(key) || [];
  
  // Filter to only include requests within the window
  timestamps = timestamps.filter(t => t > windowStart);
  
  if (timestamps.length >= maxRequests) {
    return true;
  }
  
  // Add current request
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  
  return false;
}

/**
 * Get remaining requests before rate limit
 */
export function getRemainingRequests(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const timestamps = rateLimitStore.get(key) || [];
  const validTimestamps = timestamps.filter(t => t > windowStart);
  
  return Math.max(0, maxRequests - validTimestamps.length);
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key) {
  rateLimitStore.delete(key);
}

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate and sanitize text input
 */
export function validateTextInput(input, options = {}) {
  const {
    maxLength = 100000,
    allowedChars = null,
    trim = true,
  } = options;
  
  if (typeof input !== 'string') {
    return { valid: false, value: '', error: 'Input must be a string' };
  }
  
  let value = input;
  
  if (trim) {
    value = value.trim();
  }
  
  if (value.length > maxLength) {
    return { valid: false, value: '', error: `Input exceeds maximum length of ${maxLength}` };
  }
  
  if (allowedChars && !new RegExp(`^[${allowedChars}]*$`).test(value)) {
    return { valid: false, value: '', error: 'Input contains invalid characters' };
  }
  
  return { valid: true, value, error: null };
}

/**
 * Validate URL input
 */
export function validateUrl(url) {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }
    
    return { valid: true, url: parsed.href };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey, provider) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }
  
  const trimmed = apiKey.trim();
  
  // Provider-specific validation
  switch (provider) {
    case 'openai':
      if (!trimmed.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI API keys should start with "sk-"' };
      }
      break;
    case 'google':
      if (trimmed.length < 20) {
        return { valid: false, error: 'Google API key seems too short' };
      }
      break;
  }
  
  // General validation - no whitespace or control characters
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'API key should not contain whitespace' };
  }
  
  return { valid: true, apiKey: trimmed };
}

// ═══════════════════════════════════════════════════════════════
// CSP META TAG GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate Content Security Policy meta tag content
 */
export function generateCSP() {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"], // Required for Vite in dev
    'style-src': ["'self'", "'unsafe-inline'"], // Required for Tailwind
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://api.openai.com',
      'https://generativelanguage.googleapis.com',
      'http://localhost:11434', // Ollama
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// ═══════════════════════════════════════════════════════════════
// SECURE STORAGE
// ═══════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'markviewer_';

/**
 * Securely store sensitive data
 */
export async function secureStore(key, value) {
  const encrypted = await encryptApiKey(JSON.stringify(value));
  if (encrypted) {
    localStorage.setItem(STORAGE_PREFIX + key, encrypted);
    return true;
  }
  return false;
}

/**
 * Retrieve securely stored data
 */
export async function secureRetrieve(key) {
  const encrypted = localStorage.getItem(STORAGE_PREFIX + key);
  if (!encrypted) return null;
  
  const decrypted = await decryptApiKey(encrypted);
  if (!decrypted) return null;
  
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}

/**
 * Remove securely stored data
 */
export function secureRemove(key) {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  configureDOMPurify,
  sanitizeHtml,
  encryptApiKey,
  decryptApiKey,
  isRateLimited,
  getRemainingRequests,
  resetRateLimit,
  validateTextInput,
  validateUrl,
  validateApiKey,
  generateCSP,
  secureStore,
  secureRetrieve,
  secureRemove,
};
