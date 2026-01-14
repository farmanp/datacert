# FEAT-024: Export Format Selector UI

## 1. Intent (Required)

**User Story:**
As a user
I want a unified export dialog that lets me choose the format and configure options
So that I can easily export my profile in the format I need

**Success Looks Like:**
Clean modal dialog with format selection, tolerance slider (when applicable), and download button that exports the selected format.

## 2. Context & Constraints (Required)

**Background:**
With multiple export formats available (HTML, JSON, Great Expectations, Soda Checks, JSON Schema), users need a clear interface to select their desired format and configure format-specific options like tolerance thresholds.

**Scope:**
- **In Scope:** Export modal UI, format selection, tolerance configuration, download trigger
- **Out of Scope:** New export formats (handled by FEAT-021, FEAT-022, FEAT-023)

**Constraints:**
- Must integrate with existing export dropdown in ProfileReport
- Tolerance slider only visible for formats that use it (GX, Soda)
- Must be accessible (keyboard navigation, screen reader support)

## 3. Acceptance Criteria (Required)

**Scenario: Open export dialog**
```gherkin
Given I have a profile result displayed
When I click "Export Results"
Then a modal appears with format options:
  - HTML Report
  - JSON Profile
  - Great Expectations Suite
  - Soda Checks YAML
  - JSON Schema
```

**Scenario: Configure tolerance for GX export**
```gherkin
Given the export modal is open
When I select "Great Expectations Suite"
Then I see a tolerance slider (1% to 50%, default 10%)
And I see a preview of example expectation with current tolerance
```

**Scenario: Tolerance not shown for JSON Schema**
```gherkin
Given the export modal is open
When I select "JSON Schema"
Then the tolerance slider is not visible
```

**Scenario: Export selected format**
```gherkin
Given I have selected "Soda Checks YAML"
And I have configured tolerance to 15%
When I click "Download"
Then the file downloads with .yml extension
And a success toast appears
And the modal closes
```

**Scenario: Keyboard accessibility**
```gherkin
Given the export modal is open
When I press Tab
Then focus moves through format options
When I press Enter on a format
Then that format is selected
When I press Escape
Then the modal closes
```

## 4. AI Execution Instructions (Required)

**Files to Create:**
- `src/app/components/ExportFormatSelector.tsx`

**Files to Modify:**
- `src/app/components/ProfileReport.tsx` (replace inline export with modal trigger)
- `src/app/utils/exportReport.ts` (add format dispatch logic)

**Allowed to Change:**
- Export UI components
- Export utility orchestration

**Must NOT Change:**
- Individual export format implementations
- ProfileResult data structure

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- `feat(ui): add export format selector dialog`

## 6. Verification & Definition of Done (Required)

- [ ] Acceptance criteria pass
- [ ] All export formats accessible from selector
- [ ] Tolerance slider works correctly
- [ ] Keyboard navigation functional
- [ ] Screen reader announces format options
- [ ] Toast feedback on export
- [ ] Modal closes on successful export
- [ ] Unit tests for component
- [ ] Code reviewed

## 7. Dependencies

- **FEAT-021:** Export to Great Expectations Suite
- **FEAT-022:** Export to JSON Schema
- **FEAT-023:** Export to Soda Checks YAML

## 8. Technical Notes

**Component Structure:**

```tsx
interface ExportFormatSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  profileResult: ProfileResult;
  fileName: string;
}

type ExportFormat =
  | 'html'
  | 'json'
  | 'great-expectations'
  | 'soda-checks'
  | 'json-schema';

interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  extension: string;
  requiresTolerance: boolean;
}
```

**Format Options:**

| Format | Label | Extension | Tolerance |
|--------|-------|-----------|-----------|
| html | HTML Report | .html | No |
| json | JSON Profile | .json | No |
| great-expectations | Great Expectations Suite | .json | Yes |
| soda-checks | Soda Checks YAML | .yml | Yes |
| json-schema | JSON Schema | .json | No |

**UI Layout:**

```
┌─────────────────────────────────────┐
│ Export Profile                   X  │
├─────────────────────────────────────┤
│ Select format:                      │
│ ┌─────────────────────────────────┐ │
│ │ ○ HTML Report                   │ │
│ │   Full visual report            │ │
│ ├─────────────────────────────────┤ │
│ │ ● Great Expectations Suite      │ │
│ │   GX validation rules           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tolerance: [====●====] 10%          │
│ (Bounds will use ±10% of values)    │
│                                     │
│ [Cancel]              [Download]    │
└─────────────────────────────────────┘
```

## 9. Resources

- [Existing ExportButton patterns in codebase]
- [SolidJS Dialog patterns]
