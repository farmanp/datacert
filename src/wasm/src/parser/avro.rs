use wasm_bindgen::prelude::*;
use apache_avro::Reader;
use std::io::Cursor;
use crate::stats::profiler::Profiler;
use crate::parser::json::{JsonParserConfig}; // Reusing config for flattening logic if needed
use serde_json::Value;
use std::collections::HashMap;

#[wasm_bindgen]
pub struct AvroProfiler {
    profiler: Option<Profiler>,
    headers: Vec<String>,
    schema_json: String,
}

#[wasm_bindgen]
impl AvroProfiler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            profiler: None,
            headers: Vec::new(),
            schema_json: String::new(),
        }
    }

    pub fn get_schema_json(&self) -> String {
        self.schema_json.clone()
    }

    pub fn parse_and_profile(&mut self, file_bytes: &[u8]) -> Result<JsValue, JsValue> {
        let cursor = Cursor::new(file_bytes);
        let reader = Reader::new(cursor).map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        // Extract schema
        let schema = reader.writer_schema();
        self.schema_json = serde_json::to_string_pretty(&schema).unwrap_or_default();
        
        // We need to determine headers by iterating schema or by inspecting first record?
        // Avro schema is explicit.
        // We can flatten the schema to get headers.
        // For simplicity in this streaming impl, let's process records and infer headers if complex,
        // OR better: use the known schema to build headers.
        // Let's rely on flattening the first record(s) similar to JSON parser to robustly handle nesting.
        // But Avro schema gives us headers upfront.
        // Let's skip header pre-computation and do it on first row for now to reuse JSON flattening logic?
        // Or implement explicit schema flattening.
        
        // Let's use the reader iterator.
        let mut batch: Vec<Vec<String>> = Vec::with_capacity(1000);
        let batch_size = 1000;
        
        // Re-use logic for flattening
        // We can convert Avro Value to Serde Value?
        // apache_avro::types::Value is what we get.
        
        for record_result in reader {
            let record = record_result.map_err(|e| JsValue::from_str(&e.to_string()))?;
            // Convert to serde_json::Value to reuse flattening logic logic or implement custom flattening
            // apache_avro Value implements specific types.
            // Let's implement a custom flattener for Avro Value to Vec<String>
            
            // First time initialization of headers if needed
            let serde_value: Value =  apache_avro::from_value(&record).map_err(|e| JsValue::from_str(&e.to_string()))?;
            
            if self.headers.is_empty() {
                // Determine headers from the first record structure (flattened)
                // This aligns with how we handle JSON
                self.headers = extract_headers_from_value(&serde_value, "");
                self.profiler = Some(Profiler::new(self.headers.clone()));
            }
            
            let row = flatten_avro_value(&serde_value, &self.headers);
            batch.push(row);

            if batch.len() >= batch_size {
                if let Some(ref mut p) = self.profiler {
                    p.update_batch(&batch);
                }
                batch.clear();
            }
        }

        // Final batch
        if !batch.is_empty() {
            if let Some(ref mut p) = self.profiler {
                p.update_batch(&batch);
            }
        }

        // Finalize
        if let Some(ref mut p) = self.profiler {
            let stats = p.finalize();
            serde_wasm_bindgen::to_value(&stats).map_err(|e| JsValue::from_str(&e.to_string()))
        } else {
            Err(JsValue::from_str("Profiler not initialized"))
        }
    }
}

// Helper to extract headers from a flattened view of the value
fn extract_headers_from_value(val: &Value, prefix: &str) -> Vec<String> {
    let mut headers = Vec::new();
    match val {
        Value::Object(map) => {
            for (k, v) in map {
                let full_key = if prefix.is_empty() { k.clone() } else { format!("{}.{}", prefix, k) };
                match v {
                    Value::Object(_) => {
                        headers.extend(extract_headers_from_value(v, &full_key));
                    },
                    _ => headers.push(full_key),
                }
            }
        },
        _ => headers.push(if prefix.is_empty() { "value".to_string() } else { prefix.to_string() }),
    }
    // Sort headers for deterministic order? Or keep insertion order?
    // Since we rely on index, we must respect the order we decided on.
    // Maps are unordered. We should probably sort them to be consistent across rows if schema changes (rare in Avro).
    // Or better: Use the Schema to determine order if possible.
    // For now, let's sort to ensure stability.
    headers.sort(); 
    headers
}

// Helper to flatten value into row based on known headers
fn flatten_avro_value(val: &Value, headers: &[String]) -> Vec<String> {
    let mut flat_map = HashMap::new();
    flatten_recursive(val, "", &mut flat_map);
    
    headers.iter().map(|h| {
        flat_map.get(h).cloned().unwrap_or_default()
    }).collect()
}

fn flatten_recursive(val: &Value, prefix: &str, output: &mut HashMap<String, String>) {
    match val {
        Value::Object(map) => {
            for (k, v) in map {
                let full_key = if prefix.is_empty() { k.clone() } else { format!("{}.{}", prefix, k) };
                flatten_recursive(v, &full_key, output);
            }
        },
        Value::Array(arr) => {
            // Arrays in Avro are common. Serialize as string representation like "[item1, item2]"
            // or count? The JSON parser did `[array:N]`.
            // Let's serialize content for now to be useful.
            output.insert(prefix.to_string(), val.to_string());
        },
        Value::Null => {
            output.insert(prefix.to_string(), String::new());
        },
        Value::String(s) => {
            output.insert(prefix.to_string(), s.clone());
        },
        _ => {
            output.insert(prefix.to_string(), val.to_string());
        }
    }
}
