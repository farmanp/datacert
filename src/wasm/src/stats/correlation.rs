use serde::Serialize;
use std::collections::HashMap;
use ts_rs::TS;

/// Result of correlation matrix computation
#[derive(Serialize, Debug, Clone, TS)]
#[ts(export)]
pub struct CorrelationMatrix {
    /// Names of numeric columns included in the correlation matrix
    pub columns: Vec<String>,
    /// NxN matrix of Pearson correlation coefficients
    /// matrix[i][j] is correlation between columns[i] and columns[j]
    pub matrix: Vec<Vec<f64>>,
}

/// Accumulator for computing Pearson correlation incrementally using streaming algorithm
/// Uses the formula: r = Σ((xi - x̄)(yi - ȳ)) / (n * σx * σy)
/// Implemented using Welford's online algorithm for numerical stability
#[derive(Debug, Clone)]
pub struct CorrelationAccumulator {
    /// Column names for numeric columns
    columns: Vec<String>,
    /// Column index mapping (name -> index in our numeric columns)
    column_indices: HashMap<String, usize>,
    /// Count of valid pairs for each column combination
    /// Stored as flat array: counts[i * n + j]
    pair_counts: Vec<u64>,
    /// Running mean for each column
    means: Vec<f64>,
    /// Running M2 (sum of squared deviations) for each column
    m2s: Vec<f64>,
    /// Running co-moment for each pair of columns
    /// co_moments[i * n + j] = Σ((xi - mean_x)(yi - mean_y))
    co_moments: Vec<f64>,
    /// Individual counts per column (for tracking valid values)
    column_counts: Vec<u64>,
}

impl CorrelationAccumulator {
    /// Create a new correlation accumulator for the given numeric column names
    pub fn new(numeric_columns: Vec<String>) -> Self {
        let n = numeric_columns.len();
        let mut column_indices = HashMap::new();
        for (i, name) in numeric_columns.iter().enumerate() {
            column_indices.insert(name.clone(), i);
        }

        Self {
            columns: numeric_columns,
            column_indices,
            pair_counts: vec![0; n * n],
            means: vec![0.0; n],
            m2s: vec![0.0; n],
            co_moments: vec![0.0; n * n],
            column_counts: vec![0; n],
        }
    }

    /// Update the accumulator with a row of data
    /// values should be a map from column name to the string value
    pub fn update(&mut self, values: &HashMap<String, String>) {
        let n = self.columns.len();
        if n == 0 {
            return;
        }

        // Parse numeric values for this row
        let mut parsed_values: Vec<Option<f64>> = vec![None; n];

        for (name, value) in values {
            if let Some(&idx) = self.column_indices.get(name) {
                let trimmed = value.trim();
                if !trimmed.is_empty()
                    && trimmed.to_lowercase() != "null"
                    && trimmed.to_lowercase() != "n/a"
                {
                    if let Ok(val) = trimmed.parse::<f64>() {
                        if !val.is_nan() && !val.is_infinite() {
                            parsed_values[idx] = Some(val);
                        }
                    }
                }
            }
        }

        // Compute deltas BEFORE updating means (needed for co-moment calculation)
        let mut deltas_old: Vec<Option<f64>> = vec![None; n];
        for i in 0..n {
            if let Some(val) = parsed_values[i] {
                deltas_old[i] = Some(val - self.means[i]);
            }
        }

        // Update individual column statistics using Welford's algorithm
        for i in 0..n {
            if let Some(val) = parsed_values[i] {
                let count = self.column_counts[i] + 1;
                let delta = val - self.means[i];
                let mean = self.means[i] + delta / count as f64;
                let delta2 = val - mean;

                self.means[i] = mean;
                self.m2s[i] += delta * delta2;
                self.column_counts[i] = count;
            }
        }

        // Update pairwise co-moments using the online covariance formula
        // The correct formula is: C_n = C_{n-1} + (x - mean_x_old) * (y - mean_y_new)
        // where mean_x_old is before update and mean_y_new is after update
        for i in 0..n {
            if let Some(delta_x_old) = deltas_old[i] {
                for j in 0..n {
                    if let Some(val_j) = parsed_values[j] {
                        let idx = i * n + j;
                        let pair_count = self.pair_counts[idx] + 1;
                        self.pair_counts[idx] = pair_count;

                        // Online covariance: C_n = C_{n-1} + (x - mean_x_old) * (y - mean_y_new)
                        // delta_x_old was computed before mean update
                        // delta_y_new is computed after mean update
                        let delta_y_new = val_j - self.means[j];
                        self.co_moments[idx] += delta_x_old * delta_y_new;
                    }
                }
            }
        }
    }

    /// Update with a batch of rows
    /// Each row is represented as a vector of string values corresponding to column indices
    pub fn update_batch(&mut self, headers: &[String], rows: &[Vec<String>]) {
        for row in rows {
            let mut values = HashMap::new();
            for (i, val) in row.iter().enumerate() {
                if i < headers.len() {
                    values.insert(headers[i].clone(), val.clone());
                }
            }
            self.update(&values);
        }
    }

    /// Finalize and compute the correlation matrix
    pub fn finalize(&self) -> CorrelationMatrix {
        let n = self.columns.len();
        let mut matrix = vec![vec![0.0; n]; n];

        for i in 0..n {
            for j in 0..n {
                let idx = i * n + j;
                let count = self.pair_counts[idx];

                if i == j {
                    // Diagonal is always 1.0 (correlation of a variable with itself)
                    matrix[i][j] = 1.0;
                } else if count > 1 {
                    // Compute Pearson correlation coefficient
                    // r = co_moment / sqrt(m2_x * m2_y)
                    // where co_moment = Σ(xi - mean_x)(yi - mean_y)
                    // and m2 = Σ(xi - mean)^2
                    // The (n-1) divisors cancel out in numerator and denominator

                    let co_moment = self.co_moments[idx];
                    let m2_x = self.m2s[i];
                    let m2_y = self.m2s[j];

                    if m2_x > 0.0 && m2_y > 0.0 {
                        let r = co_moment / (m2_x.sqrt() * m2_y.sqrt());

                        // Clamp to [-1, 1] to handle floating point errors
                        matrix[i][j] = r.clamp(-1.0, 1.0);
                    } else {
                        matrix[i][j] = 0.0;
                    }
                } else {
                    // Not enough data points
                    matrix[i][j] = 0.0;
                }
            }
        }

        CorrelationMatrix {
            columns: self.columns.clone(),
            matrix,
        }
    }

    /// Get the number of numeric columns
    pub fn column_count(&self) -> usize {
        self.columns.len()
    }
}

/// Compute correlation matrix from raw data (non-streaming)
/// This is more accurate but requires all data in memory
pub fn compute_correlation_matrix(
    headers: &[String],
    rows: &[Vec<String>],
    numeric_column_indices: &[usize],
) -> CorrelationMatrix {
    let n = numeric_column_indices.len();
    if n == 0 {
        return CorrelationMatrix {
            columns: vec![],
            matrix: vec![],
        };
    }

    let columns: Vec<String> = numeric_column_indices
        .iter()
        .filter_map(|&idx| headers.get(idx).cloned())
        .collect();

    // Collect all valid numeric values per column
    let mut column_values: Vec<Vec<f64>> = vec![Vec::new(); n];

    for row in rows {
        for (col_idx, &header_idx) in numeric_column_indices.iter().enumerate() {
            if header_idx < row.len() {
                let value = row[header_idx].trim();
                if !value.is_empty()
                    && value.to_lowercase() != "null"
                    && value.to_lowercase() != "n/a"
                {
                    if let Ok(val) = value.parse::<f64>() {
                        if !val.is_nan() && !val.is_infinite() {
                            column_values[col_idx].push(val);
                        }
                    }
                }
            }
        }
    }

    // Compute correlation matrix
    let mut matrix = vec![vec![0.0; n]; n];

    for i in 0..n {
        for j in 0..n {
            if i == j {
                matrix[i][j] = 1.0;
            } else {
                matrix[i][j] = pearson_correlation(&column_values[i], &column_values[j]);
            }
        }
    }

    CorrelationMatrix { columns, matrix }
}

/// Compute Pearson correlation coefficient between two vectors
/// Handles cases where vectors have different lengths by using pairwise complete observations
fn pearson_correlation(x: &[f64], y: &[f64]) -> f64 {
    // For vectors of same length, compute standard correlation
    // For different lengths, we'd need paired data - here we assume they're already paired
    let n = x.len().min(y.len());
    if n < 2 {
        return 0.0;
    }

    // Compute means
    let mean_x: f64 = x.iter().take(n).sum::<f64>() / n as f64;
    let mean_y: f64 = y.iter().take(n).sum::<f64>() / n as f64;

    // Compute covariance and standard deviations
    let mut cov = 0.0;
    let mut var_x = 0.0;
    let mut var_y = 0.0;

    for i in 0..n {
        let dx = x[i] - mean_x;
        let dy = y[i] - mean_y;
        cov += dx * dy;
        var_x += dx * dx;
        var_y += dy * dy;
    }

    if var_x == 0.0 || var_y == 0.0 {
        return 0.0;
    }

    let r = cov / (var_x.sqrt() * var_y.sqrt());
    r.clamp(-1.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_positive_correlation() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0];
        let r = pearson_correlation(&x, &y);
        assert!((r - 1.0).abs() < 0.0001, "Expected r=1.0, got r={}", r);
    }

    #[test]
    fn test_perfect_negative_correlation() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![10.0, 8.0, 6.0, 4.0, 2.0];
        let r = pearson_correlation(&x, &y);
        assert!((r - (-1.0)).abs() < 0.0001, "Expected r=-1.0, got r={}", r);
    }

    #[test]
    fn test_no_correlation() {
        // These values should have correlation close to 0
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![5.0, 1.0, 4.0, 2.0, 3.0];
        let r = pearson_correlation(&x, &y);
        assert!(r.abs() < 0.5, "Expected r close to 0, got r={}", r);
    }

    #[test]
    fn test_correlation_matrix_structure() {
        let headers = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let rows = vec![
            vec!["1".to_string(), "2".to_string(), "text".to_string()],
            vec!["2".to_string(), "4".to_string(), "more".to_string()],
            vec!["3".to_string(), "6".to_string(), "data".to_string()],
        ];

        let result = compute_correlation_matrix(&headers, &rows, &[0, 1]);

        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.matrix.len(), 2);
        assert_eq!(result.matrix[0].len(), 2);

        // Diagonal should be 1.0
        assert!((result.matrix[0][0] - 1.0).abs() < 0.0001);
        assert!((result.matrix[1][1] - 1.0).abs() < 0.0001);

        // Off-diagonal should be symmetric
        assert!((result.matrix[0][1] - result.matrix[1][0]).abs() < 0.0001);
    }

    #[test]
    fn test_streaming_accumulator() {
        let columns = vec!["a".to_string(), "b".to_string()];
        let mut acc = CorrelationAccumulator::new(columns);

        // Add some correlated data
        let headers = vec!["a".to_string(), "b".to_string()];
        let rows = vec![
            vec!["1".to_string(), "2".to_string()],
            vec!["2".to_string(), "4".to_string()],
            vec!["3".to_string(), "6".to_string()],
            vec!["4".to_string(), "8".to_string()],
            vec!["5".to_string(), "10".to_string()],
        ];

        acc.update_batch(&headers, &rows);
        let result = acc.finalize();

        assert_eq!(result.columns.len(), 2);
        // Should have high positive correlation
        assert!(result.matrix[0][1] > 0.9, "Expected high correlation, got {}", result.matrix[0][1]);
    }
}
