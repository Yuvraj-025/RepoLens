import React from 'react';
import { copyContent } from '@/lib/content';

interface FileItem {
  filePath: string;
  language?: string;
  lineCount?: number;
}

interface LargestFilesTableProps {
  files: FileItem[];
}

export default function LargestFilesTable({ files }: LargestFilesTableProps) {
  const c = copyContent.insights;
  const largestFiles = files
    .filter(f => f.language !== 'binary')
    .sort((a, b) => (b.lineCount || 0) - (a.lineCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-serif font-light border-b border-lux-border pb-2 uppercase tracking-widest text-lux-gold">
        {c.largestTitle}
      </h3>
      <div className="space-y-1 text-[11px] font-mono">
        {largestFiles.map((f, i) => (
          <div key={i} className="flex justify-between border-b border-lux-border/40 py-2 hover:bg-lux-card/10 px-1 transition-colors duration-300">
            <span className="truncate pr-4 text-lux-creme" title={f.filePath}>{f.filePath}</span>
            <span className="text-lux-gold flex-shrink-0 font-bold">{f.lineCount} {c.largestLinesLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
