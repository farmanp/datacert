# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a mobile user
I want to view profiling results without awkward horizontal scrolling
So that I can analyze data on my phone effectively

**Success Looks Like:**
The results table adapts to mobile screens by hiding non-essential columns and providing a way to access hidden data.

## 2. Context & Constraints (Required)
**Background:**
The ResultsTable has 8 columns, requiring horizontal scroll on mobile devices. This creates a poor UX where users can't see all data and must scroll side-to-side repeatedly. Mobile users represent a significant portion of data consumers reviewing profiling results.

**Scope:**
- **In Scope:**
  - Hide non-essential columns on small screens (<768px)
  - Keep essential: Name, Type, Count, Missing%, Distribution
  - Hide on mobile: Distinct, Mean, Median
  - Add responsive column visibility with Tailwind breakpoints
  - Alternatively: Show message suggesting Card view on mobile

- **Out of Scope:**
  - Complete table redesign
  - Swipeable column reveal
  - Pinned columns feature

**Constraints:**
- Use Tailwind responsive classes (hidden md:table-cell)
- Must not break print styles
- Card view already works well on mobile (fallback option)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Hide columns on mobile**
Given the user is on a mobile device (screen width < 768px)
When viewing the ResultsTable
Then the Distinct, Mean, and Median columns are hidden
And Name, Type, Count, Missing%, and Distribution columns remain visible

**Scenario: Show all columns on desktop**
Given the user is on a desktop (screen width >= 768px)
When viewing the ResultsTable
Then all 8 columns are visible

**Scenario: No horizontal scroll needed on mobile**
Given the user is on a mobile device
When viewing the ResultsTable
Then no horizontal scrolling is required to see visible columns

**Scenario: Card view suggestion (optional approach)**
Given the user is on a mobile device
When viewing Table mode
Then a subtle message suggests "Switch to Card view for better mobile experience"

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ResultsTable.tsx` - Add responsive visibility classes

**Must NOT Change:**
- Table structure or data
- Sorting functionality
- Print styles

**Implementation Approach:**
Add `hidden md:table-cell` to th and td for columns to hide on mobile:
- Distinct column (index 4)
- Mean column (index 5)
- Median column (index 6)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): hide non-essential table columns on mobile

## 6. Verification & Definition of Done (Required)
- [ ] Distinct, Mean, Median columns hidden on mobile (<768px)
- [ ] All columns visible on desktop (>=768px)
- [ ] No horizontal scroll required on mobile
- [ ] Table still functional with sorting
- [ ] Print view unaffected
- [ ] Verified on iOS Safari and Chrome Android
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- ResultsTable.tsx - Column definitions lines 73-106
- Tailwind responsive classes: hidden, md:table-cell
