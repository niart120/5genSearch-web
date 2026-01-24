//! MT Seed 起動時刻検索

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::types::{DatetimeParams, GenerationSource, MtSeed, SearchSegment};

use super::base::HashValuesEnumerator;
use super::types::{SearchRangeParams, TimeRangeParams};

// Re-export DsConfig from types for API convenience
pub use crate::types::DsConfig;

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    pub target_seeds: Vec<u32>,
    pub ds: DsConfig,
    pub time_range: TimeRangeParams,
    pub search_range: SearchRangeParams,
    pub segment: SearchSegment,
}

/// 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeResult {
    pub seed: MtSeed,
    pub datetime: DatetimeParams,
    pub segment: SearchSegment,
}

impl MtseedDatetimeResult {
    /// `GenerationSource::Datetime` に変換
    pub fn to_generation_source(&self, base_seed: u64) -> GenerationSource {
        GenerationSource::datetime(
            base_seed,
            self.datetime,
            self.segment.timer0,
            self.segment.vcount,
            self.segment.key_code,
        )
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
    hash_enumerator: HashValuesEnumerator,
    total_seconds: u64,
    segment: SearchSegment,
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
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<MtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let hash_enumerator = HashValuesEnumerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.segment,
        )?;

        Ok(Self {
            target_seeds: params.target_seeds.into_iter().collect(),
            hash_enumerator,
            total_seconds: u64::from(params.search_range.range_seconds),
            segment: params.segment,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.hash_enumerator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.total_seconds == 0 {
            return 1.0;
        }
        // 進捗計算では精度損失は問題にならない
        self.hash_enumerator.processed_seconds() as f64 / self.total_seconds as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_seconds: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let start_processed = self.hash_enumerator.processed_seconds();

        while self.hash_enumerator.processed_seconds() - start_processed < u64::from(chunk_seconds)
        {
            let (entries, len) = self.hash_enumerator.next_quad();
            if len == 0 {
                break;
            }

            for entry in entries.iter().take(len as usize) {
                if self.target_seeds.contains(&entry.mt_seed) {
                    results.push(MtseedDatetimeResult {
                        seed: MtSeed::new(entry.mt_seed),
                        datetime: DatetimeParams::new(
                            entry.year,
                            entry.month,
                            entry.day,
                            entry.hour,
                            entry.minute,
                            entry.second,
                        ),
                        segment: self.segment,
                    });
                }
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_seconds: self.hash_enumerator.processed_seconds(),
            total_seconds: self.total_seconds,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::types::{Hardware, RomRegion, RomVersion};

    use super::*;

    fn create_test_params(target_seeds: Vec<u32>) -> MtseedDatetimeSearchParams {
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
            segment: SearchSegment {
                timer0: 0x0C79,
                vcount: 0x5A,
                key_code: 0x0000_0000,
            },
        }
    }

    #[test]
    fn test_searcher_creation() {
        let params = create_test_params(vec![0x1234_5678]);
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
        let params = create_test_params(vec![0x1234_5678]);
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
    /// - `keyCode`: `0x2FFF` (入力なし)
    /// - 期待 LCG Seed: `0x768360781D1CE6DD`
    #[test]
    fn test_searcher_finds_known_seed() {
        use crate::types::LcgSeed;

        // 期待される LCG Seed から MT Seed を計算
        let expected_lcg_seed = LcgSeed::new(0x7683_6078_1D1C_E6DD);
        let expected_mt_seed: u32 = expected_lcg_seed.derive_mt_seed().value();

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
            segment: SearchSegment {
                timer0: 0x0C79,
                vcount: 0x60,
                key_code: 0x2FFF, // キー入力なし
            },
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
            .find(|r| r.seed.value() == expected_mt_seed);
        assert!(
            found.is_some(),
            "Expected MT Seed {:08X} (derived from LCG Seed 0x768360781D1CE6DD) not found. \
             Found {} results.",
            expected_mt_seed,
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
    }
}
