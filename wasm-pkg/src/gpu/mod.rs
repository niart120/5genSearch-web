//! GPU 計算モジュール
//!
//! WebGPU による並列計算機能を提供する。
//! `gpu` feature flag 有効時のみコンパイルされる。

pub mod context;
pub mod datetime_search;
pub mod limits;
pub mod profile;

pub use context::GpuDeviceContext;
pub use limits::SearchJobLimits;
pub use profile::{GpuKind, GpuProfile};

// Re-export GPU datetime search
pub use datetime_search::{GpuDatetimeSearchIterator, GpuSearchBatch};
