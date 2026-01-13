# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to export my profiling results as a standalone HTML file
So that I can share the report with stakeholders who don't have DataLens

**Success Looks Like:**
A single HTML file is downloaded containing the complete profiling report with all visualizations, viewable in any browser without internet access.

## 2. Context & Constraints (Required)
**Background:**
Shareability is key for data profiling tools. Stakeholders (PMs, analysts, QA) need to view reports without installing tools. A standalone HTML file is universally accessible and can be attached to tickets, emails, or documentation.

**Scope:**
- **In Scope:**
  - "Export to HTML" button on profile results page
  - Self-contained HTML file with embedded CSS and JS
  - All statistics and quality metrics included
  - Static histogram images (rendered to canvas, exported as data URLs)
  - Report metadata: filename, date, DataLens version
  - Professional styling suitable for sharing
  - File download via browser

- **Out of Scope:**
  - Interactive features in exported report
  - PDF export (P2)
  - JSON export (separate ticket)
  - Report customization (title, logo)
  - Email integration

**Constraints:**
- Exported HTML must be < 2MB for reasonable email attachment
- Must work without JavaScript (pure HTML+CSS for content)
- Must render correctly in Chrome, Firefox, Safari, Edge
- No external resource dependencies (fonts, CDN)

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Export report to HTML**
Given profiling has completed for a dataset
When a user clicks "Export to HTML"
Then a file named "{original_filename}_profile.html" downloads
And the file contains all profiling results
And the file opens correctly in a browser

**Scenario: Report contains all data**
Given an exported HTML report
When opened in a browser
Then it displays: dataset summary (rows, columns, quality score)
And all column profiles with statistics
And histogram visualizations as images
And quality warnings and indicators

**Scenario: Report is self-contained**
Given an exported HTML report
When opened offline (no internet)
Then all content renders correctly
And no console errors for missing resources
And styling appears correctly

**Scenario: Report metadata**
Given an exported HTML report
When viewing the report
Then it shows: source filename, profile date/time, DataLens version
And generation timestamp in ISO format

**Scenario: Reasonable file size**
Given a profile of a 50-column dataset
When exported to HTML
Then the file size is < 500KB
And load time is < 2 seconds

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/wasm/src/export/mod.rs` - Export module entry (create)
- `src/wasm/src/export/report.rs` - HTML report generation (create)
- `src/app/components/ExportButton.tsx` - Export UI component (create)
- `src/app/utils/download.ts` - File download utility (create)
- `src/app/templates/report.html` - HTML report template (create)

**Must NOT Change:**
- Profile store structure
- Statistics computation
- Main application styling

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(export): create html report template
- feat(export): implement report generation with embedded stats
- feat(export): add histogram rendering to static images
- feat(ui): add export button component
- test(export): add html export integration tests

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Exported report renders in Chrome, Firefox, Safari, Edge
- [ ] Report works offline
- [ ] File size < 2MB for 100-column dataset
- [ ] Histograms render as embedded images
- [ ] Visual QA of exported report styling
- [ ] Code reviewed

## 7. Resources
- Data URL generation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
- Canvas toDataURL: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
- pandas-profiling report reference: https://pandas-profiling.ydata.ai/examples/master/census/census_report.html
