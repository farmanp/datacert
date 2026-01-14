import { GXSuite, GXExpectation } from './exportGreatExpectations';

/**
 * Import and parse Great Expectations Suite JSON files
 *
 * Supports GX 1.x format with expectation_suite_name, meta, and expectations array.
 */

export interface ParsedGXSuite {
  suiteName: string;
  expectations: GXExpectation[];
  meta?: {
    generatedBy?: string;
    generatedAt?: string;
    sourceFile?: string;
    tolerance?: number;
  };
}

export interface GXImportError {
  type: 'parse_error' | 'validation_error' | 'format_error';
  message: string;
  details?: string;
}

export type GXImportResult =
  | { success: true; suite: ParsedGXSuite }
  | { success: false; error: GXImportError };

/**
 * Validates the basic structure of a GX Suite
 */
function validateGXStructure(data: unknown): data is GXSuite {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const suite = data as Record<string, unknown>;

  // Check required fields
  if (typeof suite.expectation_suite_name !== 'string') {
    return false;
  }

  if (!Array.isArray(suite.expectations)) {
    return false;
  }

  // Validate each expectation has required fields
  for (const exp of suite.expectations) {
    if (typeof exp !== 'object' || exp === null) {
      return false;
    }
    const expectation = exp as Record<string, unknown>;
    if (typeof expectation.expectation_type !== 'string') {
      return false;
    }
    if (typeof expectation.kwargs !== 'object' || expectation.kwargs === null) {
      return false;
    }
  }

  return true;
}

/**
 * Parses a GX Suite from JSON string
 */
export function parseGXSuiteJSON(jsonString: string): GXImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      success: false,
      error: {
        type: 'parse_error',
        message: 'Invalid JSON format',
        details: e instanceof Error ? e.message : 'Unknown parse error',
      },
    };
  }

  if (!validateGXStructure(parsed)) {
    return {
      success: false,
      error: {
        type: 'format_error',
        message: 'Invalid Great Expectations Suite format',
        details:
          'File must contain expectation_suite_name (string) and expectations (array)',
      },
    };
  }

  const suite = parsed as GXSuite;

  return {
    success: true,
    suite: {
      suiteName: suite.expectation_suite_name,
      expectations: suite.expectations,
      meta: suite.meta
        ? {
            generatedBy: suite.meta.generated_by,
            generatedAt: suite.meta.generated_at,
            sourceFile: suite.meta.source_file,
            tolerance: suite.meta.tolerance,
          }
        : undefined,
    },
  };
}

/**
 * Parses a GX Suite from a File object
 */
export async function parseGXSuiteFile(file: File): Promise<GXImportResult> {
  try {
    const text = await file.text();
    return parseGXSuiteJSON(text);
  } catch (e) {
    return {
      success: false,
      error: {
        type: 'parse_error',
        message: 'Failed to read file',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
    };
  }
}

/**
 * List of supported expectation types for validation
 */
export const SUPPORTED_EXPECTATIONS = [
  'expect_column_to_exist',
  'expect_column_values_to_not_be_null',
  'expect_column_values_to_be_of_type',
  'expect_column_values_to_be_between',
  'expect_column_values_to_be_unique',
  'expect_column_mean_to_be_between',
  'expect_column_distinct_values_to_be_in_set',
  'expect_column_values_to_be_in_set',
  'expect_table_row_count_to_be_between',
  'expect_table_column_count_to_equal',
] as const;

export type SupportedExpectationType = (typeof SUPPORTED_EXPECTATIONS)[number];

/**
 * Checks if an expectation type is supported for validation
 */
export function isExpectationSupported(expectationType: string): boolean {
  return SUPPORTED_EXPECTATIONS.includes(expectationType as SupportedExpectationType);
}
