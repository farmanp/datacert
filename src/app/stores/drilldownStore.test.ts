import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drilldownStore } from './drilldownStore';
import './fileStore'; // Side effect import to ensure store is initialized

// Mock Worker
class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    constructor() {
        // Trigger ready immediately for testing
        setTimeout(() => {
            if (this.onmessage) {
                this.onmessage({ data: { type: 'ready' } } as MessageEvent);
            }
        }, 0);
    }
}

global.Worker = MockWorker as unknown as typeof Worker;
const MockURL = vi.fn().mockImplementation((path: string, _base: string) => ({
    href: path,
})) as unknown as typeof URL;
MockURL.createObjectURL = vi.fn();
MockURL.revokeObjectURL = vi.fn();
global.URL = MockURL;

describe('drilldownStore', () => {
    beforeEach(() => {
        drilldownStore.close();
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        expect(drilldownStore.store.isOpen).toBe(false);
        expect(drilldownStore.store.currentRows).toEqual([]);
        expect(drilldownStore.store.isLoading).toBe(false);
    });

    it('should open drilldown and set initial state', () => {
        const mockColumn = { name: 'email' } as Parameters<typeof drilldownStore.openDrilldown>[0];
        const mockIndices = [1, 5, 10];
        const mockHeaders = ['id', 'email', 'name'];

        drilldownStore.openDrilldown(mockColumn, 'missing', mockIndices, mockHeaders);

        expect(drilldownStore.store.isOpen).toBe(true);
        expect(drilldownStore.store.columnName).toBe('email');
        expect(drilldownStore.store.anomalyType).toBe('missing');
        expect(drilldownStore.store.rowIndices).toEqual(mockIndices);
        expect(drilldownStore.store.headers).toEqual(mockHeaders);
        expect(drilldownStore.store.totalAffected).toBe(3);
    });

    it('should close and reset state', () => {
        drilldownStore.openDrilldown({ name: 'test' } as Parameters<typeof drilldownStore.openDrilldown>[0], 'pii', [1], ['test']);
        drilldownStore.close();

        expect(drilldownStore.store.isOpen).toBe(false);
        expect(drilldownStore.store.currentRows).toEqual([]);
    });

    it('should handle page calculation', () => {
        const mockColumn = { name: 'test' } as Parameters<typeof drilldownStore.openDrilldown>[0];
        const mockIndices = Array.from({ length: 150 }, (_, i) => i + 1);
        drilldownStore.openDrilldown(mockColumn, 'missing', mockIndices, ['test']);

        // Default page size is 50
        expect(drilldownStore.store.totalAffected).toBe(150);
        expect(Math.ceil(drilldownStore.store.totalAffected / drilldownStore.store.pageSize)).toBe(3);
    });
});
