//! MT Seed 起動時刻検索

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::types::{
    Datetime, KeySpec, LcgSeed, MtSeed, SeedOrigin, StartupCondition, Timer0VCountRange,
};

use super::base::HashValuesEnumerator;
use super::types::{SearchRangeParams, TimeRangeParams};

// Re-export DsConfig from types for API convenience
pub use crate::types::DsConfig;

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    /// 検索対象の MT Seed リスト
    pub target_seeds: Vec<MtSeed>,
    /// DS 設定
    pub ds: DsConfig,
    /// 時刻範囲
    pub time_range: TimeRangeParams,
    /// 日付範囲
    pub search_range: SearchRangeParams,
    /// Timer0/VCount 範囲 (複数指定可能)
    pub ranges: Vec<Timer0VCountRange>,
    /// キー入力仕様 (全組み合わせを探索)
    pub key_spec: KeySpec,
}

/// 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeResult {
    /// 見つかった MT Seed
    pub seed: MtSeed,
    /// 起動日時
    pub datetime: Datetime,
    /// 起動条件 (`Timer0` / `VCount` / `KeyCode`)
    pub condition: StartupCondition,
}

impl MtseedDatetimeResult {
    /// `SeedOrigin::Startup` に変換
    pub fn to_seed_origin(&self, base_seed: LcgSeed) -> SeedOrigin {
        SeedOrigin::startup(base_seed, self.datetime, self.condition)
    }
}

/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchBatch {
    pub results: Vec<MtseedDatetimeResult>,
    pub processed_seconds: u64,
    pub total_seconds: u64,
}

/// MT Seed 起動時刻検索器
#[wasm_bindgen]
pub struct MtseedDatetimeSearcher {
    target_seeds: BTreeSet<u32>,
    // 探索パラメータ (Enumerator 再作成用)
    ds: DsConfig,
    time_range: TimeRangeParams,
    search_range: SearchRangeParams,
    // 全組み合わせ
    combinations: Vec<StartupCondition>,
    current_combination_index: usize,
    // 現在の Enumerator
    current_enumerator: Option<HashValuesEnumerator>,
    // 進捗管理
    total_combinations: u64,
    processed_combinations: u64,
}

#[wasm_bindgen]
impl MtseedDatetimeSearcher {
    /// 新しい `MtseedDatetimeSearcher` を作成
    ///
    /// # Errors
    ///
    /// - `target_seeds` が空の場合
    /// - `ranges` が空の場合
    /// - `time_range` のバリデーション失敗
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<MtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }
        if params.ranges.is_empty() {
            return Err("ranges is empty".into());
        }

        // Timer0/VCount/KeyCode の全組み合わせを展開
        let key_codes = params.key_spec.combinations();
        let mut combinations = Vec::new();

        for range in &params.ranges {
            for timer0 in range.timer0_min..=range.timer0_max {
                for vcount in range.vcount_min..=range.vcount_max {
                    for &key_code in &key_codes {
                        combinations.push(StartupCondition::new(timer0, vcount, key_code));
                    }
                }
            }
        }

        if combinations.is_empty() {
            return Err("No valid combinations".into());
        }

        let seconds_per_combination = u64::from(params.search_range.range_seconds);
        #[allow(clippy::cast_possible_truncation)]
        let total_combinations = combinations.len() as u64 * seconds_per_combination;

        // 最初の Enumerator を作成
        let first_comb = combinations[0];
        let enumerator = HashValuesEnumerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            first_comb.timer0,
            first_comb.vcount,
            first_comb.key_code,
        )?;

        Ok(Self {
            target_seeds: params.target_seeds.into_iter().map(MtSeed::value).collect(),
            ds: params.ds,
            time_range: params.time_range,
            search_range: params.search_range,
            combinations,
            current_combination_index: 0,
            current_enumerator: Some(enumerator),
            total_combinations,
            processed_combinations: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_combination_index >= self.combinations.len()
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.total_combinations == 0 {
            return 1.0;
        }
        self.processed_combinations as f64 / self.total_combinations as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_seconds: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining_seconds = u64::from(chunk_seconds);

        while remaining_seconds > 0 && !self.is_done() {
            let Some(enumerator) = &mut self.current_enumerator else {
                break;
            };

            let start_processed = enumerator.processed_seconds();

            // 現在の Enumerator からバッチ取得
            while !enumerator.is_exhausted() {
                let processed_in_batch = enumerator.processed_seconds() - start_processed;
                if processed_in_batch >= remaining_seconds {
                    break;
                }

                let (entries, len) = enumerator.next_quad();
                if len == 0 {
                    break;
                }

                for entry in entries.iter().take(len as usize) {
                    if self.target_seeds.contains(&entry.mt_seed) {
                        results.push(MtseedDatetimeResult {
                            seed: MtSeed::new(entry.mt_seed),
                            datetime: Datetime::new(
                                entry.year,
                                entry.month,
                                entry.day,
                                entry.hour,
                                entry.minute,
                                entry.second,
                            ),
                            condition: StartupCondition::new(
                                enumerator.timer0(),
                                enumerator.vcount(),
                                enumerator.key_code(),
                            ),
                        });
                    }
                }
            }

            let processed_this_round = enumerator.processed_seconds() - start_processed;
            self.processed_combinations += processed_this_round;
            remaining_seconds = remaining_seconds.saturating_sub(processed_this_round);

            // 現在の Enumerator が終了したら次の組み合わせに進む
            if enumerator.is_exhausted() {
                self.current_combination_index += 1;

                if self.current_combination_index < self.combinations.len() {
                    let next_comb = self.combinations[self.current_combination_index];
                    self.current_enumerator = HashValuesEnumerator::new(
                        &self.ds,
                        &self.time_range,
                        &self.search_range,
                        next_comb.timer0,
                        next_comb.vcount,
                        next_comb.key_code,
                    )
                    .ok();
                } else {
                    self.current_enumerator = None;
                }
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_seconds: self.processed_combinations,
            total_seconds: self.total_combinations,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::types::{Hardware, KeyCode, RomRegion, RomVersion};

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
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x5A)],
            key_spec: KeySpec::new(), // No key input
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
    fn test_searcher_empty_ranges() {
        let mut params = create_test_params(vec![MtSeed::new(0x1234_5678)]);
        params.ranges = vec![];
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
        use crate::types::LcgSeed;

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
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x60)],
            key_spec: KeySpec::new(), // キー入力なし
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
            .find(|r| r.seed.value() == expected_mt_seed.value());
        assert!(
            found.is_some(),
            "Expected MT Seed {:08X} (derived from LCG Seed 0x768360781D1CE6DD) not found. \
             Found {} results.",
            expected_mt_seed.value(),
            all_results.len()
        );

        // 検証: 日時が 18:13:11 であること
        let result = found.unwrap();
        assert_eq!(result.datetime.year, 2010, "Year mismatch");
        assert_eq!(result.datetime.month, 9, "Month mismatch");
        assert_eq!(result.datetime.day, 18, "Day mismatch");
        assert_eq!(
            result.datetime.hour, 18,
            "Hour mismatch: expected 18, got {}",
            result.datetime.hour
        );
        assert_eq!(
            result.datetime.minute, 13,
            "Minute mismatch: expected 13, got {}",
            result.datetime.minute
        );
        assert_eq!(
            result.datetime.second, 11,
            "Second mismatch: expected 11, got {}",
            result.datetime.second
        );

        // 検証: Timer0, VCount, KeyCode
        assert_eq!(result.condition.timer0, 0x0C79);
        assert_eq!(result.condition.vcount, 0x60);
        assert_eq!(result.condition.key_code, KeyCode::NONE);
    }

    #[test]
    fn test_multiple_key_combinations() {
        use crate::types::DsButton;

        let params = MtseedDatetimeSearchParams {
            target_seeds: vec![MtSeed::new(0x1234_5678)],
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
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x5A)],
            key_spec: KeySpec::from_buttons(vec![DsButton::A, DsButton::B]), // 4 combinations
        };

        let searcher = MtseedDatetimeSearcher::new(params).unwrap();
        // 1 range * 1 timer0 * 1 vcount * 4 key_codes = 4 combinations
        assert_eq!(searcher.combinations.len(), 4);
    }
}
