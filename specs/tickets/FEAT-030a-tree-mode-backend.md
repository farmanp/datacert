# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want the profiler to quickly scan deeply nested JSON structure
So that I can see all available paths without triggering OOM errors

**Success Looks Like:**
Users upload a 500-level nested JSON file, and within 1-2 seconds see a complete structural analysis showing all 10,000 paths, depth metrics, and population statistics - without profiling the full data yet.

## 2. Context & Constraints (Required)
**Background:**
This is the backend foundation for FEAT-030 Tree Mode. Current JSON profiler tries to flatten everything immediately, causing OOM on deep structures. This ticket implements a lightweight **structure-only scan** that discovers paths without computing full statistics.

**Parent Ticket:** FEAT-030-tree-mode.md

**Scope:**
- **In Scope:**
  - New `analyze_json_structure()` function in Rust
  - Discovers all JSONPaths without profiling
  - Tracks: path, depth, data type, population %
  - Sample-based (default: first 1,000 rows)
  - Returns tree structure as JSON
  - No histogram/statistics computation
  - Works with any nesting depth

- **Out of Scope:**
  - Full profiling (happens later after column selection)
  - UI components (separate ticket)
  - Column selection logic (separate ticket)
  - SQL Mode integration

**Constraints:**
- Must complete in < 2 seconds for 10MB JSON
- Memory usage < 50MB for scan
- Support up to 10,000 unique paths
- Sample size: 1,000-10,000 rows (configurable)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Scan shallow JSON**
Given a JSON file with 3 levels deep, 50 total paths
When the structure scan runs
Then all 50 paths are discovered
And each path shows: depth, type, population %
And scan completes in < 500ms

**Scenario: Scan deeply nested JSON (500 levels)**
Given a JSON file with 500 levels deep, 2,345 total paths
When the structure scan runs with 1,000 row sample
Then all discovered paths are returned
And max_depth = 500 is reported
And no OOM error occurs
And scan completes in < 2 seconds

**Scenario: Scan wide JSON (10k columns)**
Given a JSON file with 10,000 top-level fields
When the structure scan runs
Then all 10,000 paths are discovered
And estimated_columns = 10,000 is reported
And no memory limit exceeded

**Scenario: Population tracking**
Given a JSON where `$.user.email` exists in 850 of 1,000 rows
When structure scan completes
Then `$.user.email` shows population = 85.0%

**Scenario: Type detection**
Given mixed types at `$.value` (50% string, 50% integer)
When structure scan completes
Then `$.value` type = "mixed" or arrays both types

**Scenario: Return tree structure**
Given any JSON file
When structure scan completes
Then returns TreeNode hierarchy
And each node has: path, depth, type, population, children
And can be serialized to JSON

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/parser/json.rs` - Add structure scan function
- `src/wasm/src/stats/tree.rs` - NEW: TreeNode data structure
- `src/wasm/src/lib.rs` - Export new structure scan function
- `src/app/utils/structure-scanner.ts` - NEW: TS wrapper for WASM call

**Must NOT Change:**
- Existing JSON profiling logic (keep both modes)
- File upload handling
- Profiler statistics calculations

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(wasm): add TreeNode data structure for hierarchical stats
- feat(json): implement structure-only analysis without profiling
- feat(json): add population tracking for JSONPaths
- feat(json): export structure scan to TS interface
- test(json): add structure scan tests for deep nested JSON

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Scans 500-level JSON without OOM
- [ ] Completes in < 2 seconds for 10MB file
- [ ] Returns correct TreeNode hierarchy
- [ ] Population percentages are accurate
- [ ] Rust tests pass for all scenarios
- [ ] TS wrapper correctly calls WASM function
- [ ] Code reviewed

## 7. Resources
- FEAT-030 parent spec: `specs/tickets/FEAT-030-tree-mode.md`
- Existing JSON parser: `src/wasm/src/parser/json.rs`
- JSONPath format: https://goessner.net/articles/JsonPath/
- serde_json Value type: https://docs.rs/serde_json/latest/serde_json/enum.Value.html
