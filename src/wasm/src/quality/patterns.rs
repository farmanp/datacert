use super::{QualityIssue, Severity};
use regex::Regex;
use std::sync::OnceLock;

/// PII pattern types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PiiType {
    Email,
    Phone,
    Ssn,
    CreditCard,
}

impl PiiType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PiiType::Email => "email",
            PiiType::Phone => "phone number",
            PiiType::Ssn => "SSN",
            PiiType::CreditCard => "credit card",
        }
    }
    
    pub fn severity(&self) -> Severity {
        match self {
            PiiType::Email => Severity::Warning,
            PiiType::Phone => Severity::Warning,
            PiiType::Ssn => Severity::Error,
            PiiType::CreditCard => Severity::Error,
        }
    }
}

// Lazy-initialized regex patterns
static EMAIL_REGEX: OnceLock<Regex> = OnceLock::new();
static PHONE_REGEX: OnceLock<Regex> = OnceLock::new();
static SSN_REGEX: OnceLock<Regex> = OnceLock::new();
static CREDIT_CARD_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_email_regex() -> &'static Regex {
    EMAIL_REGEX.get_or_init(|| {
        Regex::new(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b").unwrap()
    })
}

fn get_phone_regex() -> &'static Regex {
    PHONE_REGEX.get_or_init(|| {
        // Matches: (123) 456-7890, 123-456-7890, 123.456.7890, +1-123-456-7890
        Regex::new(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}").unwrap()
    })
}

fn get_ssn_regex() -> &'static Regex {
    SSN_REGEX.get_or_init(|| {
        // Matches: XXX-XX-XXXX (requires dashes, must be entire string)
        // Length check is done separately to avoid credit card false positives
        Regex::new(r"^\d{3}-\d{2}-\d{4}$").unwrap()
    })
}

fn get_credit_card_regex() -> &'static Regex {
    CREDIT_CARD_REGEX.get_or_init(|| {
        // Matches: 4-digit groups separated by spaces or dashes (13-19 digits total)
        Regex::new(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b").unwrap()
    })
}

/// Detect PII patterns in a sample of values
/// Returns the detected PII type if found
pub fn detect_pii_pattern(values: &[&str]) -> Option<PiiType> {
    if values.is_empty() {
        return None;
    }
    
    let sample_size = values.len().min(100);
    let sample = &values[..sample_size];
    
    let mut email_matches = 0;
    let mut phone_matches = 0;
    let mut ssn_matches = 0;
    let mut cc_matches = 0;
    
    for value in sample {
        let trimmed = value.trim();
        
        if get_email_regex().is_match(trimmed) {
            email_matches += 1;
        }
        if get_phone_regex().is_match(trimmed) {
            phone_matches += 1;
        }
        
        // SSN check: must be exactly 11 characters (XXX-XX-XXXX) and match the pattern
        // This ensures it's not part of a credit card number
        if trimmed.len() == 11 {
            let digits_only: String = trimmed.chars().filter(|c| c.is_numeric()).collect();
            if digits_only.len() == 9 && get_ssn_regex().is_match(trimmed) {
                ssn_matches += 1;
            }
        }
        
        // Credit card check: must be longer than SSN format
        if trimmed.len() > 13 && get_credit_card_regex().is_match(trimmed) {
            cc_matches += 1;
        }
    }
    
    // Require at least 30% match rate to flag as PII (conservative approach)
    // Minimum threshold of 1 to avoid false positives
    let threshold = ((sample_size as f64 * 0.3) as usize).max(1);
    
    // Check in order of severity (most sensitive first)
    if ssn_matches >= threshold {
        return Some(PiiType::Ssn);
    }
    if cc_matches >= threshold {
        return Some(PiiType::CreditCard);
    }
    if email_matches >= threshold {
        return Some(PiiType::Email);
    }
    if phone_matches >= threshold {
        return Some(PiiType::Phone);
    }
    
    None
}

/// Generate PII-related quality issues
pub fn check_pii_issues(pii_type: Option<PiiType>, column_name: &str) -> Vec<QualityIssue> {
    let mut issues = Vec::new();
    
    if let Some(pii) = pii_type {
        issues.push(QualityIssue {
            id: format!("{}_pii_{}", column_name, pii.as_str().replace(" ", "_")),
            message: format!("Potential PII detected: {}", pii.as_str()),
            severity: pii.severity(),
        });
    }
    
    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_detection() {
        let values = vec![
            "user@example.com",
            "john.doe@company.org",
            "test@test.co.uk",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();
        
        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, Some(PiiType::Email));
    }

    #[test]
    fn test_phone_detection() {
        let values = vec![
            "(123) 456-7890",
            "123-456-7890",
            "123.456.7890",
            "+1-123-456-7890",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();
        
        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, Some(PiiType::Phone));
    }

    #[test]
    fn test_ssn_detection() {
        let values = vec![
            "123-45-6789",
            "987-65-4321",
            "111-22-3333",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();
        
        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, Some(PiiType::Ssn));
    }

    #[test]
    fn test_credit_card_detection() {
        let values = vec![
            "4532-1234-5678-9010",
            "5425 2334 3010 9903",
            "3782 822463 10005",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();
        
        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, Some(PiiType::CreditCard));
    }

    #[test]
    fn test_no_pii_detection() {
        let values = vec![
            "normal text",
            "some data",
            "123",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();
        
        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, None);
    }

    #[test]
    fn test_pii_severity() {
        assert_eq!(PiiType::Email.severity(), Severity::Warning);
        assert_eq!(PiiType::Phone.severity(), Severity::Warning);
        assert_eq!(PiiType::Ssn.severity(), Severity::Error);
        assert_eq!(PiiType::CreditCard.severity(), Severity::Error);
    }
}
