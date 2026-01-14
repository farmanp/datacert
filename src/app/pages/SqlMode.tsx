import { Component, createSignal, onMount, onCleanup, Show, Suspense } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { fileStore } from '../stores/fileStore';
import { profileStore } from '../stores/profileStore';
// These will be created separately as per requirements
// import { sqlStore } from '../stores/sqlStore';
// import SqlEditor from '../components/SqlEditor';
// import QueryResults from '../components/QueryResults';

/**
 * Memory threshold for large file warning (100MB)
 */
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;

/**
 * SQL Mode Page Component
 *
 * Enables SQL querying of uploaded data files using DuckDB-WASM.
 * Features:
 * - Lazy-loads DuckDB when page mounts
 * - Loads uploaded file into DuckDB as table "data"
 * - SQL editor for query input
 * - Query results display
 * - "Profile Results" button to profile query output
 * - Memory warning for files > 100MB
 *
 * Part of FEAT-020: DuckDB SQL Mode
 */
const SqlMode: Component = () => {
  const navigate = useNavigate();

  // Local state for SQL mode (will be replaced by sqlStore when created)
  const [isInitializing, setIsInitializing] = createSignal(true);
  const [isReady, setIsReady] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [query, setQuery] = createSignal('SELECT * FROM data LIMIT 100');
  const [results, setResults] = createSignal<Record<string, unknown>[] | null>(null);
  const [isQuerying, setIsQuerying] = createSignal(false);
  const [queryError, setQueryError] = createSignal<string | null>(null);
  const [tableName] = createSignal('data');
  const [rowCount, setRowCount] = createSignal<number | null>(null);
  const [showMemoryWarning, setShowMemoryWarning] = createSignal(false);

  // DuckDB instance reference
  let db: import('@duckdb/duckdb-wasm').AsyncDuckDB | null = null;

  onMount(async () => {
    const file = fileStore.store.file;

    // Check if we have a file to work with
    if (!file || !file.file) {
      setError('No file loaded. Please upload a file first.');
      setIsInitializing(false);
      return;
    }

    // Show memory warning for large files
    if (file.size > LARGE_FILE_THRESHOLD) {
      setShowMemoryWarning(true);
    }

    try {
      // Lazy-load DuckDB
      await initDuckDB();

      // Load file into table
      if (file.file) {
        await loadFileIntoTable(file.file);
      }

      setIsReady(true);
    } catch (err) {
      console.error('Failed to initialize SQL Mode:', err);
      setError((err as Error).message || 'Failed to initialize DuckDB');
    } finally {
      setIsInitializing(false);
    }
  });

  onCleanup(() => {
    // Clean up DuckDB instance
    if (db) {
      db.terminate();
      db = null;
    }
  });

  /**
   * Initialize DuckDB-WASM
   */
  const initDuckDB = async () => {
    const duckdb = await import('@duckdb/duckdb-wasm');

    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    // Fetch worker script to avoid CORS issues
    const workerResponse = await fetch(bundle.mainWorker!);
    const workerScript = await workerResponse.text();
    const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);

    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  };

  /**
   * Load a file into DuckDB as the "data" table
   */
  const loadFileIntoTable = async (file: File) => {
    if (!db) throw new Error('DuckDB not initialized');

    const conn = await db.connect();

    try {
      const fileName = file.name.toLowerCase();

      // Register the file with DuckDB
      await db.registerFileHandle(file.name, file, 2, true); // 2 = DuckDBDataProtocol.BROWSER_FILEREADER

      // Create table based on file type
      if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
        await conn.query(`CREATE TABLE ${tableName()} AS SELECT * FROM read_csv_auto('${file.name}')`);
      } else if (fileName.endsWith('.json') || fileName.endsWith('.jsonl')) {
        await conn.query(`CREATE TABLE ${tableName()} AS SELECT * FROM read_json_auto('${file.name}')`);
      } else if (fileName.endsWith('.parquet')) {
        await conn.query(`CREATE TABLE ${tableName()} AS SELECT * FROM read_parquet('${file.name}')`);
      } else {
        throw new Error(`Unsupported file type: ${fileName}`);
      }

      // Get row count
      const countResult = await conn.query(`SELECT COUNT(*) as count FROM ${tableName()}`);
      const countArray = countResult.toArray();
      if (countArray.length > 0) {
        const row = countArray[0].toJSON();
        setRowCount(Number(row.count));
      }
    } finally {
      await conn.close();
    }
  };

  /**
   * Execute a SQL query
   */
  const executeQuery = async () => {
    if (!db) return;

    setIsQuerying(true);
    setQueryError(null);

    try {
      const conn = await db.connect();
      const result = await conn.query(query());
      const resultArray = result.toArray().map((r) => r.toJSON());
      setResults(resultArray);
      await conn.close();
    } catch (err) {
      console.error('Query failed:', err);
      setQueryError((err as Error).message || 'Query execution failed');
      setResults(null);
    } finally {
      setIsQuerying(false);
    }
  };

  /**
   * Profile the current query results
   * Converts results to CSV and sends to profileStore
   */
  const handleProfileResults = async () => {
    const currentResults = results();
    if (!currentResults || currentResults.length === 0) return;

    try {
      // Convert results to CSV
      const headers = Object.keys(currentResults[0]);
      const csvRows = [
        headers.join(','),
        ...currentResults.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              const str = String(value);
              // Escape quotes and wrap in quotes if contains comma/newline/quote
              if (str.includes('"') || str.includes(',') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(',')
        ),
      ];
      const csvContent = csvRows.join('\n');

      // Create a File from the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'query-results.csv', { type: 'text/csv' });

      // Reset stores and set the new file
      profileStore.reset();
      fileStore.selectFile(file);

      // Start profiling
      profileStore.startProfiling();

      // Navigate to home to see results
      navigate('/');
    } catch (err) {
      console.error('Failed to profile results:', err);
      setQueryError('Failed to profile query results');
    }
  };

  return (
    <div class="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header class="bg-slate-800/50 border-b border-slate-700 px-4 py-4 sm:px-8">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <A
              href="/"
              class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span class="text-sm font-medium">Back to Home</span>
            </A>
          </div>

          <h1 class="text-xl sm:text-2xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            SQL Mode
          </h1>

          <div class="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Memory Warning */}
      <Show when={showMemoryWarning()}>
        <div class="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 sm:px-8">
          <div class="max-w-7xl mx-auto flex items-center gap-3">
            <svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p class="text-amber-200 text-sm">
              <strong>Memory Warning:</strong> Files larger than 100MB may cause high memory usage.
              Consider using smaller datasets or filtering queries.
            </p>
            <button
              onClick={() => setShowMemoryWarning(false)}
              class="ml-auto text-amber-400 hover:text-amber-300 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </Show>

      {/* Main Content */}
      <main class="p-4 sm:p-8 max-w-7xl mx-auto">
        <Suspense
          fallback={
            <div class="flex flex-col items-center justify-center py-20">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4" />
              <p class="text-slate-400">Loading SQL Engine...</p>
            </div>
          }
        >
          {/* Loading State */}
          <Show when={isInitializing()}>
            <div class="flex flex-col items-center justify-center py-20">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4" />
              <p class="text-slate-400">Initializing DuckDB...</p>
              <p class="text-slate-500 text-sm mt-2">Loading file into database</p>
            </div>
          </Show>

          {/* No File State - friendly prompt to upload */}
          <Show when={!isInitializing() && error() === 'No file loaded. Please upload a file first.'}>
            <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center max-w-lg mx-auto">
              <div class="p-4 bg-cyan-500/10 rounded-full w-fit mx-auto mb-6">
                <svg
                  class="w-12 h-12 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-slate-200 mb-2">No Data Loaded</h2>
              <p class="text-slate-400 mb-6">
                Upload a file first to query it with SQL. SQL Mode lets you filter, transform, and explore your data before profiling.
              </p>
              <A
                href="/"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-semibold transition-all shadow-lg"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload a File
              </A>
            </div>
          </Show>

          {/* Other Error State - for actual errors like DuckDB failures */}
          <Show when={!isInitializing() && error() && error() !== 'No file loaded. Please upload a file first.'}>
            <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <svg
                class="w-12 h-12 text-red-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 class="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
              <p class="text-slate-400 mb-4">{error()}</p>
              <A
                href="/"
                class="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Go Back
              </A>
            </div>
          </Show>

          {/* Ready State */}
          <Show when={!isInitializing() && isReady()}>
            <div class="space-y-6">
              {/* File Info Card */}
              <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-emerald-500/20 rounded-lg">
                      <svg
                        class="w-5 h-5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-slate-400">Loaded Table</p>
                      <p class="font-mono text-emerald-400 font-semibold">{tableName()}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-slate-400">
                      {fileStore.store.file?.name}
                    </p>
                    <Show when={rowCount() !== null}>
                      <p class="text-sm text-slate-500">
                        {rowCount()?.toLocaleString()} rows
                      </p>
                    </Show>
                  </div>
                </div>
              </div>

              {/* SQL Editor Section */}
              {/* TODO: Replace with SqlEditor component when created */}
              <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-lg font-semibold text-slate-200">SQL Query</h2>
                  <button
                    onClick={executeQuery}
                    disabled={isQuerying()}
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                  >
                    <Show when={isQuerying()} fallback={
                      <>
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                        </svg>
                        Run Query
                      </>
                    }>
                      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Running...
                    </Show>
                  </button>
                </div>

                <textarea
                  value={query()}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  placeholder="Enter your SQL query..."
                  class="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  spellcheck={false}
                />

                <p class="text-xs text-slate-500 mt-2">
                  Use standard SQL syntax. Table name: <code class="text-emerald-400">{tableName()}</code>
                </p>
              </div>

              {/* Query Error */}
              <Show when={queryError()}>
                <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h3 class="font-semibold text-red-400">Query Error</h3>
                      <p class="text-sm text-slate-400 font-mono mt-1">{queryError()}</p>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Query Results Section */}
              {/* TODO: Replace with QueryResults component when created */}
              <Show when={results()}>
                <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between p-4 border-b border-slate-700">
                    <div>
                      <h2 class="text-lg font-semibold text-slate-200">Query Results</h2>
                      <p class="text-sm text-slate-500">
                        {results()?.length.toLocaleString()} rows returned
                      </p>
                    </div>
                    <button
                      onClick={handleProfileResults}
                      class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Profile Results
                    </button>
                  </div>

                  {/* Results Table */}
                  <div class="overflow-x-auto max-h-96">
                    <table class="w-full text-sm">
                      <thead class="bg-slate-900/50 sticky top-0">
                        <tr>
                          {results() &&
                            results()!.length > 0 &&
                            Object.keys(results()![0]).map((header) => (
                              <th class="px-4 py-3 text-left font-semibold text-slate-300 border-b border-slate-700">
                                {header}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results()?.map((row, idx) => (
                          <tr class={idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}>
                            {Object.values(row).map((value) => (
                              <td class="px-4 py-2 text-slate-400 font-mono text-xs border-b border-slate-700/50 whitespace-nowrap">
                                {value === null || value === undefined ? (
                                  <span class="text-slate-600 italic">null</span>
                                ) : typeof value === 'bigint' ? (
                                  value.toString()
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>

              {/* Empty State when no results yet */}
              <Show when={!results() && !queryError()}>
                <div class="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                  <svg
                    class="w-12 h-12 text-slate-600 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                  <h3 class="text-lg font-semibold text-slate-400 mb-2">Run a Query</h3>
                  <p class="text-slate-500 text-sm max-w-md mx-auto">
                    Write a SQL query above and click "Run Query" to see results.
                    You can then profile the results to get detailed statistics.
                  </p>
                </div>
              </Show>
            </div>
          </Show>
        </Suspense>
      </main>
    </div>
  );
};

export default SqlMode;
