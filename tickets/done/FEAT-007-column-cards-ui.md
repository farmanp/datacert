# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see detailed column information in rich card layouts
So that I can quickly scan and compare column characteristics visually

**Success Looks Like:**
Each column is represented by a card showing type, statistics, quality metrics, and a mini histogram, allowing quick visual scanning of the dataset.

## 2. Context & Constraints (Required)
**Background:**
While the results table (FEAT-004) provides a dense overview, card-based layouts offer better information hierarchy and visual scanning for detailed analysis. Cards are the standard view for column details in tools like pandas-profiling.

**Scope:**
- **In Scope:**
  - ColumnCard component with expandable sections
  - Header: column name, inferred type icon, quality badge
  - Statistics section: all computed stats in organized layout
  - Distribution section: mini histogram for numeric, top values for categorical
  - Quality section: completeness bar, uniqueness indicator, warnings
  - Toggle between card view and table view
  - Responsive grid layout (1-3 columns based on viewport)
  - Expand/collapse individual cards
  - Expand/collapse all cards

- **Out of Scope:**
  - Full histogram interaction (separate component)
  - Sample values display
  - Column editing/renaming
  - Column comparison selection

**Constraints:**
- Cards must render efficiently for 100+ columns
- Use virtualization if needed for very wide datasets
- Mini histogram should be < 100px wide
- Card design should work in both light theme (MVP only)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Display column card**
Given profiling has completed for a numeric column "revenue"
When viewing in card mode
Then a card displays with column name "revenue" and type icon (numeric)
And statistics show: count, missing, distinct, min, max, mean, median, std dev
And a mini histogram visualizes the distribution
And quality badge shows overall column health

**Scenario: Toggle between views**
Given the profile results page
When a user clicks the "Card View" toggle
Then the display switches from table to card grid
And clicking "Table View" switches back
And the user's preference persists during session

**Scenario: Expand card for details**
Given a column card in collapsed state
When a user clicks the expand button
Then the card expands to show all statistics and larger histogram
And clicking collapse returns to compact view

**Scenario: Responsive grid**
Given a viewport width of 1200px
When viewing column cards
Then cards display in a 3-column grid
And on 800px viewport, cards display in 2-column grid
And on 500px viewport, cards display in single column

**Scenario: Quality warning display**
Given a column with potential PII detected
When viewing the column card
Then a warning badge/icon is visible on the card
And hovering shows the warning message
And the warning is visually prominent (color-coded)

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ColumnCard.tsx` - Main card component (create)
- `src/app/components/MiniHistogram.tsx` - Small histogram component (create)
- `src/app/components/StatsList.tsx` - Statistics list display (create)
- `src/app/components/ViewToggle.tsx` - Table/card toggle (create)
- `src/app/pages/Profile.tsx` - Add view toggle and card grid

**Must NOT Change:**
- ResultsTable component
- Profile store structure
- WASM modules

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): create column card component with expandable sections
- feat(ui): add mini histogram component for cards
- feat(ui): create view toggle for table/card switching
- feat(ui): implement responsive card grid layout
- test(ui): add column card component tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Cards render correctly in Chrome, Firefox, Safari
- [ ] Performance: 100 cards render < 500ms
- [ ] Responsive breakpoints work correctly
- [ ] Accessibility: cards navigable via keyboard
- [ ] Unit tests for card state management
- [ ] Code reviewed

## 7. Resources
- SolidJS Show/For components: https://www.solidjs.com/docs/latest/api
- Tailwind grid: https://tailwindcss.com/docs/grid-template-columns
- pandas-profiling card reference: https://pandas-profiling.ydata.ai/docs/master/
