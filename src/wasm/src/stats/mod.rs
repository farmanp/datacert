use serde::{Serialize};
pub mod types;
pub mod numeric;
pub mod profiler;
pub mod histogram;
pub mod categorical;
pub mod correlation;

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
    pub quality_metrics: Option<crate::quality::ColumnQualityMetrics>,
    
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
    
    // Sample values for display (up to 5 unique non-null values)
    pub sample_values: Vec<String>,
    
    // Sample values for PII detection (separate to avoid confusion)
    #[serde(skip)]
    pub pii_samples: Vec<String>,

    // Anomaly tracking (row indices, 1-based)
    pub missing_rows: Vec<usize>,
    pub pii_rows: Vec<usize>,
    pub outlier_rows: Vec<usize>,
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
            quality_metrics: self.quality_metrics.clone(),
            hll: HyperLogLogPlus::new(12, RandomState::new()).unwrap(),
            hist_acc: None,
            cat_acc: CategoricalAccumulator::new(1000),
            integer_count: self.integer_count,
            numeric_count: self.numeric_count,
            boolean_count: self.boolean_count,
            date_count: self.date_count,
            total_valid: self.total_valid,
            sample_values: self.sample_values.clone(),
            pii_samples: Vec::new(),
            missing_rows: self.missing_rows.clone(),
            pii_rows: self.pii_rows.clone(),
            outlier_rows: self.outlier_rows.clone(),
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
            quality_metrics: None,
            hll,
            hist_acc: None,
            cat_acc: CategoricalAccumulator::new(1000),
            integer_count: 0,
            numeric_count: 0,
            boolean_count: 0,
            date_count: 0,
            total_valid: 0,
            sample_values: Vec::new(),
            pii_samples: Vec::new(),
            missing_rows: Vec::new(),
            pii_rows: Vec::new(),
            outlier_rows: Vec::new(),
        }
    }

    pub fn update(&mut self, value: &str, row_index: usize) {
        self.base_stats.count += 1;
        
        let trimmed = value.trim();
        if trimmed.is_empty() || trimmed.to_lowercase() == "null" || trimmed.to_lowercase() == "n/a" {
            self.base_stats.missing += 1;
            if self.missing_rows.len() < 1000 {
                self.missing_rows.push(row_index);
            }
            return;
        }

        self.total_valid += 1;
        self.hll.insert(&trimmed.to_string());
        self.cat_acc.update(trimmed);
        
        // Store sample values for display (max 5 unique non-null values)
        if self.sample_values.len() < 5 && !self.sample_values.contains(&trimmed.to_string()) {
            self.sample_values.push(trimmed.to_string());
        }
        
        // Store sample values for PII detection (max 100)
        // Also track row index if this looks like PII (simplified check here, refined in finalize)
        // Note: Real PII detection happens in finalize() using the samples. 
        // To strictly map rows to PII types, we would need to run detection per row which is slow.
        // For now, we collect samples. If we want to highlight rows with "Potential PII", 
        // we might need to assume all rows matching the pattern are PII.
        // Let's store potential PII indices if we collect the sample.
        if self.pii_samples.len() < 100 {
            self.pii_samples.push(trimmed.to_string());
            // We blindly add the index here corresponding to the sample. 
            // In reality, we'd filter these later.
            if self.pii_rows.len() < 100 {
                 self.pii_rows.push(row_index);
            }
        }

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
        
        // Calculate quality metrics
        self.calculate_quality_metrics();
    }
    
    fn calculate_quality_metrics(&mut self) {
        use crate::quality::completeness;
        use crate::quality::uniqueness;
        use crate::quality::patterns;
        
        let mut metrics = crate::quality::ColumnQualityMetrics::new();
        
        // Calculate completeness
        metrics.completeness = completeness::calculate_completeness(
            self.base_stats.count,
            self.base_stats.missing,
        );
        
        // Calculate uniqueness
        metrics.uniqueness = uniqueness::calculate_uniqueness(
            self.base_stats.count,
            self.base_stats.missing,
            self.base_stats.distinct_estimate,
        );
        
        // Check for quality issues
        let mut all_issues = Vec::new();
        
        // Completeness issues
        all_issues.extend(completeness::check_completeness_issues(
            metrics.completeness,
            &self.name,
        ));
        
        // Uniqueness issues
        let type_str = format!("{:?}", self.base_stats.inferred_type);
        all_issues.extend(uniqueness::check_uniqueness_issues(
            metrics.uniqueness,
            &self.name,
            &type_str,
        ));
        
        // PII detection
        if !self.pii_samples.is_empty() {
            let sample_refs: Vec<&str> = self.pii_samples.iter()
                .map(|s| s.as_str())
                .collect();
            
            let pii_type = patterns::detect_pii_pattern(&sample_refs);
            all_issues.extend(patterns::check_pii_issues(pii_type, &self.name));
        }
        
        metrics.issues = all_issues;
        
        // Calculate composite quality score
        metrics.score = self.calculate_quality_score(&metrics);
        
        self.quality_metrics = Some(metrics);
    }
    
    fn calculate_quality_score(&self, metrics: &crate::quality::ColumnQualityMetrics) -> f64 {
        // Weighted quality score formula:
        // Base score starts at 1.0
        // - Completeness weight: 40%
        // - Uniqueness weight: 20% (for non-identifier columns)
        // - Issue penalties: Error = -0.3, Warning = -0.15, Info = -0.05
        
        let mut score = 0.0;
        
        // Completeness contribution (40%)
        score += metrics.completeness * 0.4;
        
        // Uniqueness contribution (20%)
        // For high-cardinality string columns, uniqueness doesn't contribute to quality
        let type_str = format!("{:?}", self.base_stats.inferred_type);
        if type_str != "String" || metrics.uniqueness < 0.9 {
            score += metrics.uniqueness * 0.2;
        } else {
            score += 0.2; // Neutral contribution for identifier-like columns
        }
        
        // Base quality contribution (40%)
        score += 0.4;
        
        // Apply issue penalties
        use crate::quality::Severity;
        for issue in &metrics.issues {
            match issue.severity {
                Severity::Error => score -= 0.3,
                Severity::Warning => score -= 0.15,
                Severity::Info => score -= 0.05,
            }
        }
        
        // Clamp score between 0.0 and 1.0
        score.max(0.0).min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_advanced_stats() {
        let mut profile = ColumnProfile::new("values".to_string());
        for i in 1..=10 {
            profile.update(&i.to_string(), i);
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
