# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a user exporting a report
I want confirmation that the export completed successfully
So that I know the file was downloaded

**Success Looks Like:**
Export shows a spinner during processing and a toast notification on completion.

## 2. Context & Constraints (Required)
**Background:**
Currently, export functions run with "Exporting..." button text but provide no completion feedback. Users don't know if the export succeeded, especially for larger HTML reports that take time to generate. Errors are only logged to console.

**Scope:**
- **In Scope:**
  - Add spinner icon to Export button during export
  - Show toast notification on successful export
  - Show toast notification on export error
  - Toast auto-dismisses after 3 seconds

- **Out of Scope:**
  - Export progress percentage
  - Toast notification system (create simple inline)

**Constraints:**
- Toast should not require a third-party library
- Toast should match existing visual design

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Export in progress**
Given user clicks an export option
When export is processing
Then the export button shows a spinner icon
And text shows "Exporting..."

**Scenario: Export success toast**
Given an export completes successfully
When the file downloads
Then a toast notification appears: "Report downloaded successfully"
And the toast auto-dismisses after 3 seconds

**Scenario: Export error toast**
Given an export fails
When the error occurs
Then a toast notification appears with the error message
And the toast has red/danger styling

**Scenario: Toast dismissible**
Given a toast notification is visible
When user clicks the dismiss button
Then the toast disappears immediately

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/ProfileReport.tsx` - Add toast state and spinner
- `src/app/components/Toast.tsx` - Create simple toast component (new)

**Must NOT Change:**
- Export logic in exportReport.ts
- Other components

**Toast interface:**
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}
```

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add export feedback with toast notifications

## 6. Verification & Definition of Done (Required)
- [ ] Export button shows spinner during processing
- [ ] Success toast appears on completion
- [ ] Error toast appears on failure
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Toast can be manually dismissed
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- ProfileReport.tsx:23-56 - Export handlers
- Tailwind toast examples
