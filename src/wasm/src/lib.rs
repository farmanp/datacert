mod parser;
mod stats;
mod export;
mod quality;

use wasm_bindgen::prelude::*;
use parser::{CsvParser, JsonParser, JsonFormat, JsonParserConfig, AvroProfiler};
use stats::profiler::Profiler;
use stats::correlation::compute_correlation_matrix;

#[wasm_bindgen]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    web_sys::console::log_1(&"DataCert WASM Engine Initialized".into());
}

#[wasm_bindgen]
pub struct DataCertProfiler {
    parser: CsvParser,
    profiler: Option<Profiler>,
}

#[wasm_bindgen]
impl DataCertProfiler {
    #[wasm_bindgen(constructor)]
    pub fn new(delimiter: Option<u8>, has_headers: bool) -> Self {
        Self {
            parser: CsvParser::new(delimiter, has_headers),
            profiler: None,
        }
    }

    pub fn auto_detect_delimiter(&mut self, chunk: &[u8]) -> u8 {
        let delimiter = CsvParser::auto_detect_delimiter(chunk);
        self.parser.set_delimiter(delimiter);
        delimiter
    }

    pub fn parse_and_profile_chunk(&mut self, chunk: &[u8]) -> Result<JsValue, JsValue> {
        let parse_result = self.parser.parse_chunk(chunk);
        
        if self.profiler.is_none() && !parse_result.headers.is_empty() {
            self.profiler = Some(Profiler::new(parse_result.headers.clone()));
        }

        if let Some(ref mut profiler) = self.profiler {
            profiler.update_batch(&parse_result.rows);
        }

        serde_wasm_bindgen::to_value(&parse_result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn finalize(&mut self) -> Result<JsValue, JsValue> {
        // Flush remaining rows from parser
        let flush_result = self.parser.flush();
        
        if let Some(ref mut profiler) = self.profiler {
            profiler.update_batch(&flush_result.rows);
            let stats_result = profiler.finalize();
            return serde_wasm_bindgen::to_value(&stats_result).map_err(|e| JsValue::from_str(&e.to_string()));
        }

        Err(JsValue::from_str("No data was processed"))
    }
}

// Legacy parser export for backward compatibility if needed
#[wasm_bindgen]
pub struct CsvStreamingParser {
    inner: CsvParser,
}

#[wasm_bindgen]
impl CsvStreamingParser {
    #[wasm_bindgen(constructor)]
    pub fn new(delimiter: Option<u8>, has_headers: bool) -> Self {
        Self {
            inner: CsvParser::new(delimiter, has_headers),
        }
    }

    pub fn auto_detect_delimiter(&mut self, chunk: &[u8]) -> u8 {
        let delimiter = CsvParser::auto_detect_delimiter(chunk);
        self.inner.set_delimiter(delimiter);
        delimiter
    }

    pub fn parse_chunk(&mut self, chunk: &[u8]) -> Result<JsValue, JsValue> {
        let result = self.inner.parse_chunk(chunk);
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn flush(&mut self) -> Result<JsValue, JsValue> {
        let result = self.inner.flush();
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

// JSON/JSONL Profiler - combines parsing and profiling
#[wasm_bindgen]
pub struct JsonProfiler {
    parser: JsonParser,
    profiler: Option<Profiler>,
}

#[wasm_bindgen]
impl JsonProfiler {
    #[wasm_bindgen(constructor)]
    pub fn new(max_depth: Option<usize>, max_keys: Option<usize>) -> Self {
        let config = JsonParserConfig {
            max_nested_depth: max_depth.unwrap_or(3),
            max_keys_per_object: max_keys.unwrap_or(500),
        };
        Self {
            parser: JsonParser::new(Some(config)),
            profiler: None,
        }
    }

    pub fn auto_detect_format(&self, chunk: &[u8]) -> String {
        let chunk_str = String::from_utf8_lossy(chunk);
        match JsonParser::auto_detect_format(&chunk_str) {
            JsonFormat::JsonArray => "json_array".to_string(),
            JsonFormat::JsonLines => "jsonl".to_string(),
            JsonFormat::Unknown => "unknown".to_string(),
        }
    }

    pub fn parse_and_profile_chunk(&mut self, chunk: &[u8]) -> Result<JsValue, JsValue> {
        let parse_result = self.parser.parse_chunk(chunk);

        if self.profiler.is_none() && !parse_result.headers.is_empty() {
            self.profiler = Some(Profiler::new(parse_result.headers.clone()));
        }

        if let Some(ref mut profiler) = self.profiler {
            profiler.update_batch(&parse_result.rows);
        }

        serde_wasm_bindgen::to_value(&parse_result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn finalize(&mut self) -> Result<JsValue, JsValue> {
        // Flush remaining data from parser
        let flush_result = self.parser.flush();

        if let Some(ref mut profiler) = self.profiler {
            profiler.update_batch(&flush_result.rows);
            let stats_result = profiler.finalize();
            return serde_wasm_bindgen::to_value(&stats_result).map_err(|e| JsValue::from_str(&e.to_string()));
        }

        Err(JsValue::from_str("No data was processed"))
    }

    pub fn get_format(&self) -> String {
        match self.parser.get_format() {
            JsonFormat::JsonArray => "json_array".to_string(),
            JsonFormat::JsonLines => "jsonl".to_string(),
            JsonFormat::Unknown => "unknown".to_string(),
        }
    }

    pub fn get_array_stats(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(self.parser.get_array_stats())
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

// Standalone JSON streaming parser for backward compatibility
#[wasm_bindgen]
pub struct JsonStreamingParser {
    inner: JsonParser,
}

#[wasm_bindgen]
impl JsonStreamingParser {
    #[wasm_bindgen(constructor)]
    pub fn new(max_depth: Option<usize>, max_keys: Option<usize>) -> Self {
        let config = JsonParserConfig {
            max_nested_depth: max_depth.unwrap_or(3),
            max_keys_per_object: max_keys.unwrap_or(500),
        };
        Self {
            inner: JsonParser::new(Some(config)),
        }
    }

    pub fn auto_detect_format(&self, chunk: &[u8]) -> String {
        let chunk_str = String::from_utf8_lossy(chunk);
        match JsonParser::auto_detect_format(&chunk_str) {
            JsonFormat::JsonArray => "json_array".to_string(),
            JsonFormat::JsonLines => "jsonl".to_string(),
            JsonFormat::Unknown => "unknown".to_string(),
        }
    }

    pub fn set_format(&mut self, format: &str) {
        let json_format = match format {
            "json_array" => JsonFormat::JsonArray,
            "jsonl" => JsonFormat::JsonLines,
            _ => JsonFormat::Unknown,
        };
        self.inner.set_format(json_format);
    }

    pub fn parse_chunk(&mut self, chunk: &[u8]) -> Result<JsValue, JsValue> {
        let result = self.inner.parse_chunk(chunk);
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn flush(&mut self) -> Result<JsValue, JsValue> {
        let result = self.inner.flush();
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn get_format(&self) -> String {
        match self.inner.get_format() {
            JsonFormat::JsonArray => "json_array".to_string(),
            JsonFormat::JsonLines => "jsonl".to_string(),
            JsonFormat::Unknown => "unknown".to_string(),
        }
    }

    pub fn get_array_stats(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(self.inner.get_array_stats())
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

/// Correlation Matrix Calculator for computing Pearson correlation coefficients
/// between numeric columns
#[wasm_bindgen]
pub struct CorrelationCalculator {
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
    numeric_column_indices: Vec<usize>,
}

#[wasm_bindgen]
impl CorrelationCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            headers: Vec::new(),
            rows: Vec::new(),
            numeric_column_indices: Vec::new(),
        }
    }

    /// Set the headers for the data
    pub fn set_headers(&mut self, headers: JsValue) -> Result<(), JsValue> {
        let headers: Vec<String> = serde_wasm_bindgen::from_value(headers)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.headers = headers;
        Ok(())
    }

    /// Set the numeric column indices (0-based)
    pub fn set_numeric_columns(&mut self, indices: JsValue) -> Result<(), JsValue> {
        let indices: Vec<usize> = serde_wasm_bindgen::from_value(indices)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.numeric_column_indices = indices;
        Ok(())
    }

    /// Add a batch of rows to the calculator
    pub fn add_rows(&mut self, rows: JsValue) -> Result<(), JsValue> {
        let new_rows: Vec<Vec<String>> = serde_wasm_bindgen::from_value(rows)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.rows.extend(new_rows);
        Ok(())
    }

    /// Compute and return the correlation matrix
    pub fn compute(&self) -> Result<JsValue, JsValue> {
        let result = compute_correlation_matrix(
            &self.headers,
            &self.rows,
            &self.numeric_column_indices,
        );
        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Clear all stored data
    pub fn clear(&mut self) {
        self.headers.clear();
        self.rows.clear();
        self.numeric_column_indices.clear();
    }
}

// ============================================================================
// JSON Structure Analyzer (for Tree Mode)
// ============================================================================

use parser::json::analyze_json_structure;
use stats::tree::StructureConfig;

/// Analyze JSON structure without full profiling (for Tree Mode)
/// Returns tree structure with paths, depths, types, and population %
#[wasm_bindgen]
pub fn analyze_json_structure_wasm(
    data: &[u8],
    max_sample_rows: Option<usize>,
    collect_examples: Option<bool>,
) -> Result<JsValue, JsValue> {
    let config = StructureConfig {
        max_sample_rows: max_sample_rows.unwrap_or(1000),
        collect_examples: collect_examples.unwrap_or(true),
    };
    
    let analysis = analyze_json_structure(data, Some(config))
        .map_err(|e| JsValue::from_str(&e))?;
    
    serde_wasm_bindgen::to_value(&analysis)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod ts_export_tests {
    //! Tests that trigger ts-rs TypeScript type generation.
    //! Run `cargo test` to generate types into the `bindings/` directory.

    use crate::stats::types::{DataType, BaseStats};
    use crate::stats::numeric::NumericStats;
    use crate::stats::categorical::{FreqEntry, CategoricalStats};
    use crate::stats::histogram::{Histogram, HistogramBin};
    use crate::stats::ColumnProfile;
    use crate::stats::profiler::ProfilerResult;
    use crate::stats::correlation::CorrelationMatrix;
    use crate::quality::{Severity, QualityIssue, ColumnQualityMetrics};

    #[test]
    fn export_typescript_types() {
        // ts-rs exports types when this test runs.
        // The types are exported to the `bindings/` directory by default.
        // This test ensures all types are properly configured for export.

        // Import the TS trait to ensure types implement it
        use ts_rs::TS;

        // Verify all types implement TS (compilation will fail if they don't)
        let _ = DataType::decl();
        let _ = BaseStats::decl();
        let _ = NumericStats::decl();
        let _ = FreqEntry::decl();
        let _ = CategoricalStats::decl();
        let _ = Histogram::decl();
        let _ = HistogramBin::decl();
        let _ = ColumnProfile::decl();
        let _ = ProfilerResult::decl();
        let _ = CorrelationMatrix::decl();
        let _ = Severity::decl();
        let _ = QualityIssue::decl();
        let _ = ColumnQualityMetrics::decl();
    }
}