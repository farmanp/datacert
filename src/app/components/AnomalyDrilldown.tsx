import { Component, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { profileStore } from '../stores/profileStore';
import { FilteredRowsTable } from './FilteredRowsTable';

export const AnomalyDrilldown: Component = () => {
  const { store, closeDrilldown, loadDrilldownPage, exportFilteredRows } = profileStore;

  const totalPages = () => Math.ceil(store.drilldown.totalAffected / store.drilldown.pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages()) {
      loadDrilldownPage(newPage);
    }
  };

  const handleExport = () => {
    exportFilteredRows();
  };

  return (
    <Show when={store.drilldown.isOpen}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div class="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span class="capitalize">{store.drilldown.anomalyType}</span> Drilldown:{' '}
                  {store.drilldown.columnName}
                </h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  Found {store.drilldown.totalAffected.toLocaleString()} affected rows
                </p>
              </div>
              <div class="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  Export CSV
                </button>
                <button
                  onClick={closeDrilldown}
                  class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div class="flex-1 overflow-auto p-0 relative">
              <Show when={store.drilldown.isLoading}>
                <div class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
                  <div class="flex flex-col items-center gap-3">
                    <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span class="text-sm font-medium text-primary-600">Loading rows...</span>
                  </div>
                </div>
              </Show>

              <Show when={store.drilldown.error}>
                <div class="p-8 text-center text-red-500">
                  <p class="font-medium">Error loading data</p>
                  <p class="text-sm mt-1">{store.drilldown.error}</p>
                </div>
              </Show>

              <div class="min-w-full inline-block align-middle">
                <FilteredRowsTable />
              </div>
            </div>

            {/* Footer / Pagination */}
            <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
              <div class="text-sm text-slate-500 dark:text-slate-400">
                Page {store.drilldown.currentPage} of {totalPages()}
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(store.drilldown.currentPage - 1)}
                  disabled={store.drilldown.currentPage <= 1 || store.drilldown.isLoading}
                  class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  Previous
                </button>
                <div class="px-2">{/* Page jumper potentially */}</div>
                <button
                  onClick={() => handlePageChange(store.drilldown.currentPage + 1)}
                  disabled={
                    store.drilldown.currentPage >= totalPages() || store.drilldown.isLoading
                  }
                  class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
