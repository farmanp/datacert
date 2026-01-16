# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a curious user without a CSV handy
I want to click a "Try with Sample Data" button
So that I can see what the tool can do immediately

**Success Looks Like:**
A button near the dropzone loads the `public/samples/demo-data.csv` file and triggers the profiling process as if the user had dropped it.

## 2. Context & Constraints (Required)
**Background:**
Eliminating the friction of "finding a file" is huge for conversion.

**Scope:**
- **In Scope:**
  - Add "Try with Sample Data" button/link below the dropzone.
  - Implement a handler to `fetch('/samples/demo-data.csv')`.
  - Pass the fetched content to the profiling engine.

- **Out of Scope:**
  - Multiple sample files (just one for now).

**Constraints:**
- Error handling if the sample fetch fails.

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Click Sample Data**
Given the user is on the home page
When they click "Try with Sample Data"
Then the app fetches the demo CSV
And immediately starts profiling it
And the results are displayed

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/pages/Home.tsx` (or where the dropzone is).
- `src/app/services/` (if a helper is needed).

**Must NOT Change:**
- Wasm logic.

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add try with sample data button
- feat(logic): implement fetch and profile sample workflow

## 6. Verification & Definition of Done (Required)
- [ ] Button works.
- [ ] Profiling triggers correctly.
