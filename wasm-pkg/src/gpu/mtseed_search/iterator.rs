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
        let limits = SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());
        let items_per_thread = limits.mtseed_items_per_thread();
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
}
