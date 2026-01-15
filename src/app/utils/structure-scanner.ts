import init, { analyze_json_structure_wasm } from '../../wasm/pkg/datacert_wasm';

/**
 * Tree node representing a path in JSON structure
 */
export interface TreeNode {
    path: string;
    depth: number;
    data_type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'mixed';
    population: number;  // Percentage (0-100)
    child_count: number;
    examples?: string[];
    children?: TreeNode[];
}

/**
 * Result of JSON structure analysis
 */
export interface StructureAnalysis {
    max_depth: number;
    total_paths: number;
    rows_sampled: number;
    tree: TreeNode;
    recommended_mode: 'tabular' | 'tree';
}

/**
 * Configuration for structure analysis
 */
export interface StructureConfig {
    maxSampleRows?: number;      // Default: 1000
    collectExamples?: boolean;    // Default: true
}

/**
 * Analyze JSON structure without full profiling
 * 
 * This performs a lightweight scan that discovers all paths, types, and population
 * statistics without computing full statistical profiles. Suitable for deeply nested
 * JSON (500+ levels) and wide structures (10k+ columns).
 * 
 * @param data - Raw JSON file data as Uint8Array
 * @param config - Optional configuration
 * @returns Structure analysis with tree hierarchy
 * 
 * @example
 * ```typescript
 * const data = new Uint8Array(await file.arrayBuffer());
 * const analysis = await analyzeJsonStructure(data, {
 *   maxSampleRows: 1000,
 *   collectExamples: true
 * });
 * 
 * console.log(`Found ${analysis.total_paths} paths`);
 * console.log(`Max depth: ${analysis.max_depth}`);
 * console.log(`Recommended mode: ${analysis.recommended_mode}`);
 * ```
 */
export async function analyzeJsonStructure(
    data: Uint8Array,
    config?: StructureConfig
): Promise<StructureAnalysis> {
    // Ensure WASM is initialized
    await init();

    // Call WASM function
    const result = await analyze_json_structure_wasm(
        data,
        config?.maxSampleRows,
        config?.collectExamples
    );

    return result as StructureAnalysis;
}

/**
 * Extract all paths from tree as flat list
 */
export function extractAllPaths(tree: TreeNode): string[] {
    const paths: string[] = [tree.path];

    if (tree.children) {
        for (const child of tree.children) {
            paths.push(...extractAllPaths(child));
        }
    }

    return paths;
}

/**
 * Find node by path in tree
 */
export function findNodeByPath(tree: TreeNode, targetPath: string): TreeNode | null {
    if (tree.path === targetPath) {
        return tree;
    }

    if (tree.children) {
        for (const child of tree.children) {
            const found = findNodeByPath(child, targetPath);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Get tree statistics
 */
export function getTreeStats(tree: TreeNode): {
    totalNodes: number;
    leafNodes: number;
    maxDepth: number;
    avgPopulation: number;
} {
    let totalNodes = 0;
    let leafNodes = 0;
    let maxDepth = tree.depth;
    let totalPopulation = 0;

    function traverse(node: TreeNode) {
        totalNodes++;
        totalPopulation += node.population;
        maxDepth = Math.max(maxDepth, node.depth);

        if (!node.children || node.children.length === 0) {
            leafNodes++;
        } else {
            node.children.forEach(traverse);
        }
    }

    traverse(tree);

    return {
        totalNodes,
        leafNodes,
        maxDepth,
        avgPopulation: totalPopulation / totalNodes,
    };
}
