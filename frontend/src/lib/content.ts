/**
 * Centralized Copy Content Configuration for RepoLens UI.
 * Modify this file to change any headers, descriptions, path lines, labels, or placeholders.
 */

export const copyContent = {
  global: {
    brandName: 'REPOLENS',
    brandSubtitle: '',
    copyright: '',
  },

  landing: {
    categoryLabel: '',
    mainHeadingPrefix: 'Deconstruct codebases with ',
    mainHeadingHighlight: 'semantic precision.',
    mainHeadingSuffix: '',
    logLines: [
      'Secure sandbox indexing initialized.',
      'Upload codebases to generate structural graph maps.',
      'Ask natural language queries backed by pgvector context retrieval.',
      'Read, scroll, and debug source code inside Monaco.',
    ],
    actionLogin: 'LOGIN',
    actionSignup: 'Register',
    navLogin: 'Sign In',
    navSignup: 'Sign Up',
  },

  login: {
    nodeLabel: '',
    title: 'SIGN IN',
    caption: 'Enter Your Credentials',
    exitLink: 'Exit',
    signupLink: 'Create Account',
    labelEmail: 'Email Address',
    labelPassword: 'Password',
    labelCaptcha: 'Verify Session (CAPTCHA)',
    placeholderEmail: 'developer@repolens.com',
    buttonAuthenticate: 'Sign in',
    buttonLoading: 'Authenticating...',
  },

  signup: {
    nodeLabel: '',
    title: 'Create Account',
    caption: 'Enter Your Details',
    exitLink: 'Exit',
    loginLink: 'Return to Login',
    labelAlias: 'Name',
    labelEmail: 'Email',
    labelPassword: 'Password',
    labelCaptcha: 'Verify Session (CAPTCHA)',
    placeholderAlias: 'e.g. Lovelace',
    placeholderEmail: 'developer@repolens.com',
    buttonInitialize: 'Register',
    buttonLoading: 'Creating Instance...',
  },

  sidebar: {
    menuRepositories: 'Repositories',
    menuProfile: 'Profile',
    menuDisconnect: 'SIGN OUT',
    confirmSession: 'Confirming Session...',
  },

  profile: {
    title: 'Profile',
    subtitle: '',
    sectionTitle: 'PASSWORD Update',
    labelName: 'Name',
    labelEmail: 'Email',
    labelNewPassword: 'New Password',
    labelConfirmPassword: 'Confirm Password',
    placeholderNewPassword: 'Leave empty to retain current',
    placeholderConfirmPassword: 'Confirm new password',
    buttonSave: 'Save ',
    buttonLoading: 'Updating...',
    successNotification: 'Profile updated successfully.',
  },

  dashboard: {
    title: 'Repository Index',
    subtitleScanning: 'Scanning archives...',
    subtitleSynchronized: (count: number) => `${count} repositories`,
    buttonUploadZip: 'Upload ZIP',
    searchLabel: '> Search :',
    searchPlaceholder: 'Enter Repository Name...',
    searchClear: 'Clear',
    emptyCatalog: '> No Repositories found.',
    cardPrimaryLang: 'PRIMARY LANGUAGE',
    cardFileCount: 'TOTAL FILES',
    cardIndexChunks: 'INDEXED CHUNKS',
    cardIndexedLabel: 'UPLOADED AT',

    // Upload Modal
    modalUploadTitle: 'Upload',
    modalUploadSubtitle: 'Import code to database',
    dropzoneText: 'Drag and drop or click to select ZIP Archive',
    dropzoneLoading: 'Uploading ZIP Archive...',
    dropzoneSizeNote: '(Maximum file size: 5MB)',
    dropzoneExcludeNote: '(Exclude build artifacts & dependencies like node_modules, venv, and .env files)',
    githubLabel: 'Import from GitHub Repository',
    githubPlaceholder: 'https://github.com/owner/repo',
    githubImportButton: 'Import',
    githubImportLoading: 'Importing...',
    modalCancelButton: 'Cancel',

    // Delete Modal
    deleteTitle: 'Confirm Delete',
    deleteWarning: 'WARNING: This operation is destructive and cannot be undone. All index files, pgvector embeddings, and RAG session history for this project will be deleted from the database.',
    deleteAbort: 'Abort',
    deleteConfirm: 'Confirm',
    deleteConfirmLoading: 'Deleting...',

    // System Insights Modal
    insightsTitle: 'System Diagnostics',
    insightsAiBlueprint: 'Summary',
    insightsMetrics: 'Metric Diagnostics',
    insightsGeminiLoading: 'Generating Summary...',
    insightsDecompileError: 'Unable to Generate',
  },

  repoDetails: {
    statusLabel: 'Status:',
    filesCountLabel: 'Files:',
    chunksCountLabel: 'Chunks:',
    langLabel: 'Lang:',
    loadingIndex: 'Loading codebase index...',
    errorHeader: 'System Error Encountered',

    // Explorer
    explorerTreeTitle: 'Explorer Tree',
    workspaceTitle: 'Workspace Explorer',
    allFilesOffline: '> No files detected inside catalog',
    viewButton: 'View',

    // Chat
    chatHeaderTitle: 'Chat',
    saveChatButton: 'Save Chat',
    clearLogsButton: 'Clear Chat',
    confirmClearPrompt: 'Are you sure you want to clear the chat log?',
    userRoleLabel: 'User',
    systemRoleLabel: 'Agent',
    citationsLabel: 'Context Citations:',
    chatPlaceholder: 'Analyze the codebase...',
    chatLoadingPlaceholder: 'Synthesizing response...',
    clearSuccessContent: 'Chat history cleared. Ready for new query.',

    // Workspace Modal
    workspaceFileHierarchy: 'File Hierarchy',
    workspaceExpandAll: 'Expand All',
    workspaceViewerOffline: 'Viewer Offline',
    workspaceStreamingFile: 'Streaming file data...',
    workspaceLaunchingEditor: 'Launching workspace editor...',
    workspaceAwaitTarget: 'Awaiting file target selection',
    workspaceAwaitTargetDesc: 'Select a file from the explorer tree to inspect source code.',
  },

  insights: {
    statsTitle: '1. General Statistics',
    statsTotalFiles: 'Total Files',
    statsTotalChunks: 'Total Chunks',
    statsPrimaryLang: 'Primary Lang',

    langTitle: '2. Language Distribution',

    largestTitle: '3. Largest Files',
    largestLinesLabel: 'lines',
  }
};
