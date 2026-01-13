# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a mobile user
I want to tap on histogram bars to see their values
So that I can explore data distributions on touch devices

**Success Looks Like:**
Tapping a histogram bar shows the same tooltip that currently appears on hover, and tapping outside dismisses it.

## 2. Context & Constraints (Required)
**Background:**
The Histogram component shows bin details on mouse hover via onMouseMove. Touch devices don't trigger mouse events, so mobile users cannot see the actual values in each bin. This is a significant accessibility gap for mobile users.

**Scope:**
- **In Scope:**
  - Add touch event handlers to Histogram.tsx
  - Show tooltip on tap
  - Dismiss tooltip on tap outside
  - Same tooltip content as hover (range, count)
  - Apply same fix to MiniHistogram.tsx

- **Out of Scope:**
  - Long-press gestures
  - Pinch-to-zoom on histogram
  - Animated transitions for tooltip

**Constraints:**
- Must not break existing mouse hover behavior
- Tooltip positioning should avoid viewport edges on mobile
- Touch target should be the canvas element

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Tap to show tooltip**
Given the histogram is displayed on a touch device
When user taps on a histogram bar
Then the tooltip appears showing the bin range and count
And the tooltip is positioned near the tap point

**Scenario: Tap outside to dismiss**
Given a tooltip is visible on the histogram
When user taps outside the histogram canvas
Then the tooltip is dismissed

**Scenario: Tap different bar changes tooltip**
Given a tooltip is showing for bin A
When user taps on a different bar (bin B)
Then the tooltip updates to show bin B's data

**Scenario: Mouse hover still works**
Given the histogram is displayed on a desktop
When user hovers over histogram bars
Then tooltips appear on hover as before

**Scenario: MiniHistogram touch support**
Given the MiniHistogram is displayed on a touch device
When user taps on a bar
Then a tooltip shows the bin range and count

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/Histogram.tsx` - Add touch handlers
- `src/app/components/MiniHistogram.tsx` - Add touch handlers (if applicable)

**Must NOT Change:**
- Canvas rendering logic
- Existing mouse event handlers (augment, don't replace)

**Implementation Hints:**
- Use `onTouchStart` to capture tap position
- Convert touch coordinates similar to mouse coordinates
- Add state for "touch active" to persist tooltip
- Use `onTouchEnd` elsewhere to dismiss

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add touch support for histogram tooltips

## 6. Verification & Definition of Done (Required)
- [ ] Tap on histogram shows tooltip on iOS Safari
- [ ] Tap on histogram shows tooltip on Chrome Android
- [ ] Tap outside dismisses tooltip
- [ ] Mouse hover still works on desktop
- [ ] MiniHistogram supports touch (if applicable)
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- Histogram.tsx - Lines 83-105 (mouse handlers)
- MiniHistogram.tsx - Line 50 (canvas element)
- Touch event reference: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
