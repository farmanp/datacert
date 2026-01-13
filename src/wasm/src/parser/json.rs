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

/// Detected JSON format
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum JsonFormat {
    JsonArray,  // Standard JSON array: [{...}, {...}]
    JsonLines,  // JSON Lines: {...}\n{...}\n
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
    headers: Vec<String>,
    header_order: HashMap<String, usize>,
    malformed_count: u32,
    total_rows: u32,
    remainder: String,
    array_stats: HashMap<String, ArrayFieldStats>,
    in_array: bool,
    array_depth: usize,
}

impl JsonParser {
    pub fn new(config: Option<JsonParserConfig>) -> Self {
        Self {
            config: config.unwrap_or_default(),
            format: JsonFormat::Unknown,
            headers: Vec::new(),
            header_order: HashMap::new(),
            malformed_count: 0,
            total_rows: 0,
            remainder: String::new(),
            array_stats: HashMap::new(),
            in_array: false,
            array_depth: 0,
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
            // Default to JSONL for single object starting with {
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
                self.array_depth = 1;
            } else {
                return self.create_empty_result();
            }
        }

        // Process complete objects from the buffer
        loop {
            let (obj_end, obj_str, next_remainder_pos, array_ended) = {
                let trimmed = self.remainder.trim_start();
                if trimmed.is_empty() {
                    (None, None, None, false)
                } else if trimmed.starts_with(']') {
                    let start_idx = self.remainder.len() - trimmed.len();
                    (None, None, Some(start_idx + 1), true)
                } else {
                    let start_idx = self.remainder.len() - trimmed.len();
                    let (actual_trimmed, skip_count) = if trimmed.starts_with(',') {
                        let sub = trimmed[1..].trim_start();
                        (sub, trimmed.len() - sub.len())
                    } else {
                        (trimmed, 0)
                    };

                    if !actual_trimmed.starts_with('{') {
                        (None, None, None, false)
                    } else if let Some((obj_end, obj_str)) = self.find_complete_object(actual_trimmed) {
                        (Some(obj_end), Some(obj_str), Some(start_idx + skip_count + obj_end), false)
                    } else {
                        (None, None, None, false)
                    }
                }
            };

            if array_ended {
                if let Some(pos) = next_remainder_pos {
                    self.remainder = self.remainder[pos..].to_string();
                }
                self.in_array = false;
                break;
            }

            if let Some(obj_str) = obj_str {
                match serde_json::from_str::<Value>(&obj_str) {
                    Ok(Value::Object(map)) => {
                        let row = self.flatten_object(&map, "", 0);
                        rows.push(row);
                        self.total_rows += 1;
                    }
                    _ => {
                        self.malformed_count += 1;
                    }
                }
                if let Some(pos) = next_remainder_pos {
                    self.remainder = self.remainder[pos..].to_string();
                }
            } else {
                break;
            }
        }

        JsonParseResult {
            headers: self.headers.clone(),
            rows,
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
            format: self.format.clone(),
            array_stats: self.array_stats.clone(),
        }
    }

    /// Parse JSONL format incrementally
    fn parse_jsonl_chunk(&mut self) -> JsonParseResult {
        let mut rows = Vec::new();

        // Find complete lines
        while let Some(newline_pos) = self.remainder.find('\n') {
            let line = self.remainder[..newline_pos].trim();

            if !line.is_empty() {
                match serde_json::from_str::<Value>(line) {
                    Ok(Value::Object(map)) => {
                        let row = self.flatten_object(&map, "", 0);
                        rows.push(row);
                        self.total_rows += 1;
                    }
                    Ok(_) => {
                        self.malformed_count += 1;
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
            array_stats: self.array_stats.clone(),
        }
    }

    /// Find a complete JSON object in the string
    fn find_complete_object(&self, s: &str) -> Option<(usize, String)> {
        if !s.starts_with('{') {
            return None;
        }

        let mut depth = 0;
        let mut in_string = false;
        let mut escape_next = false;
        let chars: Vec<char> = s.chars().collect();

        for (i, &c) in chars.iter().enumerate() {
            if escape_next {
                escape_next = false;
                continue;
            }

            match c {
                '\\' if in_string => escape_next = true,
                '"' => in_string = !in_string,
                '{' if !in_string => depth += 1,
                '}' if !in_string => {
                    depth -= 1;
                    if depth == 0 {
                        return Some((i + 1, s[..=i].to_string()));
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
                    output.insert(full_key, format!("[array:{}]", arr.len()));
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
                        Ok(Value::Object(map)) => {
                            let row = self.flatten_object(&map, "", 0);
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
                // Try to parse remaining content as complete array
                let remaining = self.remainder.trim();
                if !remaining.is_empty() && remaining.starts_with('{') {
                    if let Some((_, obj_str)) = self.find_complete_object(remaining) {
                        match serde_json::from_str::<Value>(&obj_str) {
                            Ok(Value::Object(map)) => {
                                let row = self.flatten_object(&map, "", 0);
                                rows.push(row);
                                self.total_rows += 1;
                            }
                            _ => {
                                self.malformed_count += 1;
                            }
                        }
                    }
                }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auto_detect_json_array() {
        let data = r#"[{"id": 1, "name": "Alice"}]"#;
        assert_eq!(JsonParser::auto_detect_format(data), JsonFormat::JsonArray);
    }

    #[test]
    fn test_auto_detect_jsonl() {
        let data = r#"{"id": 1, "name": "Alice"}
{"id": 2, "name": "Bob"}"#;
        assert_eq!(JsonParser::auto_detect_format(data), JsonFormat::JsonLines);
    }

    #[test]
    fn test_parse_json_array() {
        let mut parser = JsonParser::new(None);
        let data = r#"[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]"#;

        let result = parser.parse_chunk(data.as_bytes());
        let final_result = parser.flush();

        assert_eq!(result.format, JsonFormat::JsonArray);
        assert_eq!(result.total_rows + final_result.total_rows - result.total_rows, 2);
        assert!(result.headers.contains(&"id".to_string()));
        assert!(result.headers.contains(&"name".to_string()));
    }

    #[test]
    fn test_parse_jsonl() {
        let mut parser = JsonParser::new(None);
        let data = r#"{"id": 1, "name": "Alice"}
{"id": 2, "name": "Bob"}
"#;

        let result = parser.parse_chunk(data.as_bytes());

        assert_eq!(result.format, JsonFormat::JsonLines);
        assert_eq!(result.total_rows, 2);
        assert!(result.headers.contains(&"id".to_string()));
        assert!(result.headers.contains(&"name".to_string()));
    }

    #[test]
    fn test_nested_object_flattening() {
        let mut parser = JsonParser::new(None);
        let data = r#"{"user": {"name": "Alice", "age": 30}}
"#;

        let result = parser.parse_chunk(data.as_bytes());

        assert!(result.headers.contains(&"user.name".to_string()));
        assert!(result.headers.contains(&"user.age".to_string()));
    }

    #[test]
    fn test_array_field_handling() {
        let mut parser = JsonParser::new(None);
        let data = r#"{"tags": ["a", "b", "c"]}
{"tags": ["x", "y"]}
"#;

        let result = parser.parse_chunk(data.as_bytes());

        assert!(result.headers.contains(&"tags".to_string()));

        let stats = result.array_stats.get("tags").unwrap();
        assert_eq!(stats.min_length, 2);
        assert_eq!(stats.max_length, 3);
        assert_eq!(stats.count, 2);
    }

    #[test]
    fn test_chunked_jsonl_parsing() {
        let mut parser = JsonParser::new(None);

        // First chunk - incomplete line
        let chunk1 = r#"{"id": 1, "name": "Ali"#;
        let res1 = parser.parse_chunk(chunk1.as_bytes());
        assert_eq!(res1.total_rows, 0);

        // Second chunk - completes first line and adds second
        let chunk2 = r#"ce"}
{"id": 2, "name": "Bob"}
"#;
        let res2 = parser.parse_chunk(chunk2.as_bytes());
        assert_eq!(res2.total_rows, 2);
    }

    #[test]
    fn test_chunked_json_array_parsing() {
        let mut parser = JsonParser::new(None);

        // First chunk - array start and partial object
        let chunk1 = r#"[{"id": 1, "name":"#;
        let res1 = parser.parse_chunk(chunk1.as_bytes());
        assert_eq!(res1.total_rows, 0);

        // Second chunk - completes first object
        let chunk2 = r#" "Alice"}, {"id": 2, "name": "Bob"}]"#;
        let res2 = parser.parse_chunk(chunk2.as_bytes());
        assert_eq!(res2.total_rows, 2);
    }

    #[test]
    fn test_malformed_json() {
        let mut parser = JsonParser::new(None);
        let data = r#"{"id": 1, "name": "Alice"}
{invalid json}
{"id": 3, "name": "Carol"}
"#;

        let result = parser.parse_chunk(data.as_bytes());

        assert_eq!(result.total_rows, 2);
        assert_eq!(result.malformed_count, 1);
    }

    #[test]
    fn test_depth_limit() {
        let config = JsonParserConfig {
            max_nested_depth: 2,
            max_keys_per_object: 500,
        };
        let mut parser = JsonParser::new(Some(config));

        let data = r#"{"level1": {"level2": {"level3": {"level4": "too deep"}}}}
"#;

        let result = parser.parse_chunk(data.as_bytes());

        // level3 should be serialized as JSON string, not flattened further
        assert!(result.headers.contains(&"level1.level2.level3".to_string()));
        assert!(!result.headers.contains(&"level1.level2.level3.level4".to_string()));
    }

    #[test]
    fn test_null_and_boolean_values() {
        let mut parser = JsonParser::new(None);
        let data = r#"{"active": true, "deleted": false, "middle_name": null}
"#;

        let result = parser.parse_chunk(data.as_bytes());

        assert!(result.headers.contains(&"active".to_string()));
        assert!(result.headers.contains(&"deleted".to_string()));
        assert!(result.headers.contains(&"middle_name".to_string()));

        // Check values in first row
        let active_idx = result.headers.iter().position(|h| h == "active").unwrap();
        let deleted_idx = result.headers.iter().position(|h| h == "deleted").unwrap();

        assert_eq!(result.rows[0][active_idx], "true");
        assert_eq!(result.rows[0][deleted_idx], "false");
    }

    #[test]
    fn test_flush_remaining_jsonl() {
        let mut parser = JsonParser::new(None);

        // Data without trailing newline
        let data = r#"{"id": 1, "name": "Alice"}"#;
        let result = parser.parse_chunk(data.as_bytes());
        assert_eq!(result.total_rows, 0);

        // Flush should process the remaining data
        let flush_result = parser.flush();
        assert_eq!(flush_result.total_rows, 1);
    }
}
