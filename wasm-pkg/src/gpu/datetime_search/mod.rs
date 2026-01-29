//! GPU 起動時刻検索モジュール
//!
//! WebGPU による MT Seed 起動時刻検索を提供する。

mod pipeline;
mod searcher;

pub use searcher::GpuMtseedDatetimeSearcher;
