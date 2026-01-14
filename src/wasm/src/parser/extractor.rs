use wasm_bindgen::prelude::*;
use crate::parser::csv::{CsvParser, ParseResult};
use std::collections::HashSet;

#[wasm_bindgen]
pub struct RowExtractor {
    parser: CsvParser,
    target_indices: HashSet<usize>,
    current_row_index: usize,
}

#[wasm_bindgen]
impl RowExtractor {
    #[wasm_bindgen(constructor)]
    pub fn new(indices: Vec<usize>, delimiter: Option<u8>, has_headers: bool) -> Self {
        let mut target_set = HashSet::new();
        for idx in indices {
            target_set.insert(idx);
        }

        Self {
            parser: CsvParser::new(delimiter, has_headers),
            target_indices: target_set,
            current_row_index: 0,
        }
    }

    pub fn process_chunk(&mut self, chunk: &[u8]) -> Result<JsValue, JsValue> {
        let result = self.parser.parse_chunk(chunk);
        let mut found_rows = Vec::new();

        for row in result.rows {
            self.current_row_index += 1;
            if self.target_indices.contains(&self.current_row_index) {
                found_rows.push((self.current_row_index, row));
            }
        }

        serde_wasm_bindgen::to_value(&found_rows).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn flush(&mut self) -> Result<JsValue, JsValue> {
        let result = self.parser.flush();
        let mut found_rows = Vec::new();

        for row in result.rows {
            self.current_row_index += 1;
            if self.target_indices.contains(&self.current_row_index) {
                found_rows.push((self.current_row_index, row));
            }
        }

        serde_wasm_bindgen::to_value(&found_rows).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}
