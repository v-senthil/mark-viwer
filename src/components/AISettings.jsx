/**
 * AI Settings Panel Component
 * 
 * Provides configuration UI for AI providers:
 * - Provider selection (OpenAI, Anthropic, Ollama, Custom)
 * - API key input (masked)
 * - Model selection
 * - Connection testing
 * - Advanced settings (temperature, max tokens)
 */

import { useState, useEffect } from 'react';
import {
  X, Settings, Key, Server, Cpu, Check, AlertCircle,
  Loader2, Eye, EyeOff, ExternalLink, Zap
} from 'lucide-react';
import {
  loadAISettings, saveAISettings, maskApiKey,
  PROVIDERS, DEFAULT_AI_SETTINGS, getAIClient, resetAIClient,
  fetchOllamaModels, fetchGeminiModels
} from '../lib/aiClient';

// Individual input components for clean UI
function FormSection({ title, children, dark }) {
  return (
    <div className="mb-5">
      <h3 className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-3 
        ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SelectInput({ label, value, options, onChange, dark, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[13px] flex-shrink-0 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[13px] px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors max-w-[200px] truncate
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${dark ? 'bg-[#21262d] border-[#30363d] text-white' : 'bg-white border-gray-200 text-gray-900'}`}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, dark, type = 'text', icon: Icon }) {
  return (
    <div>
      <label className={`block text-[13px] mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 
            ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full text-[13px] px-3 py-2 rounded-lg border outline-none transition-colors
            ${Icon ? 'pl-9' : ''}
            ${dark 
              ? 'bg-[#21262d] border-[#30363d] text-white placeholder-gray-600 focus:border-blue-500' 
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
        />
      </div>
    </div>
  );
}

function ApiKeyInput({ value, onChange, dark }) {
  const [showKey, setShowKey] = useState(false);
  const displayValue = showKey ? value : (value ? maskApiKey(value) : '');

  return (
    <div>
      <label className={`block text-[13px] mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        API Key
      </label>
      <div className="relative">
        <Key size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 
          ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
        <input
          type={showKey ? 'text' : 'password'}
          value={showKey ? value : value}
          onChange={e => onChange(e.target.value)}
          placeholder="sk-..."
          className={`w-full text-[13px] pl-9 pr-10 py-2 rounded-lg border outline-none transition-colors font-mono
            ${dark 
              ? 'bg-[#21262d] border-[#30363d] text-white placeholder-gray-600 focus:border-blue-500' 
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors
            ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function SliderInput({ label, value, min, max, step = 1, onChange, dark, unit = '' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[13px] ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
        <span className={`text-[12px] font-mono tabular-nums ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="range-input w-full"
      />
    </div>
  );
}

export default function AISettings({ darkMode: dark, onClose }) {
  const [settings, setSettings] = useState(loadAISettings);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [geminiModels, setGeminiModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const provider = PROVIDERS[settings.provider];

  // Fetch Ollama models when provider is ollama or endpoint changes
  useEffect(() => {
    if (settings.provider === 'ollama') {
      setLoadingModels(true);
      fetchOllamaModels(settings.ollamaEndpoint).then(models => {
        setOllamaModels(models);
        setLoadingModels(false);
        // Auto-select first model if none selected
        if (models.length > 0 && !settings.ollamaModel) {
          setSettings(prev => ({ ...prev, ollamaModel: models[0].id }));
        }
      });
    }
  }, [settings.provider, settings.ollamaEndpoint]);

  // Fetch Gemini models when provider is google and API key is set
  useEffect(() => {
    if (settings.provider === 'google' && settings.apiKey) {
      setLoadingModels(true);
      fetchGeminiModels(settings.apiKey).then(models => {
        setGeminiModels(models);
        setLoadingModels(false);
        // Auto-select first model if current selection not in list
        if (models.length > 0 && !models.find(m => m.id === settings.model)) {
          setSettings(prev => ({ ...prev, model: models[0].id }));
        }
      });
    }
  }, [settings.provider, settings.apiKey]);

  // Update a setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setTestStatus(null);
  };

  // Save settings
  const handleSave = () => {
    saveAISettings(settings);
    resetAIClient(); // Reset client to use new settings
    setHasChanges(false);
  };

  // Test connection
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection...');

    const client = getAIClient();
    client.updateSettings(settings);
    
    const result = await client.testConnection();
    
    setTestStatus(result.success ? 'success' : 'error');
    setTestMessage(result.message);
  };

  // Get models for current provider
  const getModels = () => {
    if (settings.provider === 'ollama') {
      if (ollamaModels.length > 0) {
        return ollamaModels.map(m => ({ value: m.id, label: m.name }));
      }
      return [{ value: '', label: loadingModels ? 'Loading...' : 'No models found' }];
    }
    if (settings.provider === 'google') {
      if (geminiModels.length > 0) {
        return geminiModels.map(m => ({ value: m.id, label: m.name }));
      }
      if (loadingModels) {
        return [{ value: settings.model || 'gemini-2.0-flash', label: 'Loading models...' }];
      }
      // Fallback to static models if no API key
      return provider?.models?.map(m => ({ value: m.id, label: m.name })) || [];
    }
    if (settings.provider === 'custom') {
      return [{ value: settings.model || 'gpt-4', label: settings.model || 'gpt-4' }];
    }
    return provider?.models?.map(m => ({ value: m.id, label: m.name })) || [];
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 bottom-0 w-[380px] max-w-full z-50 overflow-y-auto
        ${dark ? 'bg-[#0d1117] border-l border-[#21262d]' : 'bg-white border-l border-gray-200'}`}>
        
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Zap size={16} strokeWidth={1.75} className={dark ? 'text-purple-400' : 'text-purple-500'} />
              <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                AI Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors
                ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Provider Selection */}
          <FormSection title="Provider" dark={dark}>
            <SelectInput
              label="AI Provider"
              value={settings.provider}
              onChange={v => updateSetting('provider', v)}
              dark={dark}
              options={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'google', label: 'Google AI (Gemini)' },
                { value: 'ollama', label: 'Ollama (Local)' },
                { value: 'custom', label: 'Custom Endpoint' },
              ]}
            />
          </FormSection>

          {/* API Key (if required) */}
          {provider?.requiresKey && (
            <FormSection title="Authentication" dark={dark}>
              <ApiKeyInput
                value={settings.apiKey}
                onChange={v => updateSetting('apiKey', v)}
                dark={dark}
              />
              
              {settings.provider === 'openai' && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-[12px] transition-colors
                    ${dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  Get your API key <ExternalLink size={12} />
                </a>
              )}
              {settings.provider === 'google' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-[12px] transition-colors
                    ${dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  Get your API key <ExternalLink size={12} />
                </a>
              )}
            </FormSection>
          )}

          {/* Ollama Settings */}
          {settings.provider === 'ollama' && (
            <FormSection title="Ollama Configuration" dark={dark}>
              <TextInput
                label="Ollama Endpoint"
                value={settings.ollamaEndpoint}
                onChange={v => updateSetting('ollamaEndpoint', v)}
                placeholder="http://localhost:11434"
                dark={dark}
                icon={Server}
              />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[13px] ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Model</span>
                  <button
                    onClick={() => {
                      setLoadingModels(true);
                      fetchOllamaModels(settings.ollamaEndpoint).then(models => {
                        setOllamaModels(models);
                        setLoadingModels(false);
                      });
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors flex items-center gap-1
                      ${dark ? 'text-blue-400 hover:bg-blue-400/10' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    {loadingModels ? <Loader2 size={10} className="animate-spin" /> : '↻'} Refresh
                  </button>
                </div>
                <select
                  value={settings.ollamaModel}
                  onChange={e => updateSetting('ollamaModel', e.target.value)}
                  disabled={loadingModels}
                  className={`w-full text-[13px] px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors
                    ${loadingModels ? 'opacity-50 cursor-wait' : ''}
                    ${dark ? 'bg-[#21262d] border-[#30363d] text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                >
                  {getModels().map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                {ollamaModels.length > 0 
                  ? `${ollamaModels.length} model${ollamaModels.length > 1 ? 's' : ''} available locally`
                  : 'Make sure Ollama is running locally with CORS enabled.'
                }
              </p>
            </FormSection>
          )}

          {/* Custom Endpoint */}
          {settings.provider === 'custom' && (
            <FormSection title="Custom Endpoint" dark={dark}>
              <TextInput
                label="API Endpoint"
                value={settings.customEndpoint}
                onChange={v => updateSetting('customEndpoint', v)}
                placeholder="https://your-api.com/v1/chat/completions"
                dark={dark}
                icon={Server}
              />
              <TextInput
                label="Model ID"
                value={settings.model}
                onChange={v => updateSetting('model', v)}
                placeholder="gpt-4"
                dark={dark}
                icon={Cpu}
              />
            </FormSection>
          )}

          {/* Model Selection (for OpenAI and Google) */}
          {(settings.provider === 'openai' || settings.provider === 'google') && (
            <FormSection title="Model" dark={dark}>
              <SelectInput
                label="Model"
                value={settings.model}
                onChange={v => updateSetting('model', v)}
                dark={dark}
                options={getModels()}
              />
            </FormSection>
          )}

          {/* Advanced Settings */}
          <FormSection title="Advanced" dark={dark}>
            <SliderInput
              label="Temperature"
              value={settings.temperature}
              min={0}
              max={2}
              step={0.1}
              onChange={v => updateSetting('temperature', v)}
              dark={dark}
            />
            <p className={`text-[11px] -mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              Lower = more focused, Higher = more creative
            </p>
            
            <SliderInput
              label="Max Tokens"
              value={settings.maxTokens}
              min={256}
              max={8192}
              step={256}
              onChange={v => updateSetting('maxTokens', v)}
              dark={dark}
            />
          </FormSection>

          {/* Test Connection */}
          <FormSection title="Connection" dark={dark}>
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-[13px] transition-all
                ${testStatus === 'testing' ? 'opacity-70 cursor-wait' : ''}
                ${dark 
                  ? 'bg-[#21262d] text-white hover:bg-[#30363d] border border-[#30363d]' 
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200'}`}
            >
              {testStatus === 'testing' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Settings size={14} />
                  Test Connection
                </>
              )}
            </button>

            {/* Test Result */}
            {testStatus && testStatus !== 'testing' && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-[12px]
                ${testStatus === 'success'
                  ? dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                  : dark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'}`}
              >
                {testStatus === 'success' ? (
                  <Check size={14} className="mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                )}
                <span>{testMessage}</span>
              </div>
            )}
          </FormSection>

          {/* Save Button */}
          <div className="mt-6 pt-4 border-t border-[#21262d]">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-[13px] transition-all
                ${hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : dark 
                    ? 'bg-[#21262d] text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              <Check size={14} />
              {hasChanges ? 'Save Settings' : 'Settings Saved'}
            </button>
          </div>

          {/* Security Note */}
          <p className={`mt-4 text-[11px] text-center ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            🔒 API keys are stored locally in your browser and never sent to our servers.
          </p>
        </div>
      </div>
    </>
  );
}
