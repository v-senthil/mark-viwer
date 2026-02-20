import { X, Settings } from 'lucide-react';

/* ── Reusable form pieces ────────────────────────────── */
function Section({ title, children, dark }) {
  return (
    <div className="mb-6">
      <h3 className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, dark, unit = '' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[13px] ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
        <span className={`text-[12px] font-mono tabular-nums ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{value}{unit}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))}
        className="range-input w-full" />
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, dark }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
        ${dark ? 'hover:bg-white/[.04]' : 'hover:bg-gray-50'}`}>
      <div className="text-left">
        <div className={`text-[13px] font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{label}</div>
        {desc && <div className={`text-[11px] mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{desc}</div>}
      </div>
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-500' : dark ? 'bg-[#30363d]' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}

/* ── Panel ───────────────────────────────────────────── */
export default function SettingsPanel({ settings, updateSettings, darkMode: dark, onClose }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className={`drawer-panel ${dark ? 'bg-[#0d1117] border-l border-[#21262d]' : 'bg-white border-l border-gray-200'}`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Settings size={16} strokeWidth={1.75} className={dark ? 'text-gray-400' : 'text-gray-500'} />
              <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
            </div>
            <button onClick={onClose} className={`drawer-close-btn ${dark ? 'text-gray-500 hover:text-white hover:bg-white/[.08]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <Section title="Editor" dark={dark}>
            <Slider label="Font Size" value={settings.editorFontSize} min={10} max={24} dark={dark} onChange={v => updateSettings({ editorFontSize: v })} unit="px" />
          </Section>

          <Section title="Preview" dark={dark}>
            <Slider label="Font Size" value={settings.previewFontSize} min={12} max={28} dark={dark} onChange={v => updateSettings({ previewFontSize: v })} unit="px" />
            <Slider label="Line Height" value={settings.previewLineHeight} min={1.2} max={2.2} step={0.1} dark={dark} onChange={v => updateSettings({ previewLineHeight: v })} />
            <div className="flex items-center justify-between py-1.5">
              <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Font Family</span>
              <select
                value={settings.previewFontFamily || 'sans-serif'}
                onChange={e => updateSettings({ previewFontFamily: e.target.value })}
                className={`text-xs rounded-md px-2 py-1 border outline-none transition-colors
                  ${dark ? 'bg-[#21262d] border-[#30363d] text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
              >
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
          </Section>

          <Section title="Modes" dark={dark}>
            <Toggle label="Auto Scroll" desc="Sync scroll between editor & preview" dark={dark} checked={settings.autoScroll} onChange={v => updateSettings({ autoScroll: v })} />
            <Toggle label="Vim Mode" desc="Vim keybindings in editor" dark={dark} checked={settings.vimMode} onChange={v => updateSettings({ vimMode: v })} />
            <Toggle label="Focus Mode" desc="Hide toolbar & statusbar" dark={dark} checked={settings.focusMode} onChange={v => updateSettings({ focusMode: v })} />
            <Toggle label="Zen Mode" desc="Distraction-free writing" dark={dark} checked={settings.zenMode} onChange={v => updateSettings({ zenMode: v })} />
            <Toggle label="Typewriter Mode" desc="Keep cursor centered" dark={dark} checked={settings.typewriterMode} onChange={v => updateSettings({ typewriterMode: v })} />
          </Section>
        </div>
      </div>
    </>
  );
}
