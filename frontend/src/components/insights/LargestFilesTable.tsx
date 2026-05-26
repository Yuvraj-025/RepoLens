import React from 'react';

interface FileItem {
  filePath: string;
  language?: string;
  lineCount?: number;
}

interface LargestFilesTableProps {
  files: FileItem[];
}

export default function LargestFilesTable({ files }: LargestFilesTableProps) {
  const largestFiles = files
    .filter(f => f.language !== 'binary')
    .sort((a, b) => (b.lineCount || 0) - (a.lineCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-2">
      <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">3. Largest Files</h3>
      <div className="space-y-1 text-xs font-mono">
        {largestFiles.map((f, i) => (
          <div key={i} className="flex justify-between border-b border-retro-green/10 py-1">
            <span className="truncate pr-2 text-retro-green" title={f.filePath}>{f.filePath}</span>
            <span className="text-retro-cyan flex-shrink-0">{f.lineCount} lines</span>
          </div>
        ))}
      </div>
    </div>
  );
}
