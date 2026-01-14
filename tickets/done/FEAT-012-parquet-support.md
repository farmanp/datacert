# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to profile Parquet files directly in the browser
So that I can analyze columnar data exports without format conversion

**Success Looks Like:**
Parquet files are loaded, parsed via parquet-wasm, and profiled with the same statistics and quality metrics as CSV files.

## 2. Context & Constraints (Required)
**Background:**
Parquet is the standard format for data engineering workflows (Spark, dbt, data lakes). Native Parquet support eliminates the need to export to CSV, preserving type information and enabling analysis of larger files through columnar access.

**Scope:**
- **In Scope:**
  - Parquet file parsing via parquet-wasm library
  - Schema extraction from Parquet metadata
  - Type preservation (use Parquet types directly)
  - Row group-based streaming for large files
  - Support for common types: int32/64, float, double, string, boolean, timestamp
  - Null handling via Parquet's null bitmap
  - Statistics from Parquet metadata (min/max) as optimization

- **Out of Scope:**
  - Nested types (struct, list, map) - flatten only top level
  - Dictionary encoding optimization
  - Predicate pushdown
  - Writing Parquet files
  - Parquet encryption

**Constraints:**
- parquet-wasm adds ~2MB to WASM bundle (lazy load recommended)
- Memory usage may be higher than CSV due to Arrow buffers
- Browser must support WebAssembly SIMD for best performance

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Parse Parquet file**
Given a Parquet file with 5 columns and 1000 rows
When the file is dropped into DataCert
Then the file format is detected as Parquet
And all 5 columns and 1000 rows are processed
And column types are preserved from Parquet schema

**Scenario: Use Parquet metadata**
Given a Parquet file with pre-computed statistics in metadata
When profiling begins
Then min/max values are read from metadata (not computed)
And row count is read from metadata
And processing is faster than full scan

**Scenario: Handle Parquet types**
Given a Parquet file with columns: int64, double, string, timestamp
When profiling completes
Then types are correctly identified
And timestamp column shows temporal statistics
And numeric columns show full statistics

**Scenario: Large Parquet file streaming**
Given a 300MB Parquet file with multiple row groups
When the file is processed
Then row groups are processed sequentially
And memory usage stays reasonable
And progress is reported per row group

**Scenario: Null handling**
Given a Parquet column with null bitmap indicating 20% nulls
When profiling completes
Then missing count reflects 20% nulls
And null handling matches CSV behavior

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/parser/parquet.rs` - Parquet parser (create)
- `src/wasm/src/parser/mod.rs` - Add Parquet module
- `src/wasm/Cargo.toml` - Add parquet-wasm dependency
- `src/app/workers/parser.worker.ts` - Add Parquet handling
- `vite.config.ts` - Configure Parquet WASM loading

**Must NOT Change:**
- CSV/JSON parser implementations
- Statistics engine
- UI components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- chore(wasm): add parquet-wasm dependency
- feat(parser): implement parquet file parsing
- feat(parser): extract schema and statistics from parquet metadata
- feat(parser): add row group streaming for large parquet files
- test(parser): add parquet parsing test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Unit tests for type mapping
- [ ] Integration test with real Parquet files (Spark/DuckDB generated)
- [ ] Memory test: 300MB Parquet < 600MB memory
- [ ] Performance comparison vs CSV (should be faster)
- [ ] Lazy loading of Parquet WASM module works
- [ ] Code reviewed

## 7. Resources
- parquet-wasm: https://github.com/kylebarron/parquet-wasm
- Apache Parquet specification: https://parquet.apache.org/docs/
- Arrow columnar format: https://arrow.apache.org/docs/format/Columnar.html
