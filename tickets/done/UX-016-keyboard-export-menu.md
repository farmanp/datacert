# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a keyboard user
I want to navigate the export menu with keyboard
So that I can export reports without using a mouse

**Success Looks Like:**
Export dropdown menu supports Escape to close, arrow keys to navigate, and Enter to select.

## 2. Context & Constraints (Required)
**Background:**
The export dropdown menu can be opened with keyboard (Tab + Enter) but cannot be navigated with keyboard. Users must click menu items with mouse. This is an accessibility gap for keyboard-only users.

**Scope:**
- **In Scope:**
  - Escape key closes menu
  - Arrow Up/Down keys navigate between options
  - Enter key selects focused option
  - Focus trapped within menu when open
  - Focus returns to button when menu closes

- **Out of Scope:**
  - Type-ahead search
  - Menu repositioning on viewport edge

**Constraints:**
- Must not break mouse interaction
- Should follow WAI-ARIA menu button pattern

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Escape closes menu**
Given the export dropdown is open
When user presses Escape key
Then the menu closes
And focus returns to the Export button

**Scenario: Arrow navigation**
Given the export dropdown is open
When user presses Arrow Down
Then focus moves to the next menu item
And when at last item, focus wraps to first

**Scenario: Enter selects**
Given a menu item is focused
When user presses Enter
Then the corresponding export action is triggered
And the menu closes

**Scenario: Tab trapping**
Given the export dropdown is open
When user presses Tab
Then focus stays within the menu (trapped)
And does not escape to other page elements

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ProfileReport.tsx` - Lines 136-215 (export menu)

**Implementation approach:**
- Add onKeyDown handler to menu container
- Track focused item index
- Handle Escape, ArrowUp, ArrowDown, Enter
- Use useRef for menu item array

**Must NOT Change:**
- Export functionality
- Visual appearance

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(a11y): add keyboard navigation to export menu

## 6. Verification & Definition of Done (Required)
- [ ] Escape key closes menu
- [ ] Arrow keys navigate options
- [ ] Enter key triggers export
- [ ] Focus trapped in open menu
- [ ] Focus returns to button on close
- [ ] Mouse interaction still works
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- WAI-ARIA Menu Button: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- ProfileReport.tsx:136-215 - Current menu implementation
