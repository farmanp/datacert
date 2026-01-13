# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a keyboard/screen reader user
I want interactive elements to have proper ARIA states
So that I understand the state of expandable sections, menus, and sortable tables

**Success Looks Like:**
Expandable cards have aria-expanded, dropdown menus have proper roles, and sortable table headers have aria-sort attributes.

## 2. Context & Constraints (Required)
**Background:**
Several interactive patterns lack ARIA state attributes:
- ColumnCard "Deep Dive" button doesn't indicate expanded/collapsed state
- Export dropdown menu lacks aria-haspopup and role attributes
- ResultsTable sortable headers don't indicate current sort direction

These gaps make the interface unpredictable for assistive technology users.

**Scope:**
- **In Scope:**
  - ColumnCard: Add aria-expanded to Deep Dive button
  - ProfileReport: Add aria-haspopup="menu" and aria-expanded to export button
  - ProfileReport: Add role="menu" to dropdown, role="menuitem" to items
  - ResultsTable: Add aria-sort to sortable headers
  - ResultsTable: Add <caption> element describing table

- **Out of Scope:**
  - Full ARIA grid pattern for table
  - Live region announcements

**Constraints:**
- Must not change visual appearance
- Must maintain existing functionality

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: ColumnCard expanded state**
Given a ColumnCard is displayed
When the Deep Dive button is inspected
Then it has aria-expanded="false" when collapsed
And aria-expanded="true" when expanded

**Scenario: Export menu button attributes**
Given the ProfileReport is displayed
When the Export button is inspected
Then it has aria-haspopup="menu"
And aria-expanded="false" when closed
And aria-expanded="true" when open

**Scenario: Export menu role**
Given the export dropdown is open
When the menu container is inspected
Then it has role="menu"
And each option has role="menuitem"

**Scenario: Table sort state**
Given the ResultsTable is displayed
When a column header is sorted ascending
Then it has aria-sort="ascending"

**Scenario: Table caption**
Given the ResultsTable is displayed
When the table structure is inspected
Then it has a <caption> element with text like "Column profiling statistics"

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ColumnCard.tsx` - Add aria-expanded to button
- `src/app/components/ProfileReport.tsx` - Add aria-haspopup, aria-expanded, roles
- `src/app/components/ResultsTable.tsx` - Add aria-sort, caption

**Must NOT Change:**
- Existing event handlers
- Visual styling

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(a11y): add aria-expanded to expandable components
- feat(a11y): add aria roles to export dropdown menu
- feat(a11y): add aria-sort to table headers

## 6. Verification & Definition of Done (Required)
- [ ] ColumnCard button has aria-expanded
- [ ] Export button has aria-haspopup and aria-expanded
- [ ] Export menu has role="menu"
- [ ] Table headers have aria-sort
- [ ] Table has caption element
- [ ] Tested with screen reader
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- Disclosure pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- Menu button pattern: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
