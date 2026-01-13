use serde::{Serialize};
pub mod types;
pub mod numeric;
pub mod profiler;
pub mod histogram;
pub mod categorical;

use hyperloglogplus::{HyperLogLog, HyperLogLogPlus};
use std::collections::hash_map::RandomState;
use crate::stats::types::{DataType, BaseStats};
use crate::stats::numeric::NumericStats;
use crate::stats::histogram::{Histogram, HistogramAccumulator};
use crate::stats::categorical::{CategoricalStats, CategoricalAccumulator};

#[derive(Serialize, Debug)]
pub struct ColumnProfile {
    pub name: String,
    pub base_stats: BaseStats,
    pub numeric_stats: Option<NumericStats>,
    pub categorical_stats: Option<CategoricalStats>,
    pub histogram: Option<Histogram>,
    pub min_length: Option<usize>,
    pub max_length: Option<usize>,
    pub notes: Vec<String>,
    
    #[serde(skip)]
    hll: HyperLogLogPlus<String, RandomState>,
    
    #[serde(skip)]
    hist_acc: Option<HistogramAccumulator>,
    
    #[serde(skip)]
    cat_acc: CategoricalAccumulator,
    
    // Type inference counters
    integer_count: u64,
    numeric_count: u64,
    boolean_count: u64,
    date_count: u64,
    total_valid: u64,
}

impl Clone for ColumnProfile {
    fn clone(&self) -> Self {
        Self {
            name: self.name.clone(),
            base_stats: self.base_stats.clone(),
            numeric_stats: self.numeric_stats.clone(),
            categorical_stats: self.categorical_stats.clone(),
            histogram: self.histogram.clone(),
            min_length: self.min_length.clone(),
            max_length: self.max_length.clone(),
            notes: self.notes.clone(),
            hll: HyperLogLogPlus::new(12, RandomState::new()).unwrap(),
            hist_acc: None,
            cat_acc: CategoricalAccumulator::new(1000),
            integer_count: self.integer_count,
            numeric_count: self.numeric_count,
            boolean_count: self.boolean_count,
            date_count: self.date_count,
            total_valid: self.total_valid,
        }
    }
}

impl ColumnProfile {
    pub fn new(name: String) -> Self {
        let hll = HyperLogLogPlus::new(12, RandomState::new()).unwrap();
        
        Self {
            name,
            base_stats: BaseStats {
                count: 0,
                missing: 0,
                distinct_estimate: 0,
                inferred_type: DataType::Null,
            },
            numeric_stats: None,
            categorical_stats: None,
            histogram: None,
            min_length: None,
            max_length: None,
            notes: Vec::new(),
            hll,
            hist_acc: None,
            cat_acc: CategoricalAccumulator::new(1000),
            integer_count: 0,
            numeric_count: 0,
            boolean_count: 0,
            date_count: 0,
            total_valid: 0,
        }
    }

    pub fn update(&mut self, value: &str) {
        self.base_stats.count += 1;
        
        let trimmed = value.trim();
        if trimmed.is_empty() || trimmed.to_lowercase() == "null" || trimmed.to_lowercase() == "n/a" {
            self.base_stats.missing += 1;
            return;
        }

        self.total_valid += 1;
        self.hll.insert(&trimmed.to_string());
        self.cat_acc.update(trimmed);

        let len = trimmed.len();
        if self.min_length.map_or(true, |min| len < min) { self.min_length = Some(len); }
        if self.max_length.map_or(true, |max| len > max) { self.max_length = Some(len); }

        self.infer_and_update(trimmed);
    }

    fn infer_and_update(&mut self, trimmed: &str) {
        if let Ok(_) = trimmed.parse::<i64>() {
            self.integer_count += 1;
            self.numeric_count += 1;
            self.update_numeric(trimmed.parse::<f64>().unwrap());
            return;
        }

        if let Ok(val) = trimmed.parse::<f64>() {
            self.numeric_count += 1;
            self.update_numeric(val);
            return;
        }

        let lower = trimmed.to_lowercase();
        if lower == "true" || lower == "false" || lower == "t" || lower == "f" {
            self.boolean_count += 1;
            return;
        }

        if self.is_date(trimmed) {
            self.date_count += 1;
            return;
        }
    }

    fn is_date(&self, s: &str) -> bool {
        (s.contains('-') || s.contains('/')) && s.len() >= 8 && s.chars().any(|c| c.is_numeric())
    }

    fn update_numeric(&mut self, val: f64) {
        if self.numeric_stats.is_none() {
            self.numeric_stats = Some(NumericStats::new());
            self.hist_acc = Some(HistogramAccumulator::new(1000));
        }
        if let Some(ref mut stats) = self.numeric_stats {
            stats.update(val);
        }
        if let Some(ref mut acc) = self.hist_acc {
            acc.update(val);
        }
    }

    pub fn finalize(&mut self) {
        self.base_stats.distinct_estimate = self.hll.count().round() as u64;
        self.categorical_stats = Some(self.cat_acc.finalize());
        
        if let Some(ref mut stats) = self.numeric_stats {
            if let Some(ref mut acc) = self.hist_acc {
                stats.finalize(&mut acc.samples);
                self.histogram = Some(acc.finalize(stats.min, stats.max));
            } else {
                stats.finalize(&mut []);
            }
        }

        if self.total_valid == 0 {
            self.base_stats.inferred_type = DataType::Null;
        } else if self.integer_count == self.total_valid {
            self.base_stats.inferred_type = DataType::Integer;
        } else if self.numeric_count == self.total_valid {
            self.base_stats.inferred_type = DataType::Numeric;
        } else if self.boolean_count == self.total_valid {
            self.base_stats.inferred_type = DataType::Boolean;
        } else if self.date_count == self.total_valid {
            self.base_stats.inferred_type = DataType::Date;
        } else {
            self.base_stats.inferred_type = DataType::String;
            
            if self.numeric_count > 0 && (self.numeric_count as f64 / self.total_valid as f64) > 0.5 {
                self.notes.push("Potentially numeric with exceptions".to_string());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_advanced_stats() {
        let mut profile = ColumnProfile::new("values".to_string());
        for i in 1..=10 {
            profile.update(&i.to_string());
        }
        profile.finalize();

        let stats = profile.numeric_stats.as_ref().unwrap();
        assert!(stats.mean - 5.5 < 0.001);
        assert!(stats.std_dev > 0.0);
        assert!(stats.median > 0.0);
        
        let hist = profile.histogram.as_ref().unwrap();
        assert!(!hist.bins.is_empty());
    }
}
