# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a new user
I want to try the profiler with sample data
So that I can understand its capabilities before uploading my own files

**Success Looks Like:**
A "Try Demo" button on the landing page loads a sample CSV and profiles it, showing users exactly what the tool can do.

## 2. Context & Constraints (Required)
**Background:**
New users must upload their own data to see what the profiler does. This creates friction, especially for users evaluating the tool. A demo mode with preloaded sample data would let users explore immediately.

**Scope:**
- **In Scope:**
  - Add "Try Demo" button on Home page
  - Include sample CSV file (~100 rows, varied column types)
  - Auto-load and profile the sample on click
  - Show badge/indicator that demo data is active
  - Allow users to clear and upload their own data

- **Out of Scope:**
  - Multiple sample datasets
  - Sample data customization
  - Synthetic data generation

**Constraints:**
- Sample CSV should be small (<50KB) for fast loading
- Include varied column types: string, integer, float, date, category
- Include some missing values to demonstrate quality badges

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Try Demo button visible**
Given user is on the landing page (no results loaded)
When viewing the file dropzone area
Then a "Try Demo" button is visible below the dropzone
And it has text like "or try with sample data"

**Scenario: Load demo data**
Given user clicks "Try Demo"
When the sample CSV is loaded
Then profiling begins automatically
And results display just like user-uploaded data
And a "Demo Data" badge/indicator is shown

**Scenario: Clear demo and upload own**
Given demo data is loaded
When user clicks "Clear" or drops a new file
Then demo data is replaced
And demo indicator disappears

**Scenario: Demo file characteristics**
Given the sample CSV file
When profiled
Then it shows varied column types (string, number, date, category)
And some columns have missing values for quality demonstration

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/pages/Home.tsx` - Add Try Demo button
- `public/samples/demo-data.csv` - Create sample file (new)
- `src/app/stores/fileStore.ts` - Add demo loading function
- `src/app/components/ProfileReport.tsx` - Add demo indicator

**Must NOT Change:**
- Profiling logic
- FileDropzone behavior

**Sample CSV structure:**
```csv
id,name,email,age,salary,department,hire_date,is_active
1,John Doe,john@example.com,28,75000,Engineering,2020-03-15,true
2,Jane Smith,,35,82000,Marketing,2019-08-22,true
... (100 rows with some nulls)
```

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(ui): add demo mode with sample dataset

## 6. Verification & Definition of Done (Required)
- [ ] "Try Demo" button visible on landing page
- [ ] Clicking loads sample CSV and profiles it
- [ ] Results display correctly
- [ ] Demo indicator shown when using demo data
- [ ] Can clear demo and upload own file
- [ ] No TypeScript errors
- [ ] Lint passes

## 7. Resources
- Home.tsx - Landing page with dropzone
- Kaggle sample datasets for inspiration
