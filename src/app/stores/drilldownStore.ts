import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { ColumnProfile } from './profileStore';
import { fileStore } from './fileStore';

export type DrilldownType = 'missing' | 'pii' | 'outlier' | 'format';

export interface DrilldownState {
    isOpen: boolean;
    columnName: string;
    anomalyType: DrilldownType;
    rowIndices: number[]; // 1-based indices
    totalAffected: number;

    // Data view
    currentPage: number;
    pageSize: number;
    currentRows: Array<{ index: number; row: string[] }>;
    headers: string[];
    isLoading: boolean;
    error: string | null;
}

function createDrilldownStore() {
    const [store, setStore] = createStore<DrilldownState>({
        isOpen: false,
        columnName: '',
        anomalyType: 'missing',
        rowIndices: [],
        totalAffected: 0,
        currentPage: 1,
        pageSize: 50,
        currentRows: [],
        headers: [],
        isLoading: false,
        error: null,
    });

    let worker: Worker | null = null;
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

    const processFile = async (file: File) => {
        if (!worker) return;

        let offset = 0;
        const totalSize = file.size;

        while (offset < totalSize) {
            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const buffer = await chunk.arrayBuffer();
            // Send chunk to worker
            worker.postMessage({ type: 'extract_chunk', data: buffer }, [buffer]);
            offset += CHUNK_SIZE;
        }

        worker.postMessage({ type: 'finalize_extraction' });
    };

    const setupWorkerAndLoad = async (pageIndices: number[], forExport = false) => {
        if (worker) worker.terminate();
        worker = new Worker(new URL('../workers/profiler.worker.ts', import.meta.url), {
            type: 'module',
        });

        const fileId = fileStore.store.file?.file;
        if (!fileId) return;

        worker.onmessage = (e) => {
            const { type, result } = e.data;
            if (type === 'ready') {
                worker?.postMessage({
                    type: 'init_extractor',
                    data: {
                        indices: pageIndices,
                        delimiter: undefined, // Auto-detect in parser
                        hasHeaders: true // Assumption: file has headers if we are profiling it
                    }
                });
            } else if (type === 'extractor_ready') {
                processFile(fileId);
            } else if (type === 'extraction_complete') {
                if (forExport) {
                    const rows = result.map((r: [number, string[]]) => [r[0], ...r[1]]);
                    const csvContent = [
                        ['Row #', ...store.headers].join(','),
                        ...rows.map((row: (number | string)[]) => row.map(val => {
                            const str = String(val);
                            return str.includes(',') || str.includes('\n') || str.includes('"')
                                ? `"${str.replace(/"/g, '""')}"`
                                : str;
                        }).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${store.columnName}_${store.anomalyType}_anomalies.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    setStore('isLoading', false);
                } else {
                    const rows = result.map((r: [number, string[]]) => ({ index: r[0], row: r[1] }));
                    setStore('currentRows', rows);
                    setStore('isLoading', false);
                }
                worker?.terminate();
                worker = null;
            } else if (type === 'error') {
                setStore('error', e.data.error);
                setStore('isLoading', false);
            }
        };

        worker.postMessage({ type: 'init' });
    };

    const exportFilteredRows = () => {
        if (store.rowIndices.length === 0) return;
        setStore('isLoading', true);
        setupWorkerAndLoad(store.rowIndices, true);
    };

    const loadPage = (page: number) => {
        if (store.rowIndices.length === 0) return;

        const startIdx = (page - 1) * store.pageSize;
        const endIdx = startIdx + store.pageSize;
        const pageIndices = store.rowIndices.slice(startIdx, endIdx);

        setStore('currentPage', page);
        setStore('isLoading', true);
        setStore('error', null);

        setupWorkerAndLoad(pageIndices);
    };

    const openDrilldown = (column: ColumnProfile, type: DrilldownType, indices: number[], headers: string[]) => {
        setStore({
            isOpen: true,
            columnName: column.name,
            anomalyType: type,
            rowIndices: indices,
            totalAffected: indices.length,
            currentPage: 1,
            currentRows: [],
            headers: headers,
            isLoading: false,
            error: null,
        });

        loadPage(1);
    };

    const close = () => {
        setStore('isOpen', false);
        setStore('currentRows', []);
        if (worker) {
            worker.terminate();
            worker = null;
        }
    };

    return {
        store,
        openDrilldown,
        close,
        loadPage,
        exportFilteredRows,
        setPageSize: (size: number) => {
            setStore('pageSize', size);
            loadPage(1);
        },
    };
}

export const drilldownStore = createRoot(createDrilldownStore);
