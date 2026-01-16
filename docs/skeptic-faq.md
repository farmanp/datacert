# The Skeptic's FAQ: Answering the Hard Questions about DataCert

This document is for us, the developers. It's a place to confront the toughest questions about our project's architecture and premise. A healthy dose of skepticism is crucial for building a successful product. This FAQ forces us to justify our decisions and acknowledge our trade-offs, not just with marketing buzzwords, but with sound engineering reasoning.

---

### Q1: Why does this even exist? Why not just use a mature, server-side ETL pipeline with Python?

**The Short Answer:**
We are targeting a specific, underserved workflow: the "first mile" of data analysis for data-sensitive users. This is the initial, exploratory phase where a data scientist, analyst, or engineer has a new dataset and needs to get a quick feel for its quality, shape, and content.

**The Detailed Answer:**
1.  **Velocity & Immediacy:** Traditional server-side solutions require setup. You need to upload the data, potentially provision a service, write a script, and wait for the results. DataCert is instant. You drag, drop, and see results in seconds. This speed is critical for initial exploration.
2.  **Security & Data Sensitivity:** The "data never leaves your machine" feature is not a niche benefit; it's a hard requirement for users in healthcare (HIPAA), finance, and other regulated industries. They are often explicitly forbidden from uploading raw, un-vetted data to a third-party service, even an internal one. DataCert allows them to profile data that would otherwise be inaccessible.
3.  **Zero-Configuration Environment:** A data scientist might not have a local Python environment with all the right libraries installed and configured. DataCert requires only a web browser, making it a universal tool that works anywhere without setup.

**Trade-off We Accept:** We are explicitly not trying to replace large-scale ETL pipelines. We are a complementary tool for the initial, interactive phase of analysis.

---

### Q2: This architecture seems wildly over-engineered. Is Rust/Wasm worth the immense complexity?

**The Short Answer:**
Yes, for our specific problem. The performance requirements of parsing and statistically analyzing potentially large files in the browser make JavaScript a non-starter. Rust/Wasm is the only viable path to achieving the required performance in a client-side, sandboxed environment.

**The Detailed Answer:**
1.  **Performance is a Core Feature:** A user profiling a 500MB file expects results in seconds, not minutes. Our benchmarks showed that a pure-JS implementation was 10-20x slower and frequently crashed the browser tab due to memory pressure and garbage collection pauses. The speed of the Rust/Wasm engine is what makes the product usable.
2.  **Long-term Code Reuse:** Our core data processing logic is a valuable asset. By writing it in Rust, we have a clear path to reusing this same engine in other contexts, such as a CLI (`datacert-cli`) or a desktop application, without rewriting a single line of statistics code. This was a strategic choice for future-proofing.
3.  **The "Complexity Budget":** We acknowledge the cost. The learning curve is steeper, and debugging the FFI boundary is harder. However, we've contained this complexity within a specific module (`src/wasm`). The majority of UI/feature developers will interact with the Wasm module as a black-box TypeScript API, not by writing Rust.

**Open Question We Are Monitoring:** Is the development velocity trade-off sustainable? We need to ensure our build tooling, documentation (`rust.md`, `wasm.md`), and dev processes are excellent to mitigate the complexity cost.

---

### Q3: Why SolidJS? We're giving up the massive ecosystem of React for a niche framework.

**The Short Answer:**
SolidJS offered the best combination of performance and a familiar (React-like) developer experience, which is critical for a data-intensive and highly interactive UI.

**The Detailed Answer:**
1.  **Performance without a Virtual DOM:** Solid's fine-grained reactivity is genuinely impressive. In a UI with potentially thousands of updating data points (e.g., streaming profile results, interactive charts), avoiding a Virtual DOM diffing step is a significant performance win. Our UI needs to feel as responsive as the Wasm engine.
2.  **Developer Ergonomics:** The API is very close to React hooks (`createSignal` vs `useState`, `createEffect` vs `useEffect`). This dramatically lowers the barrier to entry for developers coming from a React background, which is the largest talent pool. It was a pragmatic compromise between raw performance and developer familiarity.
3.  **A Deliberate Bet:** We recognize this is a bet on a smaller ecosystem. We are trading the breadth of React's component libraries for the depth of Solid's performance. For a specialized application like ours, where we will build most of the UI components ourselves anyway, this is a trade-off we are willing to make.

**Risk We Are Managing:** If we need a complex, off-the-shelf component that only exists for React (e.g., a specialized data grid), we may need to wrap it or build it from scratch. We are actively monitoring the SolidJS ecosystem's growth.

---

### Q4: The browser's memory is a hard, unfixable ceiling. Doesn't this make the tool useless for "real" data?

**The Short Answer:**
Yes, the browser has limits, but they are much higher than you'd think, and we are engineering our system to work gracefully within them. DataCert's sweet spot is the "medium data" range (100MB to ~1.5GB) that is awkward for both spreadsheets and full-blown server pipelines.

**The Detailed Answer:**
1.  **Streaming Architecture:** We don't load the entire file into memory at once. The entire Rust engine is built on a streaming model. We read the file chunk by chunk, process it, and update our statistics. The memory footprint at any given time is the state of the statistics, not the size of the file. This is our key architectural defense against memory limits.
2.  **Defining the "Sweet Spot":**
    *   **< 100MB:** Excel or Google Sheets often works fine.
    *   **100MB - 1.5GB:** This is our target. The file is too big to be opened comfortably in a spreadsheet, but might not be worth the overhead of setting up a formal ETL process. This is a very common scenario.
    *   **> 1.5GB:** At this point, you are entering the realm of "big data," and a dedicated, server-side tool like Spark or a database is the appropriate solution. We are not competing there.
3.  **Graceful Degradation:** Our goal is to fail gracefully. If a user attempts to load a file that is truly too large, we should be able to detect this early and provide a clear, helpful error message, perhaps even recommending alternative tools.

---

### Q5: The "no-backend" approach feels like a dead end. What happens when we need user accounts or collaboration?

**The Short Answer:**
"Local-first" does not mean "never-backend." It means the application is fully functional offline, with the backend acting as an optional enhancement for collaboration and synchronization.

**The Detailed Answer:**
This is a valid and crucial point. Our architecture is deliberately designed to accommodate a backend when the time is right.

1.  **The Backend as a "Sync" Service:** When we introduce user accounts, the backend's primary role will be to store and sync profile *results* (the JSON output of the Wasm engine), not to process the raw data itself. A user can still profile a sensitive 1GB file locally, but then save and share the ~500KB report with their team via the backend. The core value proposition of local processing remains intact.
2.  **Clear Separation of Concerns:** The profiling engine (Wasm) is completely decoupled from any potential backend services. Integrating a backend would involve adding a new service in our TypeScript layer (`src/app/services/api.ts`) that sends and receives the *output* of the Wasm module. It requires no changes to the core Rust logic.
3.  **Roadmap:** We are postponing the complexity of a backend until we have validated the core product. This is a standard lean development approach. We are solving the most immediate user problem first, without taking on the operational overhead of a backend service before it's justified.
