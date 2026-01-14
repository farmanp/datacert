---
id: web-worker-offloading
title: 5. Web Worker Offloading
sidebar_label: 5. Web Workers
---

# 5. Web Worker Offloading

Date: 2026-01-13

## Status

Accepted

## Context

Even with Wasm (ADR 0002), processing millions of rows takes CPU time.
*   **Problem:** If this processing happens on the main JavaScript thread, the UI will freeze/block, making the application unresponsive to user input (scrolling, clicking cancel, etc.).

## Decision

We will execute the DataLens Profiler (Wasm engine) inside a **Web Worker**.
1.  The main thread handles UI and file selection.
2.  The main thread sends file chunks to the Worker.
3.  The Worker processes the chunk and sends back progress updates or intermediate results.

## Consequences

### Positive
*   **Responsiveness:** The UI remains silky smooth (60fps) even while crunching 1GB of data.
*   **Stability:** Heavy computation won't trigger "Page Unresponsive" warnings.

### Negative
*   **Communication Overhead:** Data must be transferred between Main and Worker threads. Since `SharedArrayBuffer` requires specific HTTP headers (COOP/COEP) which might not be available in all hosting environments (e.g., basic GitHub Pages without config), we will initially rely on standard `postMessage` with transferables where possible, or copying.
*   **State Management:** Asynchronous state synchronization between the Worker (source of truth for progress) and the UI Store becomes critical.
