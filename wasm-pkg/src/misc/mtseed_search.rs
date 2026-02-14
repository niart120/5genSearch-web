//! MT Seed 全探索
//!
//! 指定オフセットから検索条件を満たす IV が生成される MT Seed を全探索する機能。
//! pokemon-gen5-initseed の実装を参照。

use wasm_bindgen::prelude::*;

use crate::generation::algorithm::{generate_rng_ivs_with_offset, generate_rng_ivs_with_offset_x4};
use crate::types::{
    IvFilter, MtSeed, MtseedResult, MtseedSearchBatch, MtseedSearchContext, MtseedSearchParams,
};

/// MT Seed 検索器
#[wasm_bindgen]
pub struct MtseedSearcher {
    iv_filter: IvFilter,
    mt_offset: u32,
    is_roamer: bool,
    current_seed: u64,
    /// 検索開始 Seed (進捗計算用)
    start_seed: u64,
    /// 半開区間の終端 (`end_seed_inclusive` + 1)
    end_seed: u64,
}

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: MtseedSearchParams) -> MtseedSearcher {
        let start = u64::from(params.start_seed);
        let end = u64::from(params.end_seed) + 1; // 閉区間 → 半開区間
        Self {
            iv_filter: params.iv_filter,
            mt_offset: params.mt_offset,
            is_roamer: params.is_roamer,
            current_seed: start,
            start_seed: start,
            end_seed: end,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_seed >= self.end_seed
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        let total = self.end_seed - self.start_seed;
        if total == 0 {
            return 1.0;
        }
        (self.current_seed - self.start_seed) as f64 / total as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        let batch_end = (self.current_seed + u64::from(chunk_size)).min(self.end_seed);
        let total = self.end_seed - self.start_seed;

        // 4 Seed 単位で SIMD 処理
        while self.current_seed + 4 <= batch_end {
            #[allow(clippy::cast_possible_truncation)]
            let base = self.current_seed as u32;
            #[allow(clippy::cast_possible_truncation)]
            let seeds: [MtSeed; 4] = std::array::from_fn(|i| MtSeed::new(base + i as u32));
            let ivs_x4 = generate_rng_ivs_with_offset_x4(seeds, self.mt_offset, self.is_roamer);

            for (i, ivs) in ivs_x4.iter().enumerate() {
                #[allow(clippy::cast_possible_truncation)]
                let s = base + i as u32;
                if self.iv_filter.matches(ivs) {
                    candidates.push(MtseedResult {
                        seed: MtSeed::new(s),
                        ivs: *ivs,
                    });
                }
            }

            self.current_seed += 4;
        }

        // 端数処理 (残り 1〜3 Seed)
        while self.current_seed < batch_end {
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
            processed: self.current_seed - self.start_seed,
            total,
        }
    }
}

/// MT Seed IV 検索タスクを生成
///
/// 全 Seed 空間 (0〜2^32-1) を `worker_count` 個のタスクに均等分割する。
///
/// # Arguments
/// - `context`: 検索コンテキスト (`iv_filter`, `mt_offset`, `is_roamer`)
/// - `worker_count`: Worker 数
///
/// # Returns
/// 分割されたタスクのリスト（各タスクは閉区間 `[start_seed, end_seed]`）
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
#[allow(clippy::cast_possible_truncation)]
pub fn generate_mtseed_iv_search_tasks(
    context: MtseedSearchContext,
    worker_count: u32,
) -> Vec<MtseedSearchParams> {
    let total: u64 = 0x1_0000_0000; // 2^32
    let chunk_size = total / u64::from(worker_count);
    let remainder = total % u64::from(worker_count);

    let mut tasks = Vec::with_capacity(worker_count as usize);
    let mut current: u64 = 0;

    for i in 0..worker_count {
        let extra = u64::from(u64::from(i) < remainder);
        let size = chunk_size + extra;

        if size == 0 {
            break; // worker_count > total の場合
        }

        let task_end = current + size - 1; // 閉区間の終端

        tasks.push(MtseedSearchParams {
            iv_filter: context.iv_filter.clone(),
            mt_offset: context.mt_offset,
            is_roamer: context.is_roamer,
            start_seed: current as u32,
            end_seed: task_end as u32,
        });

        current = task_end + 1;
    }

    tasks
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Ivs;

    /// デフォルト値 (全範囲) の `MtseedSearchParams` を生成
    fn make_default_params(iv_filter: IvFilter) -> MtseedSearchParams {
        MtseedSearchParams {
            iv_filter,
            mt_offset: 7,
            is_roamer: false,
            start_seed: 0,
            end_seed: 0xFFFF_FFFF,
        }
    }

    /// デフォルト値の `MtseedSearchContext` を生成
    fn make_default_context(iv_filter: IvFilter) -> MtseedSearchContext {
        MtseedSearchContext {
            iv_filter,
            mt_offset: 7,
            is_roamer: false,
        }
    }

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
        let params = make_default_params(IvFilter::any());
        let mut searcher = MtseedSearcher::new(params);
        let batch = searcher.next_batch(100);

        // 全範囲フィルタなので 100 件すべて一致
        assert_eq!(batch.candidates.len(), 100);
        assert_eq!(batch.processed, 100);
    }

    #[test]
    fn test_mtseed_searcher_6v() {
        let params = make_default_params(IvFilter::six_v());
        let mut searcher = MtseedSearcher::new(params);
        // 最初の 10000 件には 6V はほぼ見つからない
        let batch = searcher.next_batch(10000);
        // 6V は確率的に非常に低い
        assert!(batch.candidates.len() <= 1);
    }

    #[test]
    fn test_mtseed_searcher_with_range() {
        // 範囲 [100, 199] の 100 件のみを探索
        let params = MtseedSearchParams {
            iv_filter: IvFilter::any(),
            mt_offset: 7,
            is_roamer: false,
            start_seed: 100,
            end_seed: 199,
        };

        let mut searcher = MtseedSearcher::new(params);

        // 全件探索
        let batch = searcher.next_batch(200);

        // 100 件のみ処理されること
        assert_eq!(batch.candidates.len(), 100);
        assert_eq!(batch.processed, 100);
        assert_eq!(batch.total, 100);
        assert!(searcher.is_done());

        // 最初の Seed が 100 であること
        assert_eq!(batch.candidates[0].seed.value(), 100);
        // 最後の Seed が 199 であること
        assert_eq!(batch.candidates[99].seed.value(), 199);
    }

    #[test]
    fn test_generate_mtseed_iv_search_tasks() {
        let ctx = make_default_context(IvFilter::any());
        let tasks = generate_mtseed_iv_search_tasks(ctx, 4);

        assert_eq!(tasks.len(), 4);

        // 各タスクの start_seed が前タスクの end_seed + 1 であること
        for i in 1..tasks.len() {
            assert_eq!(tasks[i].start_seed, tasks[i - 1].end_seed + 1);
        }

        // 最初のタスクは 0 から開始
        assert_eq!(tasks[0].start_seed, 0);
        // 最後のタスクは 0xFFFF_FFFF で終了
        assert_eq!(tasks[tasks.len() - 1].end_seed, 0xFFFF_FFFF);
    }

    #[test]
    fn test_generate_mtseed_iv_search_tasks_coverage() {
        let ctx = make_default_context(IvFilter::any());
        let tasks = generate_mtseed_iv_search_tasks(ctx, 4);

        // 全タスクの範囲で重複なく 0〜0xFFFF_FFFF をカバー
        let mut total_seeds: u64 = 0;
        for task in &tasks {
            let size = u64::from(task.end_seed) - u64::from(task.start_seed) + 1;
            total_seeds += size;
        }
        assert_eq!(total_seeds, 0x1_0000_0000);
    }

    #[test]
    fn test_generate_mtseed_iv_search_tasks_preserves_params() {
        let ctx = MtseedSearchContext {
            iv_filter: IvFilter::six_v(),
            mt_offset: 10,
            is_roamer: true,
        };
        let tasks = generate_mtseed_iv_search_tasks(ctx, 2);

        for task in &tasks {
            assert_eq!(task.mt_offset, 10);
            assert!(task.is_roamer);
        }
    }

    /// SIMD 化後の `MtseedSearcher` がスカラー版と同じ結果を返すことを検証
    #[test]
    fn test_mtseed_searcher_simd_consistency() {
        let iv_filter = IvFilter {
            hp: (20, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        };

        let params = MtseedSearchParams {
            iv_filter: iv_filter.clone(),
            mt_offset: 7,
            is_roamer: false,
            start_seed: 0,
            end_seed: 65535,
        };

        let mut searcher = MtseedSearcher::new(params);
        let batch = searcher.next_batch(65536);

        // スカラー版で同じ範囲を検索して比較
        for candidate in &batch.candidates {
            let scalar_ivs = generate_rng_ivs_with_offset(candidate.seed, 7, false);
            assert_eq!(
                candidate.ivs,
                scalar_ivs,
                "SIMD/scalar mismatch at seed={}",
                candidate.seed.value()
            );
        }

        // 端数処理も含めて正しく動作することを確認
        // (65536 は 4 の倍数なので端数なし)
        assert!(searcher.is_done());

        // 奇数範囲で端数処理を確認
        let params2 = MtseedSearchParams {
            iv_filter,
            mt_offset: 7,
            is_roamer: false,
            start_seed: 0,
            end_seed: 102, // 103 Seed → 25 SIMD + 3 端数
        };
        let mut searcher2 = MtseedSearcher::new(params2);
        let batch2 = searcher2.next_batch(200);
        assert_eq!(batch2.processed, 103);
        assert!(searcher2.is_done());
    }
}
