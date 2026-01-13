# 4. Streaming Data Processing

Date: 2026-01-13

## Status

Accepted

## Context

Since we are processing data locally in the browser (ADR 0003), we are constrained by the browser's available memory.
*   **Problem:** Loading a 1GB CSV file entirely into memory (DOM or JS heap) will likely crash the browser tab or cause severe performance degradation.
*   **Goal:** Profile files larger than available RAM.

## Decision

We will use a **Streaming Architecture**.
1.  The file is read in chunks (e.g., 64KB) using the File API (`FileReader` / `Streams API`).
2.  Chunks are passed to the Wasm engine.
3.  The Wasm engine parses the chunk and updates running statistical accumulators (e.g., count, sum, hyperloglog for cardinality).
4.  Raw data for the chunk is discarded immediately after processing.

## Consequences

### Positive
*   **Memory Efficiency:** Memory usage remains relatively constant (O(1) relative to file size) for many metrics, dependent only on the size of the statistical state, not the dataset size.
*   **Scalability:** Can process multi-gigabyte files on devices with limited RAM.

### Negative
*   **Algorithm Complexity:** We are limited to one-pass (or few-pass) algorithms. Computing things like "median" exactly requires sorting (high memory) or complex multi-pass approaches. We may have to rely on approximate algorithms (e.g., t-digest) for certain metrics.
*   **Async Logic:** Handling streams and partial records (e.g., a CSV row split across chunk boundaries) adds complexity to the parser.
