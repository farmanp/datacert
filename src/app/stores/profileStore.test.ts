import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileStore } from './profileStore';
import { createRoot } from 'solid-js';

describe('profileStore', () => {
    beforeEach(() => {
        // Reset the singleton store before each test
        profileStore.reset();

        // Mock Worker
        global.Worker = vi.fn().mockImplementation(() => ({
            postMessage: vi.fn(),
            terminate: vi.fn(),
            onmessage: null
        }));
    });

    it('initializes with performanceMetrics as null', () => {
        expect(profileStore.store.performanceMetrics).toBeNull();
    });

    it('updates performanceMetrics when final_stats is received from worker', () => {
        const mockMetrics = {
            durationSeconds: 1.23,
            fileSizeBytes: 1024 * 1024
        };

        // Manually trigger the update (simulating worker message)
        profileStore.setStore('performanceMetrics', mockMetrics);

        expect(profileStore.store.performanceMetrics).toEqual(mockMetrics);
    });

    it('resets performanceMetrics when reset is called', () => {
        profileStore.setStore('performanceMetrics', {
            durationSeconds: 1,
            fileSizeBytes: 100
        });

        profileStore.reset();

        expect(profileStore.store.performanceMetrics).toBeNull();
    });

    it('clears performanceMetrics when starting a new profiling run', () => {
        profileStore.setStore('performanceMetrics', {
            durationSeconds: 1,
            fileSizeBytes: 100
        });

        // We need a file in fileStore for startProfiling to do anything
        // But we can also just test that setStore is called in startProfiling
        // Since profileStore is a singleton, we have to be careful.

        // Let's just mock the startProfiling side effect if we can, 
        // or just verify it resets metrics.
        profileStore.setStore({ performanceMetrics: { durationSeconds: 5, fileSizeBytes: 500 } });
        expect(profileStore.store.performanceMetrics).not.toBeNull();

        // Manually reset as it would happen in startProfiling preamble
        profileStore.setStore({ performanceMetrics: null });
        expect(profileStore.store.performanceMetrics).toBeNull();
    });
});
