use super::{QualityIssue, Severity};

/// Calculate uniqueness score for a column
/// Uniqueness = (distinct count / non-null count)
pub fn calculate_uniqueness(total_count: u64, missing_count: u64, distinct_count: u64) -> f64 {
    let non_null_count = total_count.saturating_sub(missing_count);
    
    if non_null_count == 0 {
        return 1.0; // No data to assess
    }
    
    distinct_count as f64 / non_null_count as f64
}

/// Generate uniqueness-related quality issues
pub fn check_uniqueness_issues(
    uniqueness: f64,
    column_name: &str,
    inferred_type: &str,
) -> Vec<QualityIssue> {
    let mut issues = Vec::new();
    
    // Constant column detection (only 1 unique value)
    if uniqueness > 0.0 && uniqueness <= 0.02 {
        issues.push(QualityIssue {
            id: format!("{}_constant_column", column_name),
            message: "Column has only one unique value (constant)".to_string(),
            severity: Severity::Warning,
        });
    }
    
    // High cardinality warning for string columns
    if inferred_type == "String" && uniqueness > 0.9 {
        issues.push(QualityIssue {
            id: format!("{}_high_cardinality", column_name),
            message: format!(
                "High cardinality: {:.1}% unique values (potential identifier or free text)",
                uniqueness * 100.0
            ),
            severity: Severity::Info,
        });
    }
    
    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_uniqueness() {
        // 100 values, 15 null, 80 unique
        assert_eq!(calculate_uniqueness(100, 15, 80), 80.0 / 85.0);
        
        // All unique
        assert_eq!(calculate_uniqueness(100, 0, 100), 1.0);
        
        // All same value
        assert_eq!(calculate_uniqueness(100, 0, 1), 0.01);
        
        // All null
        assert_eq!(calculate_uniqueness(100, 100, 0), 1.0);
    }

    #[test]
    fn test_constant_column_detection() {
        let issues = check_uniqueness_issues(0.01, "test_col", "String");
        assert!(issues.iter().any(|i| i.message.contains("constant")));
    }

    #[test]
    fn test_high_cardinality_warning() {
        let issues = check_uniqueness_issues(0.95, "test_col", "String");
        assert!(issues.iter().any(|i| i.message.contains("High cardinality")));
        
        // Should not trigger for numeric types
        let issues = check_uniqueness_issues(0.95, "test_col", "Integer");
        assert!(!issues.iter().any(|i| i.message.contains("High cardinality")));
    }
}
