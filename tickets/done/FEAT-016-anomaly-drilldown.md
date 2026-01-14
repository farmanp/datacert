# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to drill down into specific rows that triggered quality warnings
So that I can investigate and fix data issues instead of just knowing they exist

**Success Looks Like:**
Clicking on any quality metric (e.g., "5% invalid emails") filters/displays the actual rows that failed validation, enabling direct investigation and debugging.

## 2. Context & Constraints (Required)
**Background:**
Currently DataLens shows aggregate statistics ("5% null", "3% invalid format") but doesn't let users see which specific rows caused the issues. This is a "black box" trust problem - veteran engineers want to see the evidence, not just the verdict. They need to:
1. Verify the detection is correct
2. Understand the pattern of failures
3. Write fixes (regex, transformations) based on actual examples

**Scope:**
- **In Scope:**
  - "View failing rows" action on quality warnings
  - Filtered table view showing only problematic rows
  - Support for: missing values, PII detection, format violations, outliers
  - Row count and percentage in filtered view
  - Export filtered rows as CSV
  - Pagination for large result sets (show first 100, load more)
  - Highlight the specific column/cell that triggered the warning

- **Out of Scope:**
  - Inline editing of data
  - Auto-fix suggestions
  - Saving filtered views
  - Complex multi-column filtering

**Constraints:**
- Must work with streaming architecture (can't load entire file)
- For large files, may need to re-scan or maintain row indices during initial parse
- Memory budget: storing row indices for up to 10% of rows per warning type
- UI must clearly indicate when showing a sample vs. all failing rows

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Drill down to null values**
Given a column "email" shows "5% missing (2,500 rows)"
When the user clicks on the missing value indicator
Then a modal/panel displays the rows where email is null
And the row numbers are shown
And the user can scroll through all 2,500 rows (paginated)

**Scenario: Drill down to PII warnings**
Given a column "notes" is flagged "Potential PII: SSN patterns detected (150 rows)"
When the user clicks on the PII warning
Then the filtered view shows the 150 rows containing SSN patterns
And the matched pattern is highlighted in the cell

**Scenario: Drill down to outliers**
Given a numeric column shows "23 outliers detected (>3σ from mean)"
When the user clicks on the outlier indicator
Then the filtered view shows those 23 rows
And the outlier values are visually highlighted

**Scenario: Export failing rows**
Given the user is viewing filtered "invalid email format" rows
When the user clicks "Export as CSV"
Then a CSV file downloads containing only the failing rows
And includes row numbers from the original file

**Scenario: Large file handling**
Given a 500MB file with 10% null values in a column
When the user clicks to view null rows
Then the UI shows "Showing first 100 of ~50,000 rows"
And provides "Load more" pagination
And indicates if showing sample vs. complete list

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/QualityBadge.tsx` - Add click handler
- `src/app/components/AnomalyDrilldown.tsx` - New component (create)
- `src/app/components/FilteredRowsTable.tsx` - New component (create)
- `src/app/stores/drilldownStore.ts` - State for filtered view (create)
- `src/wasm/src/quality/` - Add row index tracking
- `src/wasm/src/lib.rs` - Add exports for row retrieval

**Must NOT Change:**
- Core profiling flow
- Main statistics computation
- Export report format (HTML/JSON)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(quality): track row indices for quality warnings during parse
- feat(ui): create anomaly drilldown modal component
- feat(ui): create filtered rows table with pagination
- feat(store): add drilldown state management
- feat(export): enable csv export of filtered rows
- test(drilldown): add anomaly drilldown test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Clicking any quality warning opens drilldown view
- [ ] Pagination works for large result sets
- [ ] Export produces valid CSV with row numbers
- [ ] Memory usage acceptable for 10% failure rate on 500MB file
- [ ] UI clearly indicates sample vs. complete results
- [ ] Code reviewed

## 7. Resources
- Similar feature: pandas-profiling "Warnings" with sample rows
- Great Expectations: shows failing rows in validation results
- UI pattern: Modal with virtualized table for large datasets
