# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to profile JSON and JSON Lines files
So that I can analyze API responses and log files with the same tool

**Success Looks Like:**
JSON files (single array of objects) and JSONL files (newline-delimited JSON objects) are parsed and profiled with the same quality as CSV files.

## 2. Context & Constraints (Required)
**Background:**
JSON is increasingly common in data engineering workflows (API responses, event logs, NoSQL exports). JSON Lines format is particularly popular for streaming and log data. Supporting these formats significantly expands DataLens utility.

**Scope:**
- **In Scope:**
  - JSON file parsing (array of objects: `[{...}, {...}]`)
  - JSON Lines parsing (newline-delimited: `{...}\n{...}\n`)
  - Auto-detection of JSON vs JSONL format
  - Flattening of nested objects (dot notation: `user.name`)
  - Array field handling (show as array type with length stats)
  - Streaming parsing for large files
  - Same statistics and quality metrics as CSV

- **Out of Scope:**
  - Deeply nested structure analysis (> 3 levels)
  - JSON Schema extraction (Phase 2)
  - Mixed record types (all records must have similar structure)
  - GeoJSON special handling

**Constraints:**
- Must use streaming parser for memory efficiency
- Nested depth limited to 3 levels (configurable)
- Array values tracked as `columnName[]` with count of elements
- Maximum key count per object: 500

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Parse JSON array**
Given a file containing `[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]`
When the file is processed
Then 2 rows and 2 columns are detected
And columns are "id" (numeric) and "name" (string)
And standard statistics are computed

**Scenario: Parse JSON Lines**
Given a file with each line being a JSON object
When the file is processed
Then the format is auto-detected as JSONL
And each line is parsed as a record
And statistics are computed across all records

**Scenario: Handle nested objects**
Given JSON with nested structure `{"user": {"name": "Alice", "age": 30}}`
When the file is processed
Then columns are flattened to "user.name" and "user.age"
And statistics are computed for flattened columns

**Scenario: Handle arrays in values**
Given JSON with `{"tags": ["a", "b", "c"]}`
When the file is processed
Then "tags" is typed as array
And statistics show: min length, max length, avg length of arrays

**Scenario: Large JSON Lines file**
Given a 200MB JSONL file
When the file is processed
Then memory usage stays below 400MB
And parsing completes within 30 seconds
And the UI remains responsive

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/parser/json.rs` - JSON parser implementation (create)
- `src/wasm/src/parser/mod.rs` - Add JSON module export
- `src/wasm/src/lib.rs` - Add JSON parsing exports
- `src/app/workers/parser.worker.ts` - Add JSON handling

**Must NOT Change:**
- CSV parser implementation
- Statistics engine (should work unchanged)
- UI components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(parser): implement streaming json array parser
- feat(parser): add json lines (jsonl) format support
- feat(parser): implement nested object flattening for json
- feat(parser): add json/jsonl format auto-detection
- test(parser): add json parsing test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Unit tests for both JSON and JSONL formats
- [ ] Integration test with nested and array fields
- [ ] Memory test: parse 200MB JSONL < 400MB memory
- [ ] Performance test: 100MB JSONL < 15s
- [ ] Error handling for malformed JSON
- [ ] Code reviewed

## 7. Resources
- JSON specification: https://www.json.org/json-en.html
- JSON Lines specification: https://jsonlines.org/
- Rust serde_json streaming: https://docs.rs/serde_json/latest/serde_json/fn.from_reader.html
