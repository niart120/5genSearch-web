//! 雑多なユーティリティ
//!
//! レポート針生成と MT Seed 全探索機能を提供する。

pub mod mtseed_search;
pub mod needle_generator;

pub use mtseed_search::{MtseedResult, MtseedSearchBatch, MtseedSearchParams, MtseedSearcher};
pub use needle_generator::{
    NeedleGenerator, NeedleGeneratorBatch, NeedleGeneratorParams, NeedleGeneratorResult,
    get_needle_pattern,
};
