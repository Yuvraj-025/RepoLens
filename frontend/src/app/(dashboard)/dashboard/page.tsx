'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileCode, CheckCircle, Clock, AlertTriangle, Trash2, Info, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uploadRepository, getRepositories, deleteRepository, getRepositorySummary, getRepositoryFiles } from '@/lib/api/repository';

export default function DashboardPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadError, setUploadError] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [repoToDelete, setRepoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Insights Panel States
  const [selectedRepoForInsights, setSelectedRepoForInsights] = useState<any>(null);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [insightsFiles, setInsightsFiles] = useState<any[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const fetchRepos = async () => {
    try {
      const data = await getRepositories();
      setRepos(data);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('401:')) {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed' && !file.name.endsWith('.zip')) {
      setUploadError('Invalid file type. Only ZIP files are allowed.');
      return;
    }

    setUploadError('');
    setIsUploadingFile(true);
    try {
      await uploadRepository(file);
      setIsUploading(false); // Close modal
      fetchRepos(); // Refresh list
    } catch (err: any) {
      if (err.message && err.message.includes('401:')) {
        router.push('/login');
      } else {
        setUploadError(err.message || 'Upload failed');
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // prevent Link navigation
    e.stopPropagation();
    setRepoToDelete(id);
  };

  const confirmDelete = async () => {
    if (!repoToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRepository(repoToDelete);
      setRepoToDelete(null);
      fetchRepos();
    } catch (err: any) {
      if (err.message && err.message.includes('401:')) {
        router.push('/login');
      } else {
        alert(err.message || 'Delete failed');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenInsights = async (e: React.MouseEvent, repo: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRepoForInsights(repo);
    setIsInsightOpen(true);
    setSummary('');
    setInsightsFiles([]);
    setIsSummaryLoading(true);
    setSummaryError('');
    try {
      const summaryData = await getRepositorySummary(repo.id);
      setSummary(summaryData.summary);
      
      const filesData = await getRepositoryFiles(repo.id);
      setInsightsFiles(filesData);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to load summary insights');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b-2 border-retro-green-dim pb-4">
        <div>
          <h1 className="text-4xl uppercase tracking-wider mb-2">&gt; REPOSITORY_INDEX</h1>
          <p className="text-xl text-retro-green-dim">
            {isLoading ? 'SYS.SCAN() IN PROGRESS...' : `SYS.SCAN() COMPLETE. ${repos.length} REPOSITORIES FOUND.`}
          </p>
        </div>
        
        <button 
          onClick={() => setIsUploading(true)}
          className="border-2 border-retro-cyan text-retro-cyan px-6 py-3 text-xl hover:bg-retro-cyan hover:text-retro-bg shadow-retro shadow-retro-cyan hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          <span>Upload ZIP</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {repos.map((repo) => (
          <Link key={repo.id} href={`/repo/${repo.id}`} className="block">
            <div className="border-2 border-retro-green p-6 hover:bg-retro-green/10 transition-colors h-full flex flex-col group relative">
              <div className="absolute top-2 right-2 flex items-center gap-3">
                {repo.status === 'ready' && (
                  <button 
                    onClick={(e) => handleOpenInsights(e, repo)}
                    className="text-retro-cyan hover:text-white transition-all opacity-50 group-hover:opacity-100 hover:scale-110 z-10 p-1"
                    title="Show System Insights"
                  >
                    <Info className="w-6 h-6" />
                  </button>
                )}
                <button 
                  onClick={(e) => handleDeleteClick(e, repo.id)} 
                  className="text-red-500 hover:text-red-400 transition-all opacity-50 group-hover:opacity-100 hover:scale-110 z-10 p-1"
                  title="Purge Repository"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
                <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                  {repo.status === 'ready' ? <CheckCircle className="text-retro-green w-6 h-6" /> : <Clock className="text-yellow-500 animate-pulse w-6 h-6" />}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold uppercase mb-4 text-retro-green">{repo.name}</h3>
              
              <div className="space-y-2 text-lg mb-6 flex-1">
                <div className="flex justify-between">
                  <span className="text-retro-green-dim">PRIMARY_LANG:</span>
                  <span>{repo.primaryLanguage || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-retro-green-dim">FILE_COUNT:</span>
                  <span>{repo.fileCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-retro-green-dim">EMBEDDING_CHUNKS:</span>
                  <span>{repo.chunkCount || 0}</span>
                </div>
              </div>
              
              <div className="text-sm text-retro-green-dim mt-auto border-t border-retro-green/30 pt-2">
                UPLOADED: {new Date(repo.createdAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isUploading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="border-2 border-retro-cyan bg-retro-bg p-8 max-w-2xl w-full shadow-retro shadow-retro-cyan">
            <h2 className="text-3xl uppercase text-retro-cyan mb-6 border-b-2 border-retro-cyan/50 pb-2">&gt; INITIALIZE_UPLOAD()</h2>
            
            
            {uploadError && (
              <div className="bg-red-500/20 border-2 border-red-500 text-red-500 p-4 mb-6 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <span>{uploadError}</span>
              </div>
            )}

            <div 
              className={`border-2 border-dashed border-retro-green-dim p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors mb-6 ${isUploadingFile ? 'opacity-50 pointer-events-none' : 'hover:border-retro-green hover:bg-retro-green/5'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={`w-16 h-16 text-retro-green mb-4 ${isUploadingFile ? 'animate-bounce' : ''}`} />
              <p className="text-2xl mb-2">{isUploadingFile ? 'UPLOADING...' : 'CLICK TO BROWSE ZIP FILE'}</p>
              <p className="text-retro-green-dim text-lg">(MAX 50MB)</p>
              <input 
                type="file" 
                accept=".zip,application/zip" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setIsUploading(false)}
                className="border-2 border-retro-green-dim text-retro-green-dim px-6 py-2 text-xl hover:border-retro-green hover:text-retro-green transition-colors uppercase"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {repoToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="border-2 border-red-500 bg-retro-bg p-8 max-w-lg w-full shadow-retro shadow-red-500">
            <h2 className="text-2xl uppercase text-red-500 mb-4 border-b-2 border-red-500/50 pb-2 flex items-center gap-2">
              <AlertTriangle /> &gt; CONFIRM_DELETION
            </h2>
            <p className="text-lg text-red-400 mb-6">
              WARNING: This action is irreversible. All processed chunks, embeddings, and chat history for this repository will be purged from the database.
            </p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setRepoToDelete(null)}
                className="border-2 border-retro-green-dim text-retro-green-dim px-6 py-2 hover:border-retro-green hover:text-retro-green transition-colors uppercase"
                disabled={isDeleting}
              >
                Abort
              </button>
              <button 
                onClick={confirmDelete}
                className="bg-red-500 text-retro-bg px-6 py-2 font-bold hover:bg-red-400 transition-colors uppercase border-2 border-red-500"
                disabled={isDeleting}
              >
                {isDeleting ? 'PURGING...' : 'CONFIRM_PURGE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insight Panel Modal */}
      {isInsightOpen && selectedRepoForInsights && (
        <div className="fixed inset-0 z-50 bg-retro-bg/95 backdrop-blur-sm p-4 md:p-6 flex flex-col font-mono text-retro-green">
          {/* Modal Header */}
          <div className="border-2 border-retro-cyan bg-retro-bg/90 p-4 mb-4 flex justify-between items-center shadow-retro shadow-retro-cyan">
            <div className="flex items-center gap-3">
              <Info className="text-retro-cyan w-6 h-6 animate-pulse" />
              <h2 className="text-xl md:text-2xl uppercase tracking-widest text-retro-cyan font-bold">
                SYSTEM_INSIGHTS_V1.0 // {selectedRepoForInsights.name}
              </h2>
            </div>
            <button 
              onClick={() => {
                setIsInsightOpen(false);
                setSelectedRepoForInsights(null);
              }}
              className="p-2 border-2 border-retro-cyan text-retro-cyan hover:bg-retro-cyan hover:text-retro-bg transition-colors"
              title="Exit insights"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-y-auto">
            {/* Left Column: AI Summary */}
            <div className="flex-1 md:flex-[0.7] border-2 border-retro-green flex flex-col bg-retro-bg overflow-hidden shadow-retro shadow-retro-green">
              <div className="border-b-2 border-retro-green p-3 bg-retro-green/20">
                <span className="uppercase tracking-widest text-base font-bold text-retro-green">AI_DECRYPTED_ARCHITECTURE</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 text-gray-100 scrollbar-thin select-text">
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
            <div className="flex-1 md:flex-[0.3] border-2 border-retro-cyan flex flex-col bg-retro-bg overflow-hidden shadow-retro shadow-retro-cyan">
              <div className="border-b-2 border-retro-cyan p-3 bg-retro-cyan/20">
                <span className="uppercase tracking-widest text-base font-bold text-retro-cyan">METRIC_DIAGNOSTICS</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin text-retro-green">
                <div className="space-y-2">
                  <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">1. General Stats</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    <span className="text-retro-green-dim">TOTAL FILES:</span>
                    <span className="text-right">{selectedRepoForInsights.fileCount}</span>
                    <span className="text-retro-green-dim">TOTAL CHUNKS:</span>
                    <span className="text-right">{selectedRepoForInsights.chunkCount}</span>
                    <span className="text-retro-green-dim">PRIMARY LANG:</span>
                    <span className="text-right">{selectedRepoForInsights.primaryLanguage?.toUpperCase() || 'UNKNOWN'}</span>
                  </div>
                </div>

                {insightsFiles.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <h3 className="font-bold border-b border-retro-green/30 pb-1 uppercase text-retro-cyan">2. Language Breakdown</h3>
                      <div className="space-y-2 text-sm font-mono">
                        {(() => {
                          const langCounts: Record<string, number> = {};
                          insightsFiles.forEach(f => {
                            const lang = f.language || 'unknown';
                            langCounts[lang] = (langCounts[lang] || 0) + 1;
                          });
                          return Object.entries(langCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([lang, count]) => {
                              const pct = ((count / insightsFiles.length) * 100).toFixed(0);
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
                        {insightsFiles
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
