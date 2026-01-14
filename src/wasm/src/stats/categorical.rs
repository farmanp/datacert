use serde::Serialize;
use std::collections::HashMap;
use ts_rs::TS;

#[derive(Serialize, Debug, Clone, TS)]
#[ts(export)]
pub struct FreqEntry {
    pub value: String,
    pub count: u64,
    pub percentage: f64,
}

#[derive(Serialize, Debug, Clone, TS)]
#[ts(export)]
pub struct CategoricalStats {
    pub top_values: Vec<FreqEntry>,
    pub unique_count: u64,
}

#[derive(Debug)]
pub struct CategoricalAccumulator {
    counts: HashMap<String, u64>,
    total_count: u64,
    max_unique: usize,
}

impl CategoricalAccumulator {
    pub fn new(max_unique: usize) -> Self {
        Self {
            counts: HashMap::new(),
            total_count: 0,
            max_unique,
        }
    }

    pub fn update(&mut self, value: &str) {
        self.total_count += 1;
        if self.counts.contains_key(value) {
            *self.counts.get_mut(value).unwrap() += 1;
        } else if self.counts.len() < self.max_unique {
            self.counts.insert(value.to_string(), 1);
        }
    }

    pub fn finalize(&self) -> CategoricalStats {
        let mut entries: Vec<FreqEntry> = self.counts.iter().map(|(val, &count)| {
            FreqEntry {
                value: val.clone(),
                count,
                percentage: (count as f64 / self.total_count as f64) * 100.0,
            }
        }).collect();

        entries.sort_by(|a, b| b.count.cmp(&a.count));
        
        CategoricalStats {
            top_values: entries.into_iter().take(10).collect(),
            unique_count: self.counts.len() as u64,
        }
    }
}
