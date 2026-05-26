import React from 'react';

interface StatsSummaryProps {
  fileCount: number;
  chunkCount: number;
  primaryLanguage: string;
}

export default function StatsSummary({ fileCount, chunkCount, primaryLanguage }: StatsSummaryProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">1. General Stats</h3>
      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
        <span className="text-retro-green-dim">TOTAL FILES:</span>
        <span className="text-right">{fileCount}</span>
        <span className="text-retro-green-dim">TOTAL CHUNKS:</span>
        <span className="text-right">{chunkCount}</span>
        <span className="text-retro-green-dim">PRIMARY LANG:</span>
        <span className="text-right">{primaryLanguage?.toUpperCase() || 'UNKNOWN'}</span>
      </div>
    </div>
  );
}
