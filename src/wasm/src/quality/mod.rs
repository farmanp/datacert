use serde::Serialize;
use ts_rs::TS;

pub mod completeness;
pub mod uniqueness;
pub mod patterns;
pub mod duplicates;

#[derive(Serialize, Debug, Clone, Copy, PartialEq, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, rename_all = "lowercase")]
pub enum Severity {
    Info,
    Warning,
    Error,
}

#[derive(Serialize, Debug, Clone, TS)]
#[ts(export)]
pub struct QualityIssue {
    pub id: String,
    pub message: String,
    pub severity: Severity,
}

#[derive(Serialize, Debug, Clone, TS)]
#[ts(export)]
pub struct ColumnQualityMetrics {
    pub completeness: f64,
    pub uniqueness: f64,
    pub issues: Vec<QualityIssue>,
    pub score: f64,
}

impl ColumnQualityMetrics {
    pub fn new() -> Self {
        Self {
            completeness: 0.0,
            uniqueness: 0.0,
            issues: Vec::new(),
            score: 1.0,
        }
    }
}
