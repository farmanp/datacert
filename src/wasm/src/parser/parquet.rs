use wasm_bindgen::prelude::*;
use parquet::file::reader::{FileReader, SerializedFileReader};
use bytes::Bytes;
use crate::stats::profiler::Profiler;

#[wasm_bindgen]
pub struct ParquetProfiler {
    profiler: Option<Profiler>,
    headers: Vec<String>,
}

#[wasm_bindgen]
impl ParquetProfiler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            profiler: None,
            headers: Vec::new(),
        }
    }

    /// Parses the entire Parquet file buffer and updates the profiler.
    pub fn parse_and_profile(&mut self, file_bytes: &[u8]) -> Result<JsValue, JsValue> {
        // Create Bytes object which implements ChunkReader
        let bytes_data = Bytes::copy_from_slice(file_bytes);
        
        let reader = SerializedFileReader::new(bytes_data).map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        // 1. Extract Headers (Schema)
        if self.headers.is_empty() {
            let schema = reader.metadata().file_metadata().schema();
            self.headers = schema.get_fields().iter().map(|f| f.name().to_string()).collect();
            self.profiler = Some(Profiler::new(self.headers.clone()));
        }

        // 2. Iterate Rows
        let iter = reader.get_row_iter(None).map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let mut batch: Vec<Vec<String>> = Vec::with_capacity(1000);
        let batch_size = 1000;

        for record_result in iter {
            let record = record_result.map_err(|e| JsValue::from_str(&e.to_string()))?;
            let mut row_values: Vec<String> = Vec::with_capacity(self.headers.len());

            for i in 0..self.headers.len() {
                // Simplified string conversion for Profiler
                let val_str = match record.get_column_iter().nth(i) {
                    Some((_name, field)) => field.to_string(),
                    None => "".to_string(),
                };
                row_values.push(val_str);
            }
            
            batch.push(row_values);

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

        // 3. Finalize
        if let Some(ref mut p) = self.profiler {
            let stats = p.finalize();
            serde_wasm_bindgen::to_value(&stats).map_err(|e| JsValue::from_str(&e.to_string()))
        } else {
            Err(JsValue::from_str("Profiler not initialized"))
        }
    }
}
