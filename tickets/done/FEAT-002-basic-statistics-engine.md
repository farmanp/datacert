# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see basic statistics for each column (count, distinct, missing, min, max, mean)
So that I can quickly understand the shape of my data

**Success Looks Like:**
After parsing completes, each column displays accurate count, distinct count, missing count, and for numeric columns: min, max, and mean values.

## 2. Context & Constraints (Required)
**Background:**
Basic statistics are the foundation of data profiling. These metrics must be computed in a single streaming pass using online algorithms to support large files without loading all data into memory.

**Scope:**
- **In Scope:**
  - Row count (total rows processed)
  - Per-column: non-null count, null/missing count
  - Per-column: distinct value count (using HyperLogLog for approximation on large datasets)
  - Per-column: data type inference (numeric, string, date, boolean)
  - Numeric columns: min, max, mean (exact values)
  - String columns: min/max length
  - Online algorithm implementation for single-pass computation

- **Out of Scope:**
  - Median, standard deviation, quantiles (Phase 2 - FEAT-005)
  - Histograms and distributions (Phase 2)
  - Correlation analysis (Phase 2)
  - Quality metrics (separate ticket)

**Constraints:**
- All statistics must be computed in a single pass over the data
- Memory for statistics must be O(columns) not O(rows)
- Distinct count can be approximate (HyperLogLog) for columns with >10K unique values
- Must handle mixed-type columns gracefully

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Compute statistics for numeric column**
Given a CSV with a numeric column "price" containing [10, 20, null, 30, 40]
When profiling completes
Then the column shows count=4, missing=1, distinct=4
And min=10, max=40, mean=25
And inferred_type="numeric"

**Scenario: Compute statistics for string column**
Given a CSV with a string column "name" containing ["Alice", "Bob", null, "Alice", "Carol"]
When profiling completes
Then the column shows count=4, missing=1, distinct=3
And min_length=3, max_length=5
And inferred_type="string"

**Scenario: Handle large distinct counts**
Given a CSV with a column containing 100,000 unique values
When profiling completes
Then distinct count is within 2% of actual value (HyperLogLog accuracy)
And memory usage for that column's stats is < 50KB

**Scenario: Data type inference**
Given a CSV with columns: id (integers), price (floats), name (strings), active (true/false), date (ISO dates)
When profiling completes
Then types are inferred as: integer, numeric, string, boolean, date

**Scenario: Mixed type handling**
Given a CSV column with values ["10", "20", "N/A", "30"]
When profiling completes
Then the column is inferred as "string" (due to non-numeric values)
And a note indicates "potentially numeric with exceptions"

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/stats/mod.rs` - Statistics module entry
- `src/wasm/src/stats/numeric.rs` - Numeric column statistics
- `src/wasm/src/stats/categorical.rs` - String/categorical statistics
- `src/wasm/src/stats/temporal.rs` - Date/time statistics
- `src/wasm/src/lib.rs` - Add statistics exports

**Must NOT Change:**
- Parser implementation (FEAT-001)
- UI components
- Project configuration

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(stats): implement online statistics accumulator
- feat(stats): add hyperloglog for approximate distinct counts
- feat(stats): implement data type inference logic
- feat(stats): add numeric column min/max/mean computation
- test(stats): add statistics engine test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Unit tests for each statistic type
- [ ] Accuracy test: compare HyperLogLog vs exact on 1M row dataset
- [ ] Performance test: statistics add < 10% overhead to parsing
- [ ] Memory test: stats memory is O(columns) not O(rows)
- [ ] Code reviewed

## 7. Resources
- HyperLogLog paper: http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf
- Rust hyperloglog crate: https://docs.rs/hyperloglog
- Online algorithms reference: https://en.wikipedia.org/wiki/Online_algorithm
