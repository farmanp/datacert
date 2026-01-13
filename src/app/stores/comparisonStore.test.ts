import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComparisonStore } from './comparisonStore';
import { createRoot } from 'solid-js';
import { ComparisonFileKey } from './comparisonStore';

describe('comparisonStore', () => {
    let mockWorker: {
        postMessage: any;
        terminate: any;
        onmessage: ((e: MessageEvent) => void) | null;
    };

    beforeEach(() => {
        mockWorker = {
            postMessage: vi.fn(),
            terminate: vi.fn(),
            onmessage: null,
        };

        // @ts-ignore
        global.Worker = vi.fn(() => mockWorker);

        // Mock URL.createObjectURL/revokeObjectURL if needed, though mostly used in components
        global.URL.createObjectURL = vi.fn();
        global.URL.revokeObjectURL = vi.fn();
    });

    it('initializes with default state', () => {
        createRoot((dispose) => {
            const { store } = createComparisonStore();

            expect(store.fileA.state).toBe('idle');
            expect(store.fileB.state).toBe('idle');
            expect(store.comparisons).toHaveLength(0);
            expect(store.isComparing).toBe(false);

            dispose();
        });
    });

    it('updates state when a valid file is selected', () => {
        createRoot((dispose) => {
            const { store, selectFile } = createComparisonStore();
            const file = new File(['header\n1'], 'test.csv', { type: 'text/csv' });

            selectFile('A', file);

            expect(store.fileA.state).toBe('processing');
            expect(store.fileA.file?.name).toBe('test.csv');
            expect(global.Worker).toHaveBeenCalledTimes(1);

            dispose();
        });
    });

    it('sets error state for unsupported file types', () => {
        createRoot((dispose) => {
            const { store, selectFile } = createComparisonStore();
            const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });

            selectFile('B', file);

            expect(store.fileB.state).toBe('error');
            expect(store.fileB.error).toBeDefined();
            expect(global.Worker).not.toHaveBeenCalled();

            dispose();
        });
    });

    it('resets file state correctly', () => {
        createRoot((dispose) => {
            const { store, selectFile, resetFile } = createComparisonStore();
            const file = new File([''], 'test.csv');

            selectFile('A', file);
            resetFile('A');

            expect(store.fileA.state).toBe('idle');
            expect(store.fileA.file).toBeNull();
            expect(mockWorker.terminate).toHaveBeenCalled();

            dispose();
        });
    });

    it('computes comparison summary correctly', () => {
        createRoot((dispose) => {
            const { store, getSummary } = createComparisonStore();

            // Manually populate comparisons for testing
            // @ts-ignore - bypassing readonly/private for test setup
            store.comparisons = [
                { status: 'added', name: 'col1' } as any,
                { status: 'removed', name: 'col2' } as any,
                { status: 'modified', name: 'col3' } as any,
                { status: 'unchanged', name: 'col4' } as any,
                { status: 'unchanged', name: 'col5' } as any,
            ];

            const summary = getSummary();
            expect(summary.total).toBe(5);
            expect(summary.added).toBe(1);
            expect(summary.removed).toBe(1);
            expect(summary.modified).toBe(1);
            expect(summary.unchanged).toBe(2);

            dispose();
        });
    });
});
