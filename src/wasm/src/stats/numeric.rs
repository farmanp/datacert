use serde::Serialize;
use ts_rs::TS;

#[derive(Serialize, Debug, TS)]
#[ts(export)]
pub struct NumericStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub sum: f64,
    pub count: u64,
    pub std_dev: f64,
    pub variance: f64,
    pub skewness: f64,
    pub kurtosis: f64,
    pub median: f64,
    pub p25: f64,
    pub p75: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,

    // Welford's variables
    #[serde(skip)]
    #[ts(skip)]
    m2: f64,
    #[serde(skip)]
    #[ts(skip)]
    m3: f64,
    #[serde(skip)]
    #[ts(skip)]
    m4: f64,
}

impl NumericStats {
    pub fn new() -> Self {
        Self {
            min: f64::INFINITY,
            max: f64::NEG_INFINITY,
            mean: 0.0,
            sum: 0.0,
            count: 0,
            std_dev: 0.0,
            variance: 0.0,
            skewness: 0.0,
            kurtosis: 0.0,
            median: 0.0,
            p25: 0.0,
            p75: 0.0,
            p90: 0.0,
            p95: 0.0,
            p99: 0.0,
            m2: 0.0,
            m3: 0.0,
            m4: 0.0,
        }
    }

    pub fn update(&mut self, val: f64) {
        if val.is_nan() || val.is_infinite() { return; }
        
        let n_prev = self.count as f64;
        self.count += 1;
        let n = self.count as f64;
        
        self.sum += val;
        if val < self.min { self.min = val; }
        if val > self.max { self.max = val; }

        let delta = val - self.mean;
        let delta_n = delta / n;
        let delta_n2 = delta_n * delta_n;
        let term1 = delta * delta_n * n_prev;
        
        self.mean += delta_n;
        self.m4 += term1 * delta_n2 * (n*n - 3.0*n + 3.0) + 6.0 * delta_n2 * self.m2 - 4.0 * delta_n * self.m3;
        self.m3 += term1 * delta_n * (n - 2.0) - 3.0 * delta_n * self.m2;
        self.m2 += term1;
    }

    pub fn finalize(&mut self, samples: &mut [(f64, usize)]) {
        if self.count > 1 {
            let n = self.count as f64;
            self.variance = self.m2 / (n - 1.0);
            self.std_dev = self.variance.sqrt();
            
            if self.m2 > 0.0 {
                self.skewness = (n.sqrt() * self.m3) / self.m2.powf(1.5);
                self.kurtosis = (n * self.m4) / (self.m2 * self.m2) - 3.0;
            }
        }

        if !samples.is_empty() {
            samples.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
            let values: Vec<f64> = samples.iter().map(|s| s.0).collect();
            
            self.median = self.get_quantile(&values, 0.5);
            self.p25 = self.get_quantile(&values, 0.25);
            self.p75 = self.get_quantile(&values, 0.75);
            self.p90 = self.get_quantile(&values, 0.9);
            self.p95 = self.get_quantile(&values, 0.95);
            self.p99 = self.get_quantile(&values, 0.99);
        }
    }

    fn get_quantile(&self, sorted_samples: &[f64], q: f64) -> f64 {
        let n = sorted_samples.len();
        if n == 0 { return 0.0; }
        let pos = q * (n - 1) as f64;
        let idx = pos.floor() as usize;
        let fract = pos - idx as f64;
        
        if idx + 1 < n {
            sorted_samples[idx] * (1.0 - fract) + sorted_samples[idx + 1] * fract
        } else {
            sorted_samples[idx]
        }
    }
}

impl Clone for NumericStats {
    fn clone(&self) -> Self {
        Self {
            min: self.min,
            max: self.max,
            mean: self.mean,
            sum: self.sum,
            count: self.count,
            std_dev: self.std_dev,
            variance: self.variance,
            skewness: self.skewness,
            kurtosis: self.kurtosis,
            median: self.median,
            p25: self.p25,
            p75: self.p75,
            p90: self.p90,
            p95: self.p95,
            p99: self.p99,
            m2: self.m2,
            m3: self.m3,
            m4: self.m4,
        }
    }
}
