//! MT Seed 起動時刻検索

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::types::{
    DatetimeSearchContext, MtSeed, SearchRangeParams, SeedOrigin, StartupCondition, TimeRangeParams,
};

use super::base::DatetimeHashGenerator;

// Re-export DsConfig from types for API convenience
pub use crate::types::DsConfig;

/// MT Seed 検索パラメータ (単一組み合わせ)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    /// 検索対象の MT Seed セット
    pub target_seeds: Vec<MtSeed>,
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一)
    pub condition: StartupCondition,
}

/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchBatch {
    /// 見つかった結果 (`SeedOrigin::Startup` 形式)
    pub results: Vec<SeedOrigin>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}

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
/// `DatetimeSearchContext` から組み合わせを展開し、
/// 各 Worker に渡すパラメータを生成する。
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_mtseed_search_tasks(
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
    search_range: SearchRangeParams,
) -> Vec<MtseedDatetimeSearchParams> {
    // 1. 組み合わせ展開 (共通関数を使用)
    let combinations = super::expand_combinations(&context);

    // 2. タスク生成 (各組み合わせにつき1タスク)
    combinations
        .into_iter()
        .map(|condition| MtseedDatetimeSearchParams {
            target_seeds: target_seeds.clone(),
            ds: context.ds.clone(),
            time_range: context.time_range.clone(),
            search_range: search_range.clone(),
            condition,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::types::{
        Datetime, DsButton, Hardware, KeyCode, KeySpec, LcgSeed, RomRegion, RomVersion,
        Timer0VCountRange,
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

        let search_range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 1,
        };

        let tasks =
            generate_mtseed_search_tasks(context, vec![MtSeed::new(0x1234_5678)], search_range);

        // 1 range * 1 timer0 * 1 vcount * 4 key_codes = 4 combinations
        assert_eq!(tasks.len(), 4);
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
}
