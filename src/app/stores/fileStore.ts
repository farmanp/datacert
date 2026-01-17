import { createSignal, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { ProfilerError } from '../types/errors';
import { createTypedError } from '../types/errors';
import {
  isFileTooLarge,
  getFileSizeError,
  formatFileSizeLimit,
  SQL_MODE_SIZE_LIMIT,
} from '../config/fileSizeConfig';

// Supported file types
export const SUPPORTED_EXTENSIONS = [
  '.csv',
  '.tsv',
  '.json',
  '.jsonl',
  '.parquet',
  '.xlsx',
  '.xls',
  '.avro',
] as const;
export const SUPPORTED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'application/x-jsonlines',
  'application/jsonl',
  'application/octet-stream',
  'application/x-parquet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'avro/binary',
] as const;

// Accept attribute for file input
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.join(',');

export type FileState = 'idle' | 'hover' | 'processing' | 'error' | 'success';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
}

export interface FileStoreState {
  state: FileState;
  file: FileInfo | null;
  progress: number;
  error: string | null;
  profilerError: ProfilerError | null;
  isDemo: boolean;
  sheets: string[];
  selectedSheet: string | null;
  pendingFile: File | null;
  showLargeFileWarning: boolean;
}

function createFileStore() {
  const [store, setStore] = createStore<FileStoreState>({
    state: 'idle',
    file: null,
    progress: 0,
    error: null,
    profilerError: null,
    isDemo: false,
    sheets: [],
    selectedSheet: null,
    pendingFile: null,
    showLargeFileWarning: false,
  });

  // Signal for tracking if we're dragging over the dropzone
  const [isDragOver, setIsDragOver] = createSignal(false);

  /**
   * Validates if a file has a supported extension
   */
  const isValidFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  };

  const isValidUrl = (url: string): boolean => {
    const lower = url.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  };

  /**
   * Formats file size to human-readable string
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Sets the file as pending for confirmation
   */
  const selectFile = (file: File): boolean => {
    // Validate file size first
    if (isFileTooLarge(file.size)) {
      const profilerError = getFileSizeError(file.name, file.size);
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: `File too large. Maximum size is ${formatFileSizeLimit()}.`,
        profilerError,
        isDemo: false,
        sheets: [],
        selectedSheet: null,
        pendingFile: null,
        showLargeFileWarning: false,
      });
      return false;
    }

    // Validate file type
    if (!isValidFileType(file)) {
      const profilerError = createTypedError(
        'INVALID_FORMAT',
        `Unsupported file type: ${file.name}`,
      );
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: 'Unsupported file type. Please use CSV, TSV, JSON, JSONL, Parquet, or Excel.',
        profilerError,
        isDemo: false,
        sheets: [],
        selectedSheet: null,
        pendingFile: null,
        showLargeFileWarning: false,
      });
      return false;
    }

    // Set as pending for confirmation - fully reset store to prevent stale state
    setStore({
      state: 'idle',
      file: null,
      progress: 0,
      error: null,
      profilerError: null,
      isDemo: false,
      sheets: [],
      selectedSheet: null,
      pendingFile: file,
      showLargeFileWarning: file.size > SQL_MODE_SIZE_LIMIT,
    });

    return true;
  };

  /**
   * Confirms the pending file and begins processing
   */
  const confirmFile = (fileToConfirm?: File) => {
    const file = fileToConfirm || store.pendingFile;
    if (!file) return false;

    setStore({
      state: 'processing',
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      },
      progress: 0,
      error: null,
      profilerError: null,
      isDemo: false,
      sheets: [],
      selectedSheet: null,
      pendingFile: null,
      showLargeFileWarning: false,
    });
    return true;
  };

  /**
   * Cancels the pending file confirmation
   */
  const cancelPending = () => {
    setStore({
      pendingFile: null,
      showLargeFileWarning: false,
    });
  };

  /**
   * Prepare store for remote file processing
   */
  const setRemoteFile = (name: string, size: number, url: string) => {
    // Validate file size first
    if (isFileTooLarge(size)) {
      const profilerError = getFileSizeError(name, size);
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: `File too large. Maximum size is ${formatFileSizeLimit()}.`,
        profilerError,
        isDemo: false,
        sheets: [],
        selectedSheet: null,
      });
      return false;
    }

    // Basic type validation
    if (!isValidUrl(name) && !isValidUrl(url)) {
      const profilerError = createTypedError(
        'INVALID_FORMAT',
        `Unsupported file extension: ${name}`,
      );
      setStore({
        state: 'error',
        file: null,
        progress: 0,
        error: 'Unsupported file extension. Please use CSV, TSV, JSON, JSONL, Parquet, or Excel.',
        profilerError,
        isDemo: false,
        sheets: [],
        selectedSheet: null,
      });
      return false;
    }

    setStore({
      state: 'processing',
      file: {
        name,
        size,
        type: 'application/octet-stream', // inferred
        url,
      },
      progress: 0,
      error: null,
      profilerError: null,
      isDemo: false,
      sheets: [],
      selectedSheet: null,
    });
    return true;
  };

  /**
   * Load the demo dataset
   */
  const loadDemoFile = async (): Promise<File | null> => {
    try {
      setStore({
        state: 'processing',
        progress: 10,
        error: null,
        profilerError: null,
        isDemo: true,
        sheets: [],
        selectedSheet: null,
      });

      const response = await fetch('/samples/demo-data.csv');
      if (!response.ok) throw new Error('Failed to load demo data');

      const blob = await response.blob();
      const file = new File([blob], 'demo-employees.csv', { type: 'text/csv' });

      setStore({
        state: 'processing',
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
        },
        progress: 30, // Fetched, ready to parse
        error: null,
        profilerError: null,
        isDemo: true,
      });

      return file;
    } catch (err) {
      const profilerError = createTypedError('NETWORK_ERROR', 'Could not load demo data');
      setStore({
        state: 'error',
        error: 'Could not load demo data. Please try again.',
        profilerError,
        progress: 0,
        isDemo: false,
      });
      return null;
    }
  };

  /**
   * Updates progress during file processing
   */
  const setProgress = (progress: number) => {
    setStore('progress', Math.min(100, Math.max(0, progress)));
    if (progress >= 100) {
      setStore('state', 'success');
    }
  };

  /**
   * Sets the dropzone to hover state
   */
  const setHover = (isHovering: boolean) => {
    setIsDragOver(isHovering);
    if (store.state !== 'processing') {
      setStore('state', isHovering ? 'hover' : 'idle');
    }
  };

  /**
   * Sets an error state with message and optional profilerError
   */
  const setError = (message: string, profilerError?: ProfilerError) => {
    setStore({
      state: 'error',
      error: message,
      profilerError: profilerError || null,
      progress: 0,
    });
  };

  const setSheets = (sheets: string[]) => {
    setStore('sheets', sheets);
  };

  const setSelectedSheet = (sheet: string | null) => {
    setStore('selectedSheet', sheet);
  };

  /**
   * Resets the store to initial state
   */
  const reset = () => {
    setIsDragOver(false);
    setStore({
      state: 'idle',
      file: null,
      progress: 0,
      error: null,
      profilerError: null,
      isDemo: false,
      sheets: [],
      selectedSheet: null,
      pendingFile: null,
      showLargeFileWarning: false,
    });
  };

  /**
   * Clears any error and returns to idle
   */
  const clearError = () => {
    if (store.state === 'error') {
      setStore({
        state: 'idle',
        error: null,
        profilerError: null,
      });
    }
  };

  return {
    // State
    store,
    isDragOver,

    // Actions
    selectFile,
    confirmFile,
    cancelPending,
    setRemoteFile,
    loadDemoFile,
    setProgress,
    setHover,
    setError,
    setSheets,
    setSelectedSheet,
    reset,
    clearError,

    // Utilities
    isValidFileType,
    formatFileSize,
  };
}

// Create a singleton store instance using createRoot
export const fileStore = createRoot(createFileStore);
