'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileCode, CheckCircle, Clock, AlertTriangle, Trash2, Info, X, Github, HardDrive, Cpu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uploadRepository, getRepositories, deleteRepository, getRepositorySummary, getRepositoryFiles, importRepositoryFromGithub, getRepositoryDetails } from '@/lib/api/repository';
import StatsSummary from '@/components/insights/StatsSummary';
import LanguageChart from '@/components/insights/LanguageChart';
import LargestFilesTable from '@/components/insights/LargestFilesTable';
import { copyContent } from '@/lib/content';

const formatMarkdown = (text: string) => {
  if (!text) return '';

  // 1. Escape HTML
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Extract code blocks and store them
  const codeBlocks: string[] = [];
  escaped = escaped.replace(/```(\w*)\s*\r?\n([\s\S]*?)(?:\r?\n)?```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
    codeBlocks.push(
      `<pre class="p-3.5 my-4 font-mono text-[11px] bg-[#0e0d0c]/85 border border-lux-border/60 text-lux-creme rounded overflow-x-auto select-text w-full break-normal"><code class="block whitespace-pre">${code}</code></pre>`
    );
    return placeholder;
  });

  // 3. Apply inline styling (bold, italic, inline code)
  escaped = escaped.replace(/\*\*([^\s\*](?:[\s\S]*?[^\s\*])?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*([^\s\*](?:[\s\S]*?[^\s\*])?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/`([^`\s](?:[^`]*?[^`\s])?)`/g, '<code class="px-1.5 py-0.5 font-mono text-[11px] bg-[#0e0d0c]/60 border border-lux-border/60 text-lux-gold rounded">$1</code>');

  // 4. Restore code blocks
  codeBlocks.forEach((blockContent, index) => {
    escaped = escaped.replace(`__CODE_BLOCK_PLACEHOLDER_${index}__`, blockContent);
  });

  return escaped;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadError, setUploadError] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [isImportingGithub, setIsImportingGithub] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [activeIngestionRepoId, setActiveIngestionRepoId] = useState<string | null>(null);
  const [activeIngestionRepo, setActiveIngestionRepo] = useState<any | null>(null);

  const [repoToDelete, setRepoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Insights Panel States
  const [selectedRepoForInsights, setSelectedRepoForInsights] = useState<any>(null);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [insightsFiles, setInsightsFiles] = useState<any[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [activeInsightTab, setActiveInsightTab] = useState<'blueprint' | 'metrics'>('blueprint');

  const c = copyContent.dashboard;

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

    // Poll repositories if there's at least one processing/pending repo
    const interval = setInterval(() => {
      setRepos((currentRepos) => {
        const hasProcessing = currentRepos.some(
          (repo) => repo.status === 'processing' || repo.status === 'pending'
        );
        if (hasProcessing) {
          getRepositories()
            .then((data) => {
              setRepos(data);
            })
            .catch(console.error);
        }
        return currentRepos;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Poll details for the active ingestion repository
  useEffect(() => {
    if (!activeIngestionRepoId) {
      setActiveIngestionRepo(null);
      return;
    }

    let isSubscribed = true;
    let intervalId: any;

    const poll = async () => {
      try {
        const repoData = await getRepositoryDetails(activeIngestionRepoId);
        if (!isSubscribed) return;

        setActiveIngestionRepo(repoData);

        if (repoData.status === 'ready') {
          clearInterval(intervalId);
          setTimeout(() => {
            if (isSubscribed) {
              setActiveIngestionRepoId(null);
              setIsUploading(false);
              setIsUploadingFile(false);
              setIsImportingGithub(false);
              fetchRepos();
            }
          }, 1500);
        } else if (repoData.status === 'error') {
          clearInterval(intervalId);
          setUploadError('Repository processing failed. Check files or size.');
          setActiveIngestionRepoId(null);
          setIsUploadingFile(false);
          setIsImportingGithub(false);
          fetchRepos();
        }
      } catch (err: any) {
        console.error('Error polling ingestion progress:', err);
        clearInterval(intervalId);
        setUploadError(err.message || 'Error tracking progress');
        setActiveIngestionRepoId(null);
        setIsUploadingFile(false);
        setIsImportingGithub(false);
        fetchRepos();
      }
    };

    poll(); // run immediately
    intervalId = setInterval(poll, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [activeIngestionRepoId]);

  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim() || isImportingGithub) return;

    setUploadError('');
    setIsImportingGithub(true);
    try {
      const res = await importRepositoryFromGithub(githubUrl.trim());
      setGithubUrl('');
      if (res && res.repositoryId) {
        setActiveIngestionRepoId(res.repositoryId);
      } else {
        setIsUploading(false);
        fetchRepos();
        setIsImportingGithub(false);
      }
    } catch (err: any) {
      fetchRepos(); // Refresh list so the errored repository shows up
      if (err.message && err.message.includes('401:')) {
        router.push('/login');
      } else {
        setUploadError(err.message || 'GitHub import failed');
      }
      setIsImportingGithub(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed' && !file.name.endsWith('.zip')) {
      setUploadError('Invalid file type. Only ZIP files are allowed.');
      return;
    }

    setUploadError('');
    setIsUploadingFile(true);
    try {
      const res = await uploadRepository(file);
      if (res && res.repositoryId) {
        setActiveIngestionRepoId(res.repositoryId);
      } else {
        setIsUploading(false);
        fetchRepos();
        setIsUploadingFile(false);
      }
    } catch (err: any) {
      fetchRepos(); // Refresh list so the errored repository shows up
      if (err.message && err.message.includes('401:')) {
        router.push('/login');
      } else {
        setUploadError(err.message || 'Upload failed');
      }
      setIsUploadingFile(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploadingFile || isImportingGithub) return;
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (isUploadingFile || isImportingGithub) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
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
      const cleanedSummary = (summaryData.summary || '')
        .replace(/^```markdown\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      setSummary(cleanedSummary);

      const filesData = await getRepositoryFiles(repo.id);
      setInsightsFiles(filesData);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to load summary insights');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const filteredRepos = React.useMemo(() => {
    return repos.filter((repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [repos, searchQuery]);

  const isModalOpen = isUploading || !!repoToDelete || isInsightOpen;

  return (
    <div className={`flex flex-col h-full w-full max-w-7xl mx-auto space-y-10 ${isModalOpen ? '' : 'animate-reveal-up'}`}>

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-lux-border pb-6 gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-serif font-light tracking-widest text-lux-creme uppercase">
            {c.title}
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-lux-creme-dim uppercase">
            {isLoading ? c.subtitleScanning : c.subtitleSynchronized(repos.length)}
          </p>
        </div>

        <button
          onClick={() => setIsUploading(true)}
          className="w-full sm:w-auto border border-lux-gold/30 bg-lux-card hover:bg-lux-gold hover:text-lux-bg px-6 py-3 text-xs tracking-widest font-bold uppercase transition-all duration-500 flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>{c.buttonUploadZip}</span>
        </button>
      </div>

      {/* Sleek Search Interface */}
      <div className="border border-lux-border p-4 bg-lux-card/25 backdrop-blur-md flex items-center gap-3">
        <span className="text-[10px] tracking-widest text-lux-gold uppercase">{c.searchLabel}</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={c.searchPlaceholder}
          className="bg-transparent border-b border-lux-border/60 focus:border-lux-gold/50 text-lux-creme text-sm outline-none flex-1 uppercase placeholder-lux-creme-dim/30 py-1 transition-colors duration-300"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-lux-creme-dim hover:text-lux-gold text-[10px] border border-lux-border px-2.5 py-1 uppercase"
          >
            {c.searchClear}
          </button>
        )}
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredRepos.length === 0 ? (
          <div className="col-span-full border border-dashed border-lux-border/80 p-12 text-center bg-lux-card/5 animate-fade-in">
            <p className="text-xs text-lux-creme-dim uppercase tracking-widest">{c.emptyCatalog}</p>
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <Link key={repo.id} href={`/repo/${repo.id}`} className="block group">
              <div className="border border-lux-border p-6 bg-lux-card/15 hover:bg-lux-card/35 hover:border-lux-gold/30 transition-all duration-500 h-full flex flex-col relative">

                {/* Actions overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-4">
                  {repo.status === 'ready' && (
                    <button
                      onClick={(e) => handleOpenInsights(e, repo)}
                      className="text-lux-creme-dim hover:text-lux-gold transition-colors duration-300 z-10 p-1"
                      title="Show System Insights"
                    >
                      <Info className="w-4.5 h-4.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDeleteClick(e, repo.id)}
                    className="text-red-400 z-10 p-1"
                    title="Purge Repository"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                  <div className="text-lux-creme-dim/50">
                    {repo.status === 'ready' ? (
                      <CheckCircle className="text-emerald-400 w-4.5 h-4.5" />
                    ) : repo.status === 'error' ? (
                      <AlertTriangle className="text-red-400 w-4.5 h-4.5" />
                    ) : (
                      <Clock className="text-lux-copper animate-pulse w-4.5 h-4.5" />
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-serif font-light tracking-wide text-lux-creme group-hover:text-lux-gold transition-colors duration-300 mb-6 uppercase pr-28">
                  {repo.name}
                </h3>

                {repo.status === 'error' && (
                  <div className="mb-4 text-[10px] text-red-400 border border-red-500/25 bg-red-950/10 px-2 py-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {repo.chunkCount > 0
                        ? "Can't use on RAG, embedding failed"
                        : "Uploaded but can't chunk into RAG, chat option not available"}
                    </span>
                  </div>
                )}

                <div className="space-y-3 text-xs mb-8 flex-1">
                  <div className="flex justify-between border-b border-lux-border/30 pb-1.5">
                    <span className="text-lux-creme-dim uppercase">{c.cardPrimaryLang}</span>
                    <span className="text-lux-creme">{repo.primaryLanguage || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between border-b border-lux-border/30 pb-1.5">
                    <span className="text-lux-creme-dim uppercase">{c.cardFileCount}</span>
                    <span className="text-lux-creme">{repo.fileCount || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-lux-border/30 pb-1.5">
                    <span className="text-lux-creme-dim uppercase">{c.cardIndexChunks}</span>
                    <span className="text-lux-creme">{repo.chunkCount || 0}</span>
                  </div>
                </div>

                <div className="text-xs text-lux-creme-dim opacity-85 mt-auto border-t border-lux-border/30 pt-3">
                  {c.cardIndexedLabel} // {new Date(repo.createdAt).toLocaleDateString()} {new Date(repo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ZIP Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-lux-bg/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="border border-lux-border bg-lux-card p-5 sm:p-8 max-w-2xl w-full shadow-lux space-y-6 sm:space-y-8 animate-reveal-up">
            <div className="flex justify-between items-start border-b border-lux-border pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-serif font-light tracking-widest text-lux-creme uppercase">
                  {activeIngestionRepo ? 'Ingestion In Progress' : c.modalUploadTitle}
                </h2>
                <p className="text-[9px] tracking-widest text-lux-creme-dim uppercase text-lux-gold">
                  {activeIngestionRepo ? `Deconstructing ${activeIngestionRepo.name}` : c.modalUploadSubtitle}
                </p>
              </div>
              <button
                onClick={() => {
                  if (isUploadingFile || isImportingGithub || activeIngestionRepoId) return;
                  setIsUploading(false);
                  setUploadError('');
                  setGithubUrl('');
                }}
                disabled={!!activeIngestionRepoId}
                className={`text-lux-creme-dim hover:text-lux-creme p-1 ${activeIngestionRepoId ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="bg-lux-copper/10 border border-lux-copper/45 text-lux-copper p-4 text-xs flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {activeIngestionRepo ? (
              <div className="space-y-6">
                <div>
                  {/* Embedding Progress */}
                  <div className="border border-lux-border p-4 bg-lux-bg/40 flex flex-col justify-between h-24 sm:h-28">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-lux-gold tracking-widest uppercase font-bold">EMBEDDING PROGRESS</span>
                      {activeIngestionRepo.embeddedCount === activeIngestionRepo.chunkCount && activeIngestionRepo.chunkCount > 0 ? (
                        <span className="text-[8px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 uppercase font-bold">Success</span>
                      ) : activeIngestionRepo.chunkCount > 0 ? (
                        <span className="text-[8px] text-lux-copper border border-lux-copper/30 px-1.5 py-0.5 uppercase animate-pulse">Running</span>
                      ) : (
                        <span className="text-[8px] text-lux-creme-dim/40 border border-lux-border/30 px-1.5 py-0.5 uppercase">Awaiting</span>
                      )}
                    </div>
                    <p className="text-xs font-serif text-lux-creme font-light uppercase tracking-wider mt-1.5">Gemini Context Map</p>
                    <p className="text-[10px] text-lux-creme-dim uppercase">
                      Embedded: <span className="text-lux-gold font-bold">{activeIngestionRepo.embeddedCount || 0}</span> / <span className="opacity-60">{activeIngestionRepo.chunkCount || '...'}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-[9px] text-lux-creme-dim uppercase tracking-wider">
                    <span>RAG Map Synthesis</span>
                    <span>
                      {activeIngestionRepo.chunkCount > 0
                        ? Math.min(Math.round(((activeIngestionRepo.embeddedCount || 0) / activeIngestionRepo.chunkCount) * 100), 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-lux-bg/60 border border-lux-border h-3.5 flex p-[2px]">
                    <div
                      className="bg-lux-gold transition-all duration-500 h-full"
                      style={{
                        width: `${activeIngestionRepo.chunkCount > 0
                            ? Math.min(Math.round(((activeIngestionRepo.embeddedCount || 0) / activeIngestionRepo.chunkCount) * 100), 100)
                            : 0
                          }%`
                      }}
                    />
                  </div>
                </div>

                <div className="bg-[#12100f] border border-lux-border p-3 h-28 overflow-y-auto text-[9px] text-lux-creme-dim space-y-1.5 scrollbar-thin">
                  <p className="text-lux-gold">&gt; Archive ingested: {activeIngestionRepo.fileCount} files identified.</p>
                  {activeIngestionRepo.chunkCount > 0 ? (
                    <>
                      <p className="text-lux-creme-dim">&gt; Chunking complete: {activeIngestionRepo.chunkCount} code chunks created.</p>
                      <p className="text-lux-gold">&gt; Generating vector embeddings (1 chunk/sec rate-limit)...</p>
                      {activeIngestionRepo.embeddedCount > 0 && (
                        <p className="text-lux-gold">&gt; Progress: {activeIngestionRepo.embeddedCount} of {activeIngestionRepo.chunkCount} chunks embedded.</p>
                      )}
                      {activeIngestionRepo.status === 'ready' && (
                        <p className="text-emerald-400 font-bold animate-pulse">&gt; Context map successfully synthesized. Closing window...</p>
                      )}
                    </>
                  ) : (
                    <p className="text-lux-copper animate-pulse">&gt; Parsing file structures and generating chunks...</p>
                  )}
                  {activeIngestionRepo.status === 'error' && (
                    <p className="text-red-400 font-bold">&gt; Ingestion error encountered. Process halted.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`border border-dashed p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${isUploadingFile || isImportingGithub
                      ? 'border-lux-border opacity-40 pointer-events-none'
                      : isDraggingOver
                        ? 'border-lux-gold bg-lux-gold/10'
                        : 'border-lux-border hover:border-lux-gold/40 hover:bg-lux-bg/40'
                    }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className={`w-12 h-12 text-lux-gold mb-4 ${isUploadingFile ? 'animate-bounce' : 'opacity-70'}`} />
                  <p className="text-sm tracking-wide text-lux-creme mb-1">
                    {isUploadingFile ? c.dropzoneLoading : c.dropzoneText}
                  </p>
                  <p className="text-[10px] text-lux-creme-dim">{c.dropzoneSizeNote}</p>
                  <p className="text-xs text-lux-copper mt-2 font-bold tracking-wide">{c.dropzoneExcludeNote}</p>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-lux-border"></div>
                  <span className="text-[10px] text-lux-creme-dim font-bold uppercase tracking-widest">or</span>
                  <div className="flex-1 border-t border-lux-border"></div>
                </div>

                {/* GitHub Import Section */}
                <form onSubmit={handleGithubImport} className="space-y-3">
                  <label className="block text-[10px] tracking-widest text-lux-creme-dim uppercase">
                    {c.githubLabel}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 border border-lux-border focus-within:border-lux-gold/40 bg-lux-bg/50 p-3 flex items-center gap-3 transition-colors duration-300">
                      <Github className="w-5 h-5 text-lux-creme-dim flex-shrink-0" />
                      <input
                        type="text"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder={c.githubPlaceholder}
                        disabled={isUploadingFile || isImportingGithub}
                        className="bg-transparent text-lux-creme text-sm outline-none flex-1 placeholder-lux-creme-dim/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!githubUrl.trim() || isUploadingFile || isImportingGithub}
                      className="border border-lux-gold/30 bg-lux-bg hover:bg-lux-gold hover:text-lux-bg px-6 py-3 text-xs tracking-widest font-bold uppercase transition-all duration-500 disabled:opacity-50"
                    >
                      {isImportingGithub ? c.githubImportLoading : c.githubImportButton}
                    </button>
                  </div>
                </form>

                <div className="flex justify-end gap-4 border-t border-lux-border pt-4">
                  <button
                    onClick={() => {
                      if (isUploadingFile || isImportingGithub) return;
                      setIsUploading(false);
                      setUploadError('');
                      setGithubUrl('');
                    }}
                    disabled={isUploadingFile || isImportingGithub}
                    className="border border-lux-border text-lux-creme-dim px-6 py-2.5 text-xs tracking-widest uppercase hover:text-lux-creme transition-colors duration-300 disabled:opacity-50"
                  >
                    {c.modalCancelButton}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {repoToDelete && (
        <div className="fixed inset-0 bg-lux-bg/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="border border-red-500/30 bg-lux-card p-8 max-w-lg w-full shadow-lux space-y-6 animate-reveal-up">
            <h2 className="text-xl font-serif font-light tracking-widest text-red-400 uppercase border-b border-red-500/20 pb-3 flex items-center gap-2.5">
              <AlertTriangle className="text-red-400" /> {c.deleteTitle}
            </h2>
            <p className="text-xs text-red-200/70 leading-relaxed">
              {c.deleteWarning}
            </p>
            <div className="flex justify-end gap-4 border-t border-lux-border pt-4">
              <button
                onClick={() => setRepoToDelete(null)}
                className="border border-lux-border text-lux-creme-dim px-6 py-2.5 text-xs tracking-widest uppercase hover:text-lux-creme transition-colors duration-300"
                disabled={isDeleting}
              >
                {c.deleteAbort}
              </button>
              <button
                onClick={confirmDelete}
                className="border border-red-500/35 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-lux-bg px-6 py-2.5 text-xs tracking-widest font-bold uppercase transition-all duration-500"
                disabled={isDeleting}
              >
                {isDeleting ? c.deleteConfirmLoading : c.deleteConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Insights Modal Overlay */}
      {isInsightOpen && selectedRepoForInsights && (
        <div className="fixed inset-0 z-[100] bg-lux-bg/95 backdrop-blur-md p-4 md:p-12 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="border border-lux-gold/30 bg-lux-card/40 p-4 sm:p-5 mb-4 sm:mb-8 flex justify-between items-center shadow-lux animate-reveal-up">
            <div className="flex items-center gap-3">
              <Info className="text-lux-gold w-5 h-5 animate-pulse" />
              <h2 className="text-base sm:text-lg md:text-xl font-serif font-light tracking-widest text-lux-creme uppercase">
                {c.insightsTitle} // {selectedRepoForInsights.name}
              </h2>
            </div>
            <button
              onClick={() => {
                setIsInsightOpen(false);
                setSelectedRepoForInsights(null);
              }}
              className="p-2 border border-lux-border text-lux-creme-dim hover:text-lux-creme hover:border-lux-creme transition-colors duration-300"
              title="Exit Diagnostics"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Insight Tabs Switcher */}
          <div className="flex md:hidden border border-lux-border mb-4 text-xs bg-lux-card/20">
            <button
              onClick={() => setActiveInsightTab('blueprint')}
              className={`flex-1 py-3 text-center uppercase tracking-widest font-bold transition-all ${activeInsightTab === 'blueprint'
                  ? 'text-lux-gold bg-lux-card/40 border-b border-lux-gold'
                  : 'text-lux-creme-dim hover:text-lux-creme'
                }`}
            >
              Blueprint
            </button>
            <button
              onClick={() => setActiveInsightTab('metrics')}
              className={`flex-1 py-3 text-center uppercase tracking-widest font-bold transition-all ${activeInsightTab === 'metrics'
                  ? 'text-lux-gold bg-lux-card/40 border-b border-lux-gold'
                  : 'text-lux-creme-dim hover:text-lux-creme'
                }`}
            >
              Metrics
            </button>
          </div>

          {/* Core Content Grid */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8 min-h-0 overflow-y-auto animate-reveal-up delay-100">

            {/* AI Architecture Blueprint */}
            <div className={`flex-1 md:flex-[0.65] border border-lux-border flex flex-col bg-lux-card/15 overflow-hidden ${activeInsightTab === 'blueprint' ? 'flex' : 'hidden md:flex'
              }`}>
              <div className="border-b border-lux-border p-4 bg-lux-card/40">
                <span className="text-[10px] tracking-widest text-lux-gold uppercase font-bold">{c.insightsAiBlueprint}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-8 text-lux-creme select-text leading-relaxed text-xs">
                {isSummaryLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-8 h-8 border-2 border-lux-gold border-t-transparent animate-spin" />
                    <p className="text-lux-gold animate-pulse text-[10px] uppercase tracking-widest">&gt; {c.insightsGeminiLoading}</p>
                  </div>
                ) : summaryError ? (
                  <div className="text-lux-copper border border-lux-copper/30 p-4 bg-lux-copper/5">
                    <p className="font-bold">&gt; {c.insightsDecompileError}</p>
                    <p className="text-sm mt-2">{summaryError}</p>
                  </div>
                ) : (
                  <div className="space-y-8">
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

            {/* Metrics Sidebar */}
            <div className={`flex-1 md:flex-[0.35] border border-lux-border flex flex-col bg-lux-card/15 overflow-hidden ${activeInsightTab === 'metrics' ? 'flex' : 'hidden md:flex'
              }`}>
              <div className="border-b border-lux-border p-4 bg-lux-card/40">
                <span className="text-[10px] tracking-widest text-lux-gold uppercase font-bold">{c.insightsMetrics}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 text-xs text-lux-creme scrollbar-thin">
                <StatsSummary
                  fileCount={selectedRepoForInsights.fileCount}
                  chunkCount={selectedRepoForInsights.chunkCount}
                  primaryLanguage={selectedRepoForInsights.primaryLanguage}
                />
                {insightsFiles.length > 0 && (
                  <>
                    <LanguageChart files={insightsFiles} />
                    <LargestFilesTable files={insightsFiles} />
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
