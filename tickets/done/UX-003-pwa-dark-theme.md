# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a user
I want the PWA install and update prompts to match the app's dark theme
So that the UI feels cohesive and professional

**Success Looks Like:**
InstallPrompt and UpdateNotification components use the same dark slate color scheme as the rest of the application.

## 2. Context & Constraints (Required)
**Background:**
The InstallPrompt and UpdateNotification components use a light theme (white background, gray text) while the entire application uses a dark theme (slate-800/900 backgrounds). This creates a jarring visual disconnect when these prompts appear.

**Scope:**
- **In Scope:**
  - Update InstallPrompt.tsx to use dark theme colors
  - Update UpdateNotification.tsx to use dark theme colors
  - Match button styles to ProfileReport button patterns
  - Ensure text contrast meets accessibility standards

- **Out of Scope:**
  - Changing the PWA functionality
  - Adding new features to these components

**Constraints:**
- Must maintain the same functionality
- Must meet WCAG AA contrast ratios
- Button styles should be consistent with ProfileReport exports

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Install prompt matches dark theme**
Given the PWA install prompt triggers
When the InstallPrompt component displays
Then it has a dark background (slate-800 or similar)
And text is light colored (slate-100/200/300)
And buttons match the app's button styling patterns

**Scenario: Update notification matches dark theme**
Given a PWA update is available
When the UpdateNotification component displays
Then it has a dark background (slate-800 or similar)
And text is light colored (slate-100/200/300)
And buttons match the app's button styling patterns

**Scenario: Contrast requirements met**
Given either prompt is displayed
When evaluated for accessibility
Then text has at least 4.5:1 contrast ratio with background
And interactive elements have visible focus states

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/InstallPrompt.tsx` - Update color classes
- `src/app/components/UpdateNotification.tsx` - Update color classes

**Must NOT Change:**
- PWA service worker configuration
- Component functionality/logic
- Event handlers

**Color Mapping:**
- `bg-white` → `bg-slate-800`
- `text-gray-900` → `text-slate-100`
- `text-gray-500` → `text-slate-400`
- `bg-gray-100` → `bg-slate-700`
- `text-gray-700` → `text-slate-300`
- `border-gray-200` → `border-slate-700`

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- fix(ui): update PWA prompts to use dark theme

## 6. Verification & Definition of Done (Required)
- [ ] InstallPrompt uses dark theme colors
- [ ] UpdateNotification uses dark theme colors
- [ ] Visual appearance matches rest of app
- [ ] Button styles consistent with ProfileReport
- [ ] Contrast ratios meet WCAG AA
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- InstallPrompt.tsx - Lines 59-98 (light theme classes)
- UpdateNotification.tsx - Lines 42-93 (light theme classes)
- ProfileReport.tsx - Reference for button styling patterns
