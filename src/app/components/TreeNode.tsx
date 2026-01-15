import { Component, Show, For } from 'solid-js';
import type { TreeNode as TreeNodeType } from '../utils/structure-scanner';
import { treeStore } from '../stores/treeStore';

interface TreeNodeProps {
    node: TreeNodeType;
    searchQuery?: string;
}

/**
 * Individual tree node component with checkbox and expand/collapse
 */
export const TreeNode: Component<TreeNodeProps> = (props) => {
    const hasChildren = () => props.node.children && props.node.children.length > 0;
    const isExpanded = () => treeStore.isPathExpanded(props.node.path);
    const isSelected = () => treeStore.isPathSelected(props.node.path);
    const canSelect = () => treeStore.canSelectMore() || isSelected();

    // Check if node matches search query
    const matchesSearch = () => {
        if (!props.searchQuery) return true;
        return props.node.path.toLowerCase().includes(props.searchQuery.toLowerCase());
    };

    // Get display name (last part of path)
    const displayName = () => {
        const parts = props.node.path.split('.');
        return parts[parts.length - 1];
    };

    // Get type icon
    const getTypeIcon = () => {
        switch (props.node.data_type) {
            case 'object': return '📦';
            case 'array': return '📋';
            case 'string': return '📝';
            case 'number': return '🔢';
            case 'boolean': return '☑';
            case 'null': return '∅';
            case 'mixed': return '🔀';
            default: return '•';
        }
    };

    const handleToggleExpand = (e: MouseEvent) => {
        e.stopPropagation();
        if (hasChildren()) {
            treeStore.toggleExpanded(props.node.path);
        }
    };

    const handleToggleSelect = (e: Event) => {
        e.stopPropagation();
        const checkbox = e.target as HTMLInputElement;

        // Try to toggle - it may fail if at limit
        const success = treeStore.togglePath(props.node.path);

        // If failed, reset checkbox to previous state
        if (!success) {
            checkbox.checked = isSelected();
        }
    };

    const handleNodeClick = () => {
        treeStore.selectNodeForDetail(props.node);
    };

    // Highlight search matches
    const highlightedName = () => {
        const name = displayName();
        if (!props.searchQuery) return name;

        const query = props.searchQuery.toLowerCase();
        const index = name.toLowerCase().indexOf(query);

        if (index === -1) return name;

        return (
            <>
                {name.substring(0, index)}
                <mark class="bg-yellow-300 dark:bg-yellow-600">
                    {name.substring(index, index + props.searchQuery.length)}
                </mark>
                {name.substring(index + props.searchQuery.length)}
            </>
        );
    };

    return (
        <div class="tree-node">
            <div
                class="tree-node-header flex items-center gap-2 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer group"
                classList={{
                    'opacity-50': !matchesSearch(),
                    'bg-slate-50 dark:bg-slate-900': treeStore.state.selectedNodeForDetail?.path === props.node.path,
                }}
                onClick={handleNodeClick}
            >
                {/* Expand/collapse button */}
                <button
                    class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    classList={{ 'invisible': !hasChildren() }}
                    onClick={handleToggleExpand}
                    aria-label={isExpanded() ? 'Collapse' : 'Expand'}
                >
                    <Show when={hasChildren()}>
                        <span class="text-sm">{isExpanded() ? '▼' : '▶'}</span>
                    </Show>
                </button>

                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={isSelected()}
                    disabled={!canSelect()}
                    onChange={handleToggleSelect}
                    class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Select ${props.node.path}`}
                />

                {/* Type icon */}
                <span class="text-base" title={props.node.data_type}>
                    {getTypeIcon()}
                </span>

                {/* Node name */}
                <span class="font-mono text-sm text-slate-700 dark:text-slate-300 flex-1">
                    {highlightedName()}
                </span>

                {/* Metadata */}
                <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span title="Population">
                        {props.node.population.toFixed(1)}%
                    </span>

                    <Show when={hasChildren()}>
                        <span title="Child count" class="opacity-60">
                            {props.node.child_count} fields
                        </span>
                    </Show>

                    <Show when={isSelected()}>
                        <span class="text-blue-600 dark:text-blue-400 font-semibold">
                            ✓
                        </span>
                    </Show>
                </div>
            </div>

            {/* Children */}
            <Show when={isExpanded() && hasChildren()}>
                <div class="tree-node-children ml-6 border-l border-slate-200 dark:border-slate-700">
                    <For each={props.node.children}>
                        {(child) => <TreeNode node={child} searchQuery={props.searchQuery} />}
                    </For>
                </div>
            </Show>
        </div>
    );
};
