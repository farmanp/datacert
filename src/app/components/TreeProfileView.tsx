import { Component, Show, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { TreeNode } from './TreeNode';
import { TreeNodeDetail } from './TreeNodeDetail';
import { treeStore } from '../stores/treeStore';
import { analyzeJsonStructure, extractAllPaths } from '../utils/structure-scanner';
import { fileStore } from '../stores/fileStore';

/**
 * Main tree profile view for column selection
 */
export const TreeProfileView: Component = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = createSignal('');
    const [isProfiling, setIsProfiling] = createSignal(false);

    // Run structure analysis on mount
    onMount(async () => {
        const file = fileStore.store.file?.file;
        if (!file) {
            navigate('/');
            return;
        }

        try {
            treeStore.setAnalyzing(true);
            const data = new Uint8Array(await file.arrayBuffer());
            const analysis = await analyzeJsonStructure(data, {
                maxSampleRows: 1000,
                collectExamples: true,
            });

            treeStore.setAnalysis(analysis);
        } catch (error) {
            treeStore.setError(`Failed to analyze structure: ${error}`);
        } finally {
            treeStore.setAnalyzing(false);
        }
    });

    const handleSearchChange = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setSearchQuery(value);
        treeStore.setSearchQuery(value);
    };

    const handleSelectAll = () => {
        const analysis = treeStore.state.analysis;
        if (!analysis) return;

        const allPaths = extractAllPaths(analysis.tree).filter(p => p !== '$');
        treeStore.selectAll(allPaths);
    };

    const handleClearSelection = () => {
        treeStore.clearSelection();
    };

    const handleExpandAll = () => {
        const analysis = treeStore.state.analysis;
        if (!analysis) return;

        const allPaths = extractAllPaths(analysis.tree);
        treeStore.expandAll(allPaths);
    };

    const handleCollapseAll = () => {
        treeStore.collapseAll();
    };

    const handleProfileSelected = async () => {
        const selectedPaths = treeStore.getSelectedPaths();
        if (selectedPaths.length === 0) {
            treeStore.setError('Please select at least one column');
            return;
        }

        setIsProfiling(true);
        try {
            const file = fileStore.store.file?.file;
            if (!file) {
                throw new Error('No file loaded');
            }

            // Read the JSON file
            const data = new Uint8Array(await file.arrayBuffer());
            const jsonText = new TextDecoder().decode(data);

            // Parse JSON (handle both array and lines format)
            let jsonData: any[];
            const trimmed = jsonText.trim();

            if (trimmed.startsWith('[')) {
                // JSON array format
                jsonData = JSON.parse(jsonText);
            } else {
                // JSON Lines format
                jsonData = trimmed.split('\n')
                    .filter(line => line.trim())
                    .map(line => JSON.parse(line));
            }

            // Extract only selected paths from each row
            const extractValue = (obj: any, path: string): any => {
                // Remove leading $. and split by .
                const parts = path.replace(/^\$\./, '').split('.');
                let value = obj;

                for (const part of parts) {
                    if (value == null) return null;
                    value = value[part];
                }

                return value;
            };

            // Build rows with only selected columns
            const headers = selectedPaths.map(path => path.replace(/^\$\./, ''));
            const rows: Record<string, unknown>[] = jsonData.map(row => {
                const newRow: Record<string, unknown> = {};
                selectedPaths.forEach((path, idx) => {
                    const value = extractValue(row, path);
                    newRow[headers[idx]] = value;
                });
                return newRow;
            });

            // Use profileStore's profileFromRows to profile the selected columns
            const { profileStore: profileStoreImport } = await import('../stores/profileStore');
            profileStoreImport.profileFromRows(rows, headers);

            // Navigate to results
            setTimeout(() => {
                navigate('/');
            }, 100);
        } catch (error) {
            treeStore.setError(`Profiling failed: ${error}`);
        } finally {
            setIsProfiling(false);
        }
    };

    const selectedCount = () => treeStore.getSelectedCount();
    const maxColumns = () => treeStore.getMaxColumns();
    const analysis = () => treeStore.state.analysis;
    const error = () => treeStore.state.error;
    const isAnalyzing = () => treeStore.state.isAnalyzing;

    return (
        <div class="tree-profile-view min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div class="max-w-7xl mx-auto">
                {/* Header */}
                <div class="mb-6">
                    <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Select Columns to Profile
                    </h1>
                    <p class="text-slate-600 dark:text-slate-400">
                        Choose up to {maxColumns()} columns from your JSON structure
                    </p>
                </div>

                {/* Loading State */}
                <Show when={isAnalyzing()}>
                    <div class="flex items-center justify-center py-12">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p class="text-slate-600 dark:text-slate-400">
                                Analyzing JSON structure...
                            </p>
                        </div>
                    </div>
                </Show>

                {/* Error State */}
                <Show when={error()}>
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                        <p class="text-red-800 dark:text-red-200">
                            {error()}
                        </p>
                    </div>
                </Show>

                {/* Structure Stats */}
                <Show when={analysis() && !isAnalyzing()}>
                    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div class="text-sm text-slate-500 dark:text-slate-400">Total Paths</div>
                                <div class="text-2xl font-bold text-slate-900 dark:text-white">
                                    {analysis()!.total_paths}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm text-slate-500 dark:text-slate-400">Max Depth</div>
                                <div class="text-2xl font-bold text-slate-900 dark:text-white">
                                    {analysis()!.max_depth}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm text-slate-500 dark:text-slate-400">Rows Sampled</div>
                                <div class="text-2xl font-bold text-slate-900 dark:text-white">
                                    {analysis()!.rows_sampled.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm text-slate-500 dark:text-slate-400">Recommended</div>
                                <div class="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                                    {analysis()!.recommended_mode} Mode
                                </div>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* Actions Bar */}
                <Show when={analysis() && !isAnalyzing()}>
                    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-4">
                        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            {/* Search */}
                            <div class="flex-1 w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="Search paths..."
                                    value={searchQuery()}
                                    onInput={handleSearchChange}
                                    class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Tree Actions */}
                            <div class="flex gap-2">
                                <button
                                    onClick={handleExpandAll}
                                    class="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={handleCollapseAll}
                                    class="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                >
                                    Collapse All
                                </button>
                            </div>

                            {/* Selection Actions */}
                            <div class="flex gap-2">
                                <button
                                    onClick={handleSelectAll}
                                    class="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={handleClearSelection}
                                    class="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                    disabled={selectedCount() === 0}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Selection Counter */}
                        <div class="mt-4 flex items-center justify-between">
                            <div class="text-sm text-slate-600 dark:text-slate-400">
                                Selected: <span class="font-semibold text-slate-900 dark:text-white">
                                    {selectedCount()}
                                </span> / {maxColumns()}
                            </div>

                            {/* Profile Button */}
                            <button
                                onClick={handleProfileSelected}
                                disabled={selectedCount() === 0 || isProfiling()}
                                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                            >
                                {isProfiling() ? 'Profiling...' : 'Profile Selected Columns'}
                            </button>
                        </div>
                    </div>
                </Show>

                {/* Tree View with Detail Panel */}
                <Show when={analysis() && !isAnalyzing()}>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Tree (2/3 width on large screens) */}
                        <div class="lg:col-span-2">
                            <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                                <TreeNode node={analysis()!.tree} searchQuery={searchQuery()} />
                            </div>
                        </div>

                        {/* Detail Panel (1/3 width on large screens) */}
                        <div class="lg:col-span-1">
                            <TreeNodeDetail />
                        </div>
                    </div>
                </Show>
            </div>
        </div>
    );
};
