use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A node in the JSON tree structure representing a path
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TreeNode {
    /// JSONPath notation (e.g., "$.user.preferences")
    pub path: String,
    
    /// Nesting depth (0 for root)
    pub depth: usize,
    
    /// Data type at this path
    pub data_type: NodeType,
    
    /// Percentage of rows where this path exists (0.0 - 100.0)
    pub population: f64,
    
    /// Number of direct children
    pub child_count: usize,
    
    /// Example values (up to 3 samples)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub examples: Vec<String>,
    
    /// Child nodes
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<TreeNode>,
}

/// Data type classification for a tree node
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Object,
    Array,
    String,
    Number,
    Boolean,
    Null,
    Mixed, // Multiple types seen at this path
}

impl TreeNode {
    /// Create a new tree node
    pub fn new(path: String, depth: usize, data_type: NodeType) -> Self {
        Self {
            path,
            depth,
            data_type,
            population: 0.0,
            child_count: 0,
            examples: Vec::new(),
            children: Vec::new(),
        }
    }

    /// Add a child node
    pub fn add_child(&mut self, child: TreeNode) {
        self.child_count += 1;
        self.children.push(child);
    }

    /// Add an example value (max 3)
    pub fn add_example(&mut self, value: String) {
        if self.examples.len() < 3 {
            self.examples.push(value);
        }
    }
}

/// Statistics about the overall JSON structure
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StructureAnalysis {
    /// Maximum depth encountered
    pub max_depth: usize,
    
    /// Total number of unique paths discovered
    pub total_paths: usize,
    
    /// Total rows sampled
    pub rows_sampled: usize,
    
    /// Root node of the tree
    pub tree: TreeNode,
    
    /// Recommended profiling mode
    pub recommended_mode: ProfilingMode,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProfilingMode {
    Tabular,  // Can flatten normally
    Tree,     // Use tree mode (column selection)
}

impl StructureAnalysis {
    pub fn new() -> Self {
        Self {
            max_depth: 0,
            total_paths: 0,
            rows_sampled: 0,
            tree: TreeNode::new("$".to_string(), 0, NodeType::Object),
            recommended_mode: ProfilingMode::Tabular,
        }
    }

    /// Determine recommended profiling mode based on structure
    pub fn determine_mode(&mut self) {
        if self.max_depth > 5 || self.total_paths > 1000 {
            self.recommended_mode = ProfilingMode::Tree;
        } else {
            self.recommended_mode = ProfilingMode::Tabular;
        }
    }
}

/// Configuration for structure analysis
#[derive(Clone)]
pub struct StructureConfig {
    /// Maximum number of rows to sample
    pub max_sample_rows: usize,
    
    /// Whether to collect example values
    pub collect_examples: bool,
}

impl Default for StructureConfig {
    fn default() -> Self {
        Self {
            max_sample_rows: 1000,
            collect_examples: true,
        }
    }
}
