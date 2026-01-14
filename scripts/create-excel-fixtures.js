import { writeFile } from 'fs/promises';
import { utils, write } from 'xlsx';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function createFixtures() {
  const fixturesDir = join(__dirname, '../tests/fixtures/excel');
  await mkdir(fixturesDir, { recursive: true });

  // 1. Multi-sheet Workbook
  const wb = utils.book_new();

  // Sheet 1: Employees
  const employeesData = [
    ['ID', 'Name', 'Department', 'Salary'],
    [101, 'Alice Smith', 'Engineering', 85000],
    [102, 'Bob Jones', 'Marketing', 65000],
    [103, 'Charlie Day', 'Engineering', 90000]
  ];
  const ws1 = utils.aoa_to_sheet(employeesData);
  utils.book_append_sheet(wb, ws1, 'Employees');

  // Sheet 2: Departments
  const deptData = [
    ['DeptID', 'Name', 'Location'],
    ['ENG', 'Engineering', 'Building A'],
    ['MKT', 'Marketing', 'Building B']
  ];
  const ws2 = utils.aoa_to_sheet(deptData);
  utils.book_append_sheet(wb, ws2, 'Departments');

  // Sheet 3: Metadata (Merged Cells)
  // Merged cells are tricky with aoa_to_sheet, let's just do basic for now
  // as the ticket says "handle merged cells gracefully" (SheetJS handles expansion usually)
  const metaData = [
    ['Report Title', '', 'Q3 Overview'], // Merged A1:B1 conceptually
    ['Date', '2023-10-01', '']
  ];
  const ws3 = utils.aoa_to_sheet(metaData);
  // Add merge: s=start, e=end, r=row, c=col
  ws3['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } } // Merge A1:B1
  ];
  utils.book_append_sheet(wb, ws3, 'Summary');

  // Write file
  const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
  await writeFile(join(fixturesDir, 'multisheet.xlsx'), buffer);

  console.log(`Created fixtures in ${fixturesDir}`);
}

createFixtures().catch(console.error);
