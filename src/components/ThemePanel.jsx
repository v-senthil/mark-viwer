import { useState, useEffect } from 'react';
import { X, Palette, Check, Download, Upload, Plus, Trash2, Sun, Moon } from 'lucide-react';
import { 
  EDITOR_THEMES, 
  PREVIEW_THEMES, 
  THEME_PRESETS,
  loadCustomThemes,
  saveCustomThemes,
  exportTheme,
  importTheme,
  createCustomTheme,
} from '../lib/themes';
import toast from 'react-hot-toast';

function ThemeCard({ theme, selected, onClick, darkMode }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : darkMode
            ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}
      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {theme.name}
      </div>
      <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        {theme.description}
      </div>
    </button>
  );
}

function PresetCard({ preset, selected, onClick, darkMode }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : darkMode
            ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        {preset.darkMode ? (
          <Moon size={14} className="text-indigo-400" />
        ) : (
          <Sun size={14} className="text-amber-500" />
        )}
        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {preset.name}
        </span>
      </div>
      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        {preset.description}
      </div>
      <div className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        Editor: {preset.editorTheme} · Preview: {preset.previewTheme}
      </div>
    </button>
  );
}

function Tab({ label, active, onClick, darkMode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? darkMode
            ? 'bg-slate-700 text-white'
            : 'bg-white text-gray-900 shadow-sm'
          : darkMode
            ? 'text-slate-400 hover:text-white'
            : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function ThemePanel({ settings, updateSettings, onClose, darkMode }) {
  const [activeTab, setActiveTab] = useState('presets');
  const [customThemes, setCustomThemes] = useState(() => loadCustomThemes());
  
  // Save custom themes when they change
  useEffect(() => {
    saveCustomThemes(customThemes);
  }, [customThemes]);
  
  const handleApplyPreset = (preset) => {
    updateSettings({
      editorTheme: preset.editorTheme,
      previewTheme: preset.previewTheme,
      darkMode: preset.darkMode,
    });
    toast.success(`Applied "${preset.name}" theme preset`);
  };
  
  const handleImportTheme = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const theme = await importTheme(file);
        setCustomThemes(prev => [...prev, theme]);
        toast.success(`Imported "${theme.name}" theme`);
      } catch (err) {
        toast.error(err.message);
      }
    };
    input.click();
  };
  
  const handleCreateCustomTheme = () => {
    const name = prompt('Enter theme name:');
    if (!name) return;
    const theme = createCustomTheme(name);
    setCustomThemes(prev => [...prev, theme]);
    toast.success(`Created "${name}" theme`);
  };
  
  const handleDeleteCustomTheme = (themeId) => {
    if (!confirm('Delete this custom theme?')) return;
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    toast.success('Theme deleted');
  };
  
  const handleExportTheme = (theme) => {
    exportTheme(theme);
    toast.success('Theme exported');
  };
  
  // Find current preset based on settings
  const currentPreset = THEME_PRESETS.find(
    p => p.editorTheme === settings.editorTheme && 
         p.previewTheme === settings.previewTheme && 
         p.darkMode === settings.darkMode
  );
  
  return (
    <div className={`fixed right-0 top-0 bottom-0 w-[420px] z-50 shadow-2xl border-l flex flex-col ${
      darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <Palette size={20} className="text-purple-500" />
          <h2 className="font-semibold">Theme Manager</h2>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Tabs */}
      <div className={`flex gap-1 p-2 border-b ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
        <Tab label="Presets" active={activeTab === 'presets'} onClick={() => setActiveTab('presets')} darkMode={darkMode} />
        <Tab label="Editor" active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} darkMode={darkMode} />
        <Tab label="Preview" active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} darkMode={darkMode} />
        <Tab label="Custom" active={activeTab === 'custom'} onClick={() => setActiveTab('custom')} darkMode={darkMode} />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Choose a theme preset to quickly apply a coordinated look.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {THEME_PRESETS.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={currentPreset?.id === preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'editor' && (
          <div className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Choose an editor color scheme.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {EDITOR_THEMES.map(theme => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={settings.editorTheme === theme.id}
                  onClick={() => updateSettings({ editorTheme: theme.id })}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Choose a preview rendering style.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PREVIEW_THEMES.map(theme => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={settings.previewTheme === theme.id}
                  onClick={() => updateSettings({ previewTheme: theme.id })}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Create, import, and manage your custom themes.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleCreateCustomTheme}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <Plus size={16} />
                Create Theme
              </button>
              <button
                onClick={handleImportTheme}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload size={16} />
                Import
              </button>
            </div>
            
            {customThemes.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                <Palette size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No custom themes yet</p>
                <p className="text-xs mt-1">Create one or import from a file</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customThemes.map(theme => (
                  <div
                    key={theme.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      darkMode ? 'bg-slate-800' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {theme.name}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        Created {new Date(theme.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExportTheme(theme)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'
                        }`}
                        title="Export"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomTheme(theme.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'
                        }`}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer hint */}
      <div className={`px-4 py-3 border-t text-xs text-center ${
        darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
      }`}>
        Toggle dark/light mode with <kbd className="px-1 border rounded">⌘⇧K</kbd>
      </div>
    </div>
  );
}
