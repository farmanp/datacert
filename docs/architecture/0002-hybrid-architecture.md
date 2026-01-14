---
id: hybrid-architecture
title: 2. Hybrid Architecture
sidebar_label: 2. Hybrid Architecture
---

# 2. Hybrid Architecture: SolidJS Frontend with Rust/Wasm Core

Date: 2026-01-13

## Status

Accepted

## Context

Data profiling involves computationally intensive tasks: parsing large text files (CSV), iterating through millions of rows, and calculating statistical aggregates (histograms, cardinality, quantiles).

*   **Constraint:** The application must run in the browser.
*   **Problem:** JavaScript, while capable, can struggle with raw performance and memory efficiency for heavy data processing compared to systems languages, especially for large datasets.
*   **Problem:** We need a modern, reactive UI framework to build a responsive interface.

## Decision

We will adopt a hybrid architecture:
1.  **Frontend:** **SolidJS** with **TypeScript**. SolidJS is chosen for its high performance (fine-grained reactivity), small bundle size, and similarity to React (easing developer onboarding).
2.  **Core Engine:** **Rust** compiled to **WebAssembly (Wasm)**. Rust provides memory safety, near-native performance, and robust libraries for data processing (`csv`, `serde`).

## Consequences

### Positive
*   **Performance:** Wasm executes data processing tasks significantly faster than JS.
*   **Safety:** Rust's type system prevents many common classes of bugs.
*   **UX:** SolidJS ensures the UI remains snappy even when updating complex visualizations.

### Negative
*   **Complexity:** The build process is more complex (requires `wasm-pack` and Vite plugins).
*   **Interop Overhead:** Passing data between JS and Wasm incurs serialization/deserialization costs. We must design boundaries carefully (e.g., passing pointers or minimal summary structs instead of raw data arrays).
*   **Skill Set:** Requires knowledge of both TypeScript/Web Tech and Rust.
