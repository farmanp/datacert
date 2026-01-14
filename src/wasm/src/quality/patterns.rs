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
    IpAddress,
    DateOfBirth,
    PostalCode,
}

impl PiiType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PiiType::Email => "email",
            PiiType::Phone => "phone number",
            PiiType::Ssn => "SSN",
            PiiType::CreditCard => "credit card",
            PiiType::IpAddress => "IP address",
            PiiType::DateOfBirth => "date of birth",
            PiiType::PostalCode => "postal code",
        }
    }

    pub fn severity(&self) -> Severity {
        match self {
            PiiType::Email => Severity::Warning,
            PiiType::Phone => Severity::Warning,
            PiiType::Ssn => Severity::Error,
            PiiType::CreditCard => Severity::Error,
            PiiType::IpAddress => Severity::Warning,
            PiiType::DateOfBirth => Severity::Warning,
            PiiType::PostalCode => Severity::Info,
        }
    }
}

// Lazy-initialized regex patterns
static EMAIL_REGEX: OnceLock<Regex> = OnceLock::new();
static PHONE_REGEX: OnceLock<Regex> = OnceLock::new();
static SSN_REGEX: OnceLock<Regex> = OnceLock::new();
static CREDIT_CARD_REGEX: OnceLock<Regex> = OnceLock::new();
static IP_ADDRESS_REGEX: OnceLock<Regex> = OnceLock::new();
static DOB_REGEX: OnceLock<Regex> = OnceLock::new();
static US_POSTAL_REGEX: OnceLock<Regex> = OnceLock::new();
static CANADIAN_POSTAL_REGEX: OnceLock<Regex> = OnceLock::new();

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

fn get_ip_address_regex() -> &'static Regex {
    IP_ADDRESS_REGEX.get_or_init(|| {
        // Matches IPv4 addresses: xxx.xxx.xxx.xxx
        Regex::new(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b").unwrap()
    })
}

fn get_dob_regex() -> &'static Regex {
    DOB_REGEX.get_or_init(|| {
        // Matches dates in YYYY-MM-DD or YYYY/MM/DD format (common DOB formats)
        Regex::new(r"\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b").unwrap()
    })
}

fn get_us_postal_regex() -> &'static Regex {
    US_POSTAL_REGEX.get_or_init(|| {
        // Matches US ZIP codes: 12345 or 12345-6789
        Regex::new(r"\b\d{5}(?:-\d{4})?\b").unwrap()
    })
}

fn get_canadian_postal_regex() -> &'static Regex {
    CANADIAN_POSTAL_REGEX.get_or_init(|| {
        // Matches Canadian postal codes: A1A 1A1 or A1A1A1
        Regex::new(r"(?i)\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b").unwrap()
    })
}

/// Detect PII patterns in a sample of values
/// Returns the detected PII type if found
pub fn detect_pii_pattern(values: &[&str]) -> Option<PiiType> {
    detect_pii_pattern_with_column_name(values, None)
}

/// Detect PII patterns with optional column name heuristics
/// Column names provide secondary signals for PII detection
pub fn detect_pii_pattern_with_column_name(values: &[&str], column_name: Option<&str>) -> Option<PiiType> {
    if values.is_empty() {
        return None;
    }

    let sample_size = values.len().min(100);
    let sample = &values[..sample_size];

    let mut email_matches = 0;
    let mut phone_matches = 0;
    let mut ssn_matches = 0;
    let mut cc_matches = 0;
    let mut ip_matches = 0;
    let mut dob_matches = 0;
    let mut postal_matches = 0;

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

        // IP address check
        if get_ip_address_regex().is_match(trimmed) {
            ip_matches += 1;
        }

        // Date of birth check (YYYY-MM-DD or YYYY/MM/DD format)
        if get_dob_regex().is_match(trimmed) {
            dob_matches += 1;
        }

        // Postal code check (US or Canadian)
        if get_us_postal_regex().is_match(trimmed) || get_canadian_postal_regex().is_match(trimmed) {
            postal_matches += 1;
        }
    }

    // Require at least 30% match rate to flag as PII (conservative approach)
    // Minimum threshold of 1 to avoid false positives
    let threshold = ((sample_size as f64 * 0.3) as usize).max(1);

    // Check column name heuristics for secondary signal
    let column_hint = column_name.and_then(detect_pii_from_column_name);

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
    if ip_matches >= threshold {
        return Some(PiiType::IpAddress);
    }
    // For DOB, use a lower threshold if column name suggests it
    let dob_threshold = if column_hint == Some(PiiType::DateOfBirth) {
        (threshold / 2).max(1)
    } else {
        threshold
    };
    if dob_matches >= dob_threshold {
        return Some(PiiType::DateOfBirth);
    }
    // For postal codes, only flag if column name also suggests it (to reduce false positives)
    if postal_matches >= threshold && column_hint == Some(PiiType::PostalCode) {
        return Some(PiiType::PostalCode);
    }

    // If content-based detection didn't find anything, check column name hint
    // as a fallback (lower confidence)
    column_hint
}

/// Detect potential PII type from column name alone
/// Returns a PiiType if the column name strongly suggests PII
pub fn detect_pii_from_column_name(name: &str) -> Option<PiiType> {
    let name_lower = name.to_lowercase();

    // Check for specific PII-related keywords in column names
    // Note: Order matters - more specific matches should come first

    // Email
    if name_lower.contains("email") || name_lower.contains("e_mail") || name_lower.contains("e-mail")
    {
        return Some(PiiType::Email);
    }

    // Phone
    if name_lower.contains("phone")
        || name_lower.contains("mobile")
        || name_lower.contains("cell")
        || name_lower.contains("tel")
        || name_lower.contains("fax")
    {
        return Some(PiiType::Phone);
    }

    // SSN
    if name_lower.contains("ssn")
        || name_lower.contains("social_security")
        || name_lower.contains("socialsecurity")
        || name_lower.contains("social-security")
    {
        return Some(PiiType::Ssn);
    }

    // IP Address (check BEFORE address/postal since "ip_address" contains "address")
    if name_lower.contains("ip_address")
        || name_lower.contains("ipaddress")
        || name_lower.contains("ip_addr")
        || name_lower.contains("client_ip")
        || name_lower.contains("user_ip")
        || name_lower.contains("server_ip")
        || name_lower.contains("source_ip")
        || name_lower.contains("dest_ip")
        || name_lower.contains("remote_ip")
        || (name_lower == "ip")
    {
        return Some(PiiType::IpAddress);
    }

    // Address (implies postal code or street)
    if name_lower.contains("address")
        || name_lower.contains("street")
        || name_lower.contains("zip")
        || name_lower.contains("postal")
        || name_lower.contains("postcode")
    {
        return Some(PiiType::PostalCode);
    }

    // Date of Birth
    if name_lower.contains("dob")
        || name_lower.contains("birth")
        || name_lower.contains("birthdate")
        || name_lower.contains("date_of_birth")
        || name_lower.contains("dateofbirth")
    {
        return Some(PiiType::DateOfBirth);
    }

    // Name (but exclude "filename", "pathname", etc.)
    if (name_lower.contains("name")
        || name_lower.contains("first_name")
        || name_lower.contains("last_name")
        || name_lower.contains("firstname")
        || name_lower.contains("lastname")
        || name_lower.contains("fullname"))
        && !name_lower.contains("file")
        && !name_lower.contains("path")
        && !name_lower.contains("table")
        && !name_lower.contains("column")
        && !name_lower.contains("host")
    {
        // Names don't map to a specific PiiType yet, but we can flag as a warning
        // For now, return None and rely on other signals
        return None;
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
        assert_eq!(PiiType::IpAddress.severity(), Severity::Warning);
        assert_eq!(PiiType::DateOfBirth.severity(), Severity::Warning);
        assert_eq!(PiiType::PostalCode.severity(), Severity::Info);
    }

    #[test]
    fn test_ip_address_detection() {
        let values = vec![
            "192.168.1.1",
            "10.0.0.1",
            "172.16.0.100",
            "8.8.8.8",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();

        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, Some(PiiType::IpAddress));
    }

    #[test]
    fn test_dob_detection() {
        let values = vec![
            "1990-05-15",
            "2000-12-01",
            "1985/03/22",
            "2010-07-04",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();

        let pii = detect_pii_pattern(&refs);
        assert_eq!(pii, Some(PiiType::DateOfBirth));
    }

    #[test]
    fn test_us_postal_code_detection_with_column_hint() {
        let values = vec![
            "90210",
            "10001",
            "94102-1234",
            "30301",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();

        // Without column hint, postal codes alone may not trigger (to avoid false positives)
        // With column hint, it should detect
        let pii = detect_pii_pattern_with_column_name(&refs, Some("zip_code"));
        assert_eq!(pii, Some(PiiType::PostalCode));
    }

    #[test]
    fn test_canadian_postal_code_detection_with_column_hint() {
        let values = vec![
            "M5V 2T6",
            "K1A 0B1",
            "V6B2W2",
            "H2X 1L4",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();

        let pii = detect_pii_pattern_with_column_name(&refs, Some("postal_code"));
        assert_eq!(pii, Some(PiiType::PostalCode));
    }

    #[test]
    fn test_column_name_heuristics() {
        assert_eq!(detect_pii_from_column_name("email"), Some(PiiType::Email));
        assert_eq!(detect_pii_from_column_name("user_email"), Some(PiiType::Email));
        assert_eq!(detect_pii_from_column_name("phone_number"), Some(PiiType::Phone));
        assert_eq!(detect_pii_from_column_name("mobile"), Some(PiiType::Phone));
        assert_eq!(detect_pii_from_column_name("ssn"), Some(PiiType::Ssn));
        assert_eq!(detect_pii_from_column_name("social_security_number"), Some(PiiType::Ssn));
        assert_eq!(detect_pii_from_column_name("street_address"), Some(PiiType::PostalCode));
        assert_eq!(detect_pii_from_column_name("zip_code"), Some(PiiType::PostalCode));
        assert_eq!(detect_pii_from_column_name("dob"), Some(PiiType::DateOfBirth));
        assert_eq!(detect_pii_from_column_name("date_of_birth"), Some(PiiType::DateOfBirth));
        assert_eq!(detect_pii_from_column_name("ip_address"), Some(PiiType::IpAddress));
        assert_eq!(detect_pii_from_column_name("client_ip"), Some(PiiType::IpAddress));

        // These should NOT be detected as PII
        assert_eq!(detect_pii_from_column_name("filename"), None);
        assert_eq!(detect_pii_from_column_name("pathname"), None);
        assert_eq!(detect_pii_from_column_name("amount"), None);
        assert_eq!(detect_pii_from_column_name("shipping_cost"), None);
    }

    #[test]
    fn test_column_name_fallback() {
        // Test that column name hint is used as fallback when content doesn't match
        let values = vec![
            "random text",
            "some data",
            "other values",
        ];
        let refs: Vec<&str> = values.iter().map(|s| s.as_ref()).collect();

        // With a strong column hint, it should still flag as potential PII
        let pii = detect_pii_pattern_with_column_name(&refs, Some("email_address"));
        assert_eq!(pii, Some(PiiType::Email));
    }
}
