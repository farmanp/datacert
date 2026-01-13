# AI-Ready Infra Template

## 1. Objective (Required)
**What:**
Implement a Web Worker pool architecture that distributes WASM computation across multiple workers to maximize CPU utilization and keep the main thread responsive.

**Why:**
Statistical computation on large datasets (500MB target) requires parallel processing. A worker pool allows us to analyze multiple columns concurrently and prevents UI freezing during intensive operations. This is critical for achieving the < 60s target for 500MB files.

## 2. Scope (Required)
**In Scope:**
- Worker pool manager class
- Dynamic pool sizing based on `navigator.hardwareConcurrency`
- Task queue with priority support
- Message passing protocol between main thread and workers
- WASM module loading within workers
- Progress aggregation from multiple workers
- Graceful degradation for browsers without SharedArrayBuffer
- Worker termination and cleanup

**Out of Scope:**
- SharedArrayBuffer optimization (P2 enhancement)
- Transferable ArrayBuffer optimization (can be added later)
- Worker persistence between profiling sessions

## 3. Technical Approach
**Strategy:**
1. Create WorkerPool class managing N workers (hardwareConcurrency - 2, min 2)
2. Each worker loads WASM module on initialization
3. Main thread sends tasks via structured clone
4. Workers process tasks and post results back
5. Pool manager aggregates results and progress

**Architecture:**
```
Main Thread                    Worker Pool
    │                              │
    ├── createPool(size) ─────────►│
    │                              ├── Worker 1 (WASM)
    │                              ├── Worker 2 (WASM)
    │                              └── Worker N (WASM)
    │                              │
    ├── submitTask(data) ─────────►│
    │                              ├── Route to idle worker
    │◄── onProgress(%) ───────────┤
    │◄── onComplete(result) ──────┤
    │                              │
    └── terminate() ──────────────►│
```

**Message Protocol:**
```typescript
// Main → Worker
type WorkerMessage =
  | { type: 'init', wasmUrl: string }
  | { type: 'parse', chunk: ArrayBuffer, options: ParseOptions }
  | { type: 'analyze', columnData: ArrayBuffer, columnName: string }
  | { type: 'terminate' }

// Worker → Main
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress', percent: number }
  | { type: 'result', data: ProfileResult }
  | { type: 'error', message: string }
```

**Files to Create:**
- `src/app/workers/pool.ts` - Worker pool manager
- `src/app/workers/analyzer.worker.ts` - Analysis worker
- `src/app/workers/types.ts` - Message type definitions
- `src/app/workers/index.ts` - Public API exports

**Dependencies:**
None additional - uses native Web Worker API

## 4. Acceptance Criteria (Required)
- [ ] Pool initializes with correct worker count based on CPU cores
- [ ] Tasks are distributed to idle workers
- [ ] Progress is aggregated correctly from parallel workers
- [ ] All workers terminate cleanly on pool.terminate()
- [ ] WASM loads successfully in worker context
- [ ] Fallback works in browsers without SharedArrayBuffer
- [ ] Memory is released after task completion
- [ ] Error in one worker doesn't crash the pool

## 5. Rollback Plan
Fall back to single-worker model or main-thread execution if pool architecture proves unstable.

## 6. Planned Git Commit Message(s)
- feat(worker): implement worker pool manager
- feat(worker): create analyzer worker with wasm loading
- feat(worker): add task queue with distribution logic
- feat(worker): implement progress aggregation
- test(worker): add worker pool integration tests

## 7. Verification
- [ ] Unit tests for pool manager logic
- [ ] Integration test: parallel column analysis
- [ ] Performance test: compare single worker vs pool on 100MB file
- [ ] Memory test: no leaks after repeated pool create/destroy
- [ ] Browser test: works in Chrome, Firefox, Safari
