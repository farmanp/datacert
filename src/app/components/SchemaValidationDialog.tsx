import { Component, For, Show, createEffect, onCleanup } from 'solid-js';
import type { BatchSchemaValidation, FileSchemaResult } from '../utils/schemaValidation';

interface SchemaValidationDialogProps {
  validation: BatchSchemaValidation;
  onProceed: () => void;
  onCancel: () => void;
}

/**
 * SchemaValidationDialog Component
 *
 * Modal dialog that displays schema comparison results across multiple files.
 * Shows:
 * - Summary of schema compatibility
 * - Files with schema mismatches
 * - Added/removed columns
 * - Type changes
 *
 * Provides "Proceed Anyway" and "Cancel" actions.
 */
const SchemaValidationDialog: Component<SchemaValidationDialogProps> = (props) => {
  // Handle escape key to close dialog
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  // Prevent body scroll when dialog is open
  createEffect(() => {
    document.body.style.overflow = 'hidden';
    onCleanup(() => {
      document.body.style.overflow = '';
    });
  });

  const incompatibleFiles = () =>
    props.validation.fileResults.filter((f) => f.diff && !f.diff.isCompatible);

  const totalIssues = () => {
    let count = 0;
    for (const file of incompatibleFiles()) {
      if (file.diff) {
        count += file.diff.added.length + file.diff.removed.length + file.diff.typeChanges.length;
      }
    }
    return count;
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schema-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          props.onCancel();
        }
      }}
    >
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div class="flex items-start justify-between p-6 border-b border-slate-700">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                class="w-6 h-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 id="schema-dialog-title" class="text-xl font-bold text-white tracking-tight">
                Schema Mismatch Detected
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                {incompatibleFiles().length} of {props.validation.fileResults.length} files have
                schema differences ({totalIssues()} total issues)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => props.onCancel()}
            class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Baseline info */}
          <div class="mb-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-400 rounded">
                BASELINE
              </span>
              <span class="text-sm font-medium text-slate-200">
                {props.validation.fileResults[0]?.fileName || 'First file'}
              </span>
            </div>
            <p class="text-xs text-slate-400">
              {props.validation.baselineSchema.columns.length} columns
            </p>
          </div>

          {/* Files with issues */}
          <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Files with Schema Differences
          </h3>

          <div class="space-y-4">
            <For each={incompatibleFiles()}>{(file) => <FileSchemaCard file={file} />}</For>
          </div>

          {/* Warning about proceeding */}
          <div class="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="text-sm text-amber-200">
                <p class="font-semibold mb-1">Proceeding with mismatched schemas</p>
                <p class="text-amber-300/80">
                  Statistics will be merged for columns that exist in all files. Columns unique to
                  some files will be included with partial data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800/50">
          <button
            type="button"
            onClick={() => props.onCancel()}
            class="px-4 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-all border border-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => props.onProceed()}
            class="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Card component showing schema differences for a single file
 */
const FileSchemaCard: Component<{ file: FileSchemaResult }> = (props) => {
  const diff = () => props.file.diff;

  return (
    <div class="p-4 bg-slate-700/20 border border-slate-600/50 rounded-xl">
      {/* File name */}
      <div class="flex items-center gap-2 mb-3">
        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="text-sm font-medium text-slate-200 truncate">{props.file.fileName}</span>
      </div>

      {/* Differences */}
      <div class="space-y-2">
        {/* Removed columns */}
        <Show when={diff()?.removed && diff()!.removed.length > 0}>
          <div class="flex items-start gap-2">
            <span class="px-1.5 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 rounded flex-shrink-0">
              REMOVED
            </span>
            <div class="flex flex-wrap gap-1">
              <For each={diff()!.removed}>
                {(col) => (
                  <span class="px-2 py-0.5 text-xs bg-red-500/10 text-red-300 rounded border border-red-500/20">
                    {col}
                  </span>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Added columns */}
        <Show when={diff()?.added && diff()!.added.length > 0}>
          <div class="flex items-start gap-2">
            <span class="px-1.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded flex-shrink-0">
              ADDED
            </span>
            <div class="flex flex-wrap gap-1">
              <For each={diff()!.added}>
                {(col) => (
                  <span class="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">
                    {col}
                  </span>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Type changes */}
        <Show when={diff()?.typeChanges && diff()!.typeChanges.length > 0}>
          <div class="flex items-start gap-2">
            <span class="px-1.5 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded flex-shrink-0">
              TYPE CHANGE
            </span>
            <div class="flex flex-wrap gap-1">
              <For each={diff()!.typeChanges}>
                {(change) => (
                  <span class="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-300 rounded border border-amber-500/20">
                    {change.column}: {change.fromType} &rarr; {change.toType}
                  </span>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SchemaValidationDialog;
