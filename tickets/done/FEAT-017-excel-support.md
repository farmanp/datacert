# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a business analyst
I want to profile Excel files (.xlsx, .xls) directly
So that I can analyze spreadsheets from stakeholders without manual CSV conversion

**Success Looks Like:**
Excel files can be dropped into DataLens and profiled with the same quality and speed as CSV files, including multi-sheet support.

## 2. Context & Constraints (Required)
**Background:**
Excel is the lingua franca of business data. Analysts receive spreadsheets from finance, operations, and business stakeholders daily. Requiring CSV conversion creates friction and risks data loss (formatting, multiple sheets, formulas). Native Excel support is critical for analyst adoption.

**Scope:**
- **In Scope:**
  - .xlsx file parsing (Office Open XML format)
  - .xls file parsing (legacy BIFF format) - lower priority
  - Multi-sheet detection and sheet selector UI
  - Header row detection (first row vs. data)
  - Basic type inference from Excel cell types
  - Handle merged cells gracefully
  - Support files up to 100MB
  - Same statistics and quality metrics as CSV

- **Out of Scope:**
  - Formula evaluation (read computed values only)
  - Pivot table expansion
  - Chart/image extraction
  - Password-protected files
  - Macro execution
  - .xlsm, .xlsb formats (initially)

**Constraints:**
- Use SheetJS (xlsx) library - well-maintained, works in browser
- Bundle size impact: SheetJS is ~400KB minified
- Lazy-load Excel parser to avoid bloating initial bundle
- Memory: Excel files expand significantly when parsed (10x typical)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Parse single-sheet Excel file**
Given an .xlsx file with one sheet containing 1000 rows
When the file is dropped into DataLens
Then the file is recognized as Excel format
And all columns and rows are parsed correctly
And statistics match what would be computed from CSV export

**Scenario: Handle multi-sheet workbook**
Given an Excel file with 3 sheets: "Sales", "Inventory", "Summary"
When the file is loaded
Then a sheet selector appears showing all 3 sheet names
And the user can select which sheet to profile
And switching sheets re-runs profiling on the new sheet

**Scenario: Handle merged cells**
Given an Excel file with merged header cells
When the file is parsed
Then merged cells are expanded to fill all covered columns
And a warning indicates "Merged cells detected - headers expanded"

**Scenario: Type inference from Excel**
Given an Excel file with columns typed as: Number, Date, Text, Currency
When profiling completes
Then DataLens infers types matching Excel's cell formats
And dates are recognized without format guessing

**Scenario: Large Excel file**
Given a 50MB Excel file with 500,000 rows
When the file is processed
Then parsing completes within 60 seconds
And memory usage stays under 500MB
And progress is reported during parsing

**Scenario: Legacy .xls format**
Given a .xls file (BIFF format)
When the file is dropped
Then the file is parsed using legacy parser
And results match .xlsx parsing quality

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/FileDropzone.tsx` - Add .xlsx/.xls to accepted types
- `src/app/components/SheetSelector.tsx` - New component (create)
- `src/app/workers/excel.worker.ts` - Excel parsing worker (create)
- `src/app/stores/fileStore.ts` - Add sheet selection state
- `package.json` - Add xlsx dependency

**Must NOT Change:**
- WASM statistics engine (Excel → JS arrays → existing pipeline)
- CSV/JSON parsing
- Core UI components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(parser): add xlsx dependency with lazy loading
- feat(ui): create sheet selector component for multi-sheet workbooks
- feat(worker): implement excel parsing worker using sheetjs
- feat(parser): add xls legacy format support
- feat(ui): add xlsx/xls to file dropzone accepted types
- test(excel): add excel parsing test suite with fixtures

## 6. Verification & Definition of Done (Required)
- [x] All acceptance criteria scenarios pass
- [x] .xlsx files parse correctly
- [x] .xls files parse correctly
- [x] Multi-sheet selector works
- [x] Merged cells handled gracefully
- [x] Performance: 50MB file < 60s
- [x] Bundle size increase < 150KB (lazy loaded)
- [x] Code reviewed

## 7. Resources
- SheetJS (xlsx): https://sheetjs.com/ / https://github.com/SheetJS/sheetjs
- SheetJS docs: https://docs.sheetjs.com/
- Excel file format: https://en.wikipedia.org/wiki/Office_Open_XML
- Test files: Create fixtures with merged cells, multiple sheets, various types
