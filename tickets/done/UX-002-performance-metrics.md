# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a skeptical user
I want to see exactly how fast the profiling was (MB processed per second)
So that I can verify the performance claims and trust the tool

**Success Looks Like:**
After a file is processed, a small badge or text appears (e.g., in the header or summary) saying "Processed 150MB in 1.2s".

## 2. Context & Constraints (Required)
**Background:**
One of our key value props is speed. Users need to *see* this speed quantified to believe it. This is a powerful "trust signal."

**Scope:**
- **In Scope:**
  - Capture `startTime` and `endTime` in the Web Worker (or around the Wasm call).
  - Calculate file size in MB.
  - Calculate duration in seconds.
  - Return these metrics with the profile results.
  - Display them in the UI (likely near the file name or "Profile Results" header).

- **Out of Scope:**
  - Storing these metrics historically (for now).
  - Detailed breakdown of parsing vs. stats time.

**Constraints:**
- Must be unobtrusive but visible.
- Use metric units (MB, seconds).

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Successful Profile**
Given a 50MB CSV file is dropped
When the profiling completes
Then a message "Processed 50.0MB in 0.52s" is displayed
And it is located near the report header

**Scenario: Fast processing**
Given a small file (processed < 0.1s)
When results display
Then the time is shown with appropriate precision (e.g., "0.05s" or "45ms")

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/services/worker.ts` - To capture timing.
- `src/app/types.ts` - To add `performanceMetrics` to the result type.
- `src/app/components/` - To display the metrics.

**Must NOT Change:**
- The Wasm calculation logic itself (just wrap the call).

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(metrics): capture profiling duration and file size
- feat(ui): display performance metrics in result header

## 6. Verification & Definition of Done (Required)
- [ ] Timing is accurate (roughly matches wall clock).
- [ ] Display handles large and small numbers gracefully.
- [ ] "MB" and "s" units are correct.
