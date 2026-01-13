import { Component, Show, For, createSignal } from 'solid-js';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import ResultsTable from './ResultsTable';
import ColumnCard from './ColumnCard';
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
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleJSONExport = () => {
    if (!store.results) return;
    const filename = fileStore.store.file?.name || 'data_profile.csv';
    const fileSize = fileStore.store.file?.size || 0;
    const json = generateJSONReport(store.results, filename, {
      fileSize,
      processingTimeMs: 0, // Processing time not currently tracked
    });
    downloadFile(json, `${getBaseFilename()}_profile.json`, 'application/json');
    setShowExportMenu(false);
  };

  const handleCSVExport = () => {
    if (!store.results) return;
    const csv = generateCSVReport(store.results);
    downloadFile(csv, `${getBaseFilename()}_stats.csv`, 'text/csv');
    setShowExportMenu(false);
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
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Analyzed <span class="text-blue-400 font-semibold">{file().name}</span> (
                  {fileStore.formatFileSize(file().size)})
                </span>
              </p>
            )}
          </Show>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <div class="bg-slate-800 p-1 rounded-xl border border-slate-700 flex">
            <button
              onClick={() => setViewMode('table')}
              class={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                store.viewMode === 'table'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              class={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                store.viewMode === 'cards'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Card View
            </button>
          </div>

          <div class="h-8 w-[1px] bg-slate-700 hidden sm:block" />

          <button
            onClick={reset}
            class="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-all border border-slate-700 shadow-lg"
          >
            Clear
          </button>

          <div class="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu())}
              disabled={isExporting()}
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting() ? 'Exporting...' : 'Export Results'}
              <svg
                class={`w-4 h-4 transition-transform ${showExportMenu() ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  d="M19 9l-7 7-7-7"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <Show when={showExportMenu()}>
              <div class="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
                <button
                  onClick={handleHTMLExport}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
                  onClick={handleJSONExport}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700 flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
                  onClick={handleCSVExport}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700 flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
                  onClick={handlePrintPDF}
                  class="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700 flex items-center gap-3"
                >
                  <svg
                    class="w-4 h-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
            { label: 'Health Score', value: '98%', color: 'text-emerald-400' },
          ]}
        >
          {(kpi) => (
            <div class="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm print:bg-white print:border-slate-200 print:text-black">
              <p class="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1 print:text-slate-400">
                {kpi.label}
              </p>
              <p class={`text-3xl font-black ${kpi.color} tabular-nums print:text-black`}>
                {typeof kpi.value === 'number'
                  ? new Intl.NumberFormat().format(kpi.value)
                  : kpi.value}
              </p>
            </div>
          )}
        </For>
      </div>

      {/* Main Results Display */}
      <Show
        when={store.viewMode === 'table'}
        fallback={
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:grid-cols-2">
            <For each={store.results?.column_profiles}>
              {(profile) => <ColumnCard profile={profile} />}
            </For>
          </div>
        }
      >
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ResultsTable profiles={store.results?.column_profiles || []} />
        </div>
      </Show>
    </div>
  );
};

export default ProfileReport;
