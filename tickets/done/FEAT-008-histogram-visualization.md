# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to see interactive histograms for numeric columns
So that I can understand the distribution shape and identify anomalies

**Success Looks Like:**
Numeric columns display beautiful, interactive histograms with hover tooltips, zoomable axes, and clear bin labeling.

## 2. Context & Constraints (Required)
**Background:**
Distribution visualization is essential for data understanding. Histograms reveal patterns (normal, skewed, bimodal), outliers, and data quality issues that statistics alone cannot communicate effectively.

**Scope:**
- **In Scope:**
  - Full-size histogram component for expanded column view
  - Mini histogram component for column cards (simplified, non-interactive)
  - Automatic bin count selection (Sturges' or Freedman-Diaconis rule)
  - Hover tooltips showing bin range and count
  - Axis labels with appropriate number formatting
  - Responsive sizing (fill container)
  - Canvas-based rendering for performance
  - Support for both integer and float distributions

- **Out of Scope:**
  - User-adjustable bin count
  - Log scale option
  - Overlay multiple distributions
  - Box plot alternative view
  - Export histogram as image

**Constraints:**
- Use Canvas API (not SVG) for performance with large bin counts
- Avoid heavy charting libraries (no Chart.js, D3 for MVP)
- Mini histogram must render in < 10ms
- Full histogram must handle 100+ bins smoothly
- Colors should be accessible (colorblind-friendly)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Render histogram for numeric column**
Given a numeric column with computed histogram data
When the histogram component renders
Then bars are drawn proportionally to bin counts
And x-axis shows bin ranges
And y-axis shows frequency counts
And the histogram fills its container width

**Scenario: Hover interaction**
Given a rendered histogram
When a user hovers over a bar
Then a tooltip shows: bin range (e.g., "100-150") and count (e.g., "1,234 rows")
And the bar is visually highlighted

**Scenario: Mini histogram in card**
Given a column card with histogram data
When the card renders
Then a simplified histogram (no axes, no labels) is shown
And the mini histogram is ~80px wide
And rendering completes in < 10ms

**Scenario: Handle skewed distributions**
Given a highly skewed distribution (most values in few bins)
When the histogram renders
Then all bins are visible (even those with few counts)
And the tallest bin doesn't dominate excessively (consider log scale indication)

**Scenario: Handle empty/sparse bins**
Given histogram data with some bins having 0 count
When the histogram renders
Then empty bins show as minimal bars or gaps
And the distribution shape is still clear

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/Histogram.tsx` - Full histogram component (create)
- `src/app/components/MiniHistogram.tsx` - Compact histogram (modify from FEAT-007)
- `src/app/utils/canvas.ts` - Canvas rendering utilities (create)
- `src/app/utils/format.ts` - Number formatting utilities

**Must NOT Change:**
- WASM histogram generation logic
- Profile store structure
- Column card layout

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): implement canvas-based histogram component
- feat(ui): add hover tooltip interaction for histograms
- feat(ui): create mini histogram for column cards
- feat(ui): add responsive sizing for histogram containers
- test(ui): add histogram rendering tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Renders correctly in Chrome, Firefox, Safari
- [ ] Performance: mini histogram < 10ms, full histogram < 50ms
- [ ] Tooltips are accessible (keyboard focusable)
- [ ] Color contrast meets WCAG AA
- [ ] Visual tests for different distribution shapes
- [ ] Code reviewed

## 7. Resources
- HTML Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Bin count algorithms: https://en.wikipedia.org/wiki/Histogram#Number_of_bins_and_width
- Accessible data visualization: https://www.w3.org/WAI/tutorials/images/complex/
