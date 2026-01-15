import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { TreeNode, StructureAnalysis } from '../utils/structure-scanner';

/**
 * Maximum number of columns that can be selected
 */
const MAX_SELECTED_COLUMNS = 500;

/**
 * State for tree mode column selection
 */
interface TreeState {
    // Structure analysis result
    analysis: StructureAnalysis | null;

    // Selected paths (JSONPath strings)
    selectedPaths: Set<string>;

    // Search/filter query
    searchQuery: string;

    // Currently expanded nodes (for UI state)
    expandedPaths: Set<string>;

    // Currently selected node for detail panel
    selectedNodeForDetail: TreeNode | null;

    // Loading state
    isAnalyzing: boolean;

    // Error state
    error: string | null;
}

const [treeState, setTreeState] = createStore<TreeState>({
    analysis: null,
    selectedPaths: new Set<string>(),
    searchQuery: '',
    expandedPaths: new Set<string>(['$']), // Root expanded by default
    selectedNodeForDetail: null,
    isAnalyzing: false,
    error: null,
});

// Signal for re-rendering when Set changes (SolidJS doesn't track Set mutations)
const [updateTrigger, triggerUpdate] = createSignal(0);

/**
 * Tree store with actions
 */
export const treeStore = {
    get state() {
        updateTrigger(); // Subscribe to updates
        return treeState;
    },

    /**
     * Set the structure analysis result
     */
    setAnalysis(analysis: StructureAnalysis) {
        setTreeState('analysis', analysis);
        setTreeState('selectedPaths', new Set<string>());
        setTreeState('expandedPaths', new Set<string>(['$']));
        setTreeState('searchQuery', '');
        setTreeState('error', null);
        triggerUpdate(v => v + 1);
    },

    /**
     * Toggle path selection
     */
    togglePath(path: string): boolean {
        const selected = new Set(treeState.selectedPaths);

        if (selected.has(path)) {
            // Deselect
            selected.delete(path);
            setTreeState('selectedPaths', selected);
            triggerUpdate(v => v + 1);
            return true;
        } else {
            // Check limit before selecting
            if (selected.size >= MAX_SELECTED_COLUMNS) {
                setTreeState('error', `Maximum ${MAX_SELECTED_COLUMNS} columns can be selected`);
                return false;
            }

            selected.add(path);
            setTreeState('selectedPaths', selected);
            setTreeState('error', null);
            triggerUpdate(v => v + 1);
            return true;
        }
    },

    /**
     * Select all paths (up to limit)
     */
    selectAll(allPaths: string[]) {
        const selected = new Set<string>();

        for (let i = 0; i < Math.min(allPaths.length, MAX_SELECTED_COLUMNS); i++) {
            selected.add(allPaths[i]);
        }

        setTreeState('selectedPaths', selected);

        if (allPaths.length > MAX_SELECTED_COLUMNS) {
            setTreeState('error', `Selected first ${MAX_SELECTED_COLUMNS} of ${allPaths.length} paths`);
        } else {
            setTreeState('error', null);
        }

        triggerUpdate(v => v + 1);
    },

    /**
     * Clear all selections
     */
    clearSelection() {
        setTreeState('selectedPaths', new Set<string>());
        setTreeState('error', null);
        triggerUpdate(v => v + 1);
    },

    /**
     * Set search query
     */
    setSearchQuery(query: string) {
        setTreeState('searchQuery', query);
    },

    /**
     * Toggle node expansion
     */
    toggleExpanded(path: string) {
        const expanded = new Set(treeState.expandedPaths);

        if (expanded.has(path)) {
            expanded.delete(path);
        } else {
            expanded.add(path);
        }

        setTreeState('expandedPaths', expanded);
        triggerUpdate(v => v + 1);
    },

    /**
     * Expand all nodes
     */
    expandAll(allPaths: string[]) {
        setTreeState('expandedPaths', new Set(allPaths));
        triggerUpdate(v => v + 1);
    },

    /**
     * Collapse all nodes except root
     */
    collapseAll() {
        setTreeState('expandedPaths', new Set(['$']));
        triggerUpdate(v => v + 1);
    },

    /**
     * Select node for detail panel
     */
    selectNodeForDetail(node: TreeNode | null) {
        setTreeState('selectedNodeForDetail', node);
    },

    /**
     * Set analyzing state
     */
    setAnalyzing(isAnalyzing: boolean) {
        setTreeState('isAnalyzing', isAnalyzing);
    },

    /**
     * Set error
     */
    setError(error: string | null) {
        setTreeState('error', error);
    },

    /**
     * Reset entire store
     */
    reset() {
        setTreeState({
            analysis: null,
            selectedPaths: new Set<string>(),
            searchQuery: '',
            expandedPaths: new Set<string>(['$']),
            selectedNodeForDetail: null,
            isAnalyzing: false,
            error: null,
        });
        triggerUpdate(v => v + 1);
    },

    /**
     * Get selected paths as array
     */
    getSelectedPaths(): string[] {
        return Array.from(treeState.selectedPaths);
    },

    /**
     * Get selected count
     */
    getSelectedCount(): number {
        return treeState.selectedPaths.size;
    },

    /**
     * Check if path is selected
     */
    isPathSelected(path: string): boolean {
        return treeState.selectedPaths.has(path);
    },

    /**
     * Check if path is expanded
     */
    isPathExpanded(path: string): boolean {
        return treeState.expandedPaths.has(path);
    },

    /**
     * Check if can select more
     */
    canSelectMore(): boolean {
        return treeState.selectedPaths.size < MAX_SELECTED_COLUMNS;
    },

    /**
     * Get max columns
     */
    getMaxColumns(): number {
        return MAX_SELECTED_COLUMNS;
    },
};
