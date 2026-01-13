import { Component, Show, For, createSignal, createMemo, createEffect, onCleanup } from 'solid-js';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import ResultsTable from './ResultsTable';
import ColumnCard from './ColumnCard';
import EmptyState from './EmptyState';
import Toast from './Toast';
import {
  generateHTMLReport,
  generateJSONReport,
  generateCSVReport,
  downloadFile,
} from '../utils/exportReport';

const ProfileReport: Component = () => {
  const { store, setViewMode, reset } = profileStore;
  const [isExporting, setIsExporting] = createSignal(false);
  const [showExportMenu, setShowExportMenu] = createSignal(false);
  const [showClearConfirm, setShowClearConfirm] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = createSignal('');
  const [focusedMenuIndex, setFocusedMenuIndex] = createSignal(0);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal<'success' | 'error'>('success');
  const [showToast, setShowToast] = createSignal(false);
  let cancelButtonRef: HTMLButtonElement | undefined;
  let exportButtonRef: HTMLButtonElement | undefined;
  let menuItemRefs: HTMLButtonElement[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const displayToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const dismissToast = () => {
    setShowToast(false);
  };

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

  // Handle keyboard navigation for export menu
  createEffect(() => {
    if (showExportMenu()) {
      const menuItemCount = 4; // HTML, JSON, CSV, Print to PDF

      // Reset focus index and focus first item when menu opens
      setFocusedMenuIndex(0);
      // Use setTimeout to ensure refs are populated after render
      setTimeout(() => {
        menuItemRefs[0]?.focus();
      }, 0);

      const handleExportMenuKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            setShowExportMenu(false);
            exportButtonRef?.focus();
            break;
          case 'ArrowDown':
            e.preventDefault();
            setFocusedMenuIndex((prev) => {
              const next = (prev + 1) % menuItemCount;
              menuItemRefs[next]?.focus();
              return next;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedMenuIndex((prev) => {
              const next = (prev - 1 + menuItemCount) % menuItemCount;
              menuItemRefs[next]?.focus();
              return next;
            });
            break;
          case 'Enter':
            // Let the button's onClick handle the action
            // Menu will close via the handler
            break;
          case 'Tab':
            // Trap focus within the menu
            e.preventDefault();
            if (e.shiftKey) {
              setFocusedMenuIndex((prev) => {
                const next = (prev - 1 + menuItemCount) % menuItemCount;
                menuItemRefs[next]?.focus();
                return next;
              });
            } else {
              setFocusedMenuIndex((prev) => {
                const next = (prev + 1) % menuItemCount;
                menuItemRefs[next]?.focus();
                return next;
              });
            }
            break;
        }
      };

      document.addEventListener('keydown', handleExportMenuKeyDown);
      onCleanup(() => {
        document.removeEventListener('keydown', handleExportMenuKeyDown);
      });
    }
  });

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

  const getBaseFilename = () => {
    const fullFilename = fileStore.store.file?.name || 'data_profile.csv';
    return fullFilename.split('.')[0];
  };

  const handleHTMLExport = async () => {
    if (!store.results) return;
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const filename = fileStore.store.file?.name || 'data_profile.csv';
      const html = await generateHTMLReport(store.results, filename);
      downloadFile(html, `${getBaseFilename()}_profile.html`, 'text/html');
      displayToast('Report downloaded successfully', 'success');
    } catch (err) {
      console.error('Export failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      displayToast(errorMessage, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleJSONExport = () => {
    if (!store.results) return;
    setShowExportMenu(false);
    try {
      const filename = fileStore.store.file?.name || 'data_profile.csv';
      const fileSize = fileStore.store.file?.size || 0;
      const json = generateJSONReport(store.results, filename, {
        fileSize,
        processingTimeMs: 0, // Processing time not currently tracked
      });
      downloadFile(json, `${getBaseFilename()}_profile.json`, 'application/json');
      displayToast('Report downloaded successfully', 'success');
    } catch (err) {
      console.error('Export failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      displayToast(errorMessage, 'error');
    }
  };

  const handleCSVExport = () => {
    if (!store.results) return;
    setShowExportMenu(false);
    try {
      const csv = generateCSVReport(store.results);
      downloadFile(csv, `${getBaseFilename()}_stats.csv`, 'text/csv');
      displayToast('Report downloaded successfully', 'success');
    } catch (err) {
      console.error('Export failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      displayToast(errorMessage, 'error');
    }
  };

  const handlePrintPDF = () => {
    setShowExportMenu(false);
    window.print();
  };

  return (
    <div class="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 print:p-0">
      <header class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <h2 class="text-3xl font-extrabold text-white tracking-tight">Profiling Results</h2>
          <Show when={fileStore.store.file}>
            {(file) => (
              <p class="text-slate-400 mt-1 flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Analyzed <span class="text-blue-400 font-semibold">{file().name}</span> (
                  {fileStore.formatFileSize(file().size)})
                </span>
                <Show when={fileStore.store.isDemo}>
                  <span class="ml-2 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                    Demo Data
                  </span>
                </Show>
              </p>
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
              onClick={() => setShowExportMenu(!showExportMenu())}
              disabled={isExporting()}
              aria-haspopup="menu"
              aria-expanded={showExportMenu()}
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Show when={isExporting()}>
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
              {isExporting() ? 'Exporting...' : 'Export Results'}
              <Show when={!isExporting()}>
                <svg
                  class={`w-4 h-4 transition-transform ${showExportMenu() ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M19 9l-7 7-7-7"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Show>
            </button>

            <Show when={showExportMenu()}>
              <div role="menu" class="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
                <button
                  role="menuitem"
                  onClick={handleHTMLExport}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Interactive HTML
                </button>
                <button
                  role="menuitem"
                  onClick={handleJSONExport}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700 flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Data Profile (JSON)
                </button>
                <button
                  role="menuitem"
                  onClick={handleCSVExport}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700 flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Column Stats (CSV)
                </button>
                <button
                  role="menuitem"
                  onClick={handlePrintPDF}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700 flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Print to PDF
                </button>
              </div>
            </Show>
          </div>
        </div>
      </header>

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

      {/* Main Results Display */}
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

      {/* Toast Notification */}
      <Show when={showToast()}>
        <Toast
          message={toastMessage()}
          type={toastType()}
          onDismiss={dismissToast}
        />
      </Show>
    </div>
  );
};

export default ProfileReport;
