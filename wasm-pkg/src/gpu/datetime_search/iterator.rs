//! GPU 起動時刻検索イテレータ
//!
//! `AsyncIterator` パターンで GPU 検索を実行する。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::datetime_search::MtseedDatetimeSearchParams;
use crate::types::SeedOrigin;

use super::pipeline::SearchPipeline;
use crate::gpu::context::GpuDeviceContext;
use crate::gpu::limits::SearchJobLimits;

/// GPU 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, large_number_types_as_bigints)]
pub struct GpuSearchBatch {
    /// 検索結果
    pub results: Vec<SeedOrigin>,
    /// 進捗率 (0.0 - 1.0)
    pub progress: f64,
    /// スループット (messages/sec)
    pub throughput: f64,
    /// 処理済み数
    pub processed_count: u64,
    /// 総処理数
    pub total_count: u64,
}

/// GPU 起動時刻検索イテレータ
///
/// `AsyncIterator` パターンで GPU 検索を実行する。
/// `next()` を呼び出すたびに最適バッチサイズで GPU ディスパッチを実行し、
/// 結果・進捗・スループットを返す。
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuDatetimeSearchIterator {
    /// GPU パイプライン
    pipeline: SearchPipeline,
    /// 検索制限
    limits: SearchJobLimits,

    /// 現在のオフセット
    current_offset: u32,
    /// 総処理数
    total_count: u64,
    /// 処理済み数
    processed_count: u64,

    /// スループット計測: 前回の処理済み数
    last_processed: u64,
    /// スループット計測: 前回の時刻 (秒)
    last_time_secs: f64,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuDatetimeSearchIterator {
    /// イテレータを作成
    ///
    /// # Errors
    ///
    /// - GPU デバイスが利用不可の場合
    /// - `target_seeds` が空の場合
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub async fn new(
        params: MtseedDatetimeSearchParams,
    ) -> Result<GpuDatetimeSearchIterator, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let ctx = GpuDeviceContext::new().await?;
        let limits = SearchJobLimits::from_device_limits(ctx.limits(), ctx.gpu_profile());
        let pipeline = SearchPipeline::new(&ctx, &params);
        let total_count = calculate_total_count(&params);

        Ok(Self {
            pipeline,
            limits,
            current_offset: 0,
            total_count,
            processed_count: 0,
            last_processed: 0,
            last_time_secs: current_time_secs(),
        })
    }

    /// 次のバッチを取得
    ///
    /// 検索完了時は `None` を返す。
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn next(&mut self) -> Option<GpuSearchBatch> {
        if self.is_done() {
            return None;
        }

        // 残りの処理数を計算
        #[allow(clippy::cast_possible_truncation)]
        let remaining = (self.total_count - self.processed_count) as u32;
        let to_process = self.limits.max_messages_per_dispatch.min(remaining);

        // GPU ディスパッチ実行
        let (matches, processed) = self
            .pipeline
            .dispatch(to_process, self.current_offset)
            .await;

        self.current_offset += processed;
        self.processed_count += u64::from(processed);

        Some(self.build_batch_result(matches))
    }

    /// バッチ結果を構築
    fn build_batch_result(&mut self, matches: Vec<super::pipeline::MatchResult>) -> GpuSearchBatch {
        // スループット計算
        let now = current_time_secs();
        let elapsed = now - self.last_time_secs;
        let processed_delta = self.processed_count - self.last_processed;
        #[allow(clippy::cast_precision_loss)]
        let throughput = if elapsed > 0.001 {
            processed_delta as f64 / elapsed
        } else {
            0.0
        };
        self.last_processed = self.processed_count;
        self.last_time_secs = now;

        // 結果変換
        let condition = self.pipeline.condition();
        let results: Vec<SeedOrigin> = matches
            .into_iter()
            .map(|m| SeedOrigin::startup(m.lcg_seed, m.datetime, condition))
            .collect();

        GpuSearchBatch {
            results,
            progress: self.progress(),
            throughput,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }

    /// 検索が完了したか
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter))]
    pub fn is_done(&self) -> bool {
        self.processed_count >= self.total_count
    }

    /// 進捗率 (0.0 - 1.0)
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter))]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.total_count == 0 {
            1.0
        } else {
            self.processed_count as f64 / self.total_count as f64
        }
    }
}

/// 総処理数を計算
fn calculate_total_count(params: &MtseedDatetimeSearchParams) -> u64 {
    let time_range = &params.time_range;
    let search_range = &params.search_range;

    // 1日あたりの有効秒数
    let valid_seconds_per_day = u64::from(time_range.count_valid_seconds());

    // 日数 (範囲秒数を86400で割り上げ)
    let days = u64::from(search_range.range_seconds.div_ceil(86400));

    valid_seconds_per_day * days
}

/// 現在時刻を秒で取得 (WASM / ネイティブ共通)
#[cfg(target_arch = "wasm32")]
fn current_time_secs() -> f64 {
    // WASM 環境では performance.now() を使用 (ミリ秒 → 秒)
    js_sys::Date::now() / 1000.0
}

#[cfg(not(target_arch = "wasm32"))]
fn current_time_secs() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0)
}

#[cfg(test)]
mod tests {
    use crate::types::{
        DsConfig, Hardware, KeyCode, MtSeed, RomRegion, RomVersion, SearchRangeParams,
        StartupCondition, TimeRangeParams,
    };

    use super::*;

    fn create_test_params() -> MtseedDatetimeSearchParams {
        MtseedDatetimeSearchParams {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            condition: StartupCondition {
                timer0: 0x10ED,
                vcount: 0x5B,
                key_code: KeyCode::NONE,
            },
            target_seeds: vec![MtSeed::new(0x1234_5678)],
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
            search_range: SearchRangeParams {
                start_year: 2011,
                start_month: 1,
                start_day: 1,
                start_second_offset: 0,
                range_seconds: 365 * 86400, // 1年
            },
        }
    }

    #[test]
    fn test_calculate_total_count() {
        let params = create_test_params();
        let total = calculate_total_count(&params);

        // 1年 = 365日、1日あたり 86400秒
        assert_eq!(total, 365 * 86400);
    }

    #[test]
    fn test_calculate_total_count_with_time_range() {
        let mut params = create_test_params();
        params.time_range = TimeRangeParams {
            hour_start: 10,
            hour_end: 12, // 3時間
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        let total = calculate_total_count(&params);

        // 1年 = 365日、1日あたり 3時間 * 60分 * 60秒 = 10800秒
        assert_eq!(total, 365 * 10800);
    }

    #[test]
    fn test_iterator_creation() {
        let params = create_test_params();
        let result = pollster::block_on(GpuDatetimeSearchIterator::new(params));

        // GPU が利用可能な環境でのみ成功する
        if let Ok(iter) = result {
            assert!(!iter.is_done());
            #[allow(clippy::float_cmp)]
            {
                assert_eq!(iter.progress(), 0.0);
            }
        }
    }

    #[test]
    fn test_empty_target_seeds_rejected() {
        let mut params = create_test_params();
        params.target_seeds = vec![];

        let result = pollster::block_on(GpuDatetimeSearchIterator::new(params));
        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "target_seeds is empty");
    }
}
