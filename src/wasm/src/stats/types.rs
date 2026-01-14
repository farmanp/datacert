use serde::{Serialize, Deserialize};
use ts_rs::TS;

#[derive(Serialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub enum DataType {
    Integer,
    Numeric,
    String,
    Boolean,
    Date,
    Null,
}

#[derive(Serialize, Debug, Clone, TS)]
#[ts(export)]
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
