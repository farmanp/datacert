# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a keyboard user
I want visible focus indicators on all interactive elements
So that I can see where I am when navigating the interface

**Success Looks Like:**
All buttons, sortable headers, and interactive elements have consistent, visible focus rings using focus-visible styling.

## 2. Context & Constraints (Required)
**Background:**
Focus indicators are inconsistent across components. FileDropzone has good focus styling, but several buttons and interactive elements lack visible focus states:
- ColumnCard "Deep Dive" button
- ResultsTable sortable headers
- ProfileReport view toggle buttons

This violates WCAG 2.4.7 Focus Visible.

**Scope:**
- **In Scope:**
  - Add focus-visible:ring-2 styling to missing elements
  - Use consistent ring color (blue-500)
  - Use ring-offset on dark backgrounds
  - Ensure all buttons have focus states

- **Out of Scope:**
  - Custom focus indicator designs
  - Focus order changes

**Constraints:**
- Use focus-visible (not focus) to avoid showing on mouse clicks
- Ring offset should account for dark backgrounds
- Must match existing focus patterns (FileDropzone reference)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: ColumnCard button focus**
Given a user is navigating with Tab key
When focus reaches the "Deep Dive" button
Then a visible blue ring appears around the button

**Scenario: Table header focus**
Given a user is navigating with Tab key
When focus reaches a sortable column header
Then a visible blue ring appears around the header

**Scenario: View toggle focus**
Given a user is navigating with Tab key
When focus reaches the Table/Card view toggle buttons
Then a visible blue ring appears around the focused button

**Scenario: Mouse click no ring**
Given a user clicks a button with mouse
When the button receives focus
Then no focus ring appears (focus-visible behavior)

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ColumnCard.tsx` - Line 116 (Deep Dive button)
- `src/app/components/ResultsTable.tsx` - Lines 73-106 (header buttons)
- `src/app/components/ProfileReport.tsx` - Lines 82-102 (view toggles)

**Pattern to apply:**
```
focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
```

**Must NOT Change:**
- Existing focus behavior on FileDropzone (reference)
- Visual appearance otherwise

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(a11y): add consistent focus rings to interactive elements

## 6. Verification & Definition of Done (Required)
- [ ] ColumnCard button shows focus ring on Tab
- [ ] ResultsTable headers show focus ring on Tab
- [ ] ProfileReport toggles show focus ring on Tab
- [ ] No focus ring on mouse click (focus-visible)
- [ ] Ring colors consistent with FileDropzone
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- FileDropzone.tsx:202 - Reference implementation
- WCAG 2.4.7 Focus Visible: https://www.w3.org/WAI/WCAG21/Understanding/focus-visible
