# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a user with low vision
I want sufficient color contrast on all text
So that I can read the interface content

**Success Looks Like:**
All text meets WCAG AA contrast requirements (4.5:1 for normal text, 7:1 for small text).

## 2. Context & Constraints (Required)
**Background:**
Several text colors in the app fail WCAG AA contrast ratios:
- `text-slate-400` on dark backgrounds (~4.5:1, marginal)
- `text-slate-500` on dark backgrounds (~3.5:1, fails)
- Small text using `text-[10px]` with low contrast is especially problematic

These issues affect readability for users with visual impairments.

**Scope:**
- **In Scope:**
  - Upgrade text-slate-500 to text-slate-400 or text-slate-300
  - Upgrade text-slate-400 to text-slate-300 for important text
  - Use text-slate-200 for small text (<12px)
  - Audit all components for contrast issues

- **Out of Scope:**
  - Redesigning color scheme
  - Adding high contrast mode

**Constraints:**
- Changes should be subtle to maintain visual design
- Must maintain visual hierarchy (primary vs secondary text)
- Target minimum 4.5:1 for normal, 7:1 for small

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Secondary text contrast**
Given text using slate-500 on slate-800 background
When measured for contrast ratio
Then it should be at least 4.5:1 (upgrade to slate-400 or slate-300)

**Scenario: Small text contrast**
Given text using text-[10px] or text-[11px]
When measured for contrast ratio
Then it should be at least 7:1 (use slate-200 or lighter)

**Scenario: Inactive button text**
Given inactive view toggle buttons in ProfileReport
When measured for contrast ratio
Then they meet 4.5:1 minimum

**Scenario: Label text contrast**
Given label text in ColumnCard stats
When measured for contrast ratio
Then it meets 4.5:1 minimum

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ColumnCard.tsx` - Upgrade text colors
- `src/app/components/ProfileReport.tsx` - Upgrade text colors
- `src/app/components/ResultsTable.tsx` - Upgrade text colors
- `src/app/components/FileDropzone.tsx` - Upgrade text colors
- `src/app/pages/Home.tsx` - Upgrade text colors

**Color upgrade mapping:**
- `text-slate-500` → `text-slate-400` (secondary text)
- `text-slate-400` → `text-slate-300` (important secondary)
- Small text (`text-[10px]`) → add `text-slate-200` or `text-slate-300`

**Must NOT Change:**
- Primary text colors (already using slate-100/200)
- Overall visual design hierarchy

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(a11y): improve color contrast for WCAG AA compliance

## 6. Verification & Definition of Done (Required)
- [ ] No text using slate-500 on dark backgrounds
- [ ] Small text uses slate-200 or lighter
- [ ] Lighthouse accessibility score improved
- [ ] Spot-checked with contrast checker tool
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- Contrast checker: https://webaim.org/resources/contrastchecker/
- WCAG 1.4.3 Contrast Minimum: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
