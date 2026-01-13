# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to drag-and-drop or click to select a data file
So that I can start profiling with minimal friction

**Success Looks Like:**
A visually clear drop zone accepts files via drag-and-drop or click-to-browse, validates file types, and initiates processing with immediate visual feedback.

## 2. Context & Constraints (Required)
**Background:**
The file input is the primary entry point to the application. It must be immediately obvious how to use it, provide clear feedback during interaction, and gracefully handle edge cases (wrong file types, multiple files).

**Scope:**
- **In Scope:**
  - Drag-and-drop zone with visual hover states
  - Click-to-browse file picker
  - File type validation (CSV, TSV, JSON, JSONL for MVP)
  - File size display
  - Visual feedback: idle, hover, processing, error states
  - Single file acceptance (multi-file is out of scope)
  - Integration with fileStore for state management
  - Keyboard accessibility (Enter/Space to open picker)

- **Out of Scope:**
  - Directory upload
  - URL input for remote files
  - Paste from clipboard
  - Recent files list (Phase 2)

**Constraints:**
- Must work without JavaScript for basic functionality (progressive enhancement)
- Must be accessible (ARIA labels, keyboard navigation)
- Must work on mobile (touch-friendly tap target)
- Visual design should follow Tailwind utility patterns

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Drag and drop valid file**
Given the application is on the home page
When a user drags a .csv file over the drop zone
Then the drop zone shows a highlighted "drop here" state
And when dropped, the file name and size are displayed
And processing begins automatically

**Scenario: Click to browse**
Given the application is on the home page
When a user clicks the drop zone
Then the native file picker opens
And only supported file types are selectable (.csv, .tsv, .json, .jsonl)

**Scenario: Invalid file type**
Given the application is on the home page
When a user drops an unsupported file (e.g., .pdf)
Then an error message displays "Unsupported file type. Please use CSV, TSV, JSON, or JSONL."
And the drop zone returns to idle state

**Scenario: Keyboard accessibility**
Given a user is navigating with keyboard
When they tab to the drop zone and press Enter
Then the file picker opens
And focus is managed correctly after selection

**Scenario: Processing state**
Given a file has been dropped
When parsing is in progress
Then the drop zone shows a progress indicator
And displays "Processing [filename]... X%"
And the drop zone is disabled until complete

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/FileDropzone.tsx` - Main component (create)
- `src/app/stores/fileStore.ts` - File state management (create)
- `src/app/pages/Home.tsx` - Integrate dropzone
- `src/app/index.css` - Any custom styles needed

**Must NOT Change:**
- WASM modules
- Worker files
- App routing configuration

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): create file dropzone component with drag-and-drop
- feat(store): implement file state management store
- feat(ui): add file type validation and error states
- feat(ui): add progress indicator during processing
- test(ui): add file dropzone component tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Component renders correctly in Chrome, Firefox, Safari
- [ ] Accessibility audit passes (axe-core)
- [ ] Mobile touch interaction works on iOS/Android
- [ ] Unit tests for state transitions
- [ ] Code reviewed

## 7. Resources
- HTML Drag and Drop API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
- SolidJS createSignal/createStore: https://www.solidjs.com/docs/latest/api
- Tailwind drop zone examples: https://tailwindui.com/components/application-ui/forms/form-layouts
