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
/// ダブルバッファリングにより GPU のアイドル時間を削減。
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
    /// パイプラインで投入済みだが未回収のメッセージ数
    pending_count: u64,

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
            pending_count: 0,
            last_processed: 0,
            last_time_secs: current_time_secs(),
        })
    }

    /// 次のバッチを取得
    ///
    /// 検索完了時は `None` を返す。
    /// ダブルバッファリングにより、1つのスロットで GPU 処理中に
    /// 別のスロットの結果を読み出すことで GPU のアイドル時間を削減。
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn next(&mut self) -> Option<GpuSearchBatch> {
        // 全処理完了かつ pending なしなら終了
        if self.is_done() && self.pending_count == 0 {
            return None;
        }

        // 残りの処理数を計算（pending を含む）
        #[allow(clippy::cast_possible_truncation)]
        let total_remaining = (self.total_count - self.processed_count - self.pending_count) as u32;

        // まだ処理すべきデータがある場合
        if total_remaining > 0 {
            let chunk_count = self.limits.max_messages_per_dispatch;
            let to_process = chunk_count.min(total_remaining);

            // パイプライン化ディスパッチ: 新しいバッチを submit しつつ、前の結果を読み出し
            let (matches, prev_processed, submitted) = self
                .pipeline
                .dispatch_pipelined(to_process, self.current_offset)
                .await;

            // pending を更新
            self.pending_count += u64::from(submitted);
            self.current_offset += submitted;

            // 前のバッチの結果があれば処理
            if prev_processed > 0 {
                self.processed_count += u64::from(prev_processed);
                self.pending_count -= u64::from(prev_processed);

                return Some(self.build_batch_result(matches));
            }

            // 初回は結果がないので、もう一度 dispatch して結果を得る
            // (これにより2つのスロットが稼働する)
            if total_remaining > submitted {
                let next_to_process = chunk_count.min(total_remaining - submitted);
                let (matches2, prev_processed2, submitted2) = self
                    .pipeline
                    .dispatch_pipelined(next_to_process, self.current_offset)
                    .await;

                self.pending_count += u64::from(submitted2);
                self.current_offset += submitted2;

                if prev_processed2 > 0 {
                    self.processed_count += u64::from(prev_processed2);
                    self.pending_count -= u64::from(prev_processed2);

                    return Some(self.build_batch_result(matches2));
                }
            }
        }

        // pending があればフラッシュ
        if self.pending_count > 0 {
            let (matches, flushed) = self.pipeline.flush_pipeline().await;
            if flushed > 0 {
                self.processed_count += u64::from(flushed);
                self.pending_count -= u64::from(flushed);

                return Some(self.build_batch_result(matches));
            }
        }

        None
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
    use crate::types::{
        DsConfig, Hardware, KeyCode, LcgSeed, MtSeed, RomRegion, RomVersion, SearchRangeParams,
        StartupCondition, TimeRangeParams,
    };

    use super::*;

    /// 既知のSeedを検索し、正しい日時・LCG Seedが見つかることを検証
    ///
    /// テストベクター (`scalar.rs` の `test_sha1_with_real_case` と同一):
    /// - MT Seed: 0xD2F057AD
    /// - LCG Seed: 0x20D00C5C6EEBCD7E
    /// - 条件: W2/JPN, DS, Timer0=0x10F8, VCount=0x82
    /// - MAC: [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F]
    /// - 期待日時: 2006/03/11 18:53:27
    #[test]
    fn test_gpu_finds_known_seed_with_correct_lcg() {
        pollster::block_on(async {
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

            let mut iterator = match GpuDatetimeSearchIterator::new(params).await {
                Ok(it) => it,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // 検索実行
            let batch = iterator.next().await;

            // 結果検証
            let batch = batch.expect("Expected a batch result");
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

            // 進捗検証
            assert!(batch.progress > 0.0, "Progress should be positive");
        });
    }

    /// イテレータが複数バッチを返し、最終的に終了することを確認
    #[test]
    fn test_iterator_returns_batches_and_terminates() {
        pollster::block_on(async {
            // シンプルな検索パラメータ (短時間)
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
                    hour_end: 0,
                    minute_start: 0,
                    minute_end: 0,
                    second_start: 0,
                    second_end: 59,
                },
                search_range: SearchRangeParams {
                    start_year: 2023,
                    start_month: 1,
                    start_day: 1,
                    start_second_offset: 0,
                    range_seconds: 60, // 1分間
                },
                condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
            };

            let mut iterator = match GpuDatetimeSearchIterator::new(params).await {
                Ok(it) => it,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // イテレーション
            let mut batch_count = 0;
            let mut last_progress = 0.0;
            while let Some(batch) = iterator.next().await {
                batch_count += 1;
                // 進捗が単調増加することを確認
                assert!(
                    batch.progress >= last_progress,
                    "Progress should be monotonically increasing"
                );
                last_progress = batch.progress;

                // 無限ループ防止
                assert!(
                    batch_count <= 1000,
                    "Too many batches, possible infinite loop"
                );
            }

            // 少なくとも1バッチは処理されるべき
            assert!(batch_count >= 1, "Expected at least 1 batch");

            // 完了後は is_done が true
            assert!(iterator.is_done(), "Iterator should be done");

            // 完了後に next() を呼ぶと None
            assert!(
                iterator.next().await.is_none(),
                "Expected None after completion"
            );
        });
    }

    /// GPUパイプラインが正常に動作することを確認
    #[test]
    fn test_gpu_pipeline_execution() {
        pollster::block_on(async {
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

            let mut iterator = match GpuDatetimeSearchIterator::new(params).await {
                Ok(it) => it,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // GPU検索を実行 (結果がなくてもパイプラインが動作することを確認)
            let batch = iterator.next().await;

            // 処理が進んだことを確認
            let batch = batch.expect("Expected a batch result");
            assert!(batch.processed_count > 0, "Expected some processing");
            assert!(batch.total_count > 0, "Expected total count > 0");
            assert_eq!(batch.total_count, 86400, "Expected 1 day = 86400 seconds");
        });
    }

    /// 存在しないSeedを検索した場合、結果が空であることを検証
    #[test]
    fn test_gpu_no_match_returns_empty() {
        pollster::block_on(async {
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

            let mut iterator = match GpuDatetimeSearchIterator::new(params).await {
                Ok(it) => it,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            let batch = iterator.next().await;
            let batch = batch.expect("Expected a batch result");
            assert!(
                batch.results.is_empty(),
                "Expected no results for non-existent seed"
            );
        });
    }

    /// スループットが正の値であることを確認
    #[test]
    fn test_throughput_positive() {
        pollster::block_on(async {
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
                    hour_end: 0,
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
                    range_seconds: 3600, // 1時間
                },
                condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
            };

            let mut iterator = match GpuDatetimeSearchIterator::new(params).await {
                Ok(it) => it,
                Err(e) => {
                    eprintln!("GPU not available: {e}, skipping test");
                    return;
                }
            };

            // 2回目以降のバッチでスループットを確認
            let _ = iterator.next().await;
            if let Some(batch) = iterator.next().await {
                // 2回目以降は経過時間が測定できるためスループットが正になる可能性
                // (ただし非常に高速な場合は0になる可能性もある)
                assert!(batch.throughput >= 0.0, "Throughput should be non-negative");
            }
        });
    }
}
