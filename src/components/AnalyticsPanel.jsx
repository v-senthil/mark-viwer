import { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, Clock, BookOpen, Type, Hash, Link2, AlertTriangle, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { analyzeDocument, loadWordGoal, saveWordGoal } from '../lib/analytics';

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-gray-200 dark:border-slate-700 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {Icon && <Icon size={16} className="text-blue-500" />}
        <span className="font-medium text-sm">{title}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function StatRow({ label, value, subValue }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium">
        {value}
        {subValue && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">{subValue}</span>}
      </span>
    </div>
  );
}

function ProgressBar({ value, max, color = 'blue' }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };
  
  return (
    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors[color] || colors.blue} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function AnalyticsPanel({ content, onClose, darkMode }) {
  const [wordGoal, setWordGoal] = useState(() => loadWordGoal());
  const [goalInput, setGoalInput] = useState(wordGoal.target || '');
  
  // Compute analytics
  const analytics = useMemo(() => analyzeDocument(content || ''), [content]);
  
  // Save goal when it changes
  useEffect(() => {
    saveWordGoal(wordGoal);
  }, [wordGoal]);
  
  const handleSetGoal = () => {
    const target = parseInt(goalInput, 10);
    if (target > 0) {
      setWordGoal({ target, notified: false });
    } else {
      setWordGoal({ target: 0, notified: false });
    }
  };
  
  const { basic, content: contentStats, readability, vocabulary, structure } = analytics;
  
  // Reading ease color mapping
  const readabilityColors = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  };
  
  return (
    <div className={`fixed right-0 top-0 bottom-0 w-96 z-40 shadow-2xl border-l flex flex-col ${
      darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-500" />
          <h2 className="font-semibold">Document Analytics</h2>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
          title="Close"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Word Goal */}
        <Section title="Word Goal" icon={Target} defaultOpen={wordGoal.target > 0}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Set word goal..."
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-600 focus:border-blue-500' 
                    : 'bg-white border-gray-300 focus:border-blue-500'
                } outline-none`}
              />
              <button
                onClick={handleSetGoal}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Set
              </button>
            </div>
            {wordGoal.target > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{basic.words} / {wordGoal.target} words</span>
                  <span className={basic.words >= wordGoal.target ? 'text-green-500' : ''}>
                    {Math.round((basic.words / wordGoal.target) * 100)}%
                  </span>
                </div>
                <ProgressBar 
                  value={basic.words} 
                  max={wordGoal.target} 
                  color={basic.words >= wordGoal.target ? 'green' : 'blue'} 
                />
                {basic.words >= wordGoal.target && (
                  <p className="text-xs text-green-500">🎉 Goal reached!</p>
                )}
              </div>
            )}
          </div>
        </Section>
        
        {/* Basic Statistics */}
        <Section title="Basic Statistics" icon={Type}>
          <div className="space-y-1">
            <StatRow label="Words" value={basic.words.toLocaleString()} />
            <StatRow label="Characters" value={basic.characters.toLocaleString()} subValue={`(${basic.charactersNoSpaces.toLocaleString()} no spaces)`} />
            <StatRow label="Sentences" value={basic.sentences.toLocaleString()} />
            <StatRow label="Paragraphs" value={basic.paragraphs.toLocaleString()} />
            <StatRow label="Lines" value={basic.lines.toLocaleString()} />
          </div>
        </Section>
        
        {/* Reading Time */}
        <Section title="Reading Time" icon={Clock}>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-blue-500">{readability.readingTime}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">min to read</div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-purple-500">{readability.speakingTime}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">min to speak</div>
            </div>
          </div>
        </Section>
        
        {/* Readability */}
        <Section title="Readability" icon={BookOpen}>
          <div className="space-y-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-500 dark:text-slate-400">Flesch Reading Ease</span>
                <span className={`text-lg font-bold ${readabilityColors[readability.fleschReadingEaseColor]}`}>
                  {readability.fleschReadingEase}
                </span>
              </div>
              <div className={`text-sm mt-1 ${readabilityColors[readability.fleschReadingEaseColor]}`}>
                {readability.fleschReadingEaseLabel}
              </div>
              <div className="mt-2">
                <ProgressBar 
                  value={Math.max(0, Math.min(100, readability.fleschReadingEase))} 
                  max={100} 
                  color={readability.fleschReadingEaseColor} 
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <StatRow label="Flesch-Kincaid Grade" value={readability.fleschKincaidGrade} />
              <StatRow label="Avg. Words/Sentence" value={readability.avgWordsPerSentence} />
              <StatRow label="Avg. Syllables/Word" value={readability.avgSyllablesPerWord} />
            </div>
          </div>
        </Section>
        
        {/* Vocabulary */}
        <Section title="Vocabulary" icon={Hash}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <div className="text-xl font-bold text-emerald-500">{vocabulary.uniqueWords}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">unique words</div>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <div className="text-xl font-bold text-amber-500">{vocabulary.lexicalDensity}%</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">lexical density</div>
              </div>
            </div>
            
            {vocabulary.topWords.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Top Words</h4>
                <div className="flex flex-wrap gap-2">
                  {vocabulary.topWords.map(({ word, count }) => (
                    <span
                      key={word}
                      className={`px-2 py-1 text-xs rounded-full ${
                        darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {word} <span className="text-gray-400">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
        
        {/* Content Breakdown */}
        <Section title="Content Breakdown" icon={Link2} defaultOpen={false}>
          <div className="space-y-3">
            <div className="space-y-1">
              <StatRow label="Headings" value={contentStats.headings} />
              <div className="pl-4 text-xs space-y-0.5">
                {Object.entries(contentStats.headingsByLevel).map(([level, count]) => 
                  count > 0 && (
                    <div key={level} className="flex justify-between text-gray-400 dark:text-slate-500">
                      <span>{level.toUpperCase()}</span>
                      <span>{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            
            <StatRow label="Code Blocks" value={contentStats.codeBlocks} subValue={`(${contentStats.totalCodeLines} lines)`} />
            <StatRow label="Links" value={contentStats.links} />
            <div className="pl-4 text-xs space-y-0.5">
              {contentStats.linksByType.external.length > 0 && (
                <div className="flex justify-between text-gray-400 dark:text-slate-500">
                  <span>External</span>
                  <span>{contentStats.linksByType.external.length}</span>
                </div>
              )}
              {contentStats.linksByType.internal.length > 0 && (
                <div className="flex justify-between text-gray-400 dark:text-slate-500">
                  <span>Internal</span>
                  <span>{contentStats.linksByType.internal.length}</span>
                </div>
              )}
              {contentStats.linksByType.anchor.length > 0 && (
                <div className="flex justify-between text-gray-400 dark:text-slate-500">
                  <span>Anchors</span>
                  <span>{contentStats.linksByType.anchor.length}</span>
                </div>
              )}
            </div>
            
            <StatRow label="Images" value={contentStats.images} />
            <StatRow label="Tables" value={contentStats.tables} />
          </div>
        </Section>
        
        {/* Structure Warnings */}
        {structure.headingWarnings.length > 0 && (
          <Section title="Structure Warnings" icon={AlertTriangle} defaultOpen={true}>
            <div className="space-y-2">
              {structure.headingWarnings.map((warning, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-sm ${
                    darkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <div className="font-medium">{warning.message}</div>
                  {warning.heading && (
                    <div className="text-xs mt-1 opacity-70">"{warning.heading}"</div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
        
        {/* Section Word Counts */}
        {structure.sections.length > 1 && (
          <Section title="Section Analysis" icon={BarChart3} defaultOpen={false}>
            <div className="space-y-2">
              {structure.sections.map((section, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate flex-1 mr-2" title={section.heading}>
                      {'—'.repeat(Math.max(0, section.level - 1))} {section.heading}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {section.words} words
                    </span>
                  </div>
                  <ProgressBar 
                    value={section.words} 
                    max={Math.max(...structure.sections.map(s => s.words))} 
                    color="blue" 
                  />
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
      
      {/* Footer */}
      <div className={`px-4 py-3 border-t text-xs text-center ${
        darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
      }`}>
        Analytics update in real-time as you type
      </div>
    </div>
  );
}
