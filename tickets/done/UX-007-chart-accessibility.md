# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a screen reader user
I want charts and badges to have accessible alternatives
So that I can understand data distributions and quality indicators

**Success Looks Like:**
Canvas charts have aria-labels describing the data, QualityBadge includes text labels, and decorative SVGs are hidden from assistive technology.

## 2. Context & Constraints (Required)
**Background:**
Currently, Histogram and MiniHistogram canvas elements provide no accessible content - screen reader users get nothing. QualityBadge relies solely on color to convey severity (green/amber/red), violating WCAG 1.4.1. These gaps exclude users with visual impairments from understanding key data.

**Scope:**
- **In Scope:**
  - Add aria-label to Histogram canvas describing distribution
  - Add aria-label to MiniHistogram canvas
  - Add text labels to QualityBadge (Excellent/Warning/Critical)
  - Add aria-hidden="true" to decorative SVG icons
  - Add screen-reader-only data table alternative (optional)

- **Out of Scope:**
  - Complete sonification of chart data
  - Alternative chart rendering modes

**Constraints:**
- Must not affect visual appearance
- Screen-reader text should be concise but informative
- Use existing Tailwind sr-only class for hidden text

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Histogram aria-label**
Given a histogram is rendered with bin data
When a screen reader accesses the element
Then it reads an aria-label like "Distribution chart with 10 bins, range 0 to 100, peak at 40-50"

**Scenario: MiniHistogram aria-label**
Given a mini histogram is rendered
When a screen reader accesses the element
Then it reads a brief aria-label like "Distribution preview"

**Scenario: QualityBadge text labels**
Given a QualityBadge displays 5% missing
When a screen reader accesses the badge
Then it reads "Excellent: 5% missing" (not just "5% missing")

**Scenario: QualityBadge warning state**
Given a QualityBadge displays 15% missing
When a screen reader accesses the badge
Then it reads "Warning: 15% missing"

**Scenario: Decorative SVGs hidden**
Given decorative icon SVGs are in the DOM
When a screen reader traverses the page
Then the decorative icons are skipped (aria-hidden="true")

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/Histogram.tsx` - Add aria-label to canvas
- `src/app/components/MiniHistogram.tsx` - Add aria-label to canvas
- `src/app/components/QualityBadge.tsx` - Add text status labels
- `src/app/components/FileDropzone.tsx` - Add aria-hidden to decorative SVGs
- `src/app/components/ProfileReport.tsx` - Add aria-hidden to decorative SVGs
- `src/app/components/ColumnCard.tsx` - Add aria-hidden to decorative SVGs

**Must NOT Change:**
- Canvas rendering logic
- Visual appearance

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(a11y): add aria-labels to histogram charts
- feat(a11y): add text status labels to QualityBadge
- feat(a11y): add aria-hidden to decorative SVG icons

## 6. Verification & Definition of Done (Required)
- [ ] Histogram has descriptive aria-label
- [ ] MiniHistogram has aria-label
- [ ] QualityBadge shows Excellent/Warning/Critical text
- [ ] Decorative SVGs have aria-hidden="true"
- [ ] Tested with VoiceOver (Mac) or NVDA (Windows)
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- WCAG 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG21/Understanding/use-of-color
- WCAG 1.1.1 Non-text Content: https://www.w3.org/WAI/WCAG21/Understanding/non-text-content
