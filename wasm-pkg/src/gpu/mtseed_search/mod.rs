//! GPU MT Seed IV 全探索モジュール
//!
//! WebGPU による MT Seed IV 全探索を提供する。

mod iterator;
mod pipeline;

pub use iterator::{GpuMtseedSearchBatch, GpuMtseedSearchIterator};
