export default function StatusBar({ stats, settings, darkMode: dark }) {
  const badges = [];
  if (settings.vimMode) badges.push('VIM');
  if (settings.typewriterMode) badges.push('TYPEWRITER');
  if (settings.focusMode) badges.push('FOCUS');

  return (
    <div className={`flex items-center justify-between h-[26px] px-3 text-[11px] border-t flex-shrink-0 no-print select-none font-medium
      ${dark ? 'bg-[#0d1117] border-[#21262d] text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
      <div className="flex items-center gap-3">
        <span>{stats.lines} lines</span>
        <span className={`w-px h-2.5 ${dark ? 'bg-[#21262d]' : 'bg-gray-200'}`} />
        <span>{stats.words} words</span>
        <span className={`w-px h-2.5 ${dark ? 'bg-[#21262d]' : 'bg-gray-200'}`} />
        <span>{stats.chars} chars</span>
      </div>
      <div className="flex items-center gap-2">
        {badges.map(b => (
          <span key={b} className={`px-1.5 py-px rounded text-[9px] font-bold tracking-wider
            ${dark ? 'bg-blue-500/[.12] text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            {b}
          </span>
        ))}
        <span className="capitalize">{settings.editorTheme}</span>
        <span>{settings.editorFontSize}px</span>
      </div>
    </div>
  );
}
