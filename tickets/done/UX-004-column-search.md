# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer working with large datasets
I want to search and filter columns by name
So that I can quickly find specific columns without scrolling

**Success Looks Like:**
A search input above the results allows real-time filtering of columns by name, with a count showing "X of Y columns" and a clear button.

## 2. Context & Constraints (Required)
**Background:**
Datasets with 50+ columns are common in data engineering. Currently, users must scroll through all columns or use browser Ctrl+F to find specific columns. A native search/filter feature would significantly improve productivity.

**Scope:**
- **In Scope:**
  - Add search input above results section
  - Real-time filtering as user types
  - Case-insensitive search
  - Show "Showing X of Y columns" count
  - Clear search button (X icon)
  - Works in both Table and Card views
  - Persist search when switching views
  - Show "No columns match" message when no results

- **Out of Scope:**
  - Advanced filtering (by type, by missing %, etc.)
  - Saved searches
  - Regex support
  - Column selection/multi-select

**Constraints:**
- Must not impact initial render performance
- Search should be debounced (150-200ms)
- Must maintain sort order in table view while filtering

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Basic search functionality**
Given profiling results are displayed with 10 columns
When user types "name" in the search input
Then only columns containing "name" in their name are shown
And the count displays "Showing 2 of 10 columns" (example)

**Scenario: Case insensitive search**
Given columns include "UserName" and "user_id"
When user types "user"
Then both columns are shown in results

**Scenario: Clear search**
Given a search filter is active
When user clicks the clear (X) button
Then search input is cleared
And all columns are displayed again

**Scenario: No results message**
Given profiling results are displayed
When user searches for a term with no matches
Then a message displays "No columns match your search"
And the results area shows empty state

**Scenario: Search persists across view toggle**
Given user has an active search filter
When user switches from Table to Card view (or vice versa)
Then the search term remains in the input
And filtered results still apply

**Scenario: Search input appearance**
Given the profile report is displayed
Then search input appears above the results
And has placeholder text "Search columns..."
And has a search icon on the left
And has a clear (X) button when text is entered

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ProfileReport.tsx` - Add search state and input
- `src/app/stores/profileStore.ts` - Add searchQuery state (optional, could be local)

**Must NOT Change:**
- `src/app/components/ResultsTable.tsx` - Pass filtered data via props
- `src/app/components/ColumnCard.tsx` - No changes needed

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add column search and filter functionality

## 6. Verification & Definition of Done (Required)
- [ ] Search input renders above results
- [ ] Typing filters columns in real-time
- [ ] Case insensitive matching works
- [ ] Clear button resets filter
- [ ] "No results" message displays appropriately
- [ ] Works in both Table and Card views
- [ ] Search persists when switching views
- [ ] No performance degradation with 100+ columns
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- ProfileReport.tsx - Insert search above line 255 (results display)
- Similar pattern: Tailwind search input with icon
