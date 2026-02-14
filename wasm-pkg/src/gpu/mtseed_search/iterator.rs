//! GPU MT Seed IV 全探索イテレータ
//!
//! `AsyncIterator` パターンで GPU 検索を実行する。
//! 全 Seed 空間 (0〜2^32-1) をチャンクに分割し、
//! `next()` 呼び出しごとに 1 ディスパッチを実行する。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::types::{MtseedResult, MtseedSearchContext};

use super::pipeline::SearchPipeline;
use crate::gpu::context::GpuDeviceContext;
use crate::gpu::limits::SearchJobLimits;

/// GPU MT Seed IV 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, large_number_types_as_bigints)]
pub struct GpuMtseedSearchBatch {
    /// フィルタ条件を満たした候補
    pub candidates: Vec<MtseedResult>,
    /// 進捗率 (0.0 - 1.0)
    pub progress: f64,
    /// 処理済み Seed 数
    pub processed: u64,
    /// 総 Seed 数
    pub total: u64,
}

/// GPU MT Seed IV 全探索イテレータ
///
/// `AsyncIterator` パターンで GPU 検索を実行する。
/// `next()` を呼び出すたびに最適バッチサイズで GPU ディスパッチを実行し、
/// 結果・進捗を返す。
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuMtseedSearchIterator {
    pipeline: SearchPipeline,
    /// めざパ後処理用 (全条件)
    iv_filter: crate::types::IvFilter,
    /// 半開区間の現在位置
    current_seed: u64,
    /// 総 Seed 数 = `0x1_0000_0000`
    total: u64,
    /// 検索制限
    limits: SearchJobLimits,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuMtseedSearchIterator {
    /// イテレータを作成
    ///
    /// # Errors
    ///
    /// GPU デバイスが利用不可の場合
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = "create"))]
    pub async fn create(context: MtseedSearchContext) -> Result<GpuMtseedSearchIterator, String> {
        let gpu_ctx = GpuDeviceContext::new().await?;
        let mut limits =
            SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());
        let items_per_thread = limits.mtseed_items_per_thread(gpu_ctx.gpu_profile());

        // MT Seed 検索用にスレッドあたり処理数を調整
        limits.items_per_thread = items_per_thread;
        limits.max_messages_per_dispatch =
            limits.workgroup_size * limits.max_workgroups * items_per_thread;

        let pipeline = SearchPipeline::new(&gpu_ctx, &context, items_per_thread);

        Ok(Self {
            pipeline,
            iv_filter: context.iv_filter,
            current_seed: 0,
            total: 0x1_0000_0000,
            limits,
        })
    }

    /// 次のバッチを取得
    ///
    /// 検索完了時は `None` を返す。
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn next(&mut self) -> Option<GpuMtseedSearchBatch> {
        if self.is_done() {
            return None;
        }

        let remaining = self.total - self.current_seed;
        #[allow(clippy::cast_possible_truncation)]
        let to_process = u64::from(self.limits.max_messages_per_dispatch).min(remaining) as u32;

        #[allow(clippy::cast_possible_truncation)]
        let base_seed = self.current_seed as u32;
        let (mut candidates, processed) = self.pipeline.dispatch(to_process, base_seed).await;

        self.current_seed += u64::from(processed);

        // めざパフィルタ後処理 (GPU 側は IV 範囲のみで絞り込み)
        if self.iv_filter.hidden_power_types.is_some()
            || self.iv_filter.hidden_power_min_power.is_some()
        {
            candidates.retain(|c| self.iv_filter.matches(&c.ivs));
        }

        Some(GpuMtseedSearchBatch {
            candidates,
            progress: self.progress(),
            processed: self.current_seed,
            total: self.total,
        })
    }

    /// 検索が完了したか
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter))]
    pub fn is_done(&self) -> bool {
        self.current_seed >= self.total
    }

    /// 進捗率 (0.0 - 1.0)
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter))]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / self.total as f64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::IvFilter;

    #[test]
    fn test_gpu_mtseed_search_known_seed() {
        let context = MtseedSearchContext {
            iv_filter: IvFilter::six_v(),
            mt_offset: 7,
            is_roamer: false,
        };

        let result = pollster::block_on(GpuMtseedSearchIterator::create(context));

        let Ok(mut iterator) = result else {
            eprintln!("GPU not available, skipping test");
            return;
        };

        assert!(!iterator.is_done());
        #[allow(clippy::float_cmp)]
        {
            assert_eq!(iterator.progress(), 0.0);
        }

        // 最初のバッチを取得
        let batch = pollster::block_on(iterator.next());
        assert!(batch.is_some());
        let batch = batch.unwrap();
        assert!(batch.progress > 0.0);
        assert!(batch.processed > 0);
        assert_eq!(batch.total, 0x1_0000_0000);
    }

    /// GPU 検索で小範囲を全探索し CPU 版と一致することを確認
    #[test]
    fn test_gpu_vs_cpu_mtseed_search_consistency() {
        use crate::generation::algorithm::generate_rng_ivs_with_offset;

        let context = MtseedSearchContext {
            iv_filter: IvFilter::any(),
            mt_offset: 7,
            is_roamer: false,
        };

        let result = pollster::block_on(GpuMtseedSearchIterator::create(context));

        let Ok(mut iterator) = result else {
            eprintln!("GPU not available, skipping test");
            return;
        };

        // 最初のバッチのみで検証 (全探索は時間がかかるため)
        let mut all_candidates: Vec<MtseedResult> = Vec::new();
        if let Some(batch) = pollster::block_on(iterator.next()) {
            all_candidates.extend(batch.candidates);
        }

        // 各結果を CPU 版と照合
        for candidate in &all_candidates {
            let cpu_ivs = generate_rng_ivs_with_offset(candidate.seed, 7, false);
            assert_eq!(
                candidate.ivs,
                cpu_ivs,
                "GPU/CPU mismatch at seed=0x{:08X}",
                candidate.seed.value()
            );
        }
    }

    #[test]
    fn test_gpu_mtseed_search_progress() {
        let context = MtseedSearchContext {
            iv_filter: IvFilter::any(),
            mt_offset: 7,
            is_roamer: false,
        };

        let result = pollster::block_on(GpuMtseedSearchIterator::create(context));

        let Ok(mut iterator) = result else {
            eprintln!("GPU not available, skipping test");
            return;
        };

        let mut prev_progress = 0.0_f64;

        // 3バッチ実行して進捗が単調増加することを確認
        for _ in 0..3 {
            if let Some(batch) = pollster::block_on(iterator.next()) {
                assert!(
                    batch.progress >= prev_progress,
                    "Progress decreased: {} -> {}",
                    prev_progress,
                    batch.progress
                );
                prev_progress = batch.progress;
            } else {
                break;
            }
        }
    }

    // =========================================================================
    // 既知 Seed 全探索テスト (GPU vs CPU 照合)
    //
    // 各テストケースは 2^32 の全 Seed 空間を GPU で探索し、
    // 期待する Seed が結果に含まれかつ CPU 版と IV が一致することを確認する。
    // =========================================================================

    /// GPU 全探索を実行し、全候補を収集するヘルパー
    fn run_gpu_full_search(context: MtseedSearchContext) -> Vec<MtseedResult> {
        let result = pollster::block_on(GpuMtseedSearchIterator::create(context));

        let Ok(mut iterator) = result else {
            eprintln!("GPU not available, skipping test");
            return Vec::new();
        };

        let mut all: Vec<MtseedResult> = Vec::new();
        while let Some(batch) = pollster::block_on(iterator.next()) {
            all.extend(batch.candidates);
        }
        all
    }

    /// 6V (offset=0): 14B11BA6, 8A30480D, 9E02B0AE, ADFA2178, FC4AA3AC
    #[test]
    fn test_gpu_full_search_6v_offset0() {
        use crate::generation::algorithm::generate_rng_ivs_with_offset;
        use crate::types::MtSeed;

        let context = MtseedSearchContext {
            iv_filter: IvFilter::six_v(),
            mt_offset: 0,
            is_roamer: false,
        };

        let results = run_gpu_full_search(context);
        if results.is_empty() {
            // GPU 未対応環境ではスキップ
            return;
        }

        let expected_seeds: &[u32] = &[
            0x14B1_1BA6,
            0x8A30_480D,
            0x9E02_B0AE,
            0xADFA_2178,
            0xFC4A_A3AC,
        ];

        for &seed_val in expected_seeds {
            let found = results.iter().find(|r| r.seed.value() == seed_val);
            assert!(
                found.is_some(),
                "Expected seed 0x{seed_val:08X} not found in GPU results"
            );

            let cpu_ivs = generate_rng_ivs_with_offset(MtSeed::new(seed_val), 0, false);
            let gpu_ivs = found.unwrap().ivs;
            assert_eq!(
                gpu_ivs, cpu_ivs,
                "GPU/CPU IV mismatch at seed 0x{seed_val:08X}: GPU={gpu_ivs:?}, CPU={cpu_ivs:?}"
            );
        }
    }

    /// V0VVV0 (offset=2): 54F39E0F, 6338DDED, 7BF8CD77, F9C432EB
    #[test]
    fn test_gpu_full_search_v0vvv0_offset2() {
        use crate::generation::algorithm::generate_rng_ivs_with_offset;
        use crate::types::MtSeed;

        let context = MtseedSearchContext {
            iv_filter: IvFilter {
                hp: (31, 31),
                atk: (0, 0),
                def: (31, 31),
                spa: (31, 31),
                spd: (31, 31),
                spe: (0, 0),
                hidden_power_types: None,
                hidden_power_min_power: None,
            },
            mt_offset: 2,
            is_roamer: false,
        };

        let results = run_gpu_full_search(context);
        if results.is_empty() {
            return;
        }

        let expected_seeds: &[u32] = &[0x54F3_9E0F, 0x6338_DDED, 0x7BF8_CD77, 0xF9C4_32EB];

        for &seed_val in expected_seeds {
            let found = results.iter().find(|r| r.seed.value() == seed_val);
            assert!(
                found.is_some(),
                "Expected seed 0x{seed_val:08X} not found in GPU results"
            );

            let cpu_ivs = generate_rng_ivs_with_offset(MtSeed::new(seed_val), 2, false);
            let gpu_ivs = found.unwrap().ivs;
            assert_eq!(
                gpu_ivs, cpu_ivs,
                "GPU/CPU IV mismatch at seed 0x{seed_val:08X}: GPU={gpu_ivs:?}, CPU={cpu_ivs:?}"
            );
        }
    }

    /// V2UVVV (roamer, offset=1): 5F3DE7EF, 7F1983D4, B8500799, C18AA384, C899E66E, D8BFC637
    #[test]
    fn test_gpu_full_search_v2uvvv_roamer_offset1() {
        use crate::generation::algorithm::generate_rng_ivs_with_offset;
        use crate::types::MtSeed;

        let context = MtseedSearchContext {
            iv_filter: IvFilter {
                hp: (31, 31),
                atk: (2, 2),
                def: (0, 31),
                spa: (31, 31),
                spd: (31, 31),
                spe: (31, 31),
                hidden_power_types: None,
                hidden_power_min_power: None,
            },
            mt_offset: 1,
            is_roamer: true,
        };

        let results = run_gpu_full_search(context);
        if results.is_empty() {
            return;
        }

        let expected_seeds: &[u32] = &[
            0x5F3D_E7EF,
            0x7F19_83D4,
            0xB850_0799,
            0xC18A_A384,
            0xC899_E66E,
            0xD8BF_C637,
        ];

        for &seed_val in expected_seeds {
            let found = results.iter().find(|r| r.seed.value() == seed_val);
            assert!(
                found.is_some(),
                "Expected seed 0x{seed_val:08X} not found in GPU results"
            );

            let cpu_ivs = generate_rng_ivs_with_offset(MtSeed::new(seed_val), 1, true);
            let gpu_ivs = found.unwrap().ivs;
            assert_eq!(
                gpu_ivs, cpu_ivs,
                "GPU/CPU IV mismatch at seed 0x{seed_val:08X}: GPU={gpu_ivs:?}, CPU={cpu_ivs:?}"
            );
        }
    }
}
