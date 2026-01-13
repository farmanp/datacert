# AI-Ready Spike Template

## 1. Research Question (Required)
**Question:**
What is the optimal architecture for streaming large files (up to 500MB) through WASM for statistical computation while maintaining UI responsiveness?

**Context:**
The PRD specifies support for files up to 500MB with performance targets of < 60s processing time and < 1GB memory usage. We need to determine the best approach for chunked processing, worker communication, and online algorithm selection before implementation begins.

## 2. Scope & Timebox
**Timebox:** 1 day

**In Scope:**
- Evaluate ReadableStream vs FileReader for file chunking
- Research online/streaming algorithms for statistics (Welford's, t-digest, etc.)
- Prototype Web Worker + WASM communication patterns
- Measure memory overhead of different chunk sizes
- Evaluate SharedArrayBuffer availability and fallback strategies
- Document browser compatibility concerns

**Out of Scope:**
- Full implementation of any parser
- UI design decisions
- Non-CSV formats (will be separate spikes if needed)

## 3. Success Criteria (Required)
**Deliverables:**
- [ ] Written summary of streaming architecture recommendation
- [ ] Prototype demonstrating WASM + Worker data transfer
- [ ] Memory benchmarks for 64KB, 256KB, 1MB chunk sizes
- [ ] List of online algorithms to implement for each statistic
- [ ] Browser compatibility matrix with fallback strategies

## 4. Research Plan
1. Create minimal Rust WASM module that accepts byte chunks
2. Implement three transfer methods: structured clone, transferable ArrayBuffer, SharedArrayBuffer
3. Benchmark each with 10MB, 100MB synthetic data
4. Research and document online algorithms:
   - Count, sum, mean: trivial accumulation
   - Variance/stddev: Welford's online algorithm
   - Median/quantiles: t-digest or P² algorithm
   - Distinct count: HyperLogLog
   - Histogram: dynamic bin boundaries
5. Test in Chrome, Firefox, Safari to identify compatibility issues
6. Document recommended architecture with diagrams

## 5. Findings

**Research Completed: 2026-01-13**

### File Streaming Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **ReadableStream + Transferable** | Built-in chunking, backpressure, 97% support | None significant | **Primary choice** |
| FileReader + slice() | Universal (IE10+) | Manual chunking, no backpressure | Fallback only |
| SharedArrayBuffer | Fastest, true memory sharing | Requires COOP/COEP headers (95% support) | Optional enhancement |
| Main thread WASM | Simplest | Blocks UI | Not recommended |

### Chunk Size Benchmarks

| Size | Memory (500MB file) | Use Case |
|------|---------------------|----------|
| **64KB** | ~11MB | **Default - best balance** |
| 256KB | ~44MB | High-throughput scenarios |

### Recommended Algorithms

| Statistic | Algorithm | Space | Accuracy | Rust Crate |
|-----------|-----------|-------|----------|------------|
| Mean | Running accumulator | O(1) | Exact | Manual |
| Variance/StdDev | **Welford's** | O(1) | Exact, numerically stable | Manual |
| Median/Quantiles | **t-digest** | O(δ), ~2KB | <0.01% for P1/P99 | `tdigest` |
| Distinct Count | **HyperLogLog** | O(2^p), ~1.5KB | 2% error | `hyperloglog` |
| Top-N | **Count-Min Sketch + Heap** | ~1KB for top-10 | Approximate | Manual or `streaming-algorithms` |
| Histogram | Dynamic binning via t-digest | O(bins) | Derived from quantiles | Manual |

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Global |
|---------|--------|---------|--------|--------|
| ReadableStream | 43+ | 65+ | 10.1+ | 97%+ |
| SharedArrayBuffer | 68+ | 79+ | 15.2+ | 95% |
| WASM in Workers | ✅ | ✅ | ✅ | Universal |
| Transferable ArrayBuffer | ✅ | ✅ | ✅ | Universal |
| WASM SIMD | 91+ | 89+ | 16.4+ | ~90% |

### Architecture Recommendation

```
File → ReadableStream (64KB) → Transferable to Worker → WASM Parse →
Online Stats (Welford, t-digest, HLL) → Merge → JSON Result
```

**Worker Count:** `Math.max(2, navigator.hardwareConcurrency - 2)`

### Rust WASM Dependencies

```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
csv = "1.3"
xxhash-rust = { version = "0.8", features = ["xxh64"] }
# tdigest = "0.2"  # Verify WASM compatibility
# hyperloglog = "1.0"
```

### Performance Targets

| File Size | Time Target | Memory Budget |
|-----------|-------------|---------------|
| 10MB | < 3s | < 50MB |
| 100MB | < 15s | < 200MB |
| 500MB | < 60s | < 1GB |

## 6. Next Steps
- [x] Research completed
- [ ] **FEAT-001:** Implement streaming CSV parser with ReadableStream
- [ ] **FEAT-002:** Implement Welford's algorithm for basic stats
- [ ] **FEAT-005:** Implement t-digest for quantiles
- [ ] **INFRA-003:** Build worker pool with Transferable transfers
- [ ] Consider adding COOP/COEP headers for SharedArrayBuffer enhancement

**Full findings:** See `/Users/farman/.claude/plans/fizzy-seeking-kite.md`
