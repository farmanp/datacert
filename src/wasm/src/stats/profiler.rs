use serde::{Serialize};
use crate::stats::ColumnProfile;

#[derive(Serialize, Debug)]
pub struct ProfilerResult {
    pub column_profiles: Vec<ColumnProfile>,
    pub total_rows: u64,
}

pub struct Profiler {
    column_profiles: Vec<ColumnProfile>,
    total_rows: u64,
    headers: Vec<String>,
}

impl Profiler {
    pub fn new(headers: Vec<String>) -> Self {
        let column_profiles = headers.iter()
            .map(|name| ColumnProfile::new(name.clone()))
            .collect();
            
        Self {
            column_profiles,
            total_rows: 0,
            headers,
        }
    }

    pub fn update_batch(&mut self, rows: &[Vec<String>]) {
        for row in rows {
            self.total_rows += 1;
            for (i, value) in row.iter().enumerate() {
                if i < self.column_profiles.len() {
                    self.column_profiles[i].update(value);
                }
            }
        }
    }

    pub fn finalize(&mut self) -> ProfilerResult {
        for profile in &mut self.column_profiles {
            profile.finalize();
        }
        
        ProfilerResult {
            column_profiles: self.column_profiles.clone(),
            total_rows: self.total_rows,
        }
    }
}
