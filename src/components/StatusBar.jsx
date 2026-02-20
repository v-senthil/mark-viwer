export default function StatusBar({ stats, settings, darkMode: dark, isMobile }) {
  const badges = [];
  if (settings.vimMode) badges.push('VIM');
  if (settings.typewriterMode) badges.push('TYPEWRITER');
  if (settings.focusMode) badges.push('FOCUS');

  return (
    <div className={`flex items-center justify-between h-[26px] px-2 sm:px-3 text-[11px] border-t flex-shrink-0 no-print no-focus select-none font-medium
      ${dark ? 'bg-[#0d1117] border-[#21262d] text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="whitespace-nowrap">{stats.words} words</span>
        <span className={`hidden sm:inline w-px h-2.5 ${dark ? 'bg-[#21262d]' : 'bg-gray-200'}`} />
        <span className="hidden sm:inline">{stats.lines} lines</span>
        <span className={`hidden sm:inline w-px h-2.5 ${dark ? 'bg-[#21262d]' : 'bg-gray-200'}`} />
        <span className="hidden sm:inline">{stats.chars} chars</span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {badges.map(b => (
          <span key={b} className={`px-1.5 py-px rounded text-[9px] font-bold tracking-wider
            ${dark ? 'bg-blue-500/[.12] text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            {b}
          </span>
        ))}
        <span className="hidden sm:inline capitalize">{settings.editorTheme}</span>
        <span className="hidden sm:inline">{settings.editorFontSize}px</span>
      </div>
    </div>
  );
}
