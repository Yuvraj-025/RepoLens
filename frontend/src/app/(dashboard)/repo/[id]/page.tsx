'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRepositoryDetails, getRepositoryFiles, getRepositoryFile, getRepositorySummary } from '@/lib/api/repository';
import { getChatHistory, clearChatHistory, queryRepositoryStream } from '@/lib/api/chat';
import { Folder, FileCode, HardDrive, Cpu, Terminal, Send, ChevronRight, Maximize2, X, Info } from 'lucide-react';
import Editor from '@monaco-editor/react';

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

    monaco.editor.defineTheme('retro-hacker', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: '00ff41' },
        { token: 'comment', foreground: '00aa30', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00ffff' },
        { token: 'string', foreground: '00ff88' },
        { token: 'number', foreground: '00ffc8' },
        { token: 'regexp', foreground: '00ffc8' },
        { token: 'type', foreground: '00ffff' },
      ],
      colors: {
        'editor.background': '#020202',
        'editor.foreground': '#00ff41',
        'editor.lineHighlightBackground': '#00ff4110',
        'editorLineNumber.foreground': '#00ff4145',
        'editorLineNumber.activeForeground': '#00ff41',
        'editor.selectionBackground': '#00ff4130',
      }
    });
    monaco.editor.setTheme('retro-hacker');
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
      setSummary(data.summary);
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
    setIsFileLoading(true);
    setSelectedFile(file);
    setHighlightRange(range);
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

  const renderCodeWithLineNumbers = (code: string) => {
    if (!code) return <p className="text-retro-green-dim italic p-6 font-mono">&gt; [BINARY FILE OR EMPTY CONTENT]</p>;
    const lines = code.split('\n');
    return (
      <div className="flex font-mono text-sm h-full overflow-y-auto scrollbar-thin select-none">
        <div className="text-right pr-4 text-retro-green/45 border-r border-retro-green/20 select-none bg-retro-bg/50 sticky left-0 py-2 min-w-[3rem]">
          {lines.map((_, idx) => (
            <div key={idx} className="h-6 leading-6">{idx + 1}</div>
          ))}
        </div>
        <div className="pl-4 text-retro-green select-text py-2 overflow-x-auto whitespace-pre leading-6 flex-1">
          {lines.map((line, idx) => (
            <div key={idx} className="h-6 hover:bg-retro-green/10 transition-colors whitespace-pre pr-4">{line || ' '}</div>
          ))}
        </div>
      </div>
    );
  };

  const renderTreeNode = (node: any, level = 0) => {
    const isExpanded = !!expandedFolders[node.path];
    
    if (!node.isDirectory) {
      const isSelected = selectedFile?.id === node.id;
      return (
        <div 
          key={node.id} 
          className={`flex justify-between items-center group p-1.5 cursor-default transition-colors border-b border-retro-green/10 last:border-0 font-mono text-sm ${isSelected ? 'bg-retro-green/20' : 'hover:bg-retro-green/10'}`} 
          style={{ paddingLeft: `${level * 1.2 + 0.5}rem` }}
        >
          <div className="flex items-center gap-2 truncate pr-4">
            <FileCode className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-retro-cyan' : 'text-retro-green'}`} />
            <span className={`truncate text-sm ${isSelected ? 'text-retro-cyan font-bold' : 'text-retro-green'}`} title={node.name}>
              {node.name}
            </span>
          </div>
          <div className="text-xs text-retro-green-dim flex-shrink-0 flex items-center gap-3">
            <span className="w-12 truncate text-right hidden sm:inline">{node.language}</span>
            <span className="w-16 text-right hidden md:inline">{formatSize(node.sizeBytes)}</span>
            <button 
              onClick={() => handleViewFile(node)}
              className={`px-2 py-0.5 border text-xs uppercase transition-colors font-semibold ${
                isSelected 
                  ? 'border-retro-cyan text-retro-bg bg-retro-cyan hover:bg-transparent hover:text-retro-cyan' 
                  : 'border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg'
              }`}
            >
              View()
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
          className="flex items-center gap-2 hover:bg-retro-green/5 p-1.5 cursor-pointer border-b border-retro-green/10 last:border-0 font-mono text-sm" 
          style={{ paddingLeft: `${level * 1.2 + 0.5}rem` }}
        >
          <ChevronRight className={`w-3 h-3 text-retro-green-dim transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          <Folder className="w-4 h-4 text-retro-cyan flex-shrink-0" />
          <span className="font-semibold text-retro-cyan truncate">{node.name}</span>
          <span className="text-xs text-retro-green-dim ml-auto hidden sm:inline">({childrenKeys.length})</span>
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
            { role: 'assistant', content: 'INITIALIZING AI LINK... READY. AWAITING QUERY.' }
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
    if (!confirm('Are you sure you want to clear the chat log?')) return;
    try {
      await clearChatHistory(id);
      setChatMessages([
        { role: 'assistant', content: 'CHAT LOGS PURGED. AWAITING QUERY.' }
      ]);
    } catch (err: any) {
      alert(`Failed to clear chat log: ${err.message}`);
    }
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
      { role: 'assistant', content: 'RETRIEVING CONTEXT...' }
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
          if (currentContent === '' || currentContent === 'RETRIEVING CONTEXT...') {
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
              last.content = `[ERROR: ${msg.message || 'Stream disrupted'}]`;
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
          last.content = `[CONNECTION ERROR: ${err.message || 'Failed to contact AI server'}]`;
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
            <button
              onClick={handleOpenInsights}
              className="p-1.5 text-retro-cyan hover:text-white hover:bg-retro-cyan/20 border border-retro-cyan/30 hover:border-retro-cyan rounded transition-colors ml-2 flex items-center justify-center"
              title="Show System Insights"
            >
              <Info className="w-5 h-5" />
            </button>
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
          <div className="border-b-2 border-retro-green p-3 bg-retro-green/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              <h2 className="uppercase tracking-widest text-lg">SYS.TREE()</h2>
            </div>
            <button 
              onClick={() => setIsExpandedView(true)}
              className="p-1 border border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg transition-colors"
              title="Expand Workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
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
          
          <div className="border-b-2 border-retro-green p-3 bg-retro-green/20 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              <h2 className="uppercase tracking-widest text-lg">AI_LINK_ESTABLISHED</h2>
            </div>
            <button 
              onClick={handleClearHistory}
              className="px-2 py-0.5 border border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg text-xs uppercase font-bold"
            >
              CLEAR_LOGS()
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col font-mono">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start'}`}>
                <span className="text-xs text-retro-green-dim mb-1 uppercase tracking-wider">
                  {msg.role === 'user' ? 'USER_INPUT' : 'SYS_RESPONSE'}
                </span>
                <div className={`p-4 border-2 ${msg.role === 'user' ? 'border-retro-cyan bg-retro-cyan/10 text-white' : 'border-retro-green bg-retro-green/5 text-gray-100'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-retro-green/20 text-xs">
                      <span className="text-retro-green-dim font-bold uppercase tracking-wider block mb-1">RETRIEVED_SOURCES:</span>
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
                                alert(`File ${src.filePath} not found in repository files.`);
                              }
                            }}
                            title={src.filePath}
                            className="px-2 py-1 border border-retro-green/45 hover:border-retro-cyan hover:text-retro-cyan bg-retro-green/10 text-retro-green transition-colors font-mono text-[11px]"
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

          <div className="border-t-2 border-retro-green p-4 bg-retro-bg z-20">
            <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
              <span className="text-xl text-retro-green font-bold animate-pulse">&gt;</span>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isSending ? "AI is generating response..." : "Query the codebase..."}
                disabled={isSending}
                className="flex-1 bg-transparent border-b-2 border-retro-green/50 focus:border-retro-green text-retro-green placeholder:text-retro-green/30 px-2 py-2 outline-none font-mono"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isSending}
                className="p-3 border-2 border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Fullscreen Workspace Modal */}
      {isExpandedView && (
        <div className="fixed inset-0 z-50 bg-retro-bg/95 backdrop-blur-sm p-4 md:p-6 flex flex-col font-mono">
          {/* Modal Header */}
          <div className="border-2 border-retro-green bg-retro-bg/90 p-4 mb-4 flex justify-between items-center shadow-retro shadow-retro-green">
            <div className="flex items-center gap-3">
              <Terminal className="text-retro-green w-6 h-6 animate-pulse" />
              <h2 className="text-xl md:text-2xl uppercase tracking-widest text-retro-green font-bold">
                WORKSPACE_EXPLORER_V1.0 // {repo.name}
              </h2>
            </div>
            <button 
              onClick={() => {
                setIsExpandedView(false);
                setSelectedFile(null);
                setSelectedFileContent('');
              }}
              className="p-2 border-2 border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg transition-colors"
              title="Exit workspace explorer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content - Split View */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
            {/* Left Column: Folder Tree Explorer */}
            <div className="flex-1 md:flex-[0.35] border-2 border-retro-green flex flex-col bg-retro-bg overflow-hidden shadow-retro shadow-retro-green">
              <div className="border-b-2 border-retro-green p-3 bg-retro-green/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-retro-green" />
                  <span className="uppercase tracking-widest text-base font-bold text-retro-green">FILE_HIERARCHY</span>
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
                  className="px-2 py-0.5 border border-retro-green text-retro-green hover:bg-retro-green hover:text-retro-bg text-xs uppercase"
                >
                  EXPAND_ALL
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-retro-green scrollbar-track-transparent">
                {Object.keys(fileTree.children).length === 0 ? (
                  <p className="text-retro-green-dim italic">&gt; NO FILES DETECTED</p>
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
            <div className="flex-1 md:flex-[0.65] border-2 border-retro-green flex flex-col bg-retro-bg overflow-hidden shadow-retro shadow-retro-green">
              <div className="border-b-2 border-retro-green p-3 bg-retro-green/20 flex justify-between items-center">
                <div className="flex items-center gap-2 truncate pr-4">
                  <FileCode className="w-5 h-5 text-retro-green flex-shrink-0" />
                  <span className="uppercase tracking-widest text-base font-bold text-retro-cyan truncate">
                    {selectedFile ? selectedFile.filePath : 'LIVE_VIEWER_OFFLINE'}
                  </span>
                </div>
                {selectedFile && (
                  <div className="text-xs text-retro-green-dim flex-shrink-0 flex gap-4">
                    <span>LANG: {selectedFile.language?.toUpperCase()}</span>
                    <span>SIZE: {formatSize(selectedFile.sizeBytes)}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-[#020202] relative overflow-hidden">
                {isFileLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-retro-bg/90 z-20">
                    <div className="w-12 h-12 border-4 border-retro-green border-t-transparent animate-spin mb-4" />
                    <p className="text-retro-green animate-pulse">&gt; STREAMING_FILE_DATA...</p>
                  </div>
                ) : selectedFile ? (
                  <div className="h-full overflow-hidden">
                    <Editor
                      height="100%"
                      language={mapLanguageToMonaco(selectedFile.language)}
                      value={selectedFileContent}
                      theme="retro-hacker"
                      onMount={handleEditorDidMount}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        fontSize: 14,
                        fontFamily: '"VT323", "Courier New", monospace',
                        lineNumbersMinChars: 3,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        domReadOnly: true,
                      }}
                      loading={
                        <div className="flex flex-col items-center justify-center h-full bg-[#020202]">
                          <p className="text-retro-green animate-pulse">&gt; INITIALIZING_EDITOR...</p>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-retro-green-dim space-y-4 p-8 text-center select-none">
                    <Terminal className="w-16 h-16 opacity-30 animate-pulse" />
                    <div>
                      <p className="text-lg uppercase tracking-wider font-bold text-retro-green">Awaiting Target Selection...</p>
                      <p className="text-sm opacity-65 mt-2 text-retro-green/70">CLICK [VIEW()] ON ANY FILE FROM THE HIERARCHY TO INITIALIZE DECRYPTION.</p>
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
        <div className="fixed inset-0 z-50 bg-retro-bg/95 backdrop-blur-sm p-4 md:p-6 flex flex-col font-mono">
          {/* Modal Header */}
          <div className="border-2 border-retro-cyan bg-retro-bg/90 p-4 mb-4 flex justify-between items-center shadow-retro shadow-retro-cyan">
            <div className="flex items-center gap-3">
              <Info className="text-retro-cyan w-6 h-6 animate-pulse" />
              <h2 className="text-xl md:text-2xl uppercase tracking-widest text-retro-cyan font-bold">
                SYSTEM_INSIGHTS_V1.0 // {repo.name}
              </h2>
            </div>
            <button 
              onClick={() => setIsInsightOpen(false)}
              className="p-2 border-2 border-retro-cyan text-retro-cyan hover:bg-retro-cyan hover:text-retro-bg transition-colors"
              title="Exit insights"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-y-auto">
            {/* Left Column: AI Summary */}
            <div className="flex-1 md:flex-[0.65] border-2 border-retro-green flex flex-col bg-retro-bg overflow-hidden shadow-retro shadow-retro-green">
              <div className="border-b-2 border-retro-green p-3 bg-retro-green/20">
                <span className="uppercase tracking-widest text-base font-bold text-retro-green">AI_DECRYPTED_ARCHITECTURE</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-gray-100 scrollbar-thin select-text">
                {isSummaryLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-12 h-12 border-4 border-retro-green border-t-transparent animate-spin" />
                    <p className="text-retro-green animate-pulse">&gt; QUERYING GEMINI INTEL CORE...</p>
                    <p className="text-xs text-retro-green-dim">&gt; ANALYZING REPO TREE, README, AND DEPENDENCIES...</p>
                  </div>
                ) : summaryError ? (
                  <div className="text-red-500 border border-red-500 p-4 bg-red-500/10">
                    <p className="font-bold">&gt; ERROR_LOADING_SUMMARY</p>
                    <p className="text-sm mt-2">{summaryError}</p>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-retro-green font-mono">
                    <div className="space-y-6">
                      {summary.split('# ').map((section: string, idx: number) => {
                        if (!section.trim()) return null;
                        const lines = section.split('\n');
                        const title = lines[0];
                        const body = lines.slice(1).join('\n');
                        return (
                          <div key={idx} className="border border-retro-green/30 p-4 bg-retro-green/5">
                            <h3 className="text-lg font-bold text-retro-cyan border-b border-retro-cyan/30 pb-1 mb-2 uppercase tracking-wide">
                              &gt; {title}
                            </h3>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-retro-green">
                              {body}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Codebase Stats */}
            <div className="flex-1 md:flex-[0.35] border-2 border-retro-cyan flex flex-col bg-retro-bg overflow-hidden shadow-retro shadow-retro-cyan">
              <div className="border-b-2 border-retro-cyan p-3 bg-retro-cyan/20">
                <span className="uppercase tracking-widest text-base font-bold text-retro-cyan">METRIC_DIAGNOSTICS</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin text-retro-green">
                <div className="space-y-2">
                  <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">1. General Stats</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    <span className="text-retro-green-dim">TOTAL FILES:</span>
                    <span className="text-right">{repo.fileCount}</span>
                    <span className="text-retro-green-dim">TOTAL CHUNKS:</span>
                    <span className="text-right">{repo.chunkCount}</span>
                    <span className="text-retro-green-dim">PRIMARY LANG:</span>
                    <span className="text-right">{repo.primaryLanguage?.toUpperCase() || 'UNKNOWN'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">2. Language Breakdown</h3>
                  <div className="space-y-2 text-sm font-mono">
                    {(() => {
                      const langCounts: Record<string, number> = {};
                      files.forEach(f => {
                        const lang = f.language || 'unknown';
                        langCounts[lang] = (langCounts[lang] || 0) + 1;
                      });
                      return Object.entries(langCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([lang, count]) => {
                          const pct = ((count / files.length) * 100).toFixed(0);
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
                        });
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">3. Largest Files</h3>
                  <div className="space-y-1 text-xs font-mono">
                    {files
                      .filter(f => f.language !== 'binary')
                      .sort((a, b) => (b.lineCount || 0) - (a.lineCount || 0))
                      .slice(0, 5)
                      .map((f, i) => (
                        <div key={i} className="flex justify-between border-b border-retro-green/10 py-1">
                          <span className="truncate pr-2 text-retro-green" title={f.filePath}>{f.filePath}</span>
                          <span className="text-retro-cyan flex-shrink-0">{f.lineCount} lines</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
