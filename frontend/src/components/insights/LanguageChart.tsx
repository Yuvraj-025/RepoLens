import React from 'react';
import { copyContent } from '@/lib/content';

interface FileItem {
  language?: string;
}

interface LanguageChartProps {
  files: FileItem[];
}

export default function LanguageChart({ files }: LanguageChartProps) {
  const c = copyContent.insights;
  const langCounts: Record<string, number> = {};
  files.forEach(f => {
    const lang = f.language || 'unknown';
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-serif font-light border-b border-lux-border pb-2 uppercase tracking-widest text-lux-gold">
        {c.langTitle}
      </h3>
      <div className="space-y-3 text-xs font-mono">
        {Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => {
            const pct = files.length > 0 ? ((count / files.length) * 100).toFixed(0) : '0';
            return (
              <div key={lang} className="space-y-1.5 animate-fade-in">
                <div className="flex justify-between text-[11px]">
                  <span className="uppercase text-lux-creme">{lang}</span>
                  <span className="text-lux-creme-dim">{count} files ({pct}%)</span>
                </div>
                <div className="w-full bg-lux-bg border border-lux-border h-1.5">
                  <div className="bg-lux-gold h-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
