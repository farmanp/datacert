use serde::{Serialize};

#[derive(Serialize, Debug, Clone)]
pub struct Histogram {
    pub bins: Vec<HistogramBin>,
    pub min: f64,
    pub max: f64,
    pub bin_width: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct HistogramBin {
    pub start: f64,
    pub end: f64,
    pub count: u64,
}

impl Histogram {
    pub fn generate(data: &[f64], min: f64, max: f64, num_bins: usize) -> Self {
        if data.is_empty() || num_bins == 0 || min >= max {
            return Self { bins: Vec::new(), min, max, bin_width: 0.0 };
        }

        let bin_width = (max - min) / num_bins as f64;
        let mut bin_counts = vec![0u64; num_bins];

        for &val in data {
            let mut bin_idx = ((val - min) / bin_width).floor() as usize;
            if bin_idx >= num_bins {
                bin_idx = num_bins - 1;
            }
            bin_counts[bin_idx] += 1;
        }

        let bins = bin_counts.into_iter().enumerate().map(|(i, count)| {
            HistogramBin {
                start: min + i as f64 * bin_width,
                end: min + (i + 1) as f64 * bin_width,
                count,
            }
        }).collect();

        Self {
            bins,
            min,
            max,
            bin_width,
        }
    }
}

#[derive(Debug)]
pub struct HistogramAccumulator {
    pub samples: Vec<f64>,
    max_samples: usize,
    count: u64,
}

impl HistogramAccumulator {
    pub fn new(max_samples: usize) -> Self {
        Self {
            samples: Vec::with_capacity(max_samples),
            max_samples,
            count: 0,
        }
    }

    pub fn update(&mut self, val: f64) {
        self.count += 1;
        if self.samples.len() < self.max_samples {
            self.samples.push(val);
        } else {
            // Simple deterministic LCG for reservoir sampling in WASM/CLI
            let j = (self.count * 1103515245 + 12345) as usize % self.count as usize;
            if j < self.max_samples {
                self.samples[j] = val;
            }
        }
    }

    pub fn finalize(&self, min: f64, max: f64) -> Histogram {
        let num_bins = if self.count > 0 {
            let n = self.count as f64;
            (n.log2() + 1.0).ceil() as usize
        } else {
            10
        }.clamp(5, 50);

        Histogram::generate(&self.samples, min, max, num_bins)
    }
}
