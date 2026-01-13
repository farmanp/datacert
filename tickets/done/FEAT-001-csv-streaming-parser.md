# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to drop a CSV file and have it parsed via streaming
So that I can profile files up to 500MB without running out of memory

**Success Looks Like:**
CSV files are parsed in 64KB chunks through a Web Worker, with progress feedback, handling various delimiters and encodings.

## 2. Context & Constraints (Required)
**Background:**
CSV is the most common data interchange format. The parser must handle real-world messiness: different delimiters (comma, tab, pipe), quoted fields, various encodings, and malformed rows. Streaming is essential for the 500MB file size target.

**Scope:**
- **In Scope:**
  - Streaming CSV parser in Rust/WASM
  - Auto-detection of delimiter (comma, tab, semicolon, pipe)
  - UTF-8 encoding support (with UTF-16/Latin-1 detection)
  - Quoted field handling (RFC 4180 compliant)
  - Header row detection
  - Progress callback to UI
  - Error recovery for malformed rows

- **Out of Scope:**
  - JSON/Parquet parsing (separate tickets)
  - Statistical computation (separate ticket)
  - File reading from disk (handled by browser File API)

**Constraints:**
- Must process in chunks (configurable, default 64KB)
- Must not block main thread (runs in Web Worker)
- Memory usage should not exceed 2x current chunk size
- Must handle files with 1M+ rows

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Parse standard CSV with headers**
Given a CSV file with comma delimiters and a header row
When the file is dropped into the application
Then the parser correctly identifies all column names
And all rows are parsed with correct data types inferred
And progress updates are sent at least every 1% of file size

**Scenario: Auto-detect tab delimiter**
Given a TSV file using tab delimiters
When the file is processed
Then the parser auto-detects tab as the delimiter
And parses all fields correctly

**Scenario: Handle quoted fields with embedded delimiters**
Given a CSV with fields containing commas inside quotes
When the file is parsed
Then quoted fields are correctly extracted as single values
And embedded commas are preserved in the field value

**Scenario: Large file streaming**
Given a 200MB CSV file
When the file is processed
Then memory usage stays below 400MB
And the UI remains responsive throughout
And parsing completes within 30 seconds

**Scenario: Malformed row recovery**
Given a CSV with some malformed rows (wrong column count)
When the file is parsed
Then malformed rows are skipped with a warning
And valid rows continue to be processed
And the final report includes malformed row count

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/parser/mod.rs` - Parser module entry
- `src/wasm/src/parser/csv.rs` - CSV-specific parsing logic
- `src/app/workers/parser.worker.ts` - Web Worker wrapper
- `src/wasm/src/lib.rs` - WASM exports

**Must NOT Change:**
- Project configuration files (unless adding dependencies)
- UI components
- Other parser modules (JSON, Parquet)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(parser): implement streaming csv parser in rust/wasm
- feat(parser): add delimiter auto-detection for csv/tsv
- feat(parser): handle rfc 4180 quoted fields
- feat(worker): create parser web worker with progress reporting
- test(parser): add csv parsing test suite with fixtures

## 6. Verification & Definition of Done (Required)
- [x] All acceptance criteria scenarios pass
- [x] Unit tests cover: delimiter detection, quoted fields, encoding detection
- [x] Integration test: parse 100MB fixture file < 15s (Verified locally with synthetic data)
- [x] Memory profiling shows no leaks over multiple parses
- [x] Code reviewed
- [x] No breaking changes to existing APIs

## 7. Resources
- RFC 4180: https://tools.ietf.org/html/rfc4180
- Rust csv crate (reference): https://docs.rs/csv
- Test fixtures needed: standard.csv, tabs.tsv, quoted.csv, malformed.csv, large.csv (100MB)
