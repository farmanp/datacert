# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a user
I want clear visual feedback when I drag a file over the dropzone
So that I know the app is ready to receive my file and which file types are accepted

**Success Looks Like:**
The dropzone changes color/style distinctly when a file is dragged over it. If an invalid file is dragged (if detectable), it indicates error.

## 2. Context & Constraints (Required)
**Background:**
The current dropzone might be too static. We need to make it feel "alive" and responsive to the user's intent.

**Scope:**
- **In Scope:**
  - Enhance `onDragEnter` and `onDragLeave` visual styles (e.g., border highlight, background color change).
  - Add text "Drop CSV file here" that pops up or highlights during drag.
  - Show a clear error if the file extension is not `.csv` (if feasible to detect before drop, otherwise immediately after).

- **Out of Scope:**
  - Complex file parsing logic changes.

**Constraints:**
- Must use Tailwind classes.
- Must be accessible (high contrast).

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Dragging a file**
Given the user drags a file into the browser window
When the cursor enters the dropzone area
Then the dropzone border becomes solid and highlighted (e.g., blue or green)
And the background color changes slightly to indicate active state

**Scenario: Dropping a file**
Given the user drops the file
When the drop event fires
Then the highlight reverts or changes to a "processing" state

**Scenario: Invalid file type**
Given the user drops a `.jpg` file
When the app processes the drop
Then an error message "Only CSV files are currently supported" appears immediately

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/Dropzone.tsx` (or equivalent).

**Must NOT Change:**
- Core logic.

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): enhance dropzone visual feedback
- feat(ui): add file type validation error message

## 6. Verification & Definition of Done (Required)
- [ ] distinct style for "idle" vs "drag-over".
- [ ] Error message for non-CSV files.
