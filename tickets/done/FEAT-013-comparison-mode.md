# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to compare profiles of two datasets side-by-side
So that I can identify schema drift and statistical changes between data versions

**Success Looks Like:**
Two files can be loaded simultaneously, with a comparison view highlighting differences in schema, statistics, and data quality between them.

## 2. Context & Constraints (Required)
**Background:**
Comparing staging vs. production, before vs. after transformations, or version N vs. N+1 is a critical data engineering workflow. Side-by-side comparison with automatic diff highlighting saves significant manual effort.

**Scope:**
- **In Scope:**
  - Two-file drop zone interface
  - Profile both files in parallel
  - Schema comparison: columns added, removed, type changed
  - Statistics comparison: delta for all metrics
  - Visual diff highlighting (green=improved, red=degraded, yellow=changed)
  - Comparison summary: total differences count
  - Export comparison report (HTML)

- **Out of Scope:**
  - More than 2 files
  - Automatic alignment of renamed columns
  - Row-level diff
  - Statistical significance testing
  - Trend analysis (3+ versions)

**Constraints:**
- Both files must fit in browser memory simultaneously
- Comparison should complete within 2x single-file profiling time
- Column matching is by exact name (case-sensitive)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Load two files for comparison**
Given the compare page
When a user drops two CSV files (or selects via picker)
Then both files are profiled in parallel
And progress is shown for each file
And comparison view appears when both complete

**Scenario: Schema comparison**
Given file A has columns [id, name, email] and file B has [id, name, phone]
When comparison completes
Then "email" is marked as "removed in B"
And "phone" is marked as "added in B"
And "id" and "name" are marked as "unchanged"

**Scenario: Statistics comparison**
Given column "revenue" exists in both files
And file A has mean=100, file B has mean=120
When comparison view displays
Then the mean row shows: A=100, B=120, delta=+20 (+20%)
And delta is color-coded (configurable threshold)

**Scenario: Quality metric comparison**
Given column "email" has completeness 95% in A and 80% in B
When comparison view displays
Then completeness shows degradation: -15%
And the cell is highlighted red (quality decreased)

**Scenario: Export comparison report**
Given a comparison has been completed
When user clicks "Export Comparison"
Then an HTML report downloads
And it contains side-by-side metrics for all columns
And differences are highlighted

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/pages/Compare.tsx` - Comparison page (create)
- `src/app/components/DualDropzone.tsx` - Two-file input (create)
- `src/app/components/ComparisonTable.tsx` - Diff table (create)
- `src/app/stores/comparisonStore.ts` - Comparison state (create)
- `src/wasm/src/export/comparison.rs` - Comparison export (create)

**Must NOT Change:**
- Single-file profiling flow
- Statistics computation
- Basic HTML export

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): create dual file dropzone for comparison mode
- feat(store): implement comparison state management
- feat(ui): build comparison table with diff highlighting
- feat(compare): add schema diff detection
- feat(export): create comparison html report
- test(compare): add comparison mode test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Parallel profiling works correctly
- [ ] Schema differences detected accurately
- [ ] Statistic deltas calculated correctly
- [ ] Color coding thresholds are sensible
- [ ] Comparison export includes all diffs
- [ ] Code reviewed

## 7. Resources
- Data drift concepts: https://evidentlyai.com/blog/data-drift-detection-large-datasets
- pandas-profiling comparison: https://pandas-profiling.ydata.ai/docs/master/pages/use_cases/comparing_datasets.html
