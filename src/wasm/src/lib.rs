mod parser;
mod stats;
mod export;

use wasm_bindgen::prelude::*;
use parser::{CsvParser, JsonParser, JsonFormat, JsonParserConfig};
use stats::profiler::Profiler;

#[wasm_bindgen]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    web_sys::console::log_1(&"DataLens WASM Engine Initialized".into());
}

#[wasm_bindgen]
pub struct DataLensProfiler {
    parser: CsvParser,
    profiler: Option<Profiler>,
}

#[wasm_bindgen]
impl DataLensProfiler {
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
