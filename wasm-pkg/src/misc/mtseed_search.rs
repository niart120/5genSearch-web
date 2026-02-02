//! MT Seed 全探索
//!
//! 指定オフセットから検索条件を満たす IV が生成される MT Seed を全探索する機能。
//! pokemon-gen5-initseed の実装を参照。

use wasm_bindgen::prelude::*;

use crate::generation::algorithm::generate_rng_ivs_with_offset;
use crate::types::{IvFilter, MtSeed, MtseedResult, MtseedSearchBatch, MtseedSearchParams};

/// MT Seed 検索器
#[wasm_bindgen]
pub struct MtseedSearcher {
    iv_filter: IvFilter,
    mt_offset: u32,
    is_roamer: bool,
    current_seed: u64,
}

const TOTAL_SEEDS: u64 = 0x1_0000_0000;

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: MtseedSearchParams) -> MtseedSearcher {
        Self {
            iv_filter: params.iv_filter,
            mt_offset: params.mt_offset,
            is_roamer: params.is_roamer,
            current_seed: 0,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_seed >= TOTAL_SEEDS
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / TOTAL_SEEDS as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        let end_seed = (self.current_seed + u64::from(chunk_size)).min(TOTAL_SEEDS);

        while self.current_seed < end_seed {
            #[allow(clippy::cast_possible_truncation)]
            let seed = MtSeed::new(self.current_seed as u32);

            let ivs = generate_rng_ivs_with_offset(seed, self.mt_offset, self.is_roamer);

            if self.iv_filter.matches(&ivs) {
                candidates.push(MtseedResult { seed, ivs });
            }

            self.current_seed += 1;
        }

        MtseedSearchBatch {
            candidates,
            processed: self.current_seed,
            total: TOTAL_SEEDS,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Ivs;

    #[test]
    fn test_iv_filter_matches() {
        let filter = IvFilter {
            hp: (31, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (31, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        };

        let ivs_match = Ivs::new(31, 15, 20, 10, 25, 31);
        let ivs_no_match = Ivs::new(30, 15, 20, 10, 25, 31);

        assert!(filter.matches(&ivs_match));
        assert!(!filter.matches(&ivs_no_match));
    }

    #[test]
    fn test_mtseed_searcher() {
        let params = MtseedSearchParams {
            iv_filter: IvFilter::any(),
            mt_offset: 7,
            is_roamer: false,
        };

        let mut searcher = MtseedSearcher::new(params);
        let batch = searcher.next_batch(100);

        // 全範囲フィルタなので 100 件すべて一致
        assert_eq!(batch.candidates.len(), 100);
        assert_eq!(batch.processed, 100);
    }

    #[test]
    fn test_mtseed_searcher_6v() {
        let params = MtseedSearchParams {
            iv_filter: IvFilter::six_v(),
            mt_offset: 7,
            is_roamer: false,
        };

        let mut searcher = MtseedSearcher::new(params);
        // 最初の 10000 件には 6V はほぼ見つからない
        let batch = searcher.next_batch(10000);
        // 6V は確率的に非常に低い
        assert!(batch.candidates.len() <= 1);
    }
}
