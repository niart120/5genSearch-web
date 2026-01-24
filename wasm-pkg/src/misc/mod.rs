//! 雑多なユーティリティ
//!
//! レポート針検索と MT Seed 全探索機能を提供する。

pub mod mtseed_search;
pub mod needle_search;

pub use mtseed_search::{MtseedResult, MtseedSearchBatch, MtseedSearchParams, MtseedSearcher};
pub use needle_search::{
    NeedleSearchBatch, NeedleSearchParams, NeedleSearchResult, NeedleSearcher, get_needle_pattern,
};
