use serde::Serialize;
use crate::stats::profiler::ProfilerResult;
use crate::stats::ColumnProfile;
use crate::stats::numeric::NumericStats;
use crate::stats::categorical::{CategoricalStats, FreqEntry};
use crate::stats::histogram::Histogram;

const DATACERT_VERSION: &str = "0.1.0";

/// Metadata section of the JSON export
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportMeta {
    pub generated_at: String,
    pub datacert_version: String,
    pub file_name: String,
    pub file_size: u64,
    pub processing_time_ms: u64,
}

/// Summary section of the JSON export
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportSummary {
    pub total_rows: u64,
    pub total_columns: usize,
}

/// Quality metrics for a column
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportQuality {
    pub completeness: f64,
    pub uniqueness: f64,
    pub is_potential_pii: bool,
}

/// Numeric statistics formatted with 6 decimal precision
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportNumericStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub median: f64,
    pub std_dev: f64,
    pub variance: f64,
    pub skewness: f64,
    pub kurtosis: f64,
    pub sum: f64,
    pub p25: f64,
    pub p75: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,
}

/// Histogram bin for export
#[derive(Serialize, Debug)]
pub struct ExportHistogramBin {
    pub start: f64,
    pub end: f64,
    pub count: u64,
}

/// Histogram for export
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportHistogram {
    pub bins: Vec<ExportHistogramBin>,
    pub min: f64,
    pub max: f64,
    pub bin_width: f64,
}

/// Top value entry for categorical stats
#[derive(Serialize, Debug)]
pub struct ExportTopValue {
    pub value: String,
    pub count: u64,
    pub percentage: f64,
}

/// Categorical statistics for export
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportCategoricalStats {
    pub top_values: Vec<ExportTopValue>,
    pub unique_count: u64,
}

/// Column statistics for export
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportColumnStats {
    pub count: u64,
    pub missing: u64,
    pub distinct: u64,
    pub inferred_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub numeric: Option<ExportNumericStats>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categorical: Option<ExportCategoricalStats>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub histogram: Option<ExportHistogram>,
}

/// Column profile for export
#[derive(Serialize, Debug)]
pub struct ExportColumn {
    pub name: String,
    pub stats: ExportColumnStats,
    pub quality: ExportQuality,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub notes: Vec<String>,
}

/// Root JSON export structure
#[derive(Serialize, Debug)]
pub struct JsonExport {
    pub meta: ExportMeta,
    pub summary: ExportSummary,
    pub columns: Vec<ExportColumn>,
}

/// Round a float to 6 decimal places
fn round_to_precision(value: f64, decimals: u32) -> f64 {
    let multiplier = 10_f64.powi(decimals as i32);
    (value * multiplier).round() / multiplier
}

/// Convert internal numeric stats to export format
fn convert_numeric_stats(stats: &NumericStats) -> ExportNumericStats {
    ExportNumericStats {
        min: round_to_precision(stats.min, 6),
        max: round_to_precision(stats.max, 6),
        mean: round_to_precision(stats.mean, 6),
        median: round_to_precision(stats.median, 6),
        std_dev: round_to_precision(stats.std_dev, 6),
        variance: round_to_precision(stats.variance, 6),
        skewness: round_to_precision(stats.skewness, 6),
        kurtosis: round_to_precision(stats.kurtosis, 6),
        sum: round_to_precision(stats.sum, 6),
        p25: round_to_precision(stats.p25, 6),
        p75: round_to_precision(stats.p75, 6),
        p90: round_to_precision(stats.p90, 6),
        p95: round_to_precision(stats.p95, 6),
        p99: round_to_precision(stats.p99, 6),
    }
}

/// Convert internal histogram to export format
fn convert_histogram(hist: &Histogram) -> ExportHistogram {
    ExportHistogram {
        bins: hist.bins.iter().map(|b| ExportHistogramBin {
            start: round_to_precision(b.start, 6),
            end: round_to_precision(b.end, 6),
            count: b.count,
        }).collect(),
        min: round_to_precision(hist.min, 6),
        max: round_to_precision(hist.max, 6),
        bin_width: round_to_precision(hist.bin_width, 6),
    }
}

/// Convert internal categorical stats to export format
fn convert_categorical_stats(stats: &CategoricalStats) -> ExportCategoricalStats {
    ExportCategoricalStats {
        top_values: stats.top_values.iter().map(|tv| ExportTopValue {
            value: tv.value.clone(),
            count: tv.count,
            percentage: round_to_precision(tv.percentage, 6),
        }).collect(),
        unique_count: stats.unique_count,
    }
}

/// Check if a column name suggests PII
fn is_potential_pii(name: &str) -> bool {
    let lower = name.to_lowercase();
    let pii_keywords = [
        "email", "phone", "ssn", "social_security", "address", "name",
        "first_name", "last_name", "firstname", "lastname", "dob",
        "date_of_birth", "birth", "passport", "license", "credit_card",
        "card_number", "zip", "postal", "ip_address", "ip"
    ];
    pii_keywords.iter().any(|kw| lower.contains(kw))
}

/// Convert a column profile to export format
fn convert_column(profile: &ColumnProfile) -> ExportColumn {
    let count = profile.base_stats.count;
    let missing = profile.base_stats.missing;
    let distinct = profile.base_stats.distinct_estimate;

    // Calculate quality metrics
    let completeness = if count > 0 {
        round_to_precision((count - missing) as f64 / count as f64, 6)
    } else {
        0.0
    };

    let uniqueness = if count > missing && count > 0 {
        let valid_count = count - missing;
        round_to_precision(distinct as f64 / valid_count as f64, 6).min(1.0)
    } else {
        0.0
    };

    let inferred_type = format!("{:?}", profile.base_stats.inferred_type);

    ExportColumn {
        name: profile.name.clone(),
        stats: ExportColumnStats {
            count,
            missing,
            distinct,
            inferred_type,
            min_length: profile.min_length,
            max_length: profile.max_length,
            numeric: profile.numeric_stats.as_ref().map(convert_numeric_stats),
            categorical: profile.categorical_stats.as_ref().map(convert_categorical_stats),
            histogram: profile.histogram.as_ref().map(convert_histogram),
        },
        quality: ExportQuality {
            completeness,
            uniqueness,
            is_potential_pii: is_potential_pii(&profile.name),
        },
        notes: profile.notes.clone(),
    }
}

/// Generate JSON export from profiler results
pub fn generate_json_export(
    result: &ProfilerResult,
    file_name: &str,
    file_size: u64,
    processing_time_ms: u64,
) -> JsonExport {
    let generated_at = chrono::Utc::now().to_rfc3339();

    JsonExport {
        meta: ExportMeta {
            generated_at,
            datacert_version: DATACERT_VERSION.to_string(),
            file_name: file_name.to_string(),
            file_size,
            processing_time_ms,
        },
        summary: ExportSummary {
            total_rows: result.total_rows,
            total_columns: result.column_profiles.len(),
        },
        columns: result.column_profiles.iter().map(convert_column).collect(),
    }
}

/// Serialize the export to pretty-printed JSON with 2-space indentation
pub fn to_json_string(export: &JsonExport) -> Result<String, serde_json::Error> {
    let formatter = serde_json::ser::PrettyFormatter::with_indent(b"  ");
    let mut writer = Vec::new();
    let mut serializer = serde_json::Serializer::with_formatter(&mut writer, formatter);
    export.serialize(&mut serializer)?;
    Ok(String::from_utf8(writer).unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_round_to_precision() {
        assert_eq!(round_to_precision(1.23456789, 6), 1.234568);
        assert_eq!(round_to_precision(0.0, 6), 0.0);
        assert_eq!(round_to_precision(100.0, 6), 100.0);
    }

    #[test]
    fn test_is_potential_pii() {
        assert!(is_potential_pii("email"));
        assert!(is_potential_pii("user_email"));
        assert!(is_potential_pii("FirstName"));
        assert!(!is_potential_pii("amount"));
        assert!(!is_potential_pii("quantity"));
    }
}
