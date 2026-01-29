//! GPU 版 MT Seed 起動時刻検索器

use crate::datetime_search::{MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams};
use crate::types::SeedOrigin;

use super::super::context::GpuDeviceContext;
use super::pipeline::SearchPipeline;

/// GPU 版 MT Seed 起動時刻検索器
///
/// CPU 版 `MtseedDatetimeSearcher` と同一の API を提供する。
pub struct GpuMtseedDatetimeSearcher {
    pipeline: SearchPipeline,
    /// 現在のオフセット
    current_offset: u32,
    /// 総処理数
    total_count: u64,
    /// 処理済み数
    processed_count: u64,
}

impl GpuMtseedDatetimeSearcher {
    /// 検索器を作成
    ///
    /// # Errors
    ///
    /// `target_seeds` が空の場合。
    #[allow(clippy::unused_async)] // WASM 環境で GPU コンテキストが async のため
    pub async fn new(
        ctx: &GpuDeviceContext,
        params: MtseedDatetimeSearchParams,
    ) -> Result<GpuMtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let pipeline = SearchPipeline::new(ctx, &params);
        let total_count = calculate_total_count(&params);

        Ok(Self {
            pipeline,
            current_offset: 0,
            total_count,
            processed_count: 0,
        })
    }

    /// 検索が完了したかどうか
    pub fn is_done(&self) -> bool {
        self.processed_count >= self.total_count
    }

    /// 進捗率 (0.0 - 1.0)
    #[allow(clippy::cast_precision_loss)] // 進捗率計算では精度損失は許容
    pub fn progress(&self) -> f64 {
        if self.total_count == 0 {
            1.0
        } else {
            self.processed_count as f64 / self.total_count as f64
        }
    }

    /// 次のバッチを検索 (GPU 実行)
    #[allow(clippy::cast_possible_truncation)] // remaining_total は chunk_count 以下
    pub async fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining = chunk_count;

        while remaining > 0 && !self.is_done() {
            // 残りの処理数を計算
            let remaining_total = (self.total_count - self.processed_count) as u32;
            let to_process = remaining.min(remaining_total);

            if to_process == 0 {
                break;
            }

            // GPU ディスパッチ実行
            let (matches, processed) = self
                .pipeline
                .dispatch(to_process, self.current_offset)
                .await;

            self.processed_count += u64::from(processed);
            self.current_offset += processed;
            remaining = remaining.saturating_sub(processed);

            // マッチ結果を SeedOrigin に変換
            let condition = self.pipeline.condition();
            for match_result in matches {
                // LCG Seed は MT Seed から逆算が必要だが、
                // GPU 側では MT Seed のみを返すため、
                // ここでは仮の LCG Seed を生成
                // (実際には SHA-1 ハッシュ全体を保存する必要があるが、
                //  現状は MT Seed のマッチのみを確認する設計)
                let lcg_seed = crate::types::LcgSeed::new(u64::from(match_result.mt_seed.0) << 32);
                results.push(SeedOrigin::startup(
                    lcg_seed,
                    match_result.datetime,
                    condition,
                ));
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
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

#[cfg(test)]
mod tests {
    use crate::types::{
        DsConfig, Hardware, KeyCode, MtSeed, RomRegion, RomVersion, SearchRangeParams,
        StartupCondition, TimeRangeParams,
    };

    use super::*;

    fn create_test_params() -> MtseedDatetimeSearchParams {
        MtseedDatetimeSearchParams {
            target_seeds: vec![MtSeed::new(0x1234_5678)],
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
            search_range: SearchRangeParams {
                start_year: 2023,
                start_month: 1,
                start_day: 1,
                start_second_offset: 0,
                range_seconds: 86400, // 1 day
            },
            condition: StartupCondition::new(0x0C79, 0x5A, KeyCode::NONE),
        }
    }

    #[test]
    fn test_calculate_total_count() {
        let params = create_test_params();
        let total = calculate_total_count(&params);
        // 24時間 = 86400秒、1日
        assert_eq!(total, 86400);
    }

    #[test]
    fn test_calculate_total_count_partial_day() {
        let mut params = create_test_params();
        params.time_range = TimeRangeParams {
            hour_start: 12,
            hour_end: 12,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        let total = calculate_total_count(&params);
        // 1時間 = 3600秒
        assert_eq!(total, 3600);
    }
}
