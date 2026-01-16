import { Component, Show, For, createSignal, createMemo, createEffect, onCleanup } from 'solid-js';
import { A } from '@solidjs/router';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import { isFeatureEnabled, FEATURE_FLAGS } from '../utils/featureFlags';
import ResultsTable from './ResultsTable';
import ColumnCard from './ColumnCard';
import EmptyState from './EmptyState';
import AvroSchemaViewer from './AvroSchemaViewer';

import CorrelationMatrix from './CorrelationMatrix';
import { ExportFormatSelector } from './ExportFormatSelector';
import { ValidationRuleImporter } from './ValidationRuleImporter';
import { ValidationResultsView } from './ValidationResultsView';
import { useCorrelationMatrix } from '../hooks/useCorrelationMatrix';

const ProfileReport: Component = () => {
  const { store, setViewMode, reset } = profileStore;
  const [showExportModal, setShowExportModal] = createSignal(false);
  const [showClearConfirm, setShowClearConfirm] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = createSignal('');

  let cancelButtonRef: HTMLButtonElement | undefined;
  let exportButtonRef: HTMLButtonElement | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Get numeric columns for correlation matrix
  const numericColumns = createMemo(() => {
    const profiles = store.results?.column_profiles || [];
    return profiles.filter(
      (p) =>
        p.base_stats.inferred_type === 'Integer' || p.base_stats.inferred_type === 'Numeric'
    );
  });

  // Use correlation matrix hook
  const {
    showCorrelationMatrix,
    setShowCorrelationMatrix,
    correlationData,
    isComputingCorrelation,
    correlationError,
    canComputeCorrelation,
    computeCorrelation,
  } = useCorrelationMatrix({
    file: () => fileStore.store.file ?? undefined,
    numericColumns,
  });


  // Debounce search query updates (150ms)
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 150);
  };

  // Cleanup debounce timer on unmount
  onCleanup(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };

  // Filter columns based on search query (case insensitive)
  const filteredProfiles = createMemo(() => {
    const profiles = store.results?.column_profiles || [];
    const query = debouncedSearchQuery().toLowerCase().trim();
    if (!query) return profiles;
    return profiles.filter((profile) => profile.name.toLowerCase().includes(query));
  });

  const totalColumns = createMemo(() => store.results?.column_profiles?.length || 0);
  const filteredCount = createMemo(() => filteredProfiles().length);
  const hasActiveSearch = createMemo(() => debouncedSearchQuery().trim().length > 0);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    reset();
  };

  // Handle Escape and Enter keys, and trap focus in dialog
  createEffect(() => {
    if (showClearConfirm()) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancelClear();
        } else if (e.key === 'Enter') {
          handleConfirmClear();
        } else if (e.key === 'Tab') {
          // Focus trap
          const focusableElements = document.querySelectorAll(
            'div[role="dialog"] button'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      // Focus the cancel button when dialog opens
      cancelButtonRef?.focus();
      onCleanup(() => {
        document.removeEventListener('keydown', handleKeyDown);
      });
    }
  });



  // Compute columns with PII detected
  const piiColumns = createMemo(() => {
    const profiles = store.results?.column_profiles;
    if (!profiles) return [];

    const columnsWithPii: Array<{
      name: string;
      piiType: string;
      rowCount: number;
      severity: 'error' | 'warning' | 'info';
    }> = [];

    for (const profile of profiles) {
      const issues = profile.quality_metrics?.issues || [];
      const piiIssue = issues.find((issue) => issue.message.toLowerCase().includes('pii'));

      if (piiIssue) {
        // Extract PII type from message like "Potential PII detected: email"
        const piiTypeMatch = piiIssue.message.match(/:\s*(.+)$/);
        const piiType = piiTypeMatch ? piiTypeMatch[1] : 'unknown';

        columnsWithPii.push({
          name: profile.name,
          piiType,
          rowCount: profile.pii_rows?.length || 0,
          severity: piiIssue.severity,
        });
      }
    }

    return columnsWithPii;
  });

  // Check if there are any high-severity PII issues (error severity)
  const hasHighSeverityPii = createMemo(() =>
    piiColumns().some((col) => col.severity === 'error')
  );

  // Calculate health score from column profiles (completeness metric)
  const healthScore = createMemo(() => {
    const profiles = store.results?.column_profiles;
    if (!profiles || profiles.length === 0) return { value: 0, color: 'text-rose-400' };

    let totalCount = 0;
    let totalMissing = 0;

    for (const profile of profiles) {
      totalCount += profile.base_stats.count;
      totalMissing += profile.base_stats.missing;
    }

    if (totalCount === 0) return { value: 0, color: 'text-rose-400' };

    const score = ((totalCount - totalMissing) / totalCount) * 100;
    const roundedScore = Math.round(score * 10) / 10;

    // Color based on thresholds: green >90%, amber 70-90%, red <70%
    let color = 'text-emerald-400';
    if (roundedScore < 70) {
      color = 'text-rose-400';
    } else if (roundedScore < 90) {
      color = 'text-amber-400';
    }

    return { value: roundedScore, color };
  });

  return (
    <div class="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 print:p-0">
      <header class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <h2 class="text-3xl font-extrabold text-white tracking-tight">Profiling Results</h2>
            <Show when={fileStore.store.isDemo}>
              <div class="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-1.5 transition-all hover:bg-indigo-500/20 group/demo">
                <div class="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                <span class="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none">
                  Demo
                </span>
              </div>
            </Show>
          </div>
          <Show when={fileStore.store.file}>
            {(file) => (
              <div class="flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500 tracking-wide">
                <div class="flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                  <span>
                    Analyzed <span class="text-slate-300 font-medium">{file().name}</span>
                    <span class="ml-1 text-slate-600 opacity-60">({fileStore.formatFileSize(file().size)})</span>
                  </span>
                </div>

                <Show when={store.performanceMetrics}>
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-700 font-light">|</span>
                    <span class="text-slate-500">
                      Processed <span class="text-emerald-500/90 font-medium">
                        {fileStore.formatFileSize(store.performanceMetrics!.fileSizeBytes)}
                      </span> in <span class="text-emerald-500/90 font-medium whitespace-nowrap">
                        {store.performanceMetrics!.durationSeconds < 0.1
                          ? `${(store.performanceMetrics!.durationSeconds * 1000).toFixed(0)}ms`
                          : `${store.performanceMetrics!.durationSeconds.toFixed(2)}s`}
                      </span>
                    </span>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <div class="bg-slate-800 p-1 rounded-xl border border-slate-700 flex">
            <button
              onClick={() => setViewMode('table')}
              class={`px-4 py-2 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${store.viewMode === 'table'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              class={`px-4 py-2 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${store.viewMode === 'cards'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Card View
            </button>
            <Show when={isFeatureEnabled(FEATURE_FLAGS.QUALITY_MODE)}>
              <button
                onClick={() => setViewMode('validation')}
                class={`px-4 py-2 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${store.viewMode === 'validation'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Quality
              </button>
            </Show>
          </div>

          <div class="h-8 w-[1px] bg-slate-700 hidden sm:block" />

          <button
            onClick={handleClearClick}
            class="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-all border border-slate-700 shadow-lg"
          >
            Clear
          </button>

          <div class="relative">
            <button
              ref={exportButtonRef}
              onClick={() => setShowExportModal(true)}
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>

          <A
            href="/sql-mode"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            SQL Mode
          </A>
        </div>
      </header>

      {/* Avro Schema Section */}
      <Show when={store.results?.avro_schema}>
        {(schema) => <AvroSchemaViewer schema={schema()} />}
      </Show>

      {/* PII Summary Banner */}
      <Show when={piiColumns().length > 0}>
        <div
          class={`rounded-xl p-4 mb-2 border ${hasHighSeverityPii()
            ? 'bg-rose-500/10 border-rose-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
            } print:bg-amber-50 print:border-amber-200`}
        >
          <div class="flex items-start gap-3">
            <div
              class={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${hasHighSeverityPii() ? 'bg-rose-500/20' : 'bg-amber-500/20'
                }`}
            >
              <svg
                class={`w-5 h-5 ${hasHighSeverityPii() ? 'text-rose-400' : 'text-amber-400'}`}
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
            <div class="flex-1 min-w-0">
              <h3
                class={`font-bold text-base ${hasHighSeverityPii() ? 'text-rose-400' : 'text-amber-400'
                  } print:text-amber-600`}
              >
                Potential PII Detected
              </h3>
              <p class="text-sm text-slate-400 mt-0.5 print:text-slate-600">
                {piiColumns().length} column{piiColumns().length !== 1 ? 's' : ''} may contain
                sensitive data. Review before uploading to a data warehouse.
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <For each={piiColumns()}>
                  {(col) => (
                    <div
                      class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${col.severity === 'error'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : col.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                    >
                      <span class="font-semibold">{col.name}</span>
                      <span class="opacity-60">({col.piiType})</span>
                      <Show when={col.rowCount > 0}>
                        <span class="opacity-50">{col.rowCount} rows</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Summary KPI Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-4 print:mt-8">
        <For
          each={[
            { label: 'Total Rows', value: store.results?.total_rows, color: 'text-white' },
            {
              label: 'Total Columns',
              value: store.results?.column_profiles.length,
              color: 'text-white',
            },
            {
              label: 'Data Types',
              value: new Set(store.results?.column_profiles.map((p) => p.base_stats.inferred_type))
                .size,
              color: 'text-blue-400',
            },
            { label: 'Health Score', value: `${healthScore().value}%`, color: healthScore().color },
          ]}
        >
          {(kpi) => (
            <div class="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm print:bg-white print:border-slate-200 print:text-black hover:border-slate-500 transition-colors group">
              <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1 print:text-slate-400 group-hover:text-slate-300 transition-colors">
                {kpi.label}
              </p>
              <p class={`text-3xl font-bold font-heading ${kpi.color} tabular-nums print:text-black`}>
                {typeof kpi.value === 'number'
                  ? new Intl.NumberFormat().format(kpi.value)
                  : kpi.value}
              </p>
            </div>
          )}
        </For>
      </div>

      {/* Column Search Input */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div class="relative flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              class="h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search columns..."
            value={searchQuery()}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
            class="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
          <Show when={searchQuery().length > 0}>
            <button
              onClick={clearSearch}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Clear search"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </Show>
        </div>
        <Show when={hasActiveSearch()}>
          <p class="text-sm text-slate-400">
            Showing <span class="text-slate-200 font-semibold">{filteredCount()}</span> of{' '}
            <span class="text-slate-200 font-semibold">{totalColumns()}</span> columns
          </p>
        </Show>
      </div>

      <Show
        when={store.viewMode !== 'validation'}
        fallback={
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="lg:col-span-1">
              <ValidationRuleImporter />
            </div>
            <div class="lg:col-span-2">
              <ValidationResultsView />
            </div>
          </div>
        }
      >
        <Show
          when={filteredProfiles().length > 0}
          fallback={
            <Show when={hasActiveSearch()}>
              <EmptyState
                icon={
                  <svg
                    class="w-16 h-16 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
                title="No columns match your search"
                description={
                  <>
                    Try adjusting your search term or{' '}
                    <button
                      onClick={clearSearch}
                      class="text-blue-400 hover:text-blue-300 transition-colors underline"
                    >
                      clear the filter
                    </button>
                  </>
                }
              />
            </Show>
          }
        >
          <Show
            when={store.viewMode === 'table'}
            fallback={
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:grid-cols-2">
                <For each={filteredProfiles()}>
                  {(profile) => <ColumnCard profile={profile} />}
                </For>
              </div>
            }
          >
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ResultsTable profiles={filteredProfiles()} />
            </div>
          </Show>
        </Show>
      </Show>

      {/* Correlation Matrix Section */}
      <Show when={canComputeCorrelation()}>
        <div class="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 print:bg-white print:border-slate-200">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 class="text-xl font-bold text-white print:text-black">Correlation Matrix</h3>
              <p class="text-sm text-slate-400 mt-1">
                Pearson correlation coefficients between {numericColumns().length} numeric columns
              </p>
            </div>
            <div class="flex items-center gap-3">
              <Show when={showCorrelationMatrix() && correlationData()}>
                <button
                  onClick={() => setShowCorrelationMatrix(false)}
                  class="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-600 transition-colors"
                >
                  Hide
                </button>
              </Show>
              <Show when={!showCorrelationMatrix() || !correlationData()}>
                <button
                  onClick={computeCorrelation}
                  disabled={isComputingCorrelation()}
                  class="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <Show when={isComputingCorrelation()}>
                    <svg
                      class="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </Show>
                  {isComputingCorrelation() ? 'Computing...' : 'Compute Correlation'}
                </button>
              </Show>
            </div>
          </div>

          {/* Error State */}
          <Show when={correlationError()}>
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {correlationError()}
            </div>
          </Show>

          {/* Correlation Matrix Display */}
          <Show when={showCorrelationMatrix() && correlationData()}>
            {(data) => (
              <div class="overflow-x-auto">
                <CorrelationMatrix data={data()} />
              </div>
            )}
          </Show>

          {/* Empty State */}
          <Show when={!showCorrelationMatrix() && !isComputingCorrelation() && !correlationError()}>
            <div class="text-center py-8 text-slate-500">
              <svg
                class="w-12 h-12 mx-auto mb-3 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p class="text-sm">
                Click "Compute Correlation" to analyze relationships between numeric columns
              </p>
            </div>
          </Show>
        </div>
      </Show>

      {/* Clear Confirmation Dialog */}
      <Show when={showClearConfirm()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
        >
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancelClear}
          />

          {/* Dialog */}
          <div class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 max-w-sm mx-4 animate-in fade-in zoom-in duration-150">
            <h3
              id="clear-dialog-title"
              class="text-lg font-bold text-slate-100 mb-2"
            >
              Clear all results?
            </h3>
            <p class="text-slate-300 mb-6">
              This cannot be undone.
            </p>

            <div class="flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                onClick={handleCancelClear}
                class="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-colors border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                class="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Export Format Selector Modal */}
      <Show when={store.results}>
        <ExportFormatSelector
          isOpen={showExportModal()}
          onClose={() => setShowExportModal(false)}
          profileResult={store.results!}
          fileName={fileStore.store.file?.name || 'data.csv'}
          fileSize={fileStore.store.file?.size || 0}
        />
      </Show>


    </div>
  );
};

export default ProfileReport;
