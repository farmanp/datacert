use serde::{Serialize, Deserialize};

#[derive(Serialize, Debug, Clone, PartialEq)]
pub enum DataType {
    Integer,
    Numeric,
    String,
    Boolean,
    Date,
    Null,
}

#[derive(Serialize, Debug, Clone)]
pub struct BaseStats {
    pub count: u64,
    pub missing: u64,
    pub distinct_estimate: u64,
    pub inferred_type: DataType,
}

pub trait StatAccumulator {
    fn update(&mut self, value: &str);
    fn get_base_stats(&self) -> BaseStats;
}
