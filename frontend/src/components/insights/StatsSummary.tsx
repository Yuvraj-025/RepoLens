import React from 'react';
import { copyContent } from '@/lib/content';

interface StatsSummaryProps {
  fileCount: number;
  chunkCount: number;
  primaryLanguage: string;
}

export default function StatsSummary({ fileCount, chunkCount, primaryLanguage }: StatsSummaryProps) {
  const c = copyContent.insights;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-serif font-light border-b border-lux-border pb-2 uppercase tracking-widest text-lux-gold">
        {c.statsTitle}
      </h3>
      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-mono">
        <span className="text-lux-creme-dim uppercase">{c.statsTotalFiles}</span>
        <span className="text-right text-lux-creme font-bold">{fileCount}</span>
        <span className="text-lux-creme-dim uppercase">{c.statsTotalChunks}</span>
        <span className="text-right text-lux-creme font-bold">{chunkCount}</span>
        <span className="text-lux-creme-dim uppercase">{c.statsPrimaryLang}</span>
        <span className="text-right text-lux-gold font-bold">{primaryLanguage?.toUpperCase() || 'UNKNOWN'}</span>
      </div>
    </div>
  );
}
