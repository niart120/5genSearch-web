//! 起動時刻検索

pub mod base;
pub mod egg;
pub mod mtseed;
pub mod trainer_info;

use wasm_bindgen::prelude::*;

use crate::types::{DatetimeSearchContext, SearchRangeParams, StartupCondition};

use base::{datetime_to_seconds, seconds_to_datetime};

// Searcher と関数のみ re-export (型は types モジュールから)
pub use egg::{EggDatetimeSearcher, generate_egg_search_tasks};
pub use mtseed::{MtseedDatetimeSearcher, generate_mtseed_search_tasks};
pub use trainer_info::{TrainerInfoSearcher, generate_trainer_info_search_tasks};

/// 組み合わせ展開 (共通関数)
///
/// `DatetimeSearchContext` から `Timer0` × `VCount` × `KeyCode` の全組み合わせを展開する。
pub(crate) fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    let key_codes = context.key_spec.combinations();
    let mut combinations = Vec::new();

    for range in &context.ranges {
        for timer0 in range.timer0_min..=range.timer0_max {
            for vcount in range.vcount_min..=range.vcount_max {
                for &key_code in &key_codes {
                    combinations.push(StartupCondition::new(timer0, vcount, key_code));
                }
            }
        }
    }
    combinations
}

/// 組み合わせ数と Worker 数から時間分割数を計算
///
/// # Arguments
/// - `combo_count`: 組み合わせ数 (`Timer0` × `VCount` × `KeyCode`)
/// - `worker_count`: Worker 数
///
/// # Returns
/// 時間分割数 (最低 1)
pub(crate) fn calculate_time_chunks(combo_count: u32, worker_count: u32) -> u32 {
    if combo_count == 0 {
        1
    } else {
        worker_count.div_ceil(combo_count)
    }
}

/// 日時範囲分割 (共通関数)
///
/// 検索範囲を `n` 分割して、各 Worker に渡すための `SearchRangeParams` リストを生成する。
/// 境界値での連続性を保証するため、各チャンクの終了秒 + 1 = 次チャンクの開始秒 となる。
///
/// # Arguments
/// - `range`: 分割対象の検索範囲
/// - `n`: 分割数 (0 の場合は 1 として扱う)
///
/// # Returns
/// 分割された `SearchRangeParams` のリスト (最大 `n` 要素)
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn split_search_range(range: SearchRangeParams, n: u32) -> Vec<SearchRangeParams> {
    let n = n.max(1);

    if n == 1 {
        return vec![range.clone()];
    }

    let total_seconds = range.range_seconds;
    if total_seconds == 0 {
        return vec![range.clone()];
    }

    // チャンクサイズ (切り上げ)
    let chunk_seconds = total_seconds.div_ceil(n);

    // 開始日時を経過秒数として計算
    let base_seconds = datetime_to_seconds(
        range.start_year,
        range.start_month,
        range.start_day,
        0,
        0,
        0,
    ) + u64::from(range.start_second_offset);

    let mut chunks = Vec::with_capacity(n as usize);
    let mut offset = 0u32;

    while offset < total_seconds {
        let chunk_size = (total_seconds - offset).min(chunk_seconds);
        let chunk_start_seconds = base_seconds + u64::from(offset);

        let (year, month, day, hour, minute, second) = seconds_to_datetime(chunk_start_seconds);
        let second_offset = u32::from(hour) * 3600 + u32::from(minute) * 60 + u32::from(second);

        chunks.push(SearchRangeParams {
            start_year: year,
            start_month: month,
            start_day: day,
            start_second_offset: second_offset,
            range_seconds: chunk_size,
        });

        offset += chunk_size;
    }

    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_search_range_single() {
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 86400,
        };

        let chunks = split_search_range(range.clone(), 1);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].range_seconds, 86400);
    }

    #[test]
    fn test_split_search_range_zero_becomes_one() {
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 86400,
        };

        let chunks = split_search_range(range.clone(), 0);
        assert_eq!(chunks.len(), 1);
    }

    #[test]
    fn test_split_search_range_two_chunks() {
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 86400, // 1日
        };

        let chunks = split_search_range(range.clone(), 2);
        assert_eq!(chunks.len(), 2);

        // 合計秒数が元と一致
        let total: u32 = chunks.iter().map(|c| c.range_seconds).sum();
        assert_eq!(total, 86400);

        // 各チャンクは約半分
        assert_eq!(chunks[0].range_seconds, 43200);
        assert_eq!(chunks[1].range_seconds, 43200);
    }

    #[test]
    fn test_split_search_range_boundary_continuity() {
        // 境界値の連続性テスト: チャンク1の終了 + 1秒 = チャンク2の開始
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 100,
        };

        let chunks = split_search_range(range.clone(), 3);

        // 各チャンクの開始秒を計算して連続性を確認
        let mut expected_offset = 0u32;
        for chunk in &chunks {
            let chunk_start = datetime_to_seconds(
                chunk.start_year,
                chunk.start_month,
                chunk.start_day,
                0,
                0,
                0,
            ) + u64::from(chunk.start_second_offset);

            let base = datetime_to_seconds(2023, 1, 1, 0, 0, 0);
            assert_eq!(chunk_start, base + u64::from(expected_offset));

            expected_offset += chunk.range_seconds;
        }

        // 合計が元と一致
        assert_eq!(expected_offset, 100);
    }

    #[test]
    fn test_split_search_range_odd_seconds() {
        // 割り切れない場合のテスト
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 100,
        };

        let chunks = split_search_range(range.clone(), 3);
        assert_eq!(chunks.len(), 3);

        // 合計秒数が元と一致
        let total: u32 = chunks.iter().map(|c| c.range_seconds).sum();
        assert_eq!(total, 100);

        // 34 + 34 + 32 = 100 (切り上げにより最初のチャンクが大きい)
        assert_eq!(chunks[0].range_seconds, 34);
        assert_eq!(chunks[1].range_seconds, 34);
        assert_eq!(chunks[2].range_seconds, 32);
    }

    #[test]
    fn test_split_search_range_more_chunks_than_seconds() {
        // 秒数より多くの分割を要求した場合
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 5,
        };

        let chunks = split_search_range(range.clone(), 10);

        // 合計秒数が元と一致
        let total: u32 = chunks.iter().map(|c| c.range_seconds).sum();
        assert_eq!(total, 5);

        // 各チャンクは最低1秒
        for chunk in &chunks {
            assert!(chunk.range_seconds >= 1);
        }
    }

    #[test]
    fn test_split_search_range_with_offset() {
        // 開始オフセットがある場合
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 3600, // 01:00:00 から開始
            range_seconds: 7200,       // 2時間
        };

        let chunks = split_search_range(range.clone(), 2);
        assert_eq!(chunks.len(), 2);

        // 最初のチャンクは 01:00:00 から
        assert_eq!(chunks[0].start_year, 2023);
        assert_eq!(chunks[0].start_month, 1);
        assert_eq!(chunks[0].start_day, 1);
        assert_eq!(chunks[0].start_second_offset, 3600);

        // 2番目のチャンクは 02:00:00 から
        assert_eq!(chunks[1].start_second_offset, 7200);
    }

    #[test]
    fn test_split_search_range_cross_day() {
        // 日をまたぐ場合
        let range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 82800, // 23:00:00
            range_seconds: 7200,        // 2時間 (翌日 01:00:00 まで)
        };

        let chunks = split_search_range(range.clone(), 2);
        assert_eq!(chunks.len(), 2);

        // 2番目のチャンクは翌日になる
        assert_eq!(chunks[1].start_day, 2);
    }

    // ===== calculate_time_chunks のテスト =====

    #[test]
    fn test_calculate_time_chunks_zero_combo() {
        // 組み合わせ数が0の場合、分割数は1
        assert_eq!(calculate_time_chunks(0, 4), 1);
    }

    #[test]
    fn test_calculate_time_chunks_equal() {
        // 組み合わせ数 == Worker 数の場合、分割数は1
        assert_eq!(calculate_time_chunks(4, 4), 1);
    }

    #[test]
    fn test_calculate_time_chunks_more_combos() {
        // 組み合わせ数 > Worker 数の場合、分割数は1
        assert_eq!(calculate_time_chunks(8, 4), 1);
    }

    #[test]
    fn test_calculate_time_chunks_fewer_combos() {
        // 組み合わせ数 < Worker 数の場合、分割で補う
        assert_eq!(calculate_time_chunks(2, 8), 4); // 8 / 2 = 4
        assert_eq!(calculate_time_chunks(1, 8), 8); // 8 / 1 = 8
    }

    #[test]
    fn test_calculate_time_chunks_not_divisible() {
        // 割り切れない場合、切り上げ
        assert_eq!(calculate_time_chunks(3, 10), 4); // ceil(10 / 3) = 4
    }
}
