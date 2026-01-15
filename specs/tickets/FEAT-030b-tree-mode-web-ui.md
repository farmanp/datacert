# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to visually explore and select columns from deeply nested JSON
So that I can profile only the fields I care about without causing OOM errors

**Success Looks Like:**
Users see an interactive tree visualization of their JSON structure, can search/filter paths, select up to 500 columns via checkboxes, and click "Profile Selected" to run profiling on just those columns.

## 2. Context & Constraints (Required)
**Background:**
This is the Web UI frontend for FEAT-030 Tree Mode. Depends on FEAT-030a (backend structure scan). Provides the visual column picker interface that prevents OOM by letting users select a subset of columns before profiling.

**Parent Ticket:** FEAT-030-tree-mode.md
**Dependency:** FEAT-030a-tree-mode-backend.md (must be completed first)

**Scope:**
- **In Scope:**
  - TreeProfileView component (expandable tree visualization)
  - Column selection checkboxes (max 500)
  - Search/filter by path name
  - Selection counter in header
  - Node click → show details panel
  - "Profile Selected" button (disabled until 1-500 selected)
  - Integration with existing profiler on selected columns
  - "Go to SQL Mode" after profiling (optional)
  - Auto-recommend Tree Mode when depth > 5 or cols > 1000

- **Out of Scope:**
  - Backend structure scan (FEAT-030a)
  - CLI implementation (FEAT-030c)
  - Export tree as JSON Schema (future)
  - Interactive TUI

**Constraints:**
- Use virtual scrolling for 1,000+ nodes
- Tree renders in < 1 second
- Max 500 columns selectable
- Must work on mobile (collapsible tree)
- Uses existing profiler on selected columns (no new profiling logic)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Auto-detect and recommend Tree Mode**
Given a JSON file with 50 levels deep
When file upload completes
Then structure scan runs automatically
And modal shows: "Tree Mode recommended (50 levels, 2,345 paths)"
And user can choose: "Use Tree Mode" or "Try Tabular Anyway"

**Scenario: Display tree structure**
Given structure scan returned 2,345 paths
When Tree Mode view loads
Then expandable tree is displayed
And all paths are shown with checkboxes
And search box is visible at top
And "Selected: 0 / 500" counter shows

**Scenario: Select columns**
Given tree view is displayed
When user clicks checkbox on `$.user.id`
And clicks checkbox on `$.user.name`
Then "Selected: 2 / 500" counter updates
And both nodes show visual selection (checkmark or highlight)
And "Profile Selected" button becomes enabled

**Scenario: Exceed selection limit**
Given user has 500 columns selected
When user tries to select another column
Then checkbox is disabled with tooltip: "Max 500 columns"
And selection count stays at 500

**Scenario: Search paths**
Given tree view with 2,345 paths
When user types "email" in search box
Then tree filters to show only paths containing "email"
And matching nodes are highlighted
And "Clear search" button appears

**Scenario: Profile selected columns**
Given user has selected 2 columns: `$.user.id`, `$.user.name`
When user clicks "Profile Selected"
Then loading indicator shows
And profiler runs ONLY on those 2 paths
And standard profile results view appears
And results show 2 columns (not 2,345)

**Scenario: View node details**
Given tree view is displayed
When user clicks on `$.user.preferences` node
Then detail panel appears on right
And shows: type, population %, depth, child count
And shows "Select This Path" button
And shows "Select All Children" button

**Scenario: SQL Mode after profiling**
Given profiling completed on selected columns
When user checks "Enable SQL Mode After" before profiling
Then after profiling completes, SQL Mode opens
And DuckDB table contains only selected columns

**Scenario: Virtual scrolling**
Given tree has 10,000 nodes
When user scrolls through tree
Then only visible nodes render (virtual scrolling)
And scroll remains smooth (60fps)

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/TreeProfileView.tsx` - NEW: Main tree component
- `src/app/components/TreeNode.tsx` - NEW: Individual tree node with checkbox
- `src/app/components/TreeNodeDetail.tsx` - NEW: Detail panel
- `src/app/pages/Home.tsx` - Add Tree Mode recommendation modal
- `src/app/stores/treeStore.ts` - NEW: Tree selection state
- `src/app/utils/tree-profiler.ts` - NEW: Profile selected columns logic
- `src/app/App.tsx` - Add tree mode route

**Must NOT Change:**
- Backend structure scan (FEAT-030a)
- Existing profiler core logic
- SQL Mode implementation

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add tree node component with selection checkbox
- feat(ui): implement expandable tree visualization
- feat(ui): add search/filter for tree paths
- feat(ui): create node detail panel
- feat(tree): integrate selected column profiling
- feat(ui): add tree mode recommendation modal
- feat(tree): add virtual scrolling for large trees
- test(tree): add tree view interaction tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Tree renders 10,000 nodes smoothly (virtual scroll)
- [ ] Selection limit enforced (max 500)
- [ ] Search/filter works correctly
- [ ] Profile selected integrates with existing profiler
- [ ] SQL Mode integration works
- [ ] Mobile responsive
- [ ] Code reviewed
- [ ] Component tests pass

## 7. Resources
- FEAT-030 parent spec: `specs/tickets/FEAT-030-tree-mode.md`
- FEAT-030a backend: `specs/tickets/FEAT-030a-tree-mode-backend.md`
- Tree libraries:
  - react-arborist: https://github.com/brimdata/react-arborist
  - react-virtualized-tree: https://github.com/diogofcunha/react-virtualized-tree
- Existing profiler: `src/app/stores/profileStore.ts`
