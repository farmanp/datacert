# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a security-conscious user
I want to see a clear visual confirmation that my data is staying local
So that I feel safe loading sensitive files

**Success Looks Like:**
A prominent "Local Processing: Data never leaves your device" badge or icon is always visible in the application interface.

## 2. Context & Constraints (Required)
**Background:**
Users often assume web apps upload their data. We need to explicitly counter this assumption to build trust, especially for the "skeptical engineer."

**Scope:**
- **In Scope:**
  - Create a "Privacy Badge" component.
  - Add it to the main application header or footer.
  - (Optional) Add a tooltip explaining "No network requests are made with your file data."

- **Out of Scope:**
  - A full "Security Whitepaper" page (just the UI element for now).

**Constraints:**
- Use a reassuring color (e.g., green or neutral/subtle).
- Do not clutter the main workspace.

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Badge Visibility**
Given the user is on any page of the app
When they look at the header/footer
Then they see a badge/icon indicating "Local Processing" or "Offline Ready"

**Scenario: Tooltip Explanation**
Given the user hovers over the privacy badge
When the tooltip appears
Then it reads "Your data is processed locally in your browser. It is never uploaded to any server."

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/Header.tsx` (or similar layout file).
- `src/app/App.tsx`.

**Must NOT Change:**
- Functional logic.

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add local processing privacy badge
- doc(ui): add tooltip for privacy explanation

## 6. Verification & Definition of Done (Required)
- [ ] Badge is visible on desktop and mobile.
- [ ] Tooltip works.
- [ ] Text is clear and concise.
