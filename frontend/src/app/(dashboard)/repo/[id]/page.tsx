'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRepositoryDetails, getRepositoryFiles, getRepositoryFile, getRepositorySummary } from '@/lib/api/repository';
import { getChatHistory, clearChatHistory, queryRepositoryStream } from '@/lib/api/chat';
import Link from 'next/link';
import { Folder, FileCode, HardDrive, Cpu, Terminal, Send, ChevronRight, Maximize2, Minimize2, X, Info, ArrowLeft, AlertTriangle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import StatsSummary from '@/components/insights/StatsSummary';
import LanguageChart from '@/components/insights/LanguageChart';
import LargestFilesTable from '@/components/insights/LargestFilesTable';
import { copyContent } from '@/lib/content';

const formatMarkdown = (text: string) => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  escaped = escaped.replace(/\*\*([^\s\*](?:[\s\S]*?[^\s\*])?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*([^\s\*](?:[\s\S]*?[^\s\*])?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/`([^`\s](?:[^`]*?[^`\s])?)`/g, '<code class="px-1.5 py-0.5 font-mono text-[11px] bg-[#0e0d0c]/60 border border-lux-border/60 text-lux-gold rounded">$1</code>');
  return escaped;
};

export default function RepositoryDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  interface ChatMessage {
    role: string;
    content: string;
    sources?: { chunkId: string; filePath: string; startLine: number; endLine: number }[];
  }

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isExpandedView, setIsExpandedView] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [isFileLoading, setIsFileLoading] = useState(false);

  // Monaco Highlights & Scrolling States
  const [highlightRange, setHighlightRange] = useState<{ startLine: number; endLine: number } | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Insights Panel States
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'files'>('chat');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'files' | 'code'>('code');

  const c = copyContent.repoDetails;

  const mapLanguageToMonaco = (lang: string) => {
    if (!lang) return 'plaintext';
    const l = lang.toLowerCase();
    if (['ts', 'tsx'].includes(l)) return 'typescript';
    if (['js', 'jsx'].includes(l)) return 'javascript';
    if (['py'].includes(l)) return 'python';
    if (['rs'].includes(l)) return 'rust';
    if (['sh', 'bash'].includes(l)) return 'shell';
    if (['yml', 'yaml'].includes(l)) return 'yaml';
    if (['md'].includes(l)) return 'markdown';
    if (['c', 'h', 'cpp', 'hpp'].includes(l)) return 'cpp';
    if (l === 'cs') return 'csharp';
    return l;
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    setEditorInstance(editor);
    setMonacoInstance(monaco);

    // Defining the custom luxury code highlighting theme
    monaco.editor.defineTheme('luxury-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'faf8f5' },
        { token: 'comment', foreground: '8a7d6e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ebdcb9' },
        { token: 'string', foreground: 'c98c6b' },
        { token: 'number', foreground: 'ebdcb9' },
        { token: 'regexp', foreground: 'ebdcb9' },
        { token: 'type', foreground: 'd0c4b2' },
      ],
      colors: {
        'editor.background': '#12100f',
        'editor.foreground': '#faf8f5',
        'editor.lineHighlightBackground': '#27221e33',
        'editorLineNumber.foreground': '#40362f',
        'editorLineNumber.activeForeground': '#ebdcb9',
        'editor.selectionBackground': '#ebdcb922',
      }
    });
    monaco.editor.setTheme('luxury-dark');
  };

  useEffect(() => {
    if (!editorInstance || !monacoInstance) return;

    decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, []);

    if (highlightRange && selectedFileContent) {
      const { startLine, endLine } = highlightRange;

      decorationsRef.current = editorInstance.deltaDecorations([], [
        {
          range: new monacoInstance.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-chunk-highlight',
            marginClassName: 'monaco-chunk-glyph-margin',
          }
        }
      ]);

      setTimeout(() => {
        editorInstance.revealRangeInCenter({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: 1
        }, 1);
      }, 150);
    }
  }, [selectedFileContent, highlightRange, editorInstance, monacoInstance]);

  const handleOpenInsights = async () => {
    setIsInsightOpen(true);
    if (summary) return;

    setIsSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await getRepositorySummary(id);
      const cleaned = (data.summary || '')
        .replace(/^```markdown\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      setSummary(cleaned);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to load summary insights');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleViewFile = async (file: any, range: { startLine: number; endLine: number } | null = null) => {
    setIsExpandedView(true);
    setIsFileLoading(true);
    setSelectedFile(file);
    setHighlightRange(range);
    setActiveWorkspaceTab('code');
    try {
      const fileDetails = await getRepositoryFile(id, file.id);
      setSelectedFileContent(fileDetails.content);
    } catch (err: any) {
      setSelectedFileContent(`ERROR LOADING FILE: ${err.message}`);
    } finally {
      setIsFileLoading(false);
    }
  };

  const fileTree = useMemo(() => {
    const root: any = { name: 'root', path: '', isDirectory: true, children: {} };

    files.forEach(file => {
      const parts = file.filePath.split('/');
      let current = root;
      let currentPath = '';

      parts.forEach((part: string, index: number) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isDirectory: !isLast,
            children: {},
            ...(isLast ? file : {})
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }, [files]);

  const renderTreeNode = (node: any, level = 0) => {
    const isExpanded = !!expandedFolders[node.path];

    if (!node.isDirectory) {
      const isSelected = selectedFile?.id === node.id;
      return (
        <div
          key={node.id}
          className={`flex justify-between items-center group py-2 px-3 cursor-default transition-all duration-300 border-b border-lux-border/30 last:border-0 font-mono text-xs pl-[calc(var(--indent-level)*0.4rem+0.4rem)] md:pl-[calc(var(--indent-level)*1.2rem+0.75rem)] ${isSelected ? 'bg-lux-gold/10' : 'hover:bg-lux-card/40'}`}
          style={{ '--indent-level': level } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 truncate pr-4">
            <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-lux-gold' : 'text-lux-creme-dim'}`} />
            <span className={`truncate text-xs ${isSelected ? 'text-lux-gold font-bold' : 'text-lux-creme'}`} title={node.name}>
              {node.name}
            </span>
          </div>
          <div className="text-[10px] text-lux-creme-dim flex-shrink-0 flex items-center gap-3 font-mono">
            <span className="w-12 truncate text-right hidden sm:inline">{node.language}</span>
            <span className="w-16 text-right hidden md:inline">{formatSize(node.sizeBytes)}</span>
            <button
              onClick={() => handleViewFile(node)}
              className={`px-2 py-0.5 border text-[9px] uppercase tracking-wider transition-colors font-semibold font-mono ${isSelected
                  ? 'border-lux-gold text-lux-bg bg-lux-gold hover:bg-transparent hover:text-lux-gold'
                  : 'border-lux-border text-lux-creme-dim hover:border-lux-gold hover:text-lux-gold'
                }`}
            >
              {c.viewButton}
            </button>
          </div>
        </div>
      );
    }

    const childrenKeys = Object.keys(node.children).sort((a, b) => {
      const childA = node.children[a];
      const childB = node.children[b];
      if (childA.isDirectory && !childB.isDirectory) return -1;
      if (!childA.isDirectory && childB.isDirectory) return 1;
      return a.localeCompare(b);
    });

    return (
      <div key={node.path}>
        <div
          onClick={() => toggleFolder(node.path)}
          className="flex items-center gap-2 hover:bg-lux-card/30 py-2 px-3 cursor-pointer border-b border-lux-border/30 last:border-0 font-mono text-xs pl-[calc(var(--indent-level)*0.4rem+0.4rem)] md:pl-[calc(var(--indent-level)*1.2rem+0.75rem)]"
          style={{ '--indent-level': level } as React.CSSProperties}
        >
          <ChevronRight className={`w-3.5 h-3.5 text-lux-creme-dim transition-transform duration-300 ${isExpanded ? 'rotate-90 text-lux-gold' : ''}`} />
          <Folder className="w-3.5 h-3.5 text-lux-gold flex-shrink-0" />
          <span className="font-semibold text-lux-creme truncate">{node.name}</span>
          <span className="text-[9px] text-lux-creme-dim ml-auto hidden sm:inline">({childrenKeys.length})</span>
        </div>
        {isExpanded && childrenKeys.map(key => renderTreeNode(node.children[key], level + 1))}
      </div>
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const repoData = await getRepositoryDetails(id);
        setRepo(repoData);

        const filesData = await getRepositoryFiles(id);
        setFiles(filesData);

        const history = await getChatHistory(id);
        const transformed: ChatMessage[] = [];
        history.forEach((h: any) => {
          transformed.push({ role: 'user', content: h.userQuery });
          transformed.push({ role: 'assistant', content: h.aiResponse, sources: h.sourcesJson });
        });

        if (transformed.length === 0) {
          setChatMessages([
            { role: 'assistant', content: 'Index mapping completed. Ready for query analysis.' }
          ]);
        } else {
          setChatMessages(transformed);
        }
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

  const handleClearHistory = async () => {
    if (!confirm(c.confirmClearPrompt)) return;
    try {
      await clearChatHistory(id);
      setChatMessages([
        { role: 'assistant', content: c.clearSuccessContent }
      ]);
    } catch (err: any) {
      alert(`Failed to clear chat log: ${err.message}`);
    }
  };

  const handleSaveChat = () => {
    if (chatMessages.length === 0) return;

    let text = `=========================================\n`;
    text += `REPOLENS CHAT HISTORY LOG\n`;
    text += `REPOSITORY: ${repo?.name || 'UNKNOWN'}\n`;
    text += `EXPORT DATE: ${new Date().toLocaleString()}\n`;
    text += `=========================================\n\n`;

    chatMessages.forEach((msg) => {
      const roleName = msg.role === 'user' ? 'USER_INPUT' : 'SYS_RESPONSE';
      text += `[${roleName}]:\n${msg.content}\n`;
      if (msg.sources && msg.sources.length > 0) {
        text += `\nCitations:\n`;
        msg.sources.forEach((src) => {
          text += `  - ${src.filePath} (Lines ${src.startLine}-${src.endLine})\n`;
        });
      }
      text += `\n-----------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repolens-chat-${repo?.name || 'history'}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const userQuery = chatInput.trim();
    setChatInput('');
    setIsSending(true);

    setChatMessages(prev => [
      ...prev,
      { role: 'user', content: userQuery },
      { role: 'assistant', content: 'Locating context chunks...' }
    ]);

    try {
      let currentContent = '';
      let sourcesReceived: any[] = [];

      await queryRepositoryStream(id, userQuery, (msg) => {
        if (msg.type === 'sources') {
          sourcesReceived = msg.sources || [];
          setChatMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) {
              last.sources = sourcesReceived;
            }
            return updated;
          });
        } else if (msg.type === 'content') {
          if (currentContent === '' || currentContent === 'Locating context chunks...') {
            currentContent = msg.content || '';
          } else {
            currentContent += msg.content || '';
          }
          setChatMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) {
              last.content = currentContent;
            }
            return updated;
          });
        } else if (msg.type === 'error') {
          setChatMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) {
              last.content = `[Stream Disrupted: ${msg.message || 'Error occurred'}]`;
            }
            return updated;
          });
        }
      });
    } catch (err: any) {
      setChatMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last) {
          last.content = `[Connection Error: ${err.message || 'Failed to stream response'}]`;
        }
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-lux-gold animate-pulse text-xs tracking-widest uppercase">&gt; {c.loadingIndex}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-lux-copper bg-lux-copper/5 p-6 max-w-2xl mx-auto mt-12 space-y-3 font-mono text-xs">
        <h2 className="text-sm font-serif font-light text-lux-copper uppercase">&gt; {c.errorHeader}</h2>
        <p className="text-lux-creme-dim">{error}</p>
      </div>
    );
  }

  if (repo && (repo.status === 'processing' || repo.status === 'pending')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] w-full max-w-xl mx-auto p-8 space-y-6 animate-reveal-up text-center">
        <Cpu className="w-12 h-12 text-lux-gold animate-spin opacity-80" style={{ animationDuration: '3s' }} />
        <div className="space-y-2">
          <h2 className="text-lg font-serif font-light tracking-widest text-lux-creme uppercase">Synthesizing Repository Context</h2>
          <p className="text-[10px] font-mono tracking-wider text-lux-creme-dim uppercase">
            Deconstructing files into vector embeddings
          </p>
        </div>
        <div className="w-full border border-lux-border p-4 bg-lux-card/10 space-y-2 font-mono text-xs text-lux-creme-dim">
          <p>Files parsed: <span className="text-lux-gold font-bold">{repo.fileCount || 0}</span></p>
          <p>Chunks generated: <span className="text-lux-gold font-bold">{repo.chunkCount || 0}</span></p>
          <p>Chunks embedded: <span className="text-lux-gold font-bold">{repo.embeddedCount || 0}</span> / <span className="opacity-60">{repo.chunkCount || '...'}</span></p>
        </div>
        <p className="text-[10px] font-mono text-lux-gold animate-pulse tracking-widest uppercase">
          &gt; Processing embedding telemetry...
        </p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10.5rem)] w-full max-w-[1800px] mx-auto space-y-6 animate-reveal-up">

      {/* Header Panel */}
      <div className="border border-lux-border p-4 md:p-6 bg-lux-card/15 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center shadow-lux gap-6">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="p-2 border border-lux-border text-lux-creme-dim hover:text-lux-gold hover:border-lux-gold transition-colors duration-300 flex items-center justify-center mt-1"
            title="Return to Repository Index"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-light tracking-widest text-lux-creme flex items-center gap-3 uppercase">
              <HardDrive className="w-6 h-6 text-lux-gold" />
              {repo.name}
              <button
                onClick={handleOpenInsights}
                className="p-1.5 text-lux-gold hover:text-lux-creme hover:bg-lux-card border border-lux-border hover:border-lux-gold transition-all duration-300 flex items-center justify-center ml-2"
                title="Show System Insights"
              >
                <Info className="w-4 h-4" />
              </button>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-lux-creme-dim mt-2 flex flex-wrap items-center gap-3 uppercase">
              <span>{c.statusLabel} [{repo.status.toUpperCase()}]</span>
              <span className="opacity-35">/</span>
              <span>{c.filesCountLabel} {repo.fileCount}</span>
              <span className="opacity-35">/</span>
              <span>{c.chunksCountLabel} {repo.chunkCount}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t pt-4 mt-2 w-full md:w-auto md:border-t-0 md:pt-0 md:mt-0 md:border-l md:pl-6 border-lux-border">
          <Cpu className="w-10 h-10 text-lux-gold opacity-60" />
          <div className="text-[10px] font-mono text-lux-creme-dim space-y-1 text-left uppercase tracking-wider">
            <p>{c.langLabel} {repo.primaryLanguage || 'UNKNOWN'}</p>
            <p className="opacity-60">ID: {repo.id.split('-')[0]}...</p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Control */}
      <div className="flex md:hidden border border-lux-border font-mono text-xs bg-lux-card/25">
        <button
          onClick={() => setActiveMobileTab('chat')}
          className={`flex-1 py-3 text-center uppercase tracking-widest font-bold transition-all ${
            activeMobileTab === 'chat'
              ? 'text-lux-gold bg-lux-card/40 border-b border-lux-gold'
              : 'text-lux-creme-dim hover:text-lux-creme'
          }`}
        >
          Chat Analysis
        </button>
        <button
          onClick={() => setActiveMobileTab('files')}
          className={`flex-1 py-3 text-center uppercase tracking-widest font-bold transition-all ${
            activeMobileTab === 'files'
              ? 'text-lux-gold bg-lux-card/40 border-b border-lux-gold'
              : 'text-lux-creme-dim hover:text-lux-creme'
          }`}
        >
          File Catalog
        </button>
      </div>

      {/* Main Split Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">

        {/* File Explorer Panel */}
        <div className={`md:w-1/3 border border-lux-border flex flex-col h-full bg-lux-card/15 backdrop-blur-md shadow-lux ${
          isChatFullscreen ? 'hidden' : 'flex'
        } ${activeMobileTab === 'files' ? 'flex' : 'hidden md:flex'}`}>
          <div className="border-b border-lux-border p-4 bg-lux-card/45 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-lux-gold" />
              <h2 className="uppercase tracking-widest text-xs font-mono font-bold text-lux-creme">{c.explorerTreeTitle}</h2>
            </div>
            <button
              onClick={() => setIsExpandedView(true)}
              className="p-1.5 border border-lux-border text-lux-creme-dim hover:text-lux-gold hover:border-lux-gold transition-colors duration-300"
              title="Expand Workspace"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
            {files.length === 0 ? (
              <p className="text-[10px] font-mono text-lux-creme-dim italic p-4">{c.allFilesOffline}</p>
            ) : (
              files.map(file => (
                <div key={file.id} className="flex justify-between items-center group hover:bg-lux-card/30 p-2 cursor-default transition-all duration-300 border-b border-lux-border/30 last:border-0 font-mono text-xs">
                  <div className="flex items-center gap-2 truncate pr-4">
                    <ChevronRight className="w-3 h-3 text-lux-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileCode className="w-3.5 h-3.5 text-lux-creme-dim flex-shrink-0" />
                    <span className="truncate text-xs font-mono text-lux-creme" title={file.filePath}>{file.filePath}</span>
                  </div>
                  <div className="text-[9px] text-lux-creme-dim flex-shrink-0 flex gap-3 font-mono uppercase tracking-wider items-center">
                    <span className="w-12 truncate text-right hidden lg:inline">{file.language}</span>
                    <button
                      onClick={() => handleViewFile(file)}
                      className="px-2 py-0.5 border border-lux-border hover:border-lux-gold text-lux-creme-dim hover:text-lux-gold text-[9px] transition-colors"
                    >
                      {c.viewButton}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`flex flex-col overflow-hidden ${
          isChatFullscreen
            ? 'fixed inset-0 z-50 p-6 bg-lux-bg/95 backdrop-blur-md'
            : 'md:w-2/3 border border-lux-border shadow-lux relative h-full'
        } ${activeMobileTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          <div className={`flex-1 flex flex-col min-h-0 bg-lux-card/10 relative ${isChatFullscreen
              ? 'border border-lux-border bg-lux-card shadow-lux'
              : ''
            }`}>

            {/* Header controls */}
            <div className="border-b border-lux-border p-4 bg-lux-card/45 flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-lux-gold" />
                <h2 className="uppercase tracking-widest text-xs font-mono font-bold text-lux-creme">{c.chatHeaderTitle}</h2>
              </div>
              <div className="flex items-center gap-3 font-mono text-[9px]">
                <button
                  onClick={handleSaveChat}
                  disabled={chatMessages.length === 0 || (chatMessages.length === 1 && chatMessages[0].content.includes('Index mapping completed'))}
                  className="px-2.5 py-1 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-lux-bg disabled:opacity-40 disabled:cursor-not-allowed font-bold uppercase transition-colors"
                >
                  {c.saveChatButton}
                </button>
                <button
                  onClick={handleClearHistory}
                  className="px-2.5 py-1 border border-red-500/30 text-red-400 font-bold uppercase transition-colors"
                >
                  {c.clearLogsButton}
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                  className="p-1 border border-lux-border text-lux-creme-dim hover:text-lux-gold hover:border-lux-gold transition-colors"
                  title={isChatFullscreen ? "Exit Fullscreen" : "Fullscreen Chat"}
                >
                  {isChatFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col font-mono text-xs scrollbar-thin">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start'}`}>
                  <span className="text-[9px] text-lux-creme-dim mb-1.5 uppercase tracking-widest font-bold">
                    {msg.role === 'user' ? c.userRoleLabel : c.systemRoleLabel}
                  </span>
                  <div
                    className={`p-4 border text-xs leading-relaxed ${msg.role === 'user'
                        ? 'border-lux-gold/30 bg-lux-gold/5 text-lux-creme'
                        : 'border-lux-border bg-lux-card text-lux-creme'
                      }`}
                  >
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-lux-border/50 text-[10px]">
                        <span className="text-lux-gold font-bold uppercase tracking-wider block mb-2 font-mono text-[9px]">{c.citationsLabel}</span>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const file = files.find(f => f.filePath === src.filePath);
                                if (file) {
                                  setIsExpandedView(true);
                                  handleViewFile(file, { startLine: src.startLine, endLine: src.endLine });
                                } else {
                                  alert(`File ${src.filePath} not found in catalog archives.`);
                                }
                              }}
                              title={src.filePath}
                              className="px-2.5 py-1 border border-lux-border hover:border-lux-gold text-lux-creme-dim hover:text-lux-gold transition-colors font-mono text-[9px] bg-lux-bg/20"
                            >
                              {src.filePath.split('/').pop()} (L{src.startLine}-{src.endLine})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t border-lux-border p-4 bg-lux-card/25 backdrop-blur-md z-20">
              {repo?.status === 'error' || repo?.chunkCount === 0 ? (
                <div className="flex items-center justify-center gap-2 py-2 text-lux-copper font-mono text-xs border border-dashed border-lux-copper/35 bg-lux-copper/5 rounded">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {repo?.chunkCount > 0
                      ? "Can't use on RAG, embedding failed"
                      : "Uploaded but can't chunk into RAG, chat option not available"}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                  <span className="text-sm text-lux-gold font-bold animate-pulse font-mono">&gt;</span>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={isSending ? c.chatLoadingPlaceholder : c.chatPlaceholder}
                    disabled={isSending}
                    className="flex-1 bg-transparent border-b border-lux-border/60 focus:border-lux-gold/50 text-lux-creme placeholder:text-lux-creme-dim/30 px-2 py-2 outline-none font-mono text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSending}
                    className="p-3 border border-lux-border text-lux-creme-dim hover:text-lux-gold hover:border-lux-gold transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Fullscreen Workspace Modal */}
      {isExpandedView && (
        <div className="fixed inset-0 z-50 bg-lux-bg/95 backdrop-blur-md p-4 md:p-6 flex flex-col">
          {/* Modal Header */}
          <div className="border border-lux-border bg-lux-card p-4 mb-4 sm:mb-6 flex justify-between items-center shadow-lux animate-reveal-up">
            <div className="flex items-center gap-3">
              <Terminal className="text-lux-gold w-5 h-5 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-serif font-light tracking-widest text-lux-creme uppercase">
                {c.workspaceTitle} // {repo.name}
              </h2>
            </div>
            <button
              onClick={() => {
                setIsExpandedView(false);
                setSelectedFile(null);
                setSelectedFileContent('');
              }}
              className="p-2 border border-lux-border text-lux-creme-dim hover:text-lux-creme hover:border-lux-creme transition-colors duration-300"
              title="Exit Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Workspace Tabs Switcher */}
          <div className="flex md:hidden border border-lux-border mb-4 font-mono text-xs bg-lux-card/25">
            <button
              onClick={() => setActiveWorkspaceTab('files')}
              className={`flex-1 py-3 text-center uppercase tracking-widest font-bold transition-all ${
                activeWorkspaceTab === 'files'
                  ? 'text-lux-gold bg-lux-card/40 border-b border-lux-gold'
                  : 'text-lux-creme-dim hover:text-lux-creme'
              }`}
            >
              Files Explorer
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('code')}
              className={`flex-1 py-3 text-center uppercase tracking-widest font-bold transition-all ${
                activeWorkspaceTab === 'code'
                  ? 'text-lux-gold bg-lux-card/40 border-b border-lux-gold'
                  : 'text-lux-creme-dim hover:text-lux-creme'
              }`}
            >
              Code Viewer
            </button>
          </div>

          {/* Modal Content - Split View */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 animate-reveal-up delay-100">
            {/* Left Column: Folder Tree Explorer */}
            <div className={`flex-1 md:flex-[0.3] border border-lux-border flex flex-col bg-lux-card/15 overflow-hidden ${
              activeWorkspaceTab === 'files' ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="border-b border-lux-border p-4 bg-lux-card/45 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-lux-gold" />
                  <span className="text-[10px] font-mono tracking-widest text-lux-creme font-bold uppercase">{c.workspaceFileHierarchy}</span>
                </div>
                <button
                  onClick={() => {
                    const allExpanded: Record<string, boolean> = {};
                    const expandAll = (node: any) => {
                      if (node.isDirectory) {
                        allExpanded[node.path] = true;
                        Object.keys(node.children).forEach(key => expandAll(node.children[key]));
                      }
                    };
                    expandAll(fileTree);
                    setExpandedFolders(allExpanded);
                  }}
                  className="px-2 py-0.5 border border-lux-border text-[9px] font-mono text-lux-creme-dim hover:text-lux-gold hover:border-lux-gold uppercase transition-colors"
                >
                  {c.workspaceExpandAll}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
                {Object.keys(fileTree.children).length === 0 ? (
                  <p className="text-[10px] font-mono text-lux-creme-dim italic p-4">&gt; {c.allFilesOffline}</p>
                ) : (
                  Object.keys(fileTree.children).sort((a, b) => {
                    const childA = fileTree.children[a];
                    const childB = fileTree.children[b];
                    if (childA.isDirectory && !childB.isDirectory) return -1;
                    if (!childA.isDirectory && childB.isDirectory) return 1;
                    return a.localeCompare(b);
                  }).map(key => renderTreeNode(fileTree.children[key], 0))
                )}
              </div>
            </div>

            {/* Right Column: Code Viewer */}
            <div className={`flex-1 md:flex-[0.7] border border-lux-border flex flex-col bg-lux-card/15 overflow-hidden ${
              activeWorkspaceTab === 'code' ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="border-b border-lux-border p-4 bg-lux-card/45 flex justify-between items-center">
                <div className="flex items-center gap-2 truncate pr-4">
                  <FileCode className="w-4 h-4 text-lux-gold flex-shrink-0" />
                  <span className="text-[10px] font-mono tracking-widest text-lux-creme truncate uppercase font-bold">
                    {selectedFile ? selectedFile.filePath : c.workspaceViewerOffline}
                  </span>
                </div>
                {selectedFile && (
                  <div className="text-[9px] font-mono text-lux-creme-dim flex-shrink-0 flex gap-4 uppercase tracking-wider">
                    <span>Lang: {selectedFile.language}</span>
                    <span>Size: {formatSize(selectedFile.sizeBytes)}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-[#12100f] relative overflow-hidden">
                {isFileLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-lux-bg/90 z-20 space-y-3">
                    <div className="w-8 h-8 border-2 border-lux-gold border-t-transparent animate-spin" />
                    <p className="text-lux-gold animate-pulse text-[10px] font-mono uppercase tracking-widest">&gt; {c.workspaceStreamingFile}</p>
                  </div>
                ) : selectedFile ? (
                  <div className="h-full overflow-hidden">
                    <Editor
                      height="100%"
                      language={mapLanguageToMonaco(selectedFile.language)}
                      value={selectedFileContent}
                      theme="luxury-dark"
                      onMount={handleEditorDidMount}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        fontSize: 13,
                        fontFamily: '"var(--font-courier)", "Courier New", monospace',
                        lineNumbersMinChars: 3,
                        scrollBeyondLastLine: false,
                        wordWrap: 'off',
                        domReadOnly: true,
                        lineHeight: 22,
                      }}
                      loading={
                        <div className="flex flex-col items-center justify-center h-full bg-[#12100f] space-y-3">
                          <p className="text-lux-gold animate-pulse text-[10px] font-mono uppercase tracking-widest">&gt; {c.workspaceLaunchingEditor}</p>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-lux-creme-dim space-y-4 p-8 text-center select-none">
                    <Terminal className="w-12 h-12 opacity-30 animate-pulse text-lux-gold" />
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider font-bold text-lux-creme">{c.workspaceAwaitTarget}</p>
                      <p className="text-[10px] opacity-60 font-mono uppercase tracking-wider">{c.workspaceAwaitTargetDesc}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insight Panel Modal */}
      {isInsightOpen && (
        <div className="fixed inset-0 z-50 bg-lux-bg/95 backdrop-blur-md p-6 flex flex-col animate-fade-in">
          {/* Modal Header */}
          <div className="border border-lux-gold/30 bg-lux-card p-4 mb-6 flex justify-between items-center shadow-lux animate-reveal-up">
            <div className="flex items-center gap-3">
              <Info className="text-lux-gold w-5 h-5 animate-pulse" />
              <h2 className="text-sm font-serif font-light tracking-widest text-lux-creme uppercase">
                {copyContent.dashboard.insightsTitle} // {repo.name}
              </h2>
            </div>
            <button
              onClick={() => setIsInsightOpen(false)}
              className="p-2 border border-lux-border text-lux-creme-dim hover:text-lux-creme hover:border-lux-creme transition-colors duration-300"
              title="Exit insights"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-y-auto animate-reveal-up delay-100">
            {/* Left Column: AI Summary */}
            <div className="flex-1 md:flex-[0.65] border border-lux-border flex flex-col bg-lux-card/15 overflow-hidden">
              <div className="border-b border-lux-border p-4 bg-lux-card/45">
                <span className="text-[10px] font-mono tracking-widest text-lux-gold uppercase font-bold">{copyContent.dashboard.insightsAiBlueprint}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-lux-creme-dim font-mono text-xs select-text">
                {isSummaryLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-8 h-8 border-2 border-lux-gold border-t-transparent animate-spin" />
                    <p className="text-lux-gold animate-pulse text-[10px] uppercase tracking-widest">&gt; {copyContent.dashboard.insightsGeminiLoading}</p>
                  </div>
                ) : summaryError ? (
                  <div className="text-lux-copper border border-lux-copper/30 p-4 bg-lux-copper/5">
                    <p className="font-bold">&gt; {copyContent.dashboard.insightsDecompileError}</p>
                    <p className="text-sm mt-2">{summaryError}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {summary.split('# ').map((section: string, idx: number) => {
                      if (!section.trim()) return null;
                      const lines = section.split('\n');
                      const title = lines[0];
                      const body = lines.slice(1).join('\n');
                      return (
                        <div key={idx} className="border border-lux-border/60 p-5 bg-lux-bg/40">
                          <h3 className="text-xs font-serif font-light text-lux-gold border-b border-lux-border/40 pb-2 mb-3 uppercase tracking-widest">
                            {title}
                          </h3>
                          <div
                            className="whitespace-pre-wrap text-lux-creme-dim leading-relaxed text-xs"
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(body) }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Codebase Stats */}
            <div className="flex-1 md:flex-[0.35] border border-lux-border flex flex-col bg-lux-card/15 overflow-hidden">
              <div className="border-b border-lux-border p-4 bg-lux-card/45">
                <span className="text-[10px] font-mono tracking-widest text-lux-gold uppercase font-bold">{copyContent.dashboard.insightsMetrics}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-lux-creme font-mono text-xs scrollbar-thin">
                <StatsSummary
                  fileCount={repo.fileCount}
                  chunkCount={repo.chunkCount}
                  primaryLanguage={repo.primaryLanguage}
                />
                <LanguageChart files={files} />
                <LargestFilesTable files={files} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
