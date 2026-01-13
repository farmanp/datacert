# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a user
I want clear messaging when there's no content to display
So that I understand the current state and what action to take

**Success Looks Like:**
Reusable EmptyState component provides consistent empty state messaging across the app.

## 2. Context & Constraints (Required)
**Background:**
The app lacks dedicated empty state designs. Edge cases like zero columns, failed processing, or filtered results showing nothing have no graceful messaging. A reusable EmptyState component would provide consistent UX across these scenarios.

**Scope:**
- **In Scope:**
  - Create reusable EmptyState component
  - Props: icon, title, description, action button (optional)
  - Use for: no search results, processing errors, edge cases
  - Consistent styling with app theme

- **Out of Scope:**
  - Animated illustrations
  - Multiple empty state variants

**Constraints:**
- Should match existing visual design
- Should be flexible for different contexts

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Empty search results**
Given user searches for columns
When no columns match the search term
Then EmptyState displays "No columns match your search"
And includes a "Clear search" button

**Scenario: Processing error**
Given file processing fails
When error state is shown
Then EmptyState displays error message
And includes a "Try Again" button

**Scenario: Customizable content**
Given EmptyState is used in different contexts
When rendered
Then it accepts icon, title, description, and action as props
And renders them appropriately

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/EmptyState.tsx` - Create new component

**Props interface:**
```typescript
interface EmptyStateProps {
  icon?: JSX.Element;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Must NOT Change:**
- Existing components (just import and use)

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): create reusable EmptyState component

## 6. Verification & Definition of Done (Required)
- [ ] EmptyState component created
- [ ] Accepts icon, title, description, action props
- [ ] Styled consistently with app theme
- [ ] Can be used in ProfileReport for no search results
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- Tailwind empty state examples: https://tailwindui.com/components/marketing/feedback/404-pages
