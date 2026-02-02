//! 雑多なユーティリティ
//!
//! レポート針パターン検索と MT Seed 全探索機能を提供する。

pub mod mtseed_search;
pub mod needle_search;

// Searcher のみ re-export (型は types モジュールから)
pub use mtseed_search::MtseedSearcher;
pub use needle_search::{get_needle_pattern_at, search_needle_pattern};
