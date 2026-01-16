# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a new user
I want to see a clear loading indicator while the analysis engine initializes
So that I know the application is working and not frozen

**Success Looks Like:**
When the application starts, a "Initializing Engine..." spinner is visible until the Wasm module is fully loaded and ready to accept files.

## 2. Context & Constraints (Required)
**Background:**
The Rust/Wasm engine takes a moment to load and initialize (`init()`). Currently, there might be a brief period where the UI is unresponsive or appears "blank" regarding the engine status. This can cause anxiety for new users who might think the app is broken.

**Scope:**
- **In Scope:**
  - Add a global `isEngineReady` state to the store.
  - Display a full-screen or prominent spinner overlay during initialization.
  - Handle initialization errors with a friendly "Failed to load engine" message.
  - Ensure the file dropzone is disabled until the engine is ready.

- **Out of Scope:**
  - Detailed progress bars for the Wasm download (just a simple spinner is enough for now).
  - changing the underlying Wasm initialization logic itself.

**Constraints:**
- Must match existing Tailwind styling.
- Must not block the UI thread (animation should run smoothly).

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Initial Load**
Given the user visits the application
When the Wasm module is downloading or initializing
Then a loading spinner is visible
And the text "Initializing Data Engine..." is displayed
And the file dropzone is disabled

**Scenario: Engine Ready**
Given the Wasm module has finished initializing
When the `init()` promise resolves
Then the loading spinner disappears
And the file dropzone becomes enabled/interactive

**Scenario: Initialization Failure**
Given the Wasm module fails to load (e.g., network error)
When the `init()` promise rejects
Then an error message is displayed: "Failed to initialize the analysis engine. Please reload."
And the loading spinner stops

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/App.tsx` - To add the loading overlay.
- `src/app/stores/` - To add `isEngineReady` state (if not already present).
- `src/app/services/worker.ts` - To potentially expose initialization status better.

**Must NOT Change:**
- The actual Wasm binary or Rust code.

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ux): add wasm initialization loading spinner
- feat(store): add engine ready state
- style(ui): design loading overlay

## 6. Verification & Definition of Done (Required)
- [ ] Spinner appears on refresh.
- [ ] Spinner disappears when app is ready.
- [ ] Dropzone is disabled during loading.
- [ ] Error state works (can simulate by blocking network request for wasm).
