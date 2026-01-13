# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to confirm before clearing my profiling results
So that I don't accidentally lose my analysis

**Success Looks Like:**
Clicking the "Clear" button shows a confirmation dialog before destroying results, allowing users to cancel the action.

## 2. Context & Constraints (Required)
**Background:**
The Clear button immediately resets all profiling results with no warning. Users can accidentally lose their analysis with a single misclick, creating frustration and requiring them to re-upload and re-profile their data.

**Scope:**
- **In Scope:**
  - Add confirmation dialog/modal when Clear is clicked
  - Dialog text: "Clear all results? This cannot be undone."
  - Two buttons: "Cancel" (secondary) and "Clear" (danger)
  - Cancel returns to previous state
  - Clear proceeds with reset

- **Out of Scope:**
  - Undo functionality
  - Saving results before clearing
  - Auto-save feature

**Constraints:**
- Modal should match existing dark theme aesthetic
- Must be keyboard accessible (Escape to cancel, Enter to confirm)
- Focus should be trapped in modal when open

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Show confirmation dialog**
Given profiling results are displayed
When user clicks the "Clear" button
Then a confirmation dialog appears
And the dialog contains the text "Clear all results? This cannot be undone."
And the dialog has "Cancel" and "Clear" buttons

**Scenario: Cancel clears nothing**
Given the confirmation dialog is open
When user clicks "Cancel"
Then the dialog closes
And profiling results remain unchanged

**Scenario: Confirm clears results**
Given the confirmation dialog is open
When user clicks "Clear"
Then the dialog closes
And all profiling results are cleared
And the file dropzone is shown

**Scenario: Escape key cancels**
Given the confirmation dialog is open
When user presses Escape key
Then the dialog closes
And profiling results remain unchanged

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ProfileReport.tsx` - Add confirmation state and modal
- `src/app/components/ConfirmDialog.tsx` - Create reusable component (optional)

**Must NOT Change:**
- `src/app/stores/profileStore.ts` - reset logic stays the same
- Other components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add confirmation dialog before clearing results

## 6. Verification & Definition of Done (Required)
- [ ] Clicking Clear shows confirmation dialog
- [ ] Cancel dismisses dialog, preserves results
- [ ] Confirm clears results as before
- [ ] Escape key works to cancel
- [ ] Dialog matches dark theme
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- ProfileReport.tsx:108-112 - Current Clear button implementation
