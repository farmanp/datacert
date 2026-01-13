# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see profiling results in a clear, scannable table
So that I can quickly identify data quality issues and column characteristics

**Success Looks Like:**
A responsive table displays all columns with their key metrics (type, count, missing, distinct, min, max, mean) with visual indicators for data quality.

## 2. Context & Constraints (Required)
**Background:**
The results table is the primary output view for MVP. It must present complex statistical data in an accessible format, support tables with many columns (50+), and provide visual cues for data quality issues.

**Scope:**
- **In Scope:**
  - Tabular display of column profiles
  - Columns: Name, Type, Count, Missing, Missing %, Distinct, Min, Max, Mean
  - Visual indicators: type icons, missing % color coding (green/yellow/red)
  - Sortable columns (click header to sort)
  - Sticky header for scrolling
  - Responsive: horizontal scroll on narrow viewports
  - Row hover highlighting
  - Integration with profileStore

- **Out of Scope:**
  - Column detail drill-down (separate ticket)
  - Histograms/charts (separate ticket)
  - Export functionality (separate ticket)
  - Filtering columns
  - Column grouping

**Constraints:**
- Must handle 100+ columns without performance degradation
- Must be readable on 1280px viewport without horizontal scroll for 10 columns
- Numeric values should be formatted appropriately (2 decimal places, thousands separators)
- Missing % should use consistent color thresholds: <5% green, 5-20% yellow, >20% red

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Display basic profile results**
Given profiling has completed for a CSV with 5 columns
When the results page loads
Then a table displays all 5 columns with their metrics
And each row shows: name, inferred type, count, missing count, missing %, distinct, min, max, mean

**Scenario: Sort by column**
Given the results table is displayed
When a user clicks the "Missing %" header
Then rows are sorted by missing percentage descending
And clicking again sorts ascending
And a sort indicator shows current sort direction

**Scenario: Visual quality indicators**
Given a column has 25% missing values
When the results table displays
Then the missing % cell has a red background/text color
And a column with 3% missing has green indicator
And a column with 10% missing has yellow indicator

**Scenario: Handle many columns**
Given a CSV with 100 columns has been profiled
When the results table displays
Then all 100 rows render without UI lag
And the table is scrollable with sticky header
And initial render completes in < 500ms

**Scenario: Numeric formatting**
Given a column with mean=12345.6789 and max=9999999
When displayed in the table
Then mean shows as "12,345.68"
And max shows as "9,999,999"

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ProfileReport.tsx` - Main results container (create)
- `src/app/components/ResultsTable.tsx` - Table component (create)
- `src/app/components/QualityBadge.tsx` - Quality indicator component (create)
- `src/app/stores/profileStore.ts` - Profile state management (create)
- `src/app/pages/Profile.tsx` - Profile results page

**Must NOT Change:**
- WASM modules
- Parser implementation
- File dropzone component

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): create results table component with sortable columns
- feat(ui): add quality badge component with color indicators
- feat(store): implement profile state management store
- feat(ui): add numeric formatting utilities
- test(ui): add results table component tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Renders correctly in Chrome, Firefox, Safari
- [ ] Performance: 100 columns render < 500ms
- [ ] Accessibility: table has proper ARIA attributes
- [ ] Unit tests for sorting logic and formatting
- [ ] Code reviewed

## 7. Resources
- HTML table accessibility: https://www.w3.org/WAI/tutorials/tables/
- Intl.NumberFormat for formatting: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- SolidJS For component for lists: https://www.solidjs.com/docs/latest/api#for
