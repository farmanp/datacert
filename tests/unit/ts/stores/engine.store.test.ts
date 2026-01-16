import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { engineStore } from '../../../../src/app/stores/engine.store';

// Mock the dynamic import of the wasm module
vi.mock('../../../../src/wasm/pkg/datacert_wasm', () => {
  return {
    default: vi.fn().mockResolvedValue({}), // Mock default export (wasm init)
    init: vi.fn(), // Mock named export init
  };
});

describe('engineStore', () => {
  beforeEach(() => {
    // Reset state before each test
    // We can't easily reset the store state directly because it's a singleton created with createStore
    // but we can try to "re-initialize" it or mock the internals if we exported them differently.
    // For this simple store, we'll check state transitions.
    vi.clearAllMocks();
  });

  // Since state is global/singleton, we need to be careful with test order or reset mechanism.
  // Ideally, stores should be created per-test or have a reset method.
  // For this test, we'll verify the logic assuming a fresh start or sequential state changes.

  it('should start with isLoading true', () => {
     // NOTE: Because other tests might have run or the store is global, 
     // the initial state might already be modified. 
     // However, in a fresh unit test environment, it should be default.
     // If this flakes, we'll need to refactor the store to be createable.
     
     // Checking initial state properties directly if possible, or just the behavior.
     // engineStore.state is read-only from outside usually, but here we can access it.
     expect(engineStore.state.isLoading).toBe(true);
     expect(engineStore.state.isReady).toBe(false);
     expect(engineStore.state.error).toBe(null);
  });

  it('should transition to isReady=true on successful init', async () => {
    // Act
    await engineStore.init();

    // Assert
    expect(engineStore.state.isLoading).toBe(false);
    expect(engineStore.state.isReady).toBe(true);
    expect(engineStore.state.error).toBe(null);
  });

  it('should handle subsequent init calls gracefully (idempotency)', async () => {
    // Act - call init again
    await engineStore.init();

    // Assert - state remains ready
    expect(engineStore.state.isReady).toBe(true);
  });
  
  // To test error state, we'd need to mock a failure. 
  // Since the module mock is hoisted, we can't easily change it per-test without 
  // using vi.doMock or similar inside the test, which can be tricky with ESM.
  // Alternatively, we can rely on the fact that if import fails, it throws.
});
