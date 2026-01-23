//! レポート針検索
//!
//! 観測したレポート針パターンから消費位置を特定する機能。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::calc_report_needle_direction;
use crate::types::LcgSeed;

/// レポート針パターン (0-7 の方向値列)
pub type NeedlePattern = Vec<u8>;

/// レポート針検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchParams {
    /// 初期 LCG Seed
    pub initial_seed: LcgSeed,
    /// 観測したレポート針パターン (0-7)
    pub pattern: NeedlePattern,
    /// 検索開始消費位置
    pub advance_min: u32,
    /// 検索終了消費位置
    pub advance_max: u32,
}

/// レポート針検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// パターン開始消費位置
    pub advance: u32,
    /// パターン開始時点の LCG Seed
    #[tsify(type = "bigint")]
    pub seed: u64,
}

/// レポート針検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchBatch {
    pub results: Vec<NeedleSearchResult>,
    pub processed: u64,
    pub total: u64,
}

/// レポート針検索器
#[wasm_bindgen]
pub struct NeedleSearcher {
    pattern: NeedlePattern,
    advance_max: u32,
    advance_min: u32,
    current_advance: u32,
    lcg: Lcg64,
    total: u64,
}

#[wasm_bindgen]
impl NeedleSearcher {
    /// 検索器を作成
    ///
    /// # Errors
    /// パターンが空、無効な方向値 (8 以上)、または `advance_min > advance_max` の場合にエラーを返す
    #[wasm_bindgen(constructor)]
    pub fn new(params: NeedleSearchParams) -> Result<NeedleSearcher, String> {
        if params.pattern.is_empty() {
            return Err("pattern is empty".into());
        }
        if params.pattern.iter().any(|&d| d > 7) {
            return Err("Invalid needle direction (must be 0-7)".into());
        }
        if params.advance_min > params.advance_max {
            return Err("advance_min > advance_max".into());
        }

        // 初期位置まで LCG を進める
        let mut lcg = Lcg64::new(params.initial_seed);
        lcg.jump(u64::from(params.advance_min));
        let total = u64::from(params.advance_max - params.advance_min);

        Ok(Self {
            pattern: params.pattern,
            advance_max: params.advance_max,
            advance_min: params.advance_min,
            current_advance: params.advance_min,
            lcg,
            total,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_advance >= self.advance_max
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.total == 0 {
            return 1.0;
        }
        f64::from(self.current_advance - self.advance_min) / self.total as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        let mut results = Vec::new();
        let end_advance = (self.current_advance + chunk_size).min(self.advance_max);

        while self.current_advance < end_advance {
            // 現在位置でパターン一致判定
            if self.matches_pattern() {
                results.push(NeedleSearchResult {
                    advance: self.current_advance,
                    seed: self.lcg.current_seed().value(),
                });
            }

            self.lcg.advance(1);
            self.current_advance += 1;
        }

        NeedleSearchBatch {
            results,
            processed: u64::from(self.current_advance),
            total: u64::from(self.advance_max),
        }
    }

    /// 現在位置からパターンが一致するか判定
    fn matches_pattern(&self) -> bool {
        let mut test_seed = self.lcg.current_seed();

        for &expected in &self.pattern {
            let direction = calc_report_needle_direction(test_seed);
            if direction.value() != expected {
                return false;
            }
            test_seed = Lcg64::compute_next(test_seed);
        }

        true
    }
}

// ===== ユーティリティ関数 =====

/// 指定 Seed から針パターンを取得
#[wasm_bindgen]
pub fn get_needle_pattern(seed: LcgSeed, length: u32) -> Vec<u8> {
    let mut pattern = Vec::with_capacity(length as usize);
    let mut current_seed = seed;

    for _ in 0..length {
        let direction = calc_report_needle_direction(current_seed);
        pattern.push(direction.value());
        current_seed = Lcg64::compute_next(current_seed);
    }

    pattern
}

/// 針方向を矢印文字に変換
pub fn needle_direction_arrow(direction: u8) -> &'static str {
    match direction & 7 {
        0 => "↑",
        1 => "↗",
        2 => "→",
        3 => "↘",
        4 => "↓",
        5 => "↙",
        6 => "←",
        7 => "↖",
        _ => "?",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_needle_pattern() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let pattern = get_needle_pattern(seed, 5);
        assert_eq!(pattern.len(), 5);
        assert!(pattern.iter().all(|&d| d <= 7));
    }

    #[test]
    fn test_needle_searcher() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let pattern = get_needle_pattern(seed, 3);

        let params = NeedleSearchParams {
            initial_seed: seed,
            pattern,
            advance_min: 0,
            advance_max: 10,
        };

        let mut searcher = NeedleSearcher::new(params).unwrap();
        let batch = searcher.next_batch(100);

        // 先頭位置で一致するはず
        assert!(!batch.results.is_empty());
        assert_eq!(batch.results[0].advance, 0);
    }

    #[test]
    fn test_needle_direction_arrow() {
        assert_eq!(needle_direction_arrow(0), "↑");
        assert_eq!(needle_direction_arrow(4), "↓");
        assert_eq!(needle_direction_arrow(7), "↖");
    }

    #[test]
    fn test_invalid_params() {
        // Empty pattern
        let params = NeedleSearchParams {
            initial_seed: LcgSeed::new(0),
            pattern: vec![],
            advance_min: 0,
            advance_max: 10,
        };
        assert!(NeedleSearcher::new(params).is_err());

        // Invalid direction
        let params = NeedleSearchParams {
            initial_seed: LcgSeed::new(0),
            pattern: vec![8], // invalid
            advance_min: 0,
            advance_max: 10,
        };
        assert!(NeedleSearcher::new(params).is_err());

        // min > max
        let params = NeedleSearchParams {
            initial_seed: LcgSeed::new(0),
            pattern: vec![0],
            advance_min: 10,
            advance_max: 5,
        };
        assert!(NeedleSearcher::new(params).is_err());
    }
}
