import { Component, Show, createSignal, onMount, createMemo } from 'solid-js';
import DualDropzone from '../components/DualDropzone';
import ComparisonTable from '../components/ComparisonTable';
import Toast from '../components/Toast';
import { comparisonStore } from '../stores/comparisonStore';
import { downloadFile } from '../utils/exportReport';

/**
 * Compare Page Component
 *
 * Comparison mode for DataLens Profiler.
 * Allows users to compare profiles of two datasets side-by-side
 * to identify schema drift and statistical changes between data versions.
 */
const Compare: Component = () => {
  const [wasmStatus, setWasmStatus] = createSignal('Loading WASM...');
  const [wasmReady, setWasmReady] = createSignal(false);
  const [showToast, setShowToast] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal<'success' | 'error'>('success');

  const { store, reset, getSummary } = comparisonStore;

  const displayToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const dismissToast = () => {
    setShowToast(false);
  };

  onMount(async () => {
    try {
      // Import the WASM module
      const wasm = await import('../../wasm/pkg/datalens_wasm');
      wasm.init();
      setWasmStatus('WASM Ready');
      setWasmReady(true);
    } catch (e) {
      console.error('Failed to load WASM', e);
      setWasmStatus('WASM Failed to load');
      setWasmReady(false);
    }
  });

  // Check if both files have been profiled
  const hasResults = createMemo(() => {
    return store.fileA.results && store.fileB.results && store.comparisons.length > 0;
  });

  // Check if at least one file is processing
  const isProcessing = createMemo(() => {
    return store.fileA.state === 'processing' || store.fileB.state === 'processing';
  });

  // Generate comparison report HTML
  const handleExportHTML = () => {
    if (!hasResults()) return;

    try {
      const summary = getSummary();
      const fileAName = store.fileA.file?.name || 'File A';
      const fileBName = store.fileB.file?.name || 'File B';
      const date = new Date().toLocaleString();

      // Generate status badge HTML
      const getStatusBadge = (status: string) => {
        switch (status) {
          case 'added':
            return '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">ADDED</span>';
          case 'removed':
            return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">REMOVED</span>';
          case 'modified':
            return '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">MODIFIED</span>';
          default:
            return '<span style="background:#e2e8f0;color:#475569;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">UNCHANGED</span>';
        }
      };

      const formatNum = (n: number | null | undefined) => {
        if (n === null || n === undefined || !isFinite(n)) return '-';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
      };

      const comparisonRows = store.comparisons
        .map(
          (c) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px;">${c.name}</td>
          <td style="padding:12px;">${getStatusBadge(c.status)}</td>
          <td style="padding:12px;">${c.typeA || '-'} ${c.typeChanged ? '-> ' + c.typeB : ''}</td>
          <td style="padding:12px;">${formatNum(c.missingPercentDelta?.valueA)}%</td>
          <td style="padding:12px;">${formatNum(c.missingPercentDelta?.valueB)}%</td>
          <td style="padding:12px;">${formatNum(c.meanDelta?.valueA)}</td>
          <td style="padding:12px;">${formatNum(c.meanDelta?.valueB)}</td>
        </tr>
      `,
        )
        .join('');

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DataLens Comparison Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; background: #f8fafc; margin: 0; padding: 40px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { margin: 0; color: #0f172a; font-size: 24px; }
    .meta { font-size: 14px; color: #64748b; margin-top: 8px; }
    .files { display: flex; gap: 40px; margin: 20px 0; }
    .file-info { background: #f1f5f9; padding: 16px; border-radius: 8px; flex: 1; }
    .file-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
    .file-name { font-size: 16px; font-weight: 600; color: #0f172a; }
    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin: 30px 0; }
    .kpi-card { background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .kpi-value { font-size: 24px; font-weight: 800; color: #0f172a; }
    .kpi-value.green { color: #15803d; }
    .kpi-value.red { color: #b91c1c; }
    .kpi-value.amber { color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>DataLens Comparison Report</h1>
      <div class="meta">Generated on: ${date}</div>
    </header>

    <div class="files">
      <div class="file-info">
        <div class="file-label">File A (Baseline)</div>
        <div class="file-name">${fileAName}</div>
        <div class="meta">${formatNum(store.totalRowsA)} rows</div>
      </div>
      <div class="file-info">
        <div class="file-label">File B (Comparison)</div>
        <div class="file-name">${fileBName}</div>
        <div class="meta">${formatNum(store.totalRowsB)} rows</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Columns</div>
        <div class="kpi-value">${summary.total}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Added</div>
        <div class="kpi-value green">${summary.added}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Removed</div>
        <div class="kpi-value red">${summary.removed}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Modified</div>
        <div class="kpi-value amber">${summary.modified}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Unchanged</div>
        <div class="kpi-value">${summary.unchanged}</div>
      </div>
    </div>

    <h2 style="font-size:18px;margin-top:40px;">Column Comparison Details</h2>
    <table>
      <thead>
        <tr>
          <th>Column</th>
          <th>Status</th>
          <th>Type</th>
          <th>Missing % (A)</th>
          <th>Missing % (B)</th>
          <th>Mean (A)</th>
          <th>Mean (B)</th>
        </tr>
      </thead>
      <tbody>
        ${comparisonRows}
      </tbody>
    </table>

    <footer style="margin-top:60px;text-align:center;color:#94a3b8;font-size:12px;">
      Generated by DataLens Profiler - Comparison Mode
    </footer>
  </div>
</body>
</html>
      `;

      const baseNameA = fileAName.split('.')[0];
      const baseNameB = fileBName.split('.')[0];
      downloadFile(html, `comparison_${baseNameA}_vs_${baseNameB}.html`, 'text/html');
      displayToast('Comparison report exported successfully', 'success');
    } catch (err) {
      console.error('Export failed', err);
      displayToast('Failed to export comparison report', 'error');
    }
  };

  return (
    <div class="min-h-screen bg-slate-900 text-white flex flex-col items-center">
      <div class="w-full flex flex-col items-center p-4 sm:p-8 animate-in fade-in duration-500">
        {/* Header */}
        <header class="text-center mb-8 sm:mb-12 w-full max-w-5xl">
          <div class="flex items-center justify-center gap-3 mb-3">
            <a
              href="/"
              class="text-slate-400 hover:text-slate-200 transition-colors"
              title="Back to Home"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </a>
            <h1 class="text-3xl sm:text-5xl font-extrabold font-heading bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tighter">
              Compare Profiles
            </h1>
          </div>
          <p class="text-slate-400 text-base sm:text-lg font-medium tracking-tight max-w-2xl mx-auto leading-relaxed">
            Upload two datasets to compare their schemas and statistics side-by-side.
          </p>
        </header>

        {/* Main Content */}
        <main class="w-full max-w-5xl space-y-6">
          {/* Status Card */}
          <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* WASM Status */}
            <div class="flex items-center space-x-3 mb-6">
              <div
                class={`h-3 w-3 rounded-full ${wasmReady() ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              <span class="text-sm font-medium text-slate-300 uppercase tracking-wider">
                {wasmStatus()}
              </span>
            </div>

            {/* Dual Dropzone */}
            <section aria-labelledby="compare-heading">
              <h2 id="compare-heading" class="text-xl font-bold text-slate-100 mb-4">
                Select Two Files to Compare
              </h2>
              <DualDropzone />
            </section>

            {/* Processing Status */}
            <Show when={isProcessing()}>
              <div class="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div class="flex items-center gap-3">
                  <svg
                    class="w-5 h-5 text-amber-500 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  <span class="text-amber-400 font-medium">
                    Profiling files in parallel... Please wait.
                  </span>
                </div>
              </div>
            </Show>

            {/* Waiting for both files message */}
            <Show
              when={
                !isProcessing() &&
                !hasResults() &&
                (store.fileA.state === 'success' || store.fileB.state === 'success')
              }
            >
              <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span class="text-blue-400 font-medium">
                    Upload the second file to start comparison.
                  </span>
                </div>
              </div>
            </Show>
          </div>

          {/* Comparison Results */}
          <Show when={hasResults()}>
            <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 class="text-2xl font-extrabold text-white tracking-tight">
                    Comparison Results
                  </h2>
                  <p class="text-slate-400 mt-1">
                    Comparing{' '}
                    <span class="text-blue-400 font-semibold">{store.fileA.file?.name}</span> vs{' '}
                    <span class="text-purple-400 font-semibold">{store.fileB.file?.name}</span>
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <button
                    onClick={reset}
                    class="px-5 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-all border border-slate-600 shadow-lg"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleExportHTML}
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export Report
                  </button>
                </div>
              </div>

              {/* Row counts summary */}
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p class="text-xs text-blue-400 uppercase tracking-widest font-black mb-1">
                    File A Rows
                  </p>
                  <p class="text-2xl font-bold text-white tabular-nums">
                    {new Intl.NumberFormat().format(store.totalRowsA)}
                  </p>
                </div>
                <div class="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p class="text-xs text-purple-400 uppercase tracking-widest font-black mb-1">
                    File B Rows
                  </p>
                  <p class="text-2xl font-bold text-white tabular-nums">
                    {new Intl.NumberFormat().format(store.totalRowsB)}
                  </p>
                </div>
              </div>

              <ComparisonTable />
            </div>
          </Show>

          {/* Empty state when no files selected */}
          <Show
            when={
              !hasResults() &&
              !isProcessing() &&
              store.fileA.state === 'idle' &&
              store.fileB.state === 'idle'
            }
          >
            <div class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <svg
                class="w-16 h-16 text-slate-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              <h3 class="text-lg font-bold text-slate-300 mb-2">Ready to Compare</h3>
              <p class="text-slate-400 max-w-md mx-auto">
                Upload two CSV, TSV, JSON, or JSONL files above to compare their schemas and
                statistics. Perfect for detecting schema drift between data versions.
              </p>
            </div>
          </Show>
        </main>

        {/* Footer */}
        <footer class="mt-12 sm:mt-16 text-slate-400 text-sm text-center">
          <p>
            <a href="/" class="text-blue-400 hover:text-blue-300 transition-colors">
              Back to single-file profiling
            </a>
          </p>
        </footer>
      </div>

      {/* Toast Notification */}
      <Show when={showToast()}>
        <Toast message={toastMessage()} type={toastType()} onDismiss={dismissToast} />
      </Show>
    </div>
  );
};

export default Compare;
