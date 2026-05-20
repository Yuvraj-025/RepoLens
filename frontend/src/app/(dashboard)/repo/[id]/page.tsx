'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRepositoryDetails, getRepositoryFiles } from '@/lib/api/repository';
import { Folder, FileCode, HardDrive, Cpu, Terminal, Send, ChevronRight } from 'lucide-react';

export default function RepositoryDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([
    { role: 'system', content: 'INITIALIZING AI LINK... READY. AWAITING QUERY.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const repoData = await getRepositoryDetails(id);
        setRepo(repoData);
        
        const filesData = await getRepositoryFiles(id);
        setFiles(filesData);
      } catch (err: any) {
        if (err.message && err.message.includes('401:')) {
          router.push('/login');
        } else {
          setError(err.message || 'Failed to load repository');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, router]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [
      ...prev,
      { role: 'user', content: chatInput },
      { role: 'system', content: 'PROCESSING QUERY... [CONNECTION TO GEMINI PENDING]' }
    ]);
    setChatInput('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl animate-pulse text-retro-green">&gt; FETCHING REPOSITORY DATA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-red-500 bg-red-500/10 p-6 max-w-2xl mx-auto mt-12">
        <h2 className="text-2xl text-red-500 mb-2">&gt; ERROR_ENCOUNTERED</h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto space-y-6">
      
      {/* Header Panel */}
      <div className="border-2 border-retro-cyan p-6 bg-retro-cyan/5 flex flex-col md:flex-row justify-between items-start md:items-center shadow-retro shadow-retro-cyan gap-4">
        <div>
          <h1 className="text-3xl uppercase tracking-wider text-retro-cyan flex items-center gap-2">
            <HardDrive className="w-8 h-8" /> 
            {repo.name}
          </h1>
          <p className="text-retro-green-dim mt-2 flex items-center gap-2">
            <span>STATUS: [{repo.status.toUpperCase()}]</span>
            <span className="text-retro-cyan/50">|</span>
            <span>FILES: {repo.fileCount}</span>
            <span className="text-retro-cyan/50">|</span>
            <span>CHUNKS: {repo.chunkCount}</span>
          </p>
        </div>
        <div className="text-right flex items-center gap-4 border-l-2 border-retro-cyan/30 pl-4">
          <Cpu className="w-12 h-12 text-retro-cyan opacity-50" />
          <div className="text-sm text-retro-green-dim space-y-1">
            <p>LANG: {repo.primaryLanguage || 'UNKNOWN'}</p>
            <p>ID: {repo.id.split('-')[0]}...</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        
        {/* File Explorer Panel */}
        <div className="md:w-1/3 border-2 border-retro-green flex flex-col h-full bg-retro-bg overflow-hidden shadow-[4px_4px_0_0_#00ff41]">
          <div className="border-b-2 border-retro-green p-3 bg-retro-green/20 flex items-center gap-2">
            <Folder className="w-5 h-5" />
            <h2 className="uppercase tracking-widest text-lg">SYS.TREE()</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-retro-green scrollbar-track-transparent">
            {files.length === 0 ? (
              <p className="text-retro-green-dim italic">&gt; NO FILES DETECTED</p>
            ) : (
              files.map(file => (
                <div key={file.id} className="flex justify-between items-center group hover:bg-retro-green/10 p-1 cursor-default transition-colors border-b border-retro-green/20 last:border-0">
                  <div className="flex items-center gap-2 truncate pr-4">
                    <ChevronRight className="w-3 h-3 text-retro-green-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileCode className="w-4 h-4 text-retro-green flex-shrink-0" />
                    <span className="truncate text-sm font-mono" title={file.filePath}>{file.filePath}</span>
                  </div>
                  <div className="text-xs text-retro-green-dim flex-shrink-0 flex gap-3 font-mono">
                    <span className="w-12 truncate text-right">{file.language}</span>
                    <span className="w-20 text-right">{file.modifiedAt ? new Date(file.modifiedAt).toLocaleDateString() : '--/--/----'}</span>
                    <span className="w-16 text-right">{formatSize(file.sizeBytes)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="md:w-2/3 border-2 border-retro-green flex flex-col h-full bg-retro-bg shadow-[4px_4px_0_0_#00ff41] relative overflow-hidden">
          {/* CRT Scanline overlay just for this panel */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-20" />
          
          <div className="border-b-2 border-retro-green p-3 bg-retro-green/20 flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            <h2 className="uppercase tracking-widest text-lg">AI_LINK_ESTABLISHED</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col font-mono">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start'}`}>
                <span className="text-xs text-retro-green-dim mb-1 uppercase tracking-wider">
                  {msg.role === 'user' ? 'USER_INPUT' : 'SYS_RESPONSE'}
                </span>
                <div className={`p-4 border-2 ${msg.role === 'user' ? 'border-retro-cyan bg-retro-cyan/10 text-retro-cyan' : 'border-retro-green bg-retro-green/5 text-retro-green'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-retro-green p-4 bg-retro-bg z-20">
            <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
              <span className="text-xl text-retro-green font-bold animate-pulse">&gt;</span>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Query the codebase..."
                className="flex-1 bg-transparent border-b-2 border-retro-green/50 focus:border-retro-green text-retro-green placeholder:text-retro-green/30 px-2 py-2 outline-none font-mono"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim()}
                className="p-3 border-2 border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
