//! MT Seed 起動時刻検索

use std::collections::BTreeSet;

use wasm_bindgen::prelude::*;

use crate::types::{
    DatetimeSearchContext, MtSeed, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    SeedOrigin, StartupCondition,
};

use super::base::DatetimeHashGenerator;
use super::{calculate_time_chunks, expand_combinations, split_search_range};

/// MT Seed 起動時刻検索器
#[wasm_bindgen]
pub struct MtseedDatetimeSearcher {
    /// 検索対象 Seed (型安全な `BTreeSet`)
    target_seeds: BTreeSet<MtSeed>,
    /// 起動時刻とハッシュ値の生成器
    generator: DatetimeHashGenerator,
    /// 起動条件 (結果生成用)
    condition: StartupCondition,
    // 進捗管理
    total_count: u64,
    processed_count: u64,
}

#[wasm_bindgen]
impl MtseedDatetimeSearcher {
    /// 新しい `MtseedDatetimeSearcher` を作成
    ///
    /// # Errors
    ///
    /// - `target_seeds` が空の場合
    /// - `time_range` のバリデーション失敗
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<MtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let generator = DatetimeHashGenerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.condition,
        )?;

        // 進捗計算: 有効秒数 (time_range 内の秒数 × 日数相当)
        let valid_seconds_per_day = params.time_range.count_valid_seconds();
        let days = params.search_range.range_seconds.div_ceil(86400);
        let total_count = u64::from(valid_seconds_per_day) * u64::from(days);

        Ok(Self {
            target_seeds: params.target_seeds.into_iter().collect(),
            generator,
            condition: params.condition,
            total_count,
            processed_count: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.generator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.generator.is_exhausted() {
            return 1.0;
        }
        self.processed_count as f64 / self.total_count as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining = u64::from(chunk_count);

        while remaining > 0 && !self.generator.is_exhausted() {
            let (entries, len) = self.generator.next_quad();
            if len == 0 {
                break;
            }

            let processed = u64::from(len);
            self.processed_count += processed;
            remaining = remaining.saturating_sub(processed);

            for (datetime, hash_values) in entries.iter().take(len as usize) {
                let mt_seed = hash_values.to_mt_seed();
                if self.target_seeds.contains(&mt_seed) {
                    let lcg_seed = hash_values.to_lcg_seed();
                    // SeedOrigin::Startup を直接生成
                    results.push(SeedOrigin::startup(lcg_seed, *datetime, self.condition));
                }
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}

// ===== タスク生成関数 =====

/// タスク生成関数
///
/// `DatetimeSearchContext` から、
/// 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
/// Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
///
/// # Arguments
/// - `context`: 検索コンテキスト (日付範囲、時刻範囲、Timer0/VCount/KeyCode 範囲)
/// - `target_seeds`: 検索対象の MT Seed
/// - `worker_count`: Worker 数
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
#[allow(clippy::cast_possible_truncation)]
pub fn generate_mtseed_search_tasks(
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
    worker_count: u32,
) -> Vec<MtseedDatetimeSearchParams> {
    let search_range = context.date_range.to_search_range();
    let combinations = expand_combinations(&context);
    let combo_count = combinations.len() as u32;

    // 時間分割数を計算
    let time_chunks = calculate_time_chunks(combo_count, worker_count);
    let ranges = split_search_range(search_range, time_chunks);

    // 組み合わせ × 時間チャンク のクロス積でタスク生成
    combinations
        .into_iter()
        .flat_map(|condition| {
            let target_seeds = target_seeds.clone();
            let ds = context.ds.clone();
            let time_range = context.time_range.clone();
            ranges.iter().map(move |range| MtseedDatetimeSearchParams {
                target_seeds: target_seeds.clone(),
                ds: ds.clone(),
                time_range: time_range.clone(),
                search_range: range.clone(),
                condition,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::types::{
        DateRangeParams, Datetime, DsButton, DsConfig, Hardware, KeyCode, KeySpec, LcgSeed,
        MtseedDatetimeSearchParams, RomRegion, RomVersion, SearchRangeParams, StartupCondition,
        TimeRangeParams, Timer0VCountRange,
    };

    use super::*;

    fn create_test_params(target_seeds: Vec<MtSeed>) -> MtseedDatetimeSearchParams {
        MtseedDatetimeSearchParams {
            target_seeds,
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
                range_seconds: 60, // Search only 60 seconds for test
            },
            condition: StartupCondition::new(0x0C79, 0x5A, KeyCode::NONE),
        }
    }

    #[test]
    fn test_searcher_creation() {
        let params = create_test_params(vec![MtSeed::new(0x1234_5678)]);
        let searcher = MtseedDatetimeSearcher::new(params);
        assert!(searcher.is_ok());
    }

    #[test]
    fn test_searcher_empty_seeds() {
        let params = create_test_params(vec![]);
        let searcher = MtseedDatetimeSearcher::new(params);
        assert!(searcher.is_err());
    }

    #[test]
    fn test_searcher_progress() {
        let params = create_test_params(vec![MtSeed::new(0x1234_5678)]);
        let mut searcher = MtseedDatetimeSearcher::new(params).unwrap();

        assert!(!searcher.is_done());
        assert!(searcher.progress() < 1.0);

        // Process all
        while !searcher.is_done() {
            searcher.next_batch(100);
        }

        assert!(searcher.is_done());
        assert!((searcher.progress() - 1.0).abs() < f64::EPSILON);
    }

    /// 既知の条件で MT Seed が正しく検索できることを検証
    ///
    /// 検証ケース:
    /// - 日時: 2010/09/18 18:13:11
    /// - ROM: Black (JPN)
    /// - Hardware: DS Lite
    /// - MAC: `8C:56:C5:86:15:28`
    /// - Timer0: `0x0C79`
    /// - `VCount`: `0x60`
    /// - keyCode: `0x2FFF` (入力なし)
    /// - 期待 LCG Seed: `0x768360781D1CE6DD`
    #[test]
    fn test_searcher_finds_known_seed() {
        // 期待される LCG Seed から MT Seed を計算
        let expected_lcg_seed = LcgSeed::new(0x7683_6078_1D1C_E6DD);
        let expected_mt_seed = expected_lcg_seed.derive_mt_seed();

        // 検索パラメータ: 2010/09/18 00:00:00 から 1日分 (86400秒)
        let params = MtseedDatetimeSearchParams {
            target_seeds: vec![expected_mt_seed],
            ds: DsConfig {
                // MAC: 8C:56:C5:86:15:28
                mac: [0x8C, 0x56, 0xC5, 0x86, 0x15, 0x28],
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
                start_year: 2010,
                start_month: 9,
                start_day: 18,
                start_second_offset: 0, // 00:00:00
                range_seconds: 86400,   // 1日分
            },
            condition: StartupCondition::new(0x0C79, 0x60, KeyCode::NONE),
        };

        let mut searcher = MtseedDatetimeSearcher::new(params).expect("Failed to create searcher");

        // 検索実行
        let mut all_results = Vec::new();
        while !searcher.is_done() {
            let batch = searcher.next_batch(10000);
            all_results.extend(batch.results);
        }

        // 検証: 期待する MT Seed が見つかること
        let found = all_results
            .iter()
            .find(|r| r.mt_seed().value() == expected_mt_seed.value());
        assert!(
            found.is_some(),
            "Expected MT Seed {:08X} (derived from LCG Seed 0x768360781D1CE6DD) not found. \
             Found {} results.",
            expected_mt_seed.value(),
            all_results.len()
        );

        // 検証: 日時が 18:13:11 であること
        let result = found.unwrap();
        let SeedOrigin::Startup {
            datetime,
            condition,
            ..
        } = result
        else {
            panic!("Expected SeedOrigin::Startup")
        };

        assert_eq!(datetime.year, 2010, "Year mismatch");
        assert_eq!(datetime.month, 9, "Month mismatch");
        assert_eq!(datetime.day, 18, "Day mismatch");
        assert_eq!(
            datetime.hour, 18,
            "Hour mismatch: expected 18, got {}",
            datetime.hour
        );
        assert_eq!(
            datetime.minute, 13,
            "Minute mismatch: expected 13, got {}",
            datetime.minute
        );
        assert_eq!(
            datetime.second, 11,
            "Second mismatch: expected 11, got {}",
            datetime.second
        );

        // 検証: Timer0, VCount, KeyCode
        assert_eq!(condition.timer0, 0x0C79);
        assert_eq!(condition.vcount, 0x60);
        assert_eq!(condition.key_code, KeyCode::NONE);
    }

    #[test]
    fn test_generate_mtseed_search_tasks() {
        let context = DatetimeSearchContext {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            date_range: DateRangeParams {
                start_year: 2023,
                start_month: 1,
                start_day: 1,
                end_year: 2023,
                end_month: 1,
                end_day: 1,
            },
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 0,
                minute_start: 0,
                minute_end: 0,
                second_start: 0,
                second_end: 0,
            },
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x5A)],
            key_spec: KeySpec::from_buttons(vec![DsButton::A, DsButton::B]), // 4 combinations
        };

        let tasks = generate_mtseed_search_tasks(context, vec![MtSeed::new(0x1234_5678)], 4);

        // 4 combinations * 1 time chunk = 4 tasks
        // (worker_count = 4, combo_count = 4 → time_chunks = 1)
        assert_eq!(tasks.len(), 4);
    }

    #[test]
    fn test_generate_mtseed_search_tasks_with_time_split() {
        let context = DatetimeSearchContext {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            date_range: DateRangeParams {
                start_year: 2023,
                start_month: 1,
                start_day: 1,
                end_year: 2023,
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
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x5A)],
            key_spec: KeySpec::from_buttons(vec![]), // 1 combination (no buttons)
        };

        let tasks = generate_mtseed_search_tasks(context, vec![MtSeed::new(0x1234_5678)], 4);

        // 1 combination * 4 time chunks = 4 tasks
        // (worker_count = 4, combo_count = 1 → time_chunks = 4)
        assert_eq!(tasks.len(), 4);

        // 各タスクの合計秒数が元の範囲と一致
        let total_seconds: u32 = tasks.iter().map(|t| t.search_range.range_seconds).sum();
        assert_eq!(total_seconds, 86400);
    }

    #[test]
    fn test_time_range_count_valid_seconds() {
        let range = TimeRangeParams {
            hour_start: 10,
            hour_end: 10,
            minute_start: 0,
            minute_end: 0,
            second_start: 0,
            second_end: 59,
        };
        // 10:00:00 - 10:00:59 = 60 seconds
        assert_eq!(range.count_valid_seconds(), 60);

        let full_day = TimeRangeParams {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        // Full day = 86400 seconds
        assert_eq!(full_day.count_valid_seconds(), 86400);
    }

    #[test]
    fn test_mtseed_ord() {
        let seed1 = MtSeed::new(100);
        let seed2 = MtSeed::new(200);
        assert!(seed1 < seed2);

        let mut set = BTreeSet::new();
        set.insert(seed2);
        set.insert(seed1);
        assert!(set.contains(&seed1));
        assert!(set.contains(&seed2));
    }

    #[test]
    fn test_seed_origin_mt_seed() {
        let lcg_seed = LcgSeed::new(0x7683_6078_1D1C_E6DD);
        let expected_mt_seed = lcg_seed.derive_mt_seed();

        let origin_seed = SeedOrigin::seed(lcg_seed);
        assert_eq!(origin_seed.mt_seed(), expected_mt_seed);

        let origin_startup = SeedOrigin::startup(
            lcg_seed,
            Datetime::new(2010, 9, 18, 18, 13, 11),
            StartupCondition::new(0x0C79, 0x60, KeyCode::NONE),
        );
        assert_eq!(origin_startup.mt_seed(), expected_mt_seed);
    }

    /// 統合テスト: 分割されたタスクのいずれかで既知 Seed が見つかること
    ///
    /// 時間分割を行った場合でも、検索対象の Seed が
    /// いずれかのタスクで見つかることを確認する。
    #[test]
    fn test_mtseed_tasks_find_known_seed_in_split() {
        // 期待される LCG Seed から MT Seed を計算
        let expected_lcg_seed = LcgSeed::new(0x7683_6078_1D1C_E6DD);
        let expected_mt_seed = expected_lcg_seed.derive_mt_seed();

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
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x60)],
            key_spec: KeySpec::from_buttons(vec![]), // 1 combination
        };

        // 4 Worker で時間分割 (組み合わせ数 = 1 なので 4 チャンク)
        let tasks = generate_mtseed_search_tasks(context, vec![expected_mt_seed], 4);

        assert_eq!(tasks.len(), 4);

        // 各タスクの合計秒数が元の範囲と一致
        let total_seconds: u32 = tasks.iter().map(|t| t.search_range.range_seconds).sum();
        assert_eq!(total_seconds, 86400);

        // いずれかのタスクで Seed が見つかることを確認
        let mut found = false;
        for task in tasks {
            let mut searcher = MtseedDatetimeSearcher::new(task).unwrap();
            while !searcher.is_done() {
                let batch = searcher.next_batch(10000);
                if batch
                    .results
                    .iter()
                    .any(|r| r.mt_seed() == expected_mt_seed)
                {
                    found = true;
                    break;
                }
            }
            if found {
                break;
            }
        }

        assert!(
            found,
            "Expected MT Seed should be found in one of the split tasks"
        );
    }
}
