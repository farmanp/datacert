/**
 * File Size Configuration
 *
 * Centralized configuration for file size limits with dynamic calculation
 * based on available device memory.
 */

import type { ProfilerError } from '../types/errors';
import { createTypedError } from '../types/errors';

// Default maximum file size: 500 MB
const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024;

// Minimum file size limit: 50 MB (even on constrained devices)
const MIN_FILE_SIZE_LIMIT = 50 * 1024 * 1024;

// SQL mode size limit: 100 MB (DuckDB in-browser constraint)
export const SQL_MODE_SIZE_LIMIT = 100 * 1024 * 1024;

/**
 * Memory multiplier for calculating file size limit.
 * We allow files up to ~50% of reported device memory to leave room
 * for WASM overhead and other browser processes.
 */
const MEMORY_MULTIPLIER = 0.5;

/**
 * Gets the maximum allowed file size based on device memory.
 *
 * Uses navigator.deviceMemory API when available (Chrome/Edge),
 * falls back to DEFAULT_MAX_FILE_SIZE otherwise.
 *
 * @returns Maximum file size in bytes
 */
export function getMaxFileSize(): number {
  // Check for deviceMemory API (returns GB of RAM)
  // @ts-expect-error - deviceMemory is not in all TS definitions
  const deviceMemory = navigator?.deviceMemory;

  if (typeof deviceMemory === 'number' && deviceMemory > 0) {
    // Convert GB to bytes and apply multiplier
    const memoryBasedLimit = deviceMemory * 1024 * 1024 * 1024 * MEMORY_MULTIPLIER;

    // Clamp between MIN and DEFAULT limits
    return Math.max(MIN_FILE_SIZE_LIMIT, Math.min(DEFAULT_MAX_FILE_SIZE, memoryBasedLimit));
  }

  return DEFAULT_MAX_FILE_SIZE;
}

/**
 * Formats the file size limit to human-readable string.
 *
 * @returns Formatted string like "500 MB"
 */
export function formatFileSizeLimit(): string {
  const bytes = getMaxFileSize();
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

/**
 * Checks if a file size exceeds the allowed limit.
 *
 * @param size - File size in bytes
 * @returns true if file is too large
 */
export function isFileTooLarge(size: number): boolean {
  return size > getMaxFileSize();
}

/**
 * Formats bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Creates a ProfilerError for file too large condition.
 *
 * @param fileName - Name of the file that exceeded the limit
 * @param fileSize - Size of the file in bytes
 * @returns ProfilerError with detailed message
 */
export function getFileSizeError(fileName: string, fileSize: number): ProfilerError {
  const error = createTypedError(
    'FILE_TOO_LARGE',
    `File "${fileName}" is ${formatBytes(fileSize)}, which exceeds the ${formatFileSizeLimit()} limit. ` +
      `For larger files, consider using the DataCert CLI tool: npx datacert "${fileName}"`,
  );
  return error;
}
