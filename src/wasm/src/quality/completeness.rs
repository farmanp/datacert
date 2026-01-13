use super::{QualityIssue, Severity};

/// Calculate completeness score for a column
/// Completeness = (non-null count / total count)
pub fn calculate_completeness(total_count: u64, missing_count: u64) -> f64 {
    if total_count == 0 {
        return 1.0; // Empty column is considered complete
    }
    
    let non_null_count = total_count.saturating_sub(missing_count);
    non_null_count as f64 / total_count as f64
}

/// Generate completeness-related quality issues
pub fn check_completeness_issues(completeness: f64, column_name: &str) -> Vec<QualityIssue> {
    let mut issues = Vec::new();
    
    if completeness < 0.5 {
        issues.push(QualityIssue {
            id: format!("{}_completeness_critical", column_name),
            message: format!("Critical: Only {:.1}% of values are present", completeness * 100.0),
            severity: Severity::Error,
        });
    } else if completeness < 0.9 {
        issues.push(QualityIssue {
            id: format!("{}_completeness_warning", column_name),
            message: format!("Completeness is {:.1}% (below 90% threshold)", completeness * 100.0),
            severity: Severity::Warning,
        });
    } else if completeness < 1.0 {
        issues.push(QualityIssue {
            id: format!("{}_completeness_info", column_name),
            message: format!("Completeness is {:.1}%", completeness * 100.0),
            severity: Severity::Info,
        });
    }
    
    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_completeness() {
        assert_eq!(calculate_completeness(100, 15), 0.85);
        assert_eq!(calculate_completeness(100, 0), 1.0);
        assert_eq!(calculate_completeness(100, 100), 0.0);
        assert_eq!(calculate_completeness(0, 0), 1.0);
    }

    #[test]
    fn test_completeness_issues() {
        let issues = check_completeness_issues(0.85, "test_col");
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].severity, Severity::Warning);
        
        let issues = check_completeness_issues(0.4, "test_col");
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].severity, Severity::Error);
        
        let issues = check_completeness_issues(1.0, "test_col");
        assert_eq!(issues.len(), 0);
    }
}
