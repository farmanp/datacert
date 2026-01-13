# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a user
I want subtle, professional animations
So that the interface feels polished without being distracting

**Success Looks Like:**
Excessive animations (bounce, continuous pulse) are replaced with subtler alternatives.

## 2. Context & Constraints (Required)
**Background:**
Some animations in the app feel gimmicky or overused:
- FileDropzone uses `animate-bounce` on hover (too playful)
- Status indicators use continuous `animate-pulse` (distracting)

These should be toned down for a more professional feel.

**Scope:**
- **In Scope:**
  - Replace animate-bounce with subtle scale transform
  - Reduce or remove continuous pulse animations
  - Keep purposeful animations (loading spinners, transitions)

- **Out of Scope:**
  - Adding new animations
  - Animation performance optimization

**Constraints:**
- Loading spinner must remain
- Page transition animations should stay
- Changes should be subtle

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Hover animation toned down**
Given user hovers over the FileDropzone
When the hover state activates
Then the icon uses a subtle scale transform (1.1x) instead of bounce

**Scenario: Pulse animation reduced**
Given a status indicator is displayed
When viewed over time
Then it does not continuously pulse
Or it pulses once then stops

**Scenario: Loading animations preserved**
Given processing is in progress
When the spinner is displayed
Then it still uses animate-spin as expected

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/FileDropzone.tsx` - Line 165 (animate-bounce)
- `src/app/pages/Home.tsx` - Line 55, 71 (animate-pulse)
- `src/app/components/ProfileReport.tsx` - Line 71 (animate-pulse)

**Replacements:**
- `animate-bounce` → `hover:scale-110 transition-transform`
- `animate-pulse` → Remove or use single pulse on mount

**Must NOT Change:**
- Loading spinners (animate-spin)
- Page entrance animations (animate-in)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- style(ui): tone down excessive animations

## 6. Verification & Definition of Done (Required)
- [ ] No animate-bounce in codebase
- [ ] Pulse animations reduced or removed
- [ ] Loading spinners still work
- [ ] UI still feels responsive and polished
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- FileDropzone.tsx:165 - Bounce animation location
- Home.tsx:55, 71 - Pulse animation locations
