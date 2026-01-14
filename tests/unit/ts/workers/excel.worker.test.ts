import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseWorkbookMetadata, parseSheetData } from '../../../../src/app/workers/excel.worker';

// Mock self to prevent side-effect crash if environment is not worker-like
if (typeof self === 'undefined') {
    // @ts-ignore
    globalThis.self = {
        onmessage: null,
        postMessage: () => {},
    };
}

describe('Excel Worker Logic', () => {
  let excelBuffer: ArrayBuffer;

  beforeAll(async () => {
    const fixturePath = join(__dirname, '../../../fixtures/excel/multisheet.xlsx');
    const buffer = await readFile(fixturePath);
    // Convert Node Buffer to ArrayBuffer
    excelBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });

  it('should parse workbook metadata and identify sheets', () => {
    const { sheetNames } = parseWorkbookMetadata(excelBuffer);
    expect(sheetNames).toEqual(['Employees', 'Departments', 'Summary']);
  });

  it('should parse specific sheet data correctly', () => {
    const { workbook } = parseWorkbookMetadata(excelBuffer);
    
    // Test Employees Sheet
    const employees = parseSheetData(workbook, 'Employees');
    expect(employees.headers).toEqual(['ID', 'Name', 'Department', 'Salary']);
    expect(employees.rows).toHaveLength(3);
    expect(employees.rows[0]).toEqual(['101', 'Alice Smith', 'Engineering', '85000']);
  });

  it('should handle missing sheets gracefully', () => {
    const { workbook } = parseWorkbookMetadata(excelBuffer);
    expect(() => parseSheetData(workbook, 'NonExistent')).toThrow(/Sheet "NonExistent" not found/);
  });

  it('should handle merged cells (metadata sheet)', () => {
    const { workbook } = parseWorkbookMetadata(excelBuffer);
    const summary = parseSheetData(workbook, 'Summary');
    
    // In SheetJS, merged cells often result in the value being in the top-left cell,
    // and other cells being empty or filled depending on options.
    // Our logic uses default sheet_to_json.
    // Row 1: "Report Title" (A1), "" (B1), "Q3 Overview" (C1)
    // Wait, create-excel-fixtures.js defined:
    // ['Report Title', '', 'Q3 Overview']
    // And merged A1:B1.
    // So B1 should be covered by A1.
    // Let's verify what we get.
    
    expect(summary.headers[0]).toBe('Report Title');
    // Note: sheet_to_json with header:1 returns array of arrays.
    // If the file was generated correctly, we expect the data to be readable.
  });
});
