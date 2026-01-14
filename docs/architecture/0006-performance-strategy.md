---
id: performance-strategy
title: 6. Performance Strategy
sidebar_label: 6. Performance
---

# 6. Performance Strategy & Optimization

Date: 2026-01-13

## Status

Accepted

## Context

Users perceive "upload speed" and "processing time" as the primary indicators of tool quality.
For a data profiling tool, the loop of **Drop File -> See Results** must be immediate for common file sizes (1MB - 50MB) and "fast enough" for large datasets (1GB+).

Standard web applications suffer from:
1.  **Network Latency:** Uploading a 10MB file on a 50Mbps connection takes ~2 seconds + handshake overhead.
2.  **Serialization Overhead:** JSON parsing in JS is fast, but heavy data manipulation locks the main thread.

## Decision

We optimize for **Perceived Instantaneity** through a three-pillar performance strategy:

### 1. Zero-Latency "Upload" (Local-First)
The "upload" phase is eliminated entirely. We utilize the browser's `File` API to read directly from the user's filesystem.
*   **Mechanism:** When a user drops a file, we do not send bytes to a server. We treat the `File` object as a local blob.
*   **Result:** A 7MB file "upload" happens at the speed of the local SSD read (typically 500MB/s - 3GB/s), rather than network speed (5-50MB/s). This results in a ~0ms perceived upload time.

### 2. Native-Speed Parsing (Wasm)
We bypass the JavaScript Engine's overhead for the hot loop of data parsing.
*   **Mechanism:** The Rust `csv` crate (compiled to Wasm) handles the byte-level parsing. This avoids the V8/SpiderMonkey object allocation overhead for millions of strings/numbers.
*   **Optimization:** We minimize crossing the JS<->Wasm boundary. Instead of passing every row to JS, we pass pointers to data chunks, compute statistics entirely in Wasm, and **only return the final aggregate results** (histograms, counts, distributions) to the UI.

### 3. Single-Pass O(n) Algorithms
We ensure that processing time grows linearly with file size, not exponentially.
*   **Mechanism:** All core statistics (Min, Max, Mean, Variance, Cardinality) are computed in a single streaming pass.
*   **Result:** We never load the full dataset into RAM. A 7MB file is processed in one or two frame intervals (16-32ms), making the result appear effectively instant.

## Consequences

### Positive
*   **"Blazing Fast" UX:** For files under 50MB, the UI updates almost synchronously with the drop event.
*   **Scalability:** The same architecture that makes small files fast makes large files (1GB+) possible without crashing.
*   **Battery Life:** CPU usage is bursty but short-lived, returning to idle quickly.

### Negative
*   **Complexity:** Requires maintaining rigorous boundary discipline between JS (UI) and Wasm (Compute).
*   **Browser Variance:** Performance relies on the browser's specific Wasm implementation (though generally consistent across modern Chrome/Firefox/Safari).
