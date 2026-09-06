//! GPU 起動時刻検索イテレータ
//!
//! `AsyncIterator` パターンで GPU 検索を実行する。
//! 複数の `StartupCondition` (`Timer0` × `VCount` × `KeyMask`) を順次処理し、
//! 全体の進捗を統合して報告する。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::core::datetime::DatetimeSearchSpace;
use crate::datetime_search::expand_combinations;
use crate::types::{DatetimeSearchContext, DsConfig, MtSeed, SeedOrigin, StartupCondition};

use super::pipeline::SearchPipeline;
use crate::gpu::context::GpuDeviceContext;
use crate::gpu::limits::SearchJobLimits;

/// GPU 検索バッチ結果
///
/// CPU 側と同様に処理件数のみを返し、スループット計算は TS 側の責務とする。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, large_number_types_as_bigints)]
pub struct GpuSearchBatch {
    /// 検索結果
    pub results: Vec<SeedOrigin>,
    /// 進捗率 (0.0 - 1.0)
    pub progress: f64,
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
/// 複数の `StartupCondition` (`Timer0` × `VCount` × `KeyMask`) を順次処理し、
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
    /// 検証済みの共通探索空間
    search_space: DatetimeSearchSpace,

    /// 組み合わせ管理: 全組み合わせリスト
    combinations: Vec<StartupCondition>,
    /// 組み合わせ管理: 現在処理中のインデックス
    current_combo_idx: usize,

    /// 現在の Pipeline (組み合わせごとに再作成)
    pipeline: Option<SearchPipeline>,
    /// 現在の候補番号 (探索空間の開始日が基準)
    current_candidate: u32,

    /// 進捗管理: 総処理数 (全組み合わせ通算)
    total_count: u64,
    /// 進捗管理: 処理済み数 (全組み合わせ通算)
    processed_count: u64,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuDatetimeSearchIterator {
    /// イテレータを作成 (複数組み合わせ対応、WASM 公開 API)
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
    ) -> Result<GpuDatetimeSearchIterator, String> {
        if target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        // 組み合わせ展開
        let combinations = expand_combinations(&context);
        if combinations.is_empty() {
            return Err("no valid combinations".into());
        }

        let search_space =
            DatetimeSearchSpace::from_date_range(&context.date_range, &context.time_range)?;

        Self::from_space(context.ds, target_seeds, combinations, search_space).await
    }

    /// 次のバッチを取得
    ///
    /// 検索完了時は `None` を返す。
    /// 組み合わせ切り替えは内部で自動的に行われる。
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    /// # Errors
    /// dispatch 範囲外、結果番号不正、GPU 読み取り失敗の場合。
    pub async fn next(&mut self) -> Result<Option<GpuSearchBatch>, String> {
        // 全起動条件に共通の候補番号区間
        let (_, bounds) = self.search_space.candidate_bounds();

        loop {
            // Pipeline がない場合は完了
            let Some(pipeline) = self.pipeline.as_mut() else {
                return Ok(None);
            };

            // 現在の組み合わせで残り処理があるか
            let remaining_in_combo = bounds.end - self.current_candidate;

            if remaining_in_combo == 0 {
                // 次の組み合わせへ
                self.current_combo_idx += 1;
                if self.current_combo_idx >= self.combinations.len() {
                    self.pipeline = None;
                    return Ok(None);
                }

                // 新しい Pipeline 作成
                self.pipeline = Some(SearchPipeline::new(
                    &self.gpu_ctx,
                    &self.ds,
                    &self.target_seeds,
                    self.combinations[self.current_combo_idx],
                    &self.search_space,
                ));
                self.current_candidate = bounds.start;
                continue;
            }

            // dispatch 実行
            #[allow(clippy::cast_possible_truncation)]
            let to_process = self
                .limits
                .max_messages_per_dispatch
                .min(remaining_in_combo);
            let (matches, processed) = pipeline
                .dispatch(to_process, self.current_candidate)
                .await?;

            self.current_candidate += processed;
            self.processed_count += u64::from(processed);

            return Ok(Some(self.build_batch_result(matches)));
        }
    }

    /// バッチ結果を構築
    fn build_batch_result(&self, matches: Vec<super::pipeline::MatchResult>) -> GpuSearchBatch {
        // 結果変換 (現在の組み合わせを使用)
        let condition = self.combinations[self.current_combo_idx];
        let results: Vec<SeedOrigin> = matches
            .into_iter()
            .map(|m| SeedOrigin::startup(m.lcg_seed, m.datetime, condition))
            .collect();

        GpuSearchBatch {
            results,
            progress: self.progress(),
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

impl GpuDatetimeSearchIterator {
    async fn from_space(
        ds: DsConfig,
        target_seeds: Vec<MtSeed>,
        combinations: Vec<StartupCondition>,
        search_space: DatetimeSearchSpace,
    ) -> Result<Self, String> {
        // GPU 初期化
        let gpu_ctx = GpuDeviceContext::new().await?;
        let limits = SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());

        let total_count = search_space
            .count()
            .checked_mul(combinations.len() as u64)
            .ok_or("Search count overflow")?;
        let (_, bounds) = search_space.candidate_bounds();
        let pipeline = if bounds.is_empty() {
            None
        } else {
            Some(SearchPipeline::new(
                &gpu_ctx,
                &ds,
                &target_seeds,
                combinations[0],
                &search_space,
            ))
        };

        Ok(Self {
            gpu_ctx,
            limits,
            target_seeds,
            ds,
            search_space,
            combinations,
            current_combo_idx: 0,
            pipeline,
            current_candidate: bounds.start,
            total_count,
            processed_count: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::types::{
        DateRangeParams, DatetimeSearchContext, DsConfig, Hardware, KeySpec, LcgSeed, MtSeed,
        RomRegion, RomVersion, TimeRangeParams, Timer0VCountRange,
    };

    use super::*;

    #[test]
    #[ignore = "requires a real GPU; run explicitly with --ignored --nocapture"]
    fn gpu_partial_batches_reset_candidate_and_empty_space_skips_pipeline() {
        use crate::core::datetime::END_SECONDS;
        use crate::datetime_search::base::DatetimeHashGenerator;
        use crate::types::DatetimeSearchSpaceParams;
        let context = create_test_context();
        let combinations = vec![
            StartupCondition::new(3193, 90, crate::types::KeyMask::NONE),
            StartupCondition::new(3194, 90, crate::types::KeyMask::NONE),
        ];
        let time_range = TimeRangeParams {
            hour_start: 10,
            hour_end: 11,
            minute_start: 30,
            minute_end: 30,
            second_start: 0,
            second_end: 6,
        };
        let space = DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
            start_seconds: 39600,
            end_seconds: 43200,
            time_range: time_range.clone(),
        })
        .unwrap();
        let mut expected = Vec::new();
        let mut seeds = Vec::new();
        for condition in &combinations {
            let mut generator = DatetimeHashGenerator::new(&context.ds, &space, *condition);
            while !generator.is_exhausted() {
                let (entries, count) = generator.next_quad();
                for (date, hash) in entries.iter().take(usize::from(count)) {
                    seeds.push(hash.to_mt_seed());
                    expected.push(
                        serde_json::to_string(&SeedOrigin::startup(
                            hash.to_lcg_seed(),
                            *date,
                            *condition,
                        ))
                        .unwrap(),
                    );
                }
            }
        }
        let mut iter = pollster::block_on(GpuDatetimeSearchIterator::from_space(
            context.ds.clone(),
            seeds.clone(),
            combinations.clone(),
            space,
        ))
        .unwrap();
        iter.limits.max_messages_per_dispatch = 3;
        let mut actual = Vec::new();
        let mut counts = Vec::new();
        while let Some(batch) = pollster::block_on(iter.next()).unwrap() {
            counts.push(batch.processed_count);
            assert_eq!(batch.total_count, 14);
            actual.extend(
                batch
                    .results
                    .iter()
                    .map(|r| serde_json::to_string(r).unwrap()),
            );
        }
        expected.sort();
        actual.sort();
        assert_eq!(actual, expected);
        assert_eq!(counts, vec![3, 6, 7, 10, 13, 14]);
        assert!(iter.is_done());
        assert!(pollster::block_on(iter.next()).unwrap().is_none());
        let empty = DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
            start_seconds: END_SECONDS,
            end_seconds: END_SECONDS,
            time_range,
        })
        .unwrap();
        let mut iter = pollster::block_on(GpuDatetimeSearchIterator::from_space(
            context.ds,
            seeds,
            combinations,
            empty,
        ))
        .unwrap();
        assert!(iter.pipeline.is_none());
        assert!(iter.is_done());
        assert!(pollster::block_on(iter.next()).unwrap().is_none());
    }

    fn create_test_context() -> DatetimeSearchContext {
        DatetimeSearchContext {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            date_range: DateRangeParams {
                start_year: 2011,
                start_month: 1,
                start_day: 1,
                end_year: 2011,
                end_month: 1,
                end_day: 1,
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
    fn test_space_count() {
        let context = create_test_context();
        let total = DatetimeSearchSpace::from_date_range(&context.date_range, &context.time_range)
            .unwrap()
            .count();

        // 1日、1日あたり 86400秒
        assert_eq!(total, 86400);
    }

    #[test]
    fn test_space_count_with_time_range() {
        let mut context = create_test_context();
        context.time_range = TimeRangeParams {
            hour_start: 10,
            hour_end: 12, // 3時間
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        let total = DatetimeSearchSpace::from_date_range(&context.date_range, &context.time_range)
            .unwrap()
            .count();

        // 1日、1日あたり 3時間 * 60分 * 60秒 = 10800秒
        assert_eq!(total, 10800);
    }

    #[test]
    fn test_iterator_creation() {
        let context = create_test_context();
        let target_seeds = vec![MtSeed::new(0x1234_5678)];

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(context, target_seeds));

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
        let context = create_test_context();
        let target_seeds = vec![];

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(context, target_seeds));
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
    /// - `KeyMask`: `0x0000`
    #[test]
    fn test_gpu_search_finds_known_mtseed() {
        // CPU テストと同じパラメータ
        let context = DatetimeSearchContext {
            ds: DsConfig {
                mac: [0x8C, 0x56, 0xC5, 0x86, 0x15, 0x28],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            date_range: DateRangeParams {
                start_year: 2010,
                start_month: 9,
                start_day: 18,
                end_year: 2010,
                end_month: 9,
                end_day: 18,
            },
            time_range: TimeRangeParams {
                hour_start: 18,
                hour_end: 18,
                minute_start: 0,
                minute_end: 30,
                second_start: 0,
                second_end: 59,
            },
            ranges: vec![Timer0VCountRange {
                timer0_min: 0x0C79,
                timer0_max: 0x0C79,
                vcount_min: 0x60,
                vcount_max: 0x60,
            }],
            key_spec: KeySpec::from_buttons(vec![]),
        };
        let target_seeds = vec![MtSeed::new(0x32bf_6858)];

        // GPU 検索イテレータ作成
        let result = pollster::block_on(GpuDatetimeSearchIterator::create(context, target_seeds));
        let Ok(mut iterator) = result else {
            eprintln!("GPU not available, skipping test");
            return;
        };

        // 全バッチを実行して結果を収集
        let mut all_results: Vec<SeedOrigin> = Vec::new();
        while let Some(batch) = pollster::block_on(iterator.next()).unwrap() {
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

    /// 空の組み合わせでエラーになることを確認
    #[test]
    fn test_empty_combinations_rejected() {
        let mut context = create_test_context();
        context.ranges = vec![]; // 空の範囲

        let target_seeds = vec![MtSeed::new(0x1234_5678)];

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(context, target_seeds));
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

        let result = pollster::block_on(GpuDatetimeSearchIterator::create(context, target_seeds));

        if let Ok(iter) = result {
            // 2つの組み合わせ
            assert_eq!(iter.combinations.len(), 2);
            // 総処理数 = 1日 × 86400秒/日 × 2組み合わせ
            assert_eq!(iter.total_count, 86400 * 2);
        }
    }
}
