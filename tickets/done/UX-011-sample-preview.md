# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see sample values from each column
So that I can understand what the actual data looks like beyond statistics

**Success Looks Like:**
ColumnCard expanded view shows 5 sample values from the column in a pill format.

## 2. Context & Constraints (Required)
**Background:**
Currently the profiler only shows statistical summaries. Users cannot see actual data values (except top categorical values). Sample values help verify data quality, spot formatting issues, and understand the semantic meaning of columns.

**Scope:**
- **In Scope:**
  - Store first 5 unique non-null values per column during profiling
  - Display sample values in ColumnCard expanded (Deep Dive) view
  - Show in scrollable pill/tag format
  - Handle long values with truncation and tooltip

- **Out of Scope:**
  - Configurable sample count
  - Random sampling (use first encountered)
  - Full data preview table
  - Sensitive data redaction (Phase 2)

**Constraints:**
- Requires WASM changes to collect samples during parsing
- Sample values stored as strings regardless of type
- Should not significantly increase memory usage

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Display sample values**
Given a column has been profiled
When user expands the ColumnCard (Deep Dive)
Then a "Sample Values" section appears
And shows up to 5 sample values as pills

**Scenario: Truncate long values**
Given a sample value is longer than 30 characters
When displayed in the pill
Then it is truncated with ellipsis
And full value shown on hover/tooltip

**Scenario: Handle numeric values**
Given a numeric column with sample values
When displayed
Then values are formatted appropriately (numbers, not strings)

**Scenario: Empty column handling**
Given a column with all null values
When user expands ColumnCard
Then "Sample Values" section shows "No sample data available"

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/lib.rs` - Add sample collection to profiler
- `src/app/stores/profileStore.ts` - Add samples to ColumnProfile type
- `src/app/components/ColumnCard.tsx` - Add Sample Values section

**Must NOT Change:**
- Existing statistics computation
- Performance characteristics significantly

**Data structure addition to ColumnProfile:**
```typescript
sample_values: string[] | null; // Up to 5 unique non-null values
```

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(wasm): collect sample values during profiling
- feat(ui): display sample values in column card

## 6. Verification & Definition of Done (Required)
- [ ] Sample values collected during profiling (WASM)
- [ ] ProfileStore type includes sample_values
- [ ] ColumnCard shows Sample Values section in expanded view
- [ ] Long values truncated with tooltip
- [ ] Empty columns show appropriate message
- [ ] WASM builds successfully
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- ColumnCard.tsx:136-175 - Expanded section location
- profileStore.ts - ColumnProfile type definition
