import { ProfileResult } from '../stores/profileStore';

/**
 * Represents a column's schema information
 */
export interface ColumnSchema {
  name: string;
  type: string;
}

/**
 * Represents the schema signature of a profiled file
 */
export interface SchemaSignature {
  columns: ColumnSchema[];
  hash: string;
}

/**
 * Represents a type change between two schemas
 */
export interface TypeChange {
  column: string;
  fromType: string;
  toType: string;
}

/**
 * Represents the difference between two schemas
 */
export interface SchemaDiff {
  isCompatible: boolean;
  added: string[];
  removed: string[];
  typeChanges: TypeChange[];
}

/**
 * Represents a file with schema validation results
 */
export interface FileSchemaResult {
  fileId: string;
  fileName: string;
  schema: SchemaSignature;
  diff: SchemaDiff | null;
}

/**
 * Represents the overall schema validation result for a batch
 */
export interface BatchSchemaValidation {
  isAllCompatible: boolean;
  baselineSchema: SchemaSignature;
  fileResults: FileSchemaResult[];
}

/**
 * Generates a simple hash from column names and types
 */
function generateSchemaHash(columns: ColumnSchema[]): string {
  const normalized = columns
    .map((c) => `${c.name.toLowerCase()}:${c.type.toLowerCase()}`)
    .sort()
    .join('|');

  // Simple hash using djb2 algorithm
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Extracts a schema signature from a ProfileResult
 */
export function extractSchema(profile: ProfileResult): SchemaSignature {
  const columns: ColumnSchema[] = profile.column_profiles.map((col) => ({
    name: col.name,
    type: col.base_stats.inferred_type,
  }));

  return {
    columns,
    hash: generateSchemaHash(columns),
  };
}

/**
 * Compares two schemas and returns the differences
 */
export function compareSchemas(a: SchemaSignature, b: SchemaSignature): SchemaDiff {
  const aColumnNames = new Set(a.columns.map((c) => c.name));
  const bColumnNames = new Set(b.columns.map((c) => c.name));

  // Find added columns (in b but not in a)
  const added: string[] = [];
  for (const name of bColumnNames) {
    if (!aColumnNames.has(name)) {
      added.push(name);
    }
  }

  // Find removed columns (in a but not in b)
  const removed: string[] = [];
  for (const name of aColumnNames) {
    if (!bColumnNames.has(name)) {
      removed.push(name);
    }
  }

  // Find type changes for columns that exist in both
  const typeChanges: TypeChange[] = [];
  const aTypeMap = new Map(a.columns.map((c) => [c.name, c.type]));
  const bTypeMap = new Map(b.columns.map((c) => [c.name, c.type]));

  for (const [name, aType] of aTypeMap) {
    const bType = bTypeMap.get(name);
    if (bType && aType !== bType) {
      typeChanges.push({
        column: name,
        fromType: aType,
        toType: bType,
      });
    }
  }

  // Schemas are compatible if no columns were added/removed and no type changes
  const isCompatible = added.length === 0 && removed.length === 0 && typeChanges.length === 0;

  return {
    isCompatible,
    added,
    removed,
    typeChanges,
  };
}

/**
 * Validates schemas across multiple profiles
 * Uses the first profile as the baseline
 */
export function validateBatchSchemas(
  profiles: { fileId: string; fileName: string; profile: ProfileResult }[],
): BatchSchemaValidation {
  if (profiles.length === 0) {
    throw new Error('Cannot validate empty profiles array');
  }

  const baselineProfile = profiles[0];
  const baselineSchema = extractSchema(baselineProfile.profile);

  const fileResults: FileSchemaResult[] = profiles.map((p, index) => {
    const schema = extractSchema(p.profile);
    const diff = index === 0 ? null : compareSchemas(baselineSchema, schema);

    return {
      fileId: p.fileId,
      fileName: p.fileName,
      schema,
      diff,
    };
  });

  const isAllCompatible = fileResults.every(
    (result) => result.diff === null || result.diff.isCompatible,
  );

  return {
    isAllCompatible,
    baselineSchema,
    fileResults,
  };
}
