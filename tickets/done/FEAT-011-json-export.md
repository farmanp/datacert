# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to export profiling results as JSON
So that I can integrate the metrics into automated pipelines and monitoring systems

**Success Looks Like:**
A JSON file is downloaded containing all computed metrics in a structured format matching the schema defined in the PRD.

## 2. Context & Constraints (Required)
**Background:**
Machine-readable output enables integration with data quality monitoring, CI/CD pipelines, and custom dashboards. JSON export is essential for programmatic use of DataCert results.

**Scope:**
- **In Scope:**
  - "Export to JSON" button on profile results page
  - Complete metrics export following PRD schema (Appendix C)
  - Metadata section: filename, version, timestamps
  - Summary section: row/column counts, quality score, issues
  - Per-column profiles: all statistics, quality metrics, distributions
  - Correlation data (when computed)
  - Pretty-printed JSON with 2-space indentation

- **Out of Scope:**
  - Streaming JSON export
  - Custom field selection
  - Schema validation of output
  - API endpoint (this is file download only)

**Constraints:**
- Must match PRD Appendix C schema exactly
- File size proportional to column count, not row count
- Numeric precision: 6 decimal places maximum
- UTF-8 encoding

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Export profile to JSON**
Given profiling has completed for a dataset
When a user clicks "Export to JSON"
Then a file named "{original_filename}_profile.json" downloads
And the file is valid JSON
And it parses without errors

**Scenario: Schema compliance**
Given an exported JSON profile
When validating against PRD Appendix C schema
Then all required fields are present
And data types match specification
And no extra unknown fields exist

**Scenario: Metadata section**
Given an exported JSON profile
When examining the "meta" section
Then it contains: generatedAt (ISO timestamp), datacertVersion, fileName, fileSize, processingTimeMs

**Scenario: Column statistics**
Given an exported JSON profile for a numeric column
When examining the column's stats object
Then it contains: count, missing, distinct, min, max, mean, median, stdDev
And values are accurate to 6 decimal places

**Scenario: Quality metrics**
Given an exported JSON profile
When examining a column's quality object
Then it contains: completeness, uniqueness, isPotentialPII
And values are between 0 and 1 for ratios

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/export/json.rs` - JSON export implementation (create)
- `src/app/components/ExportButton.tsx` - Add JSON option
- `src/app/utils/download.ts` - Ensure JSON download support

**Must NOT Change:**
- HTML export implementation
- Profile store structure
- Statistics computation

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(export): implement json profile export matching prd schema
- feat(ui): add json export option to export button
- test(export): add json schema validation tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] JSON validates against PRD Appendix C schema
- [ ] Export works for datasets with 100+ columns
- [ ] Numeric precision is consistent
- [ ] UTF-8 encoding handles special characters
- [ ] Code reviewed

## 7. Resources
- PRD Appendix C: Sample Report Schema
- JSON Schema: https://json-schema.org/
- Rust serde_json: https://docs.rs/serde_json/
