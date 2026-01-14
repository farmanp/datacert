use wasm_bindgen::prelude::*;
use apache_avro::Reader;
use std::io::Cursor;
use crate::stats::profiler::{Profiler, ProfilerResult};
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
        match self.parse_and_profile_internal(file_bytes) {
            Ok(stats) => serde_wasm_bindgen::to_value(&stats).map_err(|e| JsValue::from_str(&e.to_string())),
            Err(e) => Err(JsValue::from_str(&e)),
        }
    }

    fn parse_and_profile_internal(&mut self, file_bytes: &[u8]) -> Result<ProfilerResult, String> {
        let cursor = Cursor::new(file_bytes);
        let reader = Reader::new(cursor).map_err(|e| e.to_string())?;
        
        // Extract schema
        let schema = reader.writer_schema();
        self.schema_json = serde_json::to_string_pretty(&schema).unwrap_or_default();
        
        // Let's use the reader iterator.
        let mut batch: Vec<Vec<String>> = Vec::with_capacity(1000);
        let batch_size = 1000;
        
        for record_result in reader {
            let record = record_result.map_err(|e| e.to_string())?;
            
            // First time initialization of headers if needed
            let serde_value: Value =  apache_avro::from_value(&record).map_err(|e| e.to_string())?;
            
            if self.headers.is_empty() {
                // Determine headers from the first record structure (flattened)
                // This aligns with how we handle JSON
                self.headers = extract_headers_from_value(&serde_value, "");
                let mut profiler = Profiler::new(self.headers.clone());
                profiler.avro_schema = Some(self.schema_json.clone());
                self.profiler = Some(profiler);
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
            Ok(p.finalize())
        } else {
            Err("Profiler not initialized".to_string())
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_extract_headers() {
        let val = json!({
            "a": 1,
            "b": {
                "c": 2,
                "d": "test"
            },
            "e": [1, 2, 3]
        });
        let headers = extract_headers_from_value(&val, "");
        assert_eq!(headers, vec!["a", "b.c", "b.d", "e"]);
    }

    #[test]
    fn test_flatten_avro_value() {
        let val = json!({
            "a": 1,
            "b": {
                "c": 2,
                "d": "test"
            }
        });
        let headers = vec!["a".to_string(), "b.c".to_string(), "b.d".to_string()];
        let row = flatten_avro_value(&val, &headers);
        assert_eq!(row, vec!["1", "2", "test"]);
    }

    #[test]
    fn test_avro_profiling_logic() {
        use apache_avro::types::Record;
        use apache_avro::{Schema, Writer};

        let raw_schema = r#"
            {
                "type": "record",
                "name": "test",
                "fields": [
                    {"name": "id", "type": "long"},
                    {"name": "name", "type": "string"},
                    {"name": "nested", "type": {
                        "type": "record",
                        "name": "inner",
                        "fields": [
                            {"name": "val", "type": "int"}
                        ]
                    }}
                ]
            }
        "#;
        let schema = Schema::parse_str(raw_schema).unwrap();
        let mut writer = Writer::new(&schema, Vec::new());

        let mut record = Record::new(writer.schema()).unwrap();
        record.put("id", 1i64);
        record.put("name", "Alice");
        let mut inner = Record::new(writer.schema()).unwrap(); // This is wrong in apache-avro, needs to match sub-schema
        // Actually easier to use from_value or just trust the helper tests above if we can't easily mock full Avro bytes here.
        // But let's try to do it right.
        
        let mut inner_record = Record::new(match &schema {
            Schema::Record(rf) => &rf.fields[2].schema,
            _ => unreachable!(),
        }).unwrap();
        inner_record.put("val", 100i32);
        
        record.put("id", 1i64);
        record.put("name", "Alice");
        record.put("nested", inner_record);
        writer.append(record).unwrap();

        let bytes = writer.into_inner().unwrap();
        let mut profiler = AvroProfiler::new();
        
        // This will call the actual logic
        let _ = profiler.parse_and_profile_internal(&bytes).unwrap();
        
        assert_eq!(profiler.headers, vec!["id", "name", "nested.val"]);
        assert!(profiler.schema_json.contains("nested"));
    }
}
