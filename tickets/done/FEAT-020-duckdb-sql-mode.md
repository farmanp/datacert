# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to query my uploaded data using SQL
So that I can filter, transform, and explore data using familiar syntax before profiling

**Success Looks Like:**
Users can toggle into "SQL Mode", write queries against uploaded files, and profile the query results - enabling power-user workflows and instant drill-downs on millions of rows.

## 2. Context & Constraints (Required)
**Background:**
SPIKE-005 confirmed DuckDB-WASM is highly feasible with exceptional performance (1M rows aggregated in 12ms, 85MB memory). This feature adds SQL capabilities as an optional power-user mode, laying the foundation for future database connectors and the anomaly drill-down feature (FEAT-016).

**Scope:**
- **In Scope:**
  - "SQL Mode" toggle in UI
  - SQL editor with syntax highlighting
  - Load uploaded file into DuckDB as table
  - Execute SELECT queries and display results
  - "Profile Results" button to run profiler on query output
  - Query history (session-only)
  - Basic error handling and query validation
  - Lazy-load DuckDB module (not in initial bundle)
  - Support for uploaded CSV, JSON, Parquet files

- **Out of Scope:**
  - Remote file access via httpfs (Phase 2)
  - Database connections (requires proxy)
  - Saved queries persistence
  - Query auto-complete/intellisense
  - Multiple file joins (v1 = single file)
  - DML statements (INSERT, UPDATE, DELETE)

**Constraints:**
- DuckDB-WASM loaded from CDN (JSDelivr) to keep PWA bundle small
- Lazy-load only when user enters SQL Mode
- Memory limit warning for files > 100MB
- BigInt results must be serialized correctly (use toString())
- Query timeout after 30 seconds

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Enter SQL Mode**
Given a file has been uploaded and profiled
When the user clicks "SQL Mode" toggle
Then DuckDB-WASM is lazy-loaded (show loading indicator)
And the file is loaded into DuckDB as table named "data"
And a SQL editor appears with placeholder: "SELECT * FROM data LIMIT 100"

**Scenario: Execute SQL query**
Given SQL Mode is active with a loaded file
When the user types "SELECT * FROM data WHERE amount > 100" and clicks "Run"
Then the query executes against the data
And results display in a table below the editor
And execution time is shown (e.g., "12ms, 5,432 rows")

**Scenario: Profile query results**
Given a SQL query has returned results
When the user clicks "Profile Results"
Then the query results are passed to the profiler
And a new profile is generated for the filtered dataset
And the profile view shows stats for the query output

**Scenario: Handle SQL errors**
Given SQL Mode is active
When the user executes an invalid query (e.g., "SELEC * FORM data")
Then an error message displays with DuckDB's error text
And the editor highlights the error location if possible
And previous results remain visible

**Scenario: Lazy loading**
Given the app has just loaded (fresh session)
When the user has not entered SQL Mode
Then DuckDB-WASM is NOT loaded (check network tab)
And bundle size is unaffected by DuckDB

**Scenario: Large result handling**
Given a query returns 100,000+ rows
When results are displayed
Then only first 1,000 rows show in preview
And message indicates "Showing 1,000 of 100,000 rows"
And "Profile Results" works on full result set

**Scenario: BigInt serialization**
Given a query returns COUNT(*) on 1M rows
When results display
Then the count shows as "1000000" (string), not [object BigInt]
And no console errors occur

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/pages/SqlMode.tsx` - New SQL mode page (create)
- `src/app/components/SqlEditor.tsx` - SQL editor component (create)
- `src/app/components/QueryResults.tsx` - Results table (create)
- `src/app/stores/sqlStore.ts` - SQL mode state (create)
- `src/app/utils/duckdb.ts` - DuckDB loader and utilities (create)
- `src/app/App.tsx` - Add SQL mode route
- `src/app/pages/Home.tsx` - Add SQL Mode toggle

**Must NOT Change:**
- Existing Rust WASM profiler
- Core profiling flow
- File upload handling (reuse existing)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(sql): add duckdb-wasm lazy loader utility
- feat(sql): create sql editor component with syntax highlighting
- feat(sql): implement query execution and results display
- feat(sql): add "profile results" integration with existing profiler
- feat(ui): add sql mode toggle and routing
- feat(sql): handle bigint serialization in query results
- test(sql): add sql mode integration tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] DuckDB loads lazily (verify in Network tab)
- [ ] Queries execute correctly on CSV, JSON, Parquet
- [ ] BigInt values display correctly
- [ ] "Profile Results" generates valid profile
- [ ] Error messages are user-friendly
- [ ] Performance: 1M row query < 100ms
- [ ] Memory: 1M rows < 100MB heap
- [ ] Code reviewed

## 7. Resources
- SPIKE-005 findings: `tickets/SPIKE-005-duckdb-wasm-feasibility.md`
- DuckDB-WASM docs: https://duckdb.org/docs/api/wasm/overview
- Existing spike implementation: `src/app/pages/spike/duckdb/`
- CodeMirror for SQL editor: https://codemirror.net/
- Monaco Editor alternative: https://microsoft.github.io/monaco-editor/
