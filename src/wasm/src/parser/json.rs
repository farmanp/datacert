use serde::{Deserialize, Serialize};
use serde_json::{Value, Map};
use std::collections::HashMap;

/// Result of JSON parsing, compatible with CSV ParseResult structure
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JsonParseResult {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub malformed_count: u32,
    pub total_rows: u32,
    pub format: JsonFormat,
    pub structure: JsonStructure,
    pub array_stats: HashMap<String, ArrayFieldStats>,
}

/// Statistics for array-type fields
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArrayFieldStats {
    pub min_length: usize,
    pub max_length: usize,
    pub total_length: usize,
    pub count: usize,
}

impl ArrayFieldStats {
    pub fn update(&mut self, length: usize) {
        if self.count == 0 {
            self.min_length = length;
            self.max_length = length;
        } else {
            self.min_length = self.min_length.min(length);
            self.max_length = self.max_length.max(length);
        }
        self.total_length += length;
        self.count += 1;
    }

    pub fn avg_length(&self) -> f64 {
        if self.count == 0 {
            0.0
        } else {
            self.total_length as f64 / self.count as f64
        }
    }
}

/// Detected JSON format (container type)
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum JsonFormat {
    JsonArray,  // Standard JSON array: [{...}, {...}]
    JsonLines,  // JSON Lines: {...}\n{...}\n
    Unknown,
}

/// Detected content structure
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum JsonStructure {
    ArrayOfObjects,      // [{ "a": 1 }, { "a": 2 }]
    ArrayOfArrays,       // [[1, 2], [3, 4]] - treated as 1 col
    ArrayOfPrimitives,   // [1, 2, 3] - treated as 1 col
    MixedArray,          // [{...}, 1]
    NewlineDelimitedObjects, // {...}\n{...}
    SingleObject,        // {...}
    Unknown,
}

/// Configuration for the JSON parser
#[derive(Clone)]
pub struct JsonParserConfig {
    pub max_nested_depth: usize,
    pub max_keys_per_object: usize,
}

impl Default for JsonParserConfig {
    fn default() -> Self {
        Self {
            max_nested_depth: 3,
            max_keys_per_object: 500,
        }
    }
}

/// Streaming JSON/JSONL parser
pub struct JsonParser {
    config: JsonParserConfig,
    format: JsonFormat,
    structure: JsonStructure,
    headers: Vec<String>,
    header_order: HashMap<String, usize>,
    malformed_count: u32,
    total_rows: u32,
    remainder: String,
    array_stats: HashMap<String, ArrayFieldStats>,
    in_array: bool,
    // array_depth: usize, // Removed unused field
}

impl JsonParser {
    pub fn new(config: Option<JsonParserConfig>) -> Self {
        Self {
            config: config.unwrap_or_default(),
            format: JsonFormat::Unknown,
            structure: JsonStructure::Unknown,
            headers: Vec::new(),
            header_order: HashMap::new(),
            malformed_count: 0,
            total_rows: 0,
            remainder: String::new(),
            array_stats: HashMap::new(),
            in_array: false,
            // array_depth: 0,
        }
    }

    /// Auto-detect JSON format from initial data
    pub fn auto_detect_format(data: &str) -> JsonFormat {
        let trimmed = data.trim_start();

        if trimmed.starts_with('[') {
            JsonFormat::JsonArray
        } else if trimmed.starts_with('{') {
            // Could be JSONL or a single object
            // Check if there are multiple lines with objects
            let lines: Vec<&str> = trimmed.lines().collect();
            if lines.len() > 1 {
                // Check if second non-empty line starts with {
                for line in lines.iter().skip(1) {
                    let trimmed_line = line.trim();
                    if !trimmed_line.is_empty() {
                        if trimmed_line.starts_with('{') {
                            return JsonFormat::JsonLines;
                        }
                        break;
                    }
                }
            }
            // Default to JSONL for single object starting with { (treat as 1-row JSONL)
            JsonFormat::JsonLines
        } else {
            JsonFormat::Unknown
        }
    }

    /// Set the format explicitly
    pub fn set_format(&mut self, format: JsonFormat) {
        self.format = format;
    }

    /// Parse a chunk of JSON data
    pub fn parse_chunk(&mut self, chunk: &[u8]) -> JsonParseResult {
        let chunk_str = String::from_utf8_lossy(chunk);
        self.remainder.push_str(&chunk_str);

        // Auto-detect format if not yet determined
        if self.format == JsonFormat::Unknown {
            self.format = Self::auto_detect_format(&self.remainder);
        }

        match self.format {
            JsonFormat::JsonArray => self.parse_json_array_chunk(),
            JsonFormat::JsonLines => self.parse_jsonl_chunk(),
            JsonFormat::Unknown => self.create_empty_result(),
        }
    }

    /// Parse JSON array format incrementally
    fn parse_json_array_chunk(&mut self) -> JsonParseResult {
        let mut rows = Vec::new();

        // Find the start of the array
        if !self.in_array {
            if let Some(start_pos) = self.remainder.find('[') {
                let new_remainder = self.remainder[start_pos + 1..].to_string();
                self.remainder = new_remainder;
                self.in_array = true;
                // self.array_depth = 1;
            } else {
                return self.create_empty_result();
            }
        }

        // Process items from the buffer
        loop {
            let trimmed = self.remainder.trim_start();
            if trimmed.is_empty() {
                break; // Wait for more data
            }

            // Check for end of array
            if trimmed.starts_with(']') {
                let start_idx = self.remainder.len() - trimmed.len();
                self.remainder = self.remainder[start_idx + 1..].to_string();
                self.in_array = false;
                break;
            }

            // Handle comma if present
            let (actual_data, offset) = if trimmed.starts_with(',') {
                let sub = trimmed[1..].trim_start();
                (sub, trimmed.len() - sub.len())
            } else {
                (trimmed, 0)
            };
            
            let start_idx = self.remainder.len() - trimmed.len();
            let effective_start = start_idx + offset;

            // Find next separator (comma or end bracket)
            match self.find_next_value_separator(actual_data) {
                Some((end_pos, is_end_bracket)) => {
                    let item_str = &actual_data[..end_pos];
                    
                    // Parse item
                    match serde_json::from_str::<Value>(item_str) {
                        Ok(val) => {
                            self.update_structure(&val);
                            let row = self.flatten_value(&val);
                            rows.push(row);
                            self.total_rows += 1;
                        }
                        Err(_) => {
                            self.malformed_count += 1;
                        }
                    }

                    // Advance remainder
                    // If is_end_bracket, we consume up to end_pos, but NOT the bracket itself (loop handles it next)
                    // Wait, logic: `find_next_value_separator` returns index of `,` or `]`. 
                    // So `item_str` excludes `,` or `]`. 
                    // We advance `self.remainder` past `item_str`.
                    // The loop will then see `,` or `]` at start of `trimmed`.
                    
                    // actually `effective_start` is index in `self.remainder` where `actual_data` starts.
                    // `end_pos` is index in `actual_data`.
                    let advance = effective_start + end_pos;
                    self.remainder = self.remainder[advance..].to_string();
                    
                    // Note: We don't break if `is_end_bracket` because the NEXT iteration will see the `]`. 
                    // This allows us to process the item we just found.
                }
                None => {
                    // Incomplete item, wait for more data
                    break;
                }
            }
        }

        JsonParseResult {
            headers: self.headers.clone(),
            rows,
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
            format: self.format.clone(),
            structure: self.structure.clone(),
            array_stats: self.array_stats.clone(),
        }
    }

    /// Parse JSONL format incrementally
    fn parse_jsonl_chunk(&mut self) -> JsonParseResult {
        let mut rows = Vec::new();
        
        if self.structure == JsonStructure::Unknown {
            self.structure = JsonStructure::NewlineDelimitedObjects;
        }

        // Find complete lines
        while let Some(newline_pos) = self.remainder.find('\n') {
            let line = self.remainder[..newline_pos].trim();

            if !line.is_empty() {
                match serde_json::from_str::<Value>(line) {
                    Ok(val) => {
                        // For JSONL, we usually expect objects, but could be mixed
                        // update_structure checks types
                        self.update_structure(&val);
                        let row = self.flatten_value(&val);
                        rows.push(row);
                        self.total_rows += 1;
                    }
                    Err(_) => {
                        self.malformed_count += 1;
                    }
                }
            }

            self.remainder = self.remainder[newline_pos + 1..].to_string();
        }

        JsonParseResult {
            headers: self.headers.clone(),
            rows,
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
            format: self.format.clone(),
            structure: self.structure.clone(),
            array_stats: self.array_stats.clone(),
        }
    }

    /// Update detected structure based on observed value
    fn update_structure(&mut self, val: &Value) {
        let current = match val {
            Value::Object(_) => JsonStructure::ArrayOfObjects,
            Value::Array(_) => JsonStructure::ArrayOfArrays,
            _ => JsonStructure::ArrayOfPrimitives, // Numbers, Strings, Bools, Nulls
        };

        if self.format == JsonFormat::JsonLines {
             // For JSONL, simpler mapping
             match val {
                 Value::Object(_) => self.structure = JsonStructure::NewlineDelimitedObjects,
                 _ => self.structure = JsonStructure::Unknown, // Or specialized JSONL type
             }
             return;
        }

        // State transition for Arrays
        match self.structure {
            JsonStructure::Unknown => self.structure = current,
            JsonStructure::ArrayOfObjects => {
                if current != JsonStructure::ArrayOfObjects {
                    self.structure = JsonStructure::MixedArray;
                }
            },
            JsonStructure::ArrayOfPrimitives => {
                if current != JsonStructure::ArrayOfPrimitives {
                    self.structure = JsonStructure::MixedArray;
                }
            },
            JsonStructure::ArrayOfArrays => {
                if current != JsonStructure::ArrayOfArrays {
                    self.structure = JsonStructure::MixedArray;
                }
            }
            JsonStructure::MixedArray => {}, // Already mixed
            _ => {}, 
        }
    }

    /// Flatten any JSON Value into a row
    fn flatten_value(&mut self, val: &Value) -> Vec<String> {
        match val {
            Value::Object(map) => self.flatten_object(map, "", 0),
            _ => {
                // Treat primitive/array as a single column "value"
                let mut flat_values = HashMap::new();
                let key = "value".to_string();
                
                let str_val = match val {
                    Value::String(s) => s.clone(),
                    Value::Null => String::new(),
                    _ => val.to_string(),
                };
                
                self.ensure_header(&key);
                flat_values.insert(key.clone(), str_val);
                
                // Construct row
                let mut row = vec![String::new(); self.headers.len()];
                if let Some(&idx) = self.header_order.get(&key) {
                    row[idx] = flat_values.remove(&key).unwrap();
                }
                row
            }
        }
    }

    /// Find the index of the next separator (comma or end bracket) at current depth
    fn find_next_value_separator(&self, s: &str) -> Option<(usize, bool)> {
        let mut depth_obj = 0;
        let mut depth_arr = 0;
        let mut in_string = false;
        let mut escape_next = false;

        for (i, c) in s.char_indices() {
            if escape_next {
                escape_next = false;
                continue;
            }
            
            if in_string {
                match c {
                    '\\' => escape_next = true,
                    '"' => in_string = false,
                    _ => {}
                }
                continue;
            }

            match c {
                '"' => in_string = true,
                '{' => depth_obj += 1,
                '}' => depth_obj -= 1,
                '[' => depth_arr += 1,
                ']' => {
                    if depth_arr == 0 && depth_obj == 0 {
                        return Some((i, true));
                    }
                    if depth_arr > 0 { depth_arr -= 1; }
                }
                ',' => {
                    if depth_arr == 0 && depth_obj == 0 {
                        return Some((i, false));
                    }
                }
                _ => {}
            }
        }
        None
    }

    /// Flatten a JSON object into column values with dot notation
    fn flatten_object(&mut self, obj: &Map<String, Value>, prefix: &str, depth: usize) -> Vec<String> {
        let mut flat_values: HashMap<String, String> = HashMap::new();

        self.flatten_recursive(obj, prefix, depth, &mut flat_values);

        // Ensure all headers exist in the output
        let mut row = vec![String::new(); self.headers.len()];
        for (key, value) in flat_values {
            if let Some(&idx) = self.header_order.get(&key) {
                row[idx] = value;
            }
        }

        row
    }

    /// Recursive helper for flattening
    fn flatten_recursive(
        &mut self,
        obj: &Map<String, Value>,
        prefix: &str,
        depth: usize,
        output: &mut HashMap<String, String>,
    ) {
        if depth > self.config.max_nested_depth {
            return;
        }

        for (key, value) in obj {
            let full_key = if prefix.is_empty() {
                key.clone()
            } else {
                format!("{}.{}", prefix, key)
            };

            // Check max keys limit
            if self.headers.len() >= self.config.max_keys_per_object && !self.header_order.contains_key(&full_key) {
                continue;
            }

            match value {
                Value::Object(nested) if depth < self.config.max_nested_depth => {
                    self.flatten_recursive(nested, &full_key, depth + 1, output);
                }
                Value::Array(arr) => {
                    // Track array stats
                    let stats = self.array_stats.entry(full_key.clone()).or_default();
                    stats.update(arr.len());

                    // Store array as JSON string representation
                    self.ensure_header(&full_key);
                    output.insert(full_key, format!("[array:{}]
", arr.len()));
                }
                Value::Null => {
                    self.ensure_header(&full_key);
                    output.insert(full_key, String::new());
                }
                Value::Bool(b) => {
                    self.ensure_header(&full_key);
                    output.insert(full_key, b.to_string());
                }
                Value::Number(n) => {
                    self.ensure_header(&full_key);
                    output.insert(full_key, n.to_string());
                }
                Value::String(s) => {
                    self.ensure_header(&full_key);
                    output.insert(full_key, s.clone());
                }
                Value::Object(_) => {
                    // At max depth, serialize as JSON string
                    self.ensure_header(&full_key);
                    output.insert(full_key, value.to_string());
                }
            }
        }
    }

    /// Ensure a header exists in the headers list
    fn ensure_header(&mut self, key: &str) {
        if !self.header_order.contains_key(key) {
            self.header_order.insert(key.to_string(), self.headers.len());
            self.headers.push(key.to_string());
        }
    }

    /// Create an empty result
    fn create_empty_result(&self) -> JsonParseResult {
        JsonParseResult {
            headers: self.headers.clone(),
            rows: Vec::new(),
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
            format: self.format.clone(),
            structure: self.structure.clone(),
            array_stats: self.array_stats.clone(),
        }
    }

    /// Flush any remaining data in the buffer
    pub fn flush(&mut self) -> JsonParseResult {
        let mut rows = Vec::new();

        match self.format {
            JsonFormat::JsonLines => {
                // Process any remaining line without newline
                let remaining = self.remainder.trim();
                if !remaining.is_empty() {
                    match serde_json::from_str::<Value>(remaining) {
                        Ok(val) => {
                            self.update_structure(&val);
                            let row = self.flatten_value(&val);
                            rows.push(row);
                            self.total_rows += 1;
                        }
                        _ => {
                            self.malformed_count += 1;
                        }
                    }
                }
            }
            JsonFormat::JsonArray => {
                // If there's valid data remaining (unlikely if loop works right, but edge cases)
                // In array mode, find_next_value_separator relies on commas.
                // If the stream ended abruptly, we might have half an object.
                // We can't really recover incomplete JSON.
            }
            JsonFormat::Unknown => {}
        }

        self.remainder.clear();

        JsonParseResult {
            headers: self.headers.clone(),
            rows,
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
            format: self.format.clone(),
            structure: self.structure.clone(),
            array_stats: self.array_stats.clone(),
        }
    }

    /// Get current format
    pub fn get_format(&self) -> &JsonFormat {
        &self.format
    }

    /// Get array field statistics
    pub fn get_array_stats(&self) -> &HashMap<String, ArrayFieldStats> {
        &self.array_stats
    }
}

// ============================================================================
// Structural Analysis (for Tree Mode)
// ============================================================================

use crate::stats::tree::{TreeNode, StructureAnalysis, StructureConfig, NodeType};

/// Analyze JSON structure without full profiling
/// This is a lightweight scan that discovers paths, types, and population
pub fn analyze_json_structure(
    data: &[u8],
    config: Option<StructureConfig>
) -> Result<StructureAnalysis, String> {
    let config = config.unwrap_or_default();
    let data_str = String::from_utf8_lossy(data);
    
    // Detect format
    let format = JsonParser::auto_detect_format(&data_str);
    
    let mut analysis = StructureAnalysis::new();
    let mut path_tracker = PathTracker::new(config.collect_examples);
    let mut rows_processed = 0;
    
    // Parse JSON and track paths
    match format {
        JsonFormat::JsonArray => {
            // Parse as array
            match serde_json::from_str::<Value>(&data_str) {
                Ok(Value::Array(items)) => {
                    for (idx, item) in items.iter().enumerate() {
                        if rows_processed >= config.max_sample_rows {
                            break;
                        }
                        path_tracker.track_value("$", item, 0);
                        rows_processed += 1;
                    }
                }
                _ => return Err("Invalid JSON array format".to_string()),
            }
        }
        JsonFormat::JsonLines => {
            // Parse line by line
            for line in data_str.lines() {
                if rows_processed >= config.max_sample_rows {
                    break;
                }
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                match serde_json::from_str::<Value>(trimmed) {
                    Ok(value) => {
                        path_tracker.track_value("$", &value, 0);
                        rows_processed += 1;
                    }
                    Err(_) => continue,
                }
            }
        }
        JsonFormat::Unknown => {
            return Err("Unable to detect JSON format".to_string());
        }
    }
    
    // Convert tracked paths to tree structure
    analysis.tree = path_tracker.build_tree(rows_processed);
    analysis.total_paths = path_tracker.paths.len();
    analysis.max_depth = path_tracker.max_depth;
    analysis.rows_sampled = rows_processed;
    analysis.determine_mode();
    
    Ok(analysis)
}

/// Helper struct to track paths during scanning
struct PathTracker {
    paths: HashMap<String, PathInfo>,
    max_depth: usize,
    collect_examples: bool,
}

struct PathInfo {
    count: usize,
    types_seen: std::collections::HashSet<String>,
    examples: Vec<String>,
    depth: usize,
}

impl PathTracker {
    fn new(collect_examples: bool) -> Self {
        Self {
            paths: HashMap::new(),
            max_depth: 0,
            collect_examples,
        }
    }
    
    fn track_value(&mut self, path: &str, value: &Value, depth: usize) {
        self.max_depth = self.max_depth.max(depth);
        
        // Record this path
        let info = self.paths.entry(path.to_string()).or_insert(PathInfo {
            count: 0,
            types_seen: std::collections::HashSet::new(),
            examples: Vec::new(),
            depth,
        });
        info.count += 1;
        
        // Determine type
        let type_str = match value {
            Value::Object(_) => "object",
            Value::Array(_) => "array",
            Value::String(_) => "string",
            Value::Number(_) => "number",
            Value::Bool(_) => "boolean",
            Value::Null => "null",
        };
        info.types_seen.insert(type_str.to_string());
        
        // Collect example
        if self.collect_examples && info.examples.len() < 3 {
            let example = match value {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                _ => String::new(),
            };
            if !example.is_empty() {
                info.examples.push(example);
            }
        }
        
        // Recursively track children
        match value {
            Value::Object(map) => {
                for (key, child_value) in map {
                    let child_path = if path == "$" {
                        format!("$.{}", key)
                    } else {
                        format!("{}.{}", path, key)
                    };
                    self.track_value(&child_path, child_value, depth + 1);
                }
            }
            Value::Array(arr) => {
                // For arrays, track the array itself but don't expand indices
                // Just note that it's an array type
            }
            _ => {}
        }
    }
    
    fn build_tree(&self, total_rows: usize) -> TreeNode {
        let mut root = TreeNode::new("$".to_string(), 0, NodeType::Object);
        
        // Group paths by their parent
        let mut children_map: HashMap<String, Vec<String>> = HashMap::new();
        for path in self.paths.keys() {
            if path == "$" {
                continue;
            }
            let parent = self.get_parent_path(path);
            children_map.entry(parent).or_insert_with(Vec::new).push(path.clone());
        }
        
        // Build tree recursively
        self.build_node(&mut root, &children_map, total_rows);
        
        root
    }
    
    fn build_node(
        &self,
        node: &mut TreeNode,
        children_map: &HashMap<String, Vec<String>>,
        total_rows: usize,
    ) {
        // Get info for this node
        if let Some(info) = self.paths.get(&node.path) {
            node.population = (info.count as f64 / total_rows as f64) * 100.0;
            node.data_type = self.determine_node_type(&info.types_seen);
            node.examples = info.examples.clone();
        }
        
        // Add children
        if let Some(child_paths) = children_map.get(&node.path) {
            for child_path in child_paths {
                if let Some(child_info) = self.paths.get(child_path) {
                    let mut child_node = TreeNode::new(
                        child_path.clone(),
                        child_info.depth,
                        self.determine_node_type(&child_info.types_seen),
                    );
                    self.build_node(&mut child_node, children_map, total_rows);
                    node.add_child(child_node);
                }
            }
        }
    }
    
    fn get_parent_path(&self, path: &str) -> String {
        if path == "$" {
            return "$".to_string();
        }
        match path.rfind('.') {
            Some(pos) => path[..pos].to_string(),
            None => "$".to_string(),
        }
    }
    
    fn determine_node_type(&self, types_seen: &std::collections::HashSet<String>) -> NodeType {
        if types_seen.len() > 1 {
            return NodeType::Mixed;
        }
        match types_seen.iter().next().map(|s| s.as_str()) {
            Some("object") => NodeType::Object,
            Some("array") => NodeType::Array,
            Some("string") => NodeType::String,
            Some("number") => NodeType::Number,
            Some("boolean") => NodeType::Boolean,
            Some("null") => NodeType::Null,
            _ => NodeType::Mixed,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::stats::tree::{NodeType, ProfilingMode, StructureConfig};

    #[test]
    fn test_auto_detect_json_array() {
        let data = r#"[{"id": 1, "name": "Alice"}]"#;
        assert_eq!(JsonParser::auto_detect_format(data), JsonFormat::JsonArray);
    }

    #[test]
    fn test_parse_json_array_objects() {
        let mut parser = JsonParser::new(None);
        let data = r#"[{"id": 1}, {"id": 2}]"#;
        let result = parser.parse_chunk(data.as_bytes());
        assert_eq!(result.structure, JsonStructure::ArrayOfObjects);
        assert_eq!(result.total_rows, 2);
    }

    #[test]
    fn test_parse_json_array_primitives() {
        let mut parser = JsonParser::new(None);
        let data = r#"[1, 2, 3]"#;
        let result = parser.parse_chunk(data.as_bytes());
        assert_eq!(result.structure, JsonStructure::ArrayOfPrimitives);
        assert_eq!(result.total_rows, 3);
        assert_eq!(result.headers, vec!["value"]);
        assert_eq!(result.rows[0][0], "1");
    }

    #[test]
    fn test_parse_mixed_array() {
        let mut parser = JsonParser::new(None);
        let data = r#"[{"id": 1}, 2]"#;
        let result = parser.parse_chunk(data.as_bytes());
        assert_eq!(result.structure, JsonStructure::MixedArray);
        assert_eq!(result.total_rows, 2);
        // Header logic might be tricky for mixed.
        // First item "id": 1 -> Headers: ["id"]
        // Second item 2 -> Headers: ["id", "value"] (if we call flatten_value)
        // Let's verify headers.
        assert!(result.headers.contains(&"id".to_string()));
        assert!(result.headers.contains(&"value".to_string()));
    }

    // ============================================================================
    // Structure Analysis Tests
    // ============================================================================

    #[test]
    fn test_analyze_shallow_json() {
        let data = r#"[
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"}
        ]"#;

        let result = analyze_json_structure(data.as_bytes(), None);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.max_depth, 1);  // $.id, $.name at depth 1
        assert_eq!(analysis.rows_sampled, 2);
        assert!(analysis.total_paths >= 2);  // At least $.id and $.name
        assert_eq!(analysis.recommended_mode, ProfilingMode::Tabular);
    }

    #[test]
    fn test_analyze_deeply_nested_json() {
        let data = r#"[
            {
                "level1": {
                    "level2": {
                        "level3": {
                            "level4": {
                                "level5": {
                                    "value": "deep"
                                }
                            }
                        }
                    }
                }
            }
        ]"#;

        let result = analyze_json_structure(data.as_bytes(), None);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.max_depth, 6);  // level1 through level to value
        assert!(analysis.total_paths >= 6);
        assert_eq!(analysis.recommended_mode, ProfilingMode::Tree);  // depth > 5
    }

    #[test]
    fn test_analyze_wide_json() {
        // Create JSON with many fields
        let mut fields = Vec::new();
        for i in 0..100 {
            fields.push(format!("\"field{}\": {}", i, i));
        }
        let data = format!("[{{{}}}]", fields.join(","));

        let result = analyze_json_structure(data.as_bytes(), None);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.total_paths, 101);  // 100 fields + root $
        assert_eq!(analysis.max_depth, 1);
    }

    #[test]
    fn test_analyze_population_tracking() {
        let data = r#"[
            {"id": 1, "email": "alice@example.com"},
            {"id": 2, "email": "bob@example.com"},
            {"id": 3},
            {"id": 4}
        ]"#;

        let result = analyze_json_structure(data.as_bytes(), None);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        
        // Find the email path in tree
        let mut email_node = None;
        for child in &analysis.tree.children {
            if child.path == "$.email" {
                email_node = Some(child);
                break;
            }
        }
        
        assert!(email_node.is_some());
        let email = email_node.unwrap();
        
        // Email exists in 2 out of 4 rows = 50%
        assert!((email.population - 50.0).abs() < 0.1);
    }

    #[test]
    fn test_analyze_mixed_types() {
        let data = r#"[
            {"value": "string"},
            {"value": 123},
            {"value": true}
        ]"#;

        let result = analyze_json_structure(data.as_bytes(), None);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        
        // Find the value path
        let mut value_node = None;
        for child in &analysis.tree.children {
            if child.path == "$.value" {
                value_node = Some(child);
                break;
            }
        }
        
        assert!(value_node.is_some());
        let value = value_node.unwrap();
        
        // Should detect mixed type
        assert_eq!(value.data_type, NodeType::Mixed);
    }

    #[test]
    fn test_analyze_jsonl_format() {
        let data = r#"{"id": 1, "name": "Alice"}
{"id": 2, "name": "Bob"}
{"id": 3, "name": "Charlie"}"#;

        let result = analyze_json_structure(data.as_bytes(), None);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.rows_sampled, 3);
        assert!(analysis.total_paths >= 2);  // id and name
    }

    #[test]
    fn test_analyze_with_sampling() {
        // Create 2000 rows but only sample 100
        let rows: Vec<String> = (0..2000)
            .map(|i| format!(r#"{{"id": {}, "value": "row{}" }}"#, i, i))
            .collect();
        let data = format!("[{}]", rows.join(","));

        let config = StructureConfig {
            max_sample_rows: 100,
            collect_examples: true,
        };

        let result = analyze_json_structure(data.as_bytes(), Some(config));
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.rows_sampled, 100);  // Only sampled 100, not all 2000
    }

    #[test]
    fn test_analyze_example_collection() {
        let data = r#"[
            {"name": "Alice"},
            {"name": "Bob"},
            {"name": "Charlie"}
        ]"#;

        let config = StructureConfig {
            max_sample_rows: 1000,
            collect_examples: true,
        };

        let result = analyze_json_structure(data.as_bytes(), Some(config));
        assert!(result.is_ok());

        let analysis = result.unwrap();
        
        // Find name node
        let mut name_node = None;
        for child in &analysis.tree.children {
            if child.path == "$.name" {
                name_node = Some(child);
                break;
            }
        }
        
        assert!(name_node.is_some());
        let name = name_node.unwrap();
        
        // Should have collected examples (up to 3)
        assert!(!name.examples.is_empty());
        assert!(name.examples.len() <= 3);
    }
}