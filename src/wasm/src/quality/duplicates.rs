use super::{QualityIssue, Severity};
use std::collections::HashSet;

/// Duplicate row detector using hash-based exact matching
pub struct DuplicateDetector {
    seen_rows: HashSet<Vec<String>>,
    duplicate_count: u64,
    total_rows: u64,
}

impl DuplicateDetector {
    pub fn new() -> Self {
        Self {
            seen_rows: HashSet::new(),
            duplicate_count: 0,
            total_rows: 0,
        }
    }
    
    /// Process a batch of rows
    pub fn process_batch(&mut self, rows: &[Vec<String>]) {
        for row in rows {
            self.total_rows += 1;
            
            if !self.seen_rows.insert(row.clone()) {
                // Row already exists - it's a duplicate
                self.duplicate_count += 1;
            }
        }
    }
    
    /// Get duplicate count
    pub fn duplicate_count(&self) -> u64 {
        self.duplicate_count
    }
    
    /// Get total rows processed
    pub fn total_rows(&self) -> u64 {
        self.total_rows
    }
    
    /// Get duplicate percentage
    pub fn duplicate_percentage(&self) -> f64 {
        if self.total_rows == 0 {
            return 0.0;
        }
        (self.duplicate_count as f64 / self.total_rows as f64) * 100.0
    }
}

/// Generate duplicate-related quality issues
pub fn check_duplicate_issues(duplicate_count: u64, duplicate_percentage: f64) -> Vec<QualityIssue> {
    let mut issues = Vec::new();
    
    if duplicate_count == 0 {
        return issues;
    }
    
    let severity = if duplicate_percentage > 10.0 {
        Severity::Error
    } else if duplicate_percentage > 1.0 {
        Severity::Warning
    } else {
        Severity::Info
    };
    
    issues.push(QualityIssue {
        id: "duplicate_rows".to_string(),
        message: format!(
            "{} duplicate rows detected ({:.2}% of total)",
            duplicate_count, duplicate_percentage
        ),
        severity,
    });
    
    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_duplicate_detection() {
        let mut detector = DuplicateDetector::new();
        
        let rows = vec![
            vec!["a".to_string(), "b".to_string(), "c".to_string()],
            vec!["d".to_string(), "e".to_string(), "f".to_string()],
            vec!["a".to_string(), "b".to_string(), "c".to_string()], // duplicate
            vec!["g".to_string(), "h".to_string(), "i".to_string()],
            vec!["d".to_string(), "e".to_string(), "f".to_string()], // duplicate
        ];
        
        detector.process_batch(&rows);
        
        assert_eq!(detector.total_rows(), 5);
        assert_eq!(detector.duplicate_count(), 2);
        assert_eq!(detector.duplicate_percentage(), 40.0);
    }

    #[test]
    fn test_no_duplicates() {
        let mut detector = DuplicateDetector::new();
        
        let rows = vec![
            vec!["a".to_string(), "b".to_string()],
            vec!["c".to_string(), "d".to_string()],
            vec!["e".to_string(), "f".to_string()],
        ];
        
        detector.process_batch(&rows);
        
        assert_eq!(detector.duplicate_count(), 0);
        assert_eq!(detector.duplicate_percentage(), 0.0);
    }

    #[test]
    fn test_duplicate_issues_severity() {
        // High percentage - error
        let issues = check_duplicate_issues(50, 15.0);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].severity, Severity::Error);
        
        // Medium percentage - warning
        let issues = check_duplicate_issues(50, 5.0);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].severity, Severity::Warning);
        
        // Low percentage - info
        let issues = check_duplicate_issues(5, 0.5);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].severity, Severity::Info);
        
        // No duplicates
        let issues = check_duplicate_issues(0, 0.0);
        assert_eq!(issues.len(), 0);
    }
}
