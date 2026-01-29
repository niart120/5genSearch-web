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
    pub fn new(
        ctx: &GpuDeviceContext,
        params: &MtseedDatetimeSearchParams,
    ) -> Result<GpuMtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let pipeline = SearchPipeline::new(ctx, params);
        let total_count = calculate_total_count(params);

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
                results.push(SeedOrigin::startup(
                    match_result.lcg_seed,
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

/// GPU統合テスト (実際のGPU実行を伴う)
/// これらのテストは `cargo test --features gpu` で実行される
#[cfg(all(test, feature = "gpu"))]
mod gpu_integration_tests {
    use crate::gpu::context::GpuDeviceContext;
    use crate::types::{
        DsConfig, Hardware, KeyCode, LcgSeed, MtSeed, RomRegion, RomVersion, SearchRangeParams,
        StartupCondition, TimeRangeParams,
    };

    use super::*;

    /// 既知のSeedを検索し、正しい日時・LCG Seedが見つかることを検証
    ///
    /// テストベクター (scalar.rs の test_sha1_with_real_case と同一):
    /// - MT Seed: 0xD2F057AD
    /// - LCG Seed: 0x20D00C5C6EEBCD7E
    /// - 条件: W2/JPN, DS, Timer0=0x10F8, VCount=0x82
    /// - MAC: [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F]
    /// - 期待日時: 2006/03/11 18:53:27
    #[test]
    fn test_gpu_finds_known_seed_with_correct_lcg() {
        pollster::block_on(async {
            let ctx = match GpuDeviceContext::new().await {
                Ok(ctx) => ctx,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // 既知のMT Seed
            let target_seed = MtSeed::new(0xD2F0_57AD);

            let params = MtseedDatetimeSearchParams {
                target_seeds: vec![target_seed],
                ds: DsConfig {
                    mac: [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F],
                    hardware: Hardware::Ds,
                    version: RomVersion::White2,
                    region: RomRegion::Jpn,
                },
                time_range: TimeRangeParams {
                    hour_start: 18,
                    hour_end: 18,
                    minute_start: 53,
                    minute_end: 53,
                    second_start: 27,
                    second_end: 27,
                },
                search_range: SearchRangeParams {
                    start_year: 2006,
                    start_month: 3,
                    start_day: 11,
                    start_second_offset: 0,
                    range_seconds: 1, // 1秒のみ検索
                },
                condition: StartupCondition::new(0x10F8, 0x82, KeyCode::NONE),
            };

            let mut searcher =
                GpuMtseedDatetimeSearcher::new(&ctx, &params).expect("Failed to create searcher");

            // 検索実行
            let batch = searcher.next_batch(1).await;

            // 結果検証
            assert!(!batch.results.is_empty(), "Expected at least 1 result");
            let result = &batch.results[0];

            // LCG Seed 検証
            let expected_lcg_seed = LcgSeed::new(0x20D0_0C5C_6EEB_CD7E);
            assert_eq!(
                result.base_seed(),
                expected_lcg_seed,
                "LCG Seed mismatch: expected 0x{:016X}, got 0x{:016X}",
                expected_lcg_seed.value(),
                result.base_seed().value()
            );

            // MT Seed 検証
            assert_eq!(result.mt_seed().value(), 0xD2F0_57AD, "MT Seed mismatch");

            // 日時検証
            if let crate::types::SeedOrigin::Startup { datetime, .. } = result {
                assert_eq!(datetime.year, 2006, "Year mismatch");
                assert_eq!(datetime.month, 3, "Month mismatch");
                assert_eq!(datetime.day, 11, "Day mismatch");
                assert_eq!(datetime.hour, 18, "Hour mismatch");
                assert_eq!(datetime.minute, 53, "Minute mismatch");
                assert_eq!(datetime.second, 27, "Second mismatch");
            } else {
                panic!("Expected SeedOrigin::Startup variant");
            }
        });
    }

    /// GPUパイプラインが正常に動作することを確認
    #[test]
    fn test_gpu_pipeline_execution() {
        pollster::block_on(async {
            let ctx = match GpuDeviceContext::new().await {
                Ok(ctx) => ctx,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // シンプルな検索パラメータ
            let target_seed = MtSeed::new(0x1234_5678);

            let params = MtseedDatetimeSearchParams {
                target_seeds: vec![target_seed],
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
                    start_year: 2011,
                    start_month: 1,
                    start_day: 1,
                    start_second_offset: 0,
                    range_seconds: 86400, // 1日
                },
                condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
            };

            let mut searcher =
                GpuMtseedDatetimeSearcher::new(&ctx, &params).expect("Failed to create searcher");

            // GPU検索を実行 (結果がなくてもパイプラインが動作することを確認)
            let batch = searcher.next_batch(1000).await;

            // 処理が進んだことを確認
            assert!(batch.processed_count > 0, "Expected some processing");
            assert!(batch.total_count > 0, "Expected total count > 0");
            assert_eq!(batch.total_count, 86400, "Expected 1 day = 86400 seconds");
        });
    }

    /// 存在しないSeedを検索した場合、結果が空であることを検証
    #[test]
    fn test_gpu_no_match_returns_empty() {
        pollster::block_on(async {
            let ctx = match GpuDeviceContext::new().await {
                Ok(ctx) => ctx,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // ありえないSeed
            let target_seed = MtSeed::new(0xFFFF_FFFF);

            let params = MtseedDatetimeSearchParams {
                target_seeds: vec![target_seed],
                ds: DsConfig {
                    mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                    hardware: Hardware::DsLite,
                    version: RomVersion::Black,
                    region: RomRegion::Jpn,
                },
                time_range: TimeRangeParams {
                    hour_start: 0,
                    hour_end: 0,
                    minute_start: 0,
                    minute_end: 0,
                    second_start: 0,
                    second_end: 0,
                },
                search_range: SearchRangeParams {
                    start_year: 2023,
                    start_month: 1,
                    start_day: 1,
                    start_second_offset: 0,
                    range_seconds: 1,
                },
                condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
            };

            let mut searcher =
                GpuMtseedDatetimeSearcher::new(&ctx, &params).expect("Failed to create searcher");

            let batch = searcher.next_batch(1).await;
            assert!(
                batch.results.is_empty(),
                "Expected no results for non-existent seed"
            );
        });
    }
}
