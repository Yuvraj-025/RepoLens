import React from 'react';

interface FileItem {
  language?: string;
}

interface LanguageChartProps {
  files: FileItem[];
}

export default function LanguageChart({ files }: LanguageChartProps) {
  const langCounts: Record<string, number> = {};
  files.forEach(f => {
    const lang = f.language || 'unknown';
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  });

  return (
    <div className="space-y-3">
      <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">2. Language Breakdown</h3>
      <div className="space-y-2 text-sm font-mono">
        {Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => {
            const pct = files.length > 0 ? ((count / files.length) * 100).toFixed(0) : '0';
            return (
              <div key={lang} className="space-y-1">
                <div className="flex justify-between">
                  <span className="uppercase">{lang}</span>
                  <span>{count} files ({pct}%)</span>
                </div>
                <div className="w-full bg-retro-bg border border-retro-green/30 h-2">
                  <div className="bg-retro-cyan h-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
