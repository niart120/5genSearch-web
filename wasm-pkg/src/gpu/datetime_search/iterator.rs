//! GPU 起動時刻検索イテレータ
//!
//! `AsyncIterator` パターンで GPU 検索を実行する。
//! 複数の `StartupCondition` (`Timer0` × `VCount` × `KeyCode`) を順次処理し、
//! 全体の進捗を統合して報告する。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::datetime_search::expand_combinations;
use crate::types::{
    DateRangeParams, DatetimeSearchContext, DsConfig, MtSeed, MtseedDatetimeSearchParams,
    SearchRangeParams, SeedOrigin, StartupCondition, TimeRangeParams,
};

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
///
/// 複数の `StartupCondition` (`Timer0` × `VCount` × `KeyCode`) を順次処理し、
/// 全体の進捗を統合して報告する。
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuDatetimeSearchIterator {
    /// GPU デバイスコンテキスト (組み合わせ切り替え時に再利用)
    gpu_ctx: GpuDeviceContext,
    /// 検索制限
    limits: SearchJobLimits,

    /// 共通パラメータ: 検索対象 MT Seed
    target_seeds: Vec<MtSeed>,
    /// 共通パラメータ: DS 設定
    ds: DsConfig,
    /// 共通パラメータ: 1日内の時刻範囲
    time_range: TimeRangeParams,
    /// 共通パラメータ: 検索範囲
    search_range: SearchRangeParams,

    /// 組み合わせ管理: 全組み合わせリスト
    combinations: Vec<StartupCondition>,
    /// 組み合わせ管理: 現在処理中のインデックス
    current_combo_idx: usize,

    /// 現在の Pipeline (組み合わせごとに再作成)
    pipeline: Option<SearchPipeline>,
    /// 現在の Pipeline 内オフセット
    pipeline_offset: u32,

    /// 進捗管理: 総処理数 (全組み合わせ通算)
    total_count: u64,
    /// 進捗管理: 処理済み数 (全組み合わせ通算)
    processed_count: u64,

    /// スループット計測: 前回の処理済み数
    last_processed: u64,
    /// スループット計測: 前回の時刻 (秒)
    last_time_secs: f64,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuDatetimeSearchIterator {
    /// イテレータを作成 (async factory method) - 新 API
    ///
    /// `DatetimeSearchContext` から組み合わせを展開し、順次処理する。
    ///
    /// # Errors
    ///
    /// - GPU デバイスが利用不可の場合
    /// - `target_seeds` が空の場合
    /// - 組み合わせが空の場合
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = "create"))]
    pub async fn create(
        context: DatetimeSearchContext,
        target_seeds: Vec<MtSeed>,
        date_range: DateRangeParams,
    ) -> Result<GpuDatetimeSearchIterator, String> {
        if target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        // 組み合わせ展開
        let combinations = expand_combinations(&context);
        if combinations.is_empty() {
            return Err("no valid combinations".into());
        }

        // GPU 初期化
        let gpu_ctx = GpuDeviceContext::new().await?;
        let limits = SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());

        // 検索範囲計算
        let search_range = date_range.to_search_range();
        let seconds_per_combo = calculate_seconds_in_range(&search_range, &context.time_range);
        #[allow(clippy::cast_possible_truncation)]
        let total_count = seconds_per_combo * combinations.len() as u64;

        // 最初の組み合わせで Pipeline 作成
        let first_params = build_params(
            &context.ds,
            &target_seeds,
            &context.time_range,
            &search_range,
            combinations[0],
        );
        let pipeline = SearchPipeline::new(&gpu_ctx, &first_params);

        Ok(Self {
            gpu_ctx,
            limits,
            target_seeds,
            ds: context.ds,
            time_range: context.time_range,
            search_range,
            combinations,
            current_combo_idx: 0,
            pipeline: Some(pipeline),
            pipeline_offset: 0,
            total_count,
            processed_count: 0,
            last_processed: 0,
            last_time_secs: current_time_secs(),
        })
    }

    /// イテレータを作成 (async factory method) - 旧 API (互換用)
    ///
    /// # Errors
    ///
    /// - GPU デバイスが利用不可の場合
    /// - `target_seeds` が空の場合
    pub async fn new(
        params: MtseedDatetimeSearchParams,
    ) -> Result<GpuDatetimeSearchIterator, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let gpu_ctx = GpuDeviceContext::new().await?;
        let limits = SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());
        let pipeline = SearchPipeline::new(&gpu_ctx, &params);
        let total_count = calculate_total_count(&params);

        Ok(Self {
            gpu_ctx,
            limits,
            target_seeds: params.target_seeds,
            ds: params.ds,
            time_range: params.time_range,
            search_range: params.search_range,
            combinations: vec![params.condition],
            current_combo_idx: 0,
            pipeline: Some(pipeline),
            pipeline_offset: 0,
            total_count,
            processed_count: 0,
            last_processed: 0,
            last_time_secs: current_time_secs(),
        })
    }

    /// 組み合わせあたりの処理数を計算
    fn seconds_per_combo(&self) -> u64 {
        calculate_seconds_in_range(&self.search_range, &self.time_range)
    }

    /// 現在の組み合わせで Pipeline パラメータを構築
    fn build_current_params(&self) -> MtseedDatetimeSearchParams {
        build_params(
            &self.ds,
            &self.target_seeds,
            &self.time_range,
            &self.search_range,
            self.combinations[self.current_combo_idx],
        )
    }

    /// 次のバッチを取得
    ///
    /// 検索完了時は `None` を返す。
    /// 組み合わせ切り替えは内部で自動的に行われる。
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn next(&mut self) -> Option<GpuSearchBatch> {
        // 組み合わせあたりの処理数を事前計算 (borrow 回避)
        let seconds_per_combo = self.seconds_per_combo();

        loop {
            // Pipeline がない場合は完了
            let pipeline = self.pipeline.as_mut()?;

            // 現在の組み合わせで残り処理があるか
            let remaining_in_combo =
                seconds_per_combo.saturating_sub(u64::from(self.pipeline_offset));

            if remaining_in_combo == 0 {
                // 次の組み合わせへ
                self.current_combo_idx += 1;
                if self.current_combo_idx >= self.combinations.len() {
                    self.pipeline = None;
                    return None;
                }

                // 新しい Pipeline 作成
                let params = self.build_current_params();
                self.pipeline = Some(SearchPipeline::new(&self.gpu_ctx, &params));
                self.pipeline_offset = 0;
                continue;
            }

            // dispatch 実行
            #[allow(clippy::cast_possible_truncation)]
            let to_process = self
                .limits
                .max_messages_per_dispatch
                .min(remaining_in_combo as u32);
            let (matches, processed) = pipeline.dispatch(to_process, self.pipeline_offset).await;

            self.pipeline_offset += processed;
            self.processed_count += u64::from(processed);

            return Some(self.build_batch_result(matches));
        }
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

        // 結果変換 (現在の組み合わせを使用)
        let condition = self.combinations[self.current_combo_idx];
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

/// 総処理数を計算 (単一組み合わせ用、旧 API 互換)
fn calculate_total_count(params: &MtseedDatetimeSearchParams) -> u64 {
    calculate_seconds_in_range(&params.search_range, &params.time_range)
}

/// 検索範囲内の有効秒数を計算
fn calculate_seconds_in_range(
    search_range: &SearchRangeParams,
    time_range: &TimeRangeParams,
) -> u64 {
    // 1日あたりの有効秒数
    let valid_seconds_per_day = u64::from(time_range.count_valid_seconds());

    // 日数 (範囲秒数を86400で割り上げ)
    let days = u64::from(search_range.range_seconds.div_ceil(86400));

    valid_seconds_per_day * days
}

/// `MtseedDatetimeSearchParams` を構築
fn build_params(
    ds: &DsConfig,
    target_seeds: &[MtSeed],
    time_range: &TimeRangeParams,
    search_range: &SearchRangeParams,
    condition: StartupCondition,
) -> MtseedDatetimeSearchParams {
    MtseedDatetimeSearchParams {
        target_seeds: target_seeds.to_vec(),
        ds: ds.clone(),
        time_range: time_range.clone(),
        search_range: search_range.clone(),
        condition,
    }
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
        .map_or(0.0, |d| d.as_secs_f64())
}

#[cfg(test)]
mod tests {
    use crate::types::{
        DateRangeParams, DatetimeSearchContext, DsConfig, Hardware, KeyCode, KeySpec, LcgSeed,
        MtSeed, RomRegion, RomVersion, SearchRangeParams, StartupCondition, TimeRangeParams,
        Timer0VCountRange,
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

    fn create_test_context() -> DatetimeSearchContext {
        DatetimeSearchContext {
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
            ranges: vec![Timer0VCountRange {
                timer0_min: 0x10ED,
                timer0_max: 0x10ED,
                vcount_min: 0x5B,
                vcount_max: 0x5B,
            }],
            key_spec: KeySpec::from_buttons(vec![]),
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

    /// GPU 検索で既知の MT Seed を検索し、期待する結果が得られることを確認
    ///
    /// CPU 検索テスト (TypeScript 側) で使用している同じ期待値:
    /// - MT Seed: `0x32bf6858`
    /// - 日時: 2010/09/18 18:13:11
    /// - LCG Seed: `0x768360781d1ce6dd`
    ///
    /// DS 設定:
    /// - MAC: `8C:56:C5:86:15:28`
    /// - Hardware: DS Lite
    /// - Version: Black
    /// - Region: JPN
    /// - Timer0: `0x0C79`
    /// - `VCount`: `0x60`
    /// - `KeyCode`: `0x2FFF`
    #[test]
    fn test_gpu_search_finds_known_mtseed() {
        // CPU テストと同じパラメータ
        let params = MtseedDatetimeSearchParams {
            ds: DsConfig {
                mac: [0x8C, 0x56, 0xC5, 0x86, 0x15, 0x28],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            condition: StartupCondition {
                timer0: 0x0C79,
                vcount: 0x60,
                key_code: KeyCode::new(0x2FFF),
            },
            target_seeds: vec![MtSeed::new(0x32bf_6858)],
            time_range: TimeRangeParams {
                hour_start: 18,
                hour_end: 18,
                minute_start: 0,
                minute_end: 30,
                second_start: 0,
                second_end: 59,
            },
            search_range: SearchRangeParams {
                start_year: 2010,
                start_month: 9,
                start_day: 18,
                start_second_offset: 0,
                range_seconds: 86400, // 1日
            },
        };

        // GPU 検索イテレータ作成
        let result = pollster::block_on(GpuDatetimeSearchIterator::new(params));
        let Ok(mut iterator) = result else {
            eprintln!("GPU not available, skipping test");
            return;
        };

        // 全バッチを実行して結果を収集
        let mut all_results = Vec::new();
        while let Some(batch) = pollster::block_on(iterator.next()) {
            all_results.extend(batch.results);
        }

        // 結果があることを確認
        assert!(
            !all_results.is_empty(),
            "Expected to find MT Seed 0x32bf6858 but got no results"
        );

        // 期待する MT Seed が見つかることを確認
        let found = all_results
            .iter()
            .find(|r| r.mt_seed() == MtSeed::new(0x32bf_6858));
        assert!(found.is_some(), "Expected MT Seed 0x32bf6858 not found");

        let seed_origin = found.unwrap();

        // LCG Seed の確認
        assert_eq!(
            seed_origin.base_seed(),
            LcgSeed::new(0x7683_6078_1d1c_e6dd),
            "LCG Seed mismatch"
        );

        // 日時の確認 (Startup バリアントから取得)
        if let crate::types::SeedOrigin::Startup { datetime, .. } = seed_origin {
            assert_eq!(datetime.year, 2010, "Year mismatch");
            assert_eq!(datetime.month, 9, "Month mismatch");
            assert_eq!(datetime.day, 18, "Day mismatch");
            assert_eq!(datetime.hour, 18, "Hour mismatch");
            assert_eq!(datetime.minute, 13, "Minute mismatch");
            assert_eq!(datetime.second, 11, "Second mismatch");
        } else {
            panic!("Expected Startup variant");
        }
    }

    /// 新 API (`DatetimeSearchContext`) でイテレータを作成できることを確認
    #[test]
    fn test_create_with_context() {
        let context = create_test_context();
        let target_seeds = vec![MtSeed::new(0x1234_5678)];
        let date_range = DateRangeParams {
            start_year: 2011,
            start_month: 1,
            start_day: 1,
            end_year: 2011,
            end_month: 1,
            end_day: 1,
        };

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(
            context,
            target_seeds,
            date_range,
        ));

        // GPU が利用可能な環境でのみ成功する
        if let Ok(iter) = result {
            assert!(!iter.is_done());
            #[allow(clippy::float_cmp)]
            {
                assert_eq!(iter.progress(), 0.0);
            }
            // 組み合わせは 1 つ (Timer0=0x10ED, VCount=0x5B, KeyCode=NONE)
            assert_eq!(iter.combinations.len(), 1);
        }
    }

    /// 空の組み合わせでエラーになることを確認
    #[test]
    fn test_empty_combinations_rejected() {
        let mut context = create_test_context();
        context.ranges = vec![]; // 空の範囲

        let target_seeds = vec![MtSeed::new(0x1234_5678)];
        let date_range = DateRangeParams {
            start_year: 2011,
            start_month: 1,
            start_day: 1,
            end_year: 2011,
            end_month: 1,
            end_day: 1,
        };

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(
            context,
            target_seeds,
            date_range,
        ));
        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "no valid combinations");
    }

    /// 複数組み合わせで進捗が正しく計算されることを確認
    #[test]
    fn test_progress_calculation_multiple_combinations() {
        let mut context = create_test_context();
        // 2つの組み合わせを設定
        context.ranges = vec![Timer0VCountRange {
            timer0_min: 0x10ED,
            timer0_max: 0x10EE, // 2つの Timer0
            vcount_min: 0x5B,
            vcount_max: 0x5B,
        }];

        let target_seeds = vec![MtSeed::new(0x1234_5678)];
        let date_range = DateRangeParams {
            start_year: 2011,
            start_month: 1,
            start_day: 1,
            end_year: 2011,
            end_month: 1,
            end_day: 1, // 1日
        };

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(
            context,
            target_seeds,
            date_range,
        ));

        if let Ok(iter) = result {
            // 2つの組み合わせ
            assert_eq!(iter.combinations.len(), 2);
            // 総処理数 = 1日 × 86400秒/日 × 2組み合わせ
            assert_eq!(iter.total_count, 86400 * 2);
        }
    }
}
