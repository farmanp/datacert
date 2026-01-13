import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { ProfileResult, ColumnProfile } from './profileStore';
import { SUPPORTED_EXTENSIONS } from './fileStore';

export type ComparisonFileKey = 'A' | 'B';

export interface ComparisonFileInfo {
  name: string;
  size: number;
  file: File;
}

export interface ComparisonFileState {
  file: ComparisonFileInfo | null;
  state: 'idle' | 'hover' | 'processing' | 'error' | 'success';
  progress: number;
  error: string | null;
  results: ProfileResult | null;
}

export type ColumnDiffStatus = 'unchanged' | 'added' | 'removed' | 'modified';

export interface StatDelta {
  valueA: number | null;
  valueB: number | null;
  delta: number | null;
  percentChange: number | null;
  direction: 'improved' | 'degraded' | 'unchanged' | 'na';
}

export interface ColumnComparison {
  name: string;
  status: ColumnDiffStatus;
  profileA: ColumnProfile | null;
  profileB: ColumnProfile | null;
  // Deltas for numeric stats
  meanDelta: StatDelta | null;
  stdDevDelta: StatDelta | null;
  missingPercentDelta: StatDelta | null;
  distinctDelta: StatDelta | null;
  minDelta: StatDelta | null;
  maxDelta: StatDelta | null;
  // Type change detection
  typeChanged: boolean;
  typeA: string | null;
  typeB: string | null;
}

export interface ComparisonStoreState {
  fileA: ComparisonFileState;
  fileB: ComparisonFileState;
  comparisons: ColumnComparison[];
  isComparing: boolean;
  totalRowsA: number;
  totalRowsB: number;
}

export function createComparisonStore() {
  const initialFileState = (): ComparisonFileState => ({
    file: null,
    state: 'idle',
    progress: 0,
    error: null,
    results: null,
  });

  const [store, setStore] = createStore<ComparisonStoreState>({
    fileA: initialFileState(),
    fileB: initialFileState(),
    comparisons: [],
    isComparing: false,
    totalRowsA: 0,
    totalRowsB: 0,
  });

  const workers: { A: Worker | null; B: Worker | null } = { A: null, B: null };

  /**
   * Validates if a file has a supported extension
   */
  const isValidFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
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
   * Select a file for comparison
   */
  const selectFile = (key: ComparisonFileKey, file: File): boolean => {
    if (!isValidFileType(file)) {
      setStore(key === 'A' ? 'fileA' : 'fileB', {
        file: null,
        state: 'error',
        progress: 0,
        error: 'Unsupported file type. Please use CSV, TSV, JSON, or JSONL.',
        results: null,
      });
      return false;
    }

    setStore(key === 'A' ? 'fileA' : 'fileB', {
      file: { name: file.name, size: file.size, file },
      state: 'processing',
      progress: 0,
      error: null,
      results: null,
    });

    // Clear comparisons when a new file is selected
    setStore('comparisons', []);

    startProfiling(key, file);
    return true;
  };

  /**
   * Set hover state for a dropzone
   */
  const setHover = (key: ComparisonFileKey, isHovering: boolean) => {
    const storeKey = key === 'A' ? 'fileA' : 'fileB';
    const currentState = store[storeKey].state;
    if (currentState !== 'processing') {
      setStore(storeKey, 'state', isHovering ? 'hover' : 'idle');
    }
  };

  /**
   * Start profiling a file
   */
  const startProfiling = (key: ComparisonFileKey, file: File) => {
    const storeKey = key === 'A' ? 'fileA' : 'fileB';

    // Terminate existing worker if any
    if (workers[key]) {
      workers[key]?.terminate();
    }

    workers[key] = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
      type: 'module',
    });

    workers[key]!.onmessage = (e) => {
      const { type, result, error } = e.data;

      switch (type) {
        case 'ready':
          workers[key]?.postMessage({
            type: 'start_profiling',
            data: { delimiter: undefined, hasHeaders: true },
          });
          break;

        case 'started':
          processFile(key, file);
          break;

        case 'final_stats':
          setStore(storeKey, {
            results: result as ProfileResult,
            state: 'success',
            progress: 100,
          });
          workers[key]?.terminate();
          workers[key] = null;

          // Check if both files are ready for comparison
          checkAndRunComparison();
          break;

        case 'error':
          setStore(storeKey, {
            error: error || 'An error occurred during profiling',
            state: 'error',
          });
          workers[key]?.terminate();
          workers[key] = null;
          break;
      }
    };

    workers[key]!.postMessage({ type: 'init' });
  };

  /**
   * Process file chunks
   */
  const processFile = async (key: ComparisonFileKey, file: File) => {
    const worker = workers[key];
    if (!worker) return;

    const storeKey = key === 'A' ? 'fileA' : 'fileB';
    const CHUNK_SIZE = 64 * 1024; // 64KB
    let offset = 0;
    const totalSize = file.size;

    while (offset < totalSize) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunk.arrayBuffer();

      worker.postMessage(
        {
          type: 'process_chunk',
          data: buffer,
        },
        [buffer],
      );

      offset += CHUNK_SIZE;
      const progress = Math.round((offset / totalSize) * 100);
      setStore(storeKey, 'progress', Math.min(progress, 99));
    }

    worker.postMessage({ type: 'finalize' });
  };

  /**
   * Check if both files have results and run comparison
   */
  const checkAndRunComparison = () => {
    if (store.fileA.results && store.fileB.results) {
      runComparison();
    }
  };

  /**
   * Calculate delta between two numeric values
   */
  const calculateDelta = (
    valueA: number | null | undefined,
    valueB: number | null | undefined,
    lowerIsBetter: boolean = false,
  ): StatDelta | null => {
    const a = valueA ?? null;
    const b = valueB ?? null;

    if (a === null && b === null) {
      return null;
    }

    const delta = a !== null && b !== null ? b - a : null;
    const percentChange =
      a !== null && b !== null && a !== 0 ? ((b - a) / Math.abs(a)) * 100 : null;

    let direction: StatDelta['direction'] = 'na';
    if (delta !== null) {
      if (Math.abs(delta) < 0.0001) {
        direction = 'unchanged';
      } else if (lowerIsBetter) {
        direction = delta < 0 ? 'improved' : 'degraded';
      } else {
        direction = delta > 0 ? 'improved' : 'degraded';
      }
    }

    return { valueA: a, valueB: b, delta, percentChange, direction };
  };

  /**
   * Run comparison between two profile results
   */
  const runComparison = () => {
    const resultsA = store.fileA.results;
    const resultsB = store.fileB.results;

    if (!resultsA || !resultsB) return;

    setStore('isComparing', true);
    setStore('totalRowsA', resultsA.total_rows);
    setStore('totalRowsB', resultsB.total_rows);

    const profilesMapA = new Map<string, ColumnProfile>();
    const profilesMapB = new Map<string, ColumnProfile>();

    for (const p of resultsA.column_profiles) {
      profilesMapA.set(p.name, p);
    }
    for (const p of resultsB.column_profiles) {
      profilesMapB.set(p.name, p);
    }

    const allColumnNames = new Set([...profilesMapA.keys(), ...profilesMapB.keys()]);
    const comparisons: ColumnComparison[] = [];

    for (const name of allColumnNames) {
      const profileA = profilesMapA.get(name) || null;
      const profileB = profilesMapB.get(name) || null;

      let status: ColumnDiffStatus;
      if (profileA && profileB) {
        status = 'unchanged'; // Will check for modifications below
      } else if (profileA && !profileB) {
        status = 'removed';
      } else {
        status = 'added';
      }

      // Calculate deltas
      const missingPercentA =
        profileA && profileA.base_stats.count > 0
          ? (profileA.base_stats.missing / profileA.base_stats.count) * 100
          : null;
      const missingPercentB =
        profileB && profileB.base_stats.count > 0
          ? (profileB.base_stats.missing / profileB.base_stats.count) * 100
          : null;

      const meanDelta =
        profileA && profileB
          ? calculateDelta(profileA.numeric_stats?.mean, profileB.numeric_stats?.mean)
          : null;

      const stdDevDelta =
        profileA && profileB
          ? calculateDelta(profileA.numeric_stats?.std_dev, profileB.numeric_stats?.std_dev, true)
          : null;

      const missingPercentDelta =
        profileA && profileB ? calculateDelta(missingPercentA, missingPercentB, true) : null;

      const distinctDelta =
        profileA && profileB
          ? calculateDelta(
            profileA.base_stats.distinct_estimate,
            profileB.base_stats.distinct_estimate,
          )
          : null;

      const minDelta =
        profileA && profileB
          ? calculateDelta(profileA.numeric_stats?.min, profileB.numeric_stats?.min)
          : null;

      const maxDelta =
        profileA && profileB
          ? calculateDelta(profileA.numeric_stats?.max, profileB.numeric_stats?.max)
          : null;

      // Detect type changes
      const typeA = profileA?.base_stats.inferred_type || null;
      const typeB = profileB?.base_stats.inferred_type || null;
      const typeChanged = typeA !== null && typeB !== null && typeA !== typeB;

      // Check if column has any modifications
      if (status === 'unchanged' && profileA && profileB) {
        const hasStatChanges =
          typeChanged ||
          (meanDelta && meanDelta.direction !== 'unchanged') ||
          (stdDevDelta && stdDevDelta.direction !== 'unchanged') ||
          (missingPercentDelta && missingPercentDelta.direction !== 'unchanged') ||
          (distinctDelta && distinctDelta.direction !== 'unchanged');

        if (hasStatChanges) {
          status = 'modified';
        }
      }

      comparisons.push({
        name,
        status,
        profileA,
        profileB,
        meanDelta,
        stdDevDelta,
        missingPercentDelta,
        distinctDelta,
        minDelta,
        maxDelta,
        typeChanged,
        typeA,
        typeB,
      });
    }

    // Sort: removed first, then added, then modified, then unchanged
    const statusOrder: Record<ColumnDiffStatus, number> = {
      removed: 0,
      added: 1,
      modified: 2,
      unchanged: 3,
    };

    comparisons.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status];
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    setStore('comparisons', comparisons);
    setStore('isComparing', false);
  };

  /**
   * Reset a single file
   */
  const resetFile = (key: ComparisonFileKey) => {
    const storeKey = key === 'A' ? 'fileA' : 'fileB';

    if (workers[key]) {
      workers[key]?.terminate();
      workers[key] = null;
    }

    setStore(storeKey, initialFileState());
    setStore('comparisons', []);
  };

  /**
   * Reset entire comparison store
   */
  const reset = () => {
    if (workers.A) {
      workers.A.terminate();
      workers.A = null;
    }
    if (workers.B) {
      workers.B.terminate();
      workers.B = null;
    }

    setStore({
      fileA: initialFileState(),
      fileB: initialFileState(),
      comparisons: [],
      isComparing: false,
      totalRowsA: 0,
      totalRowsB: 0,
    });
  };

  /**
   * Get summary statistics for comparison
   */
  const getSummary = () => {
    const comparisons = store.comparisons;
    return {
      total: comparisons.length,
      added: comparisons.filter((c) => c.status === 'added').length,
      removed: comparisons.filter((c) => c.status === 'removed').length,
      modified: comparisons.filter((c) => c.status === 'modified').length,
      unchanged: comparisons.filter((c) => c.status === 'unchanged').length,
    };
  };

  return {
    store,
    selectFile,
    setHover,
    resetFile,
    reset,
    getSummary,
    formatFileSize,
    isValidFileType,
  };
}

export const comparisonStore = createRoot(createComparisonStore);
