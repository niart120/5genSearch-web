//! 起動時刻検索 共通基盤

use crate::core::datetime_codes::{get_date_code, get_time_code_for_hardware};
use crate::core::sha1::{
    BaseMessageBuilder, HashValues, calculate_pokemon_sha1_simd, get_frame, get_nazo_values,
};
use crate::types::{
    Datetime, DsConfig, Hardware, SearchRangeParams, StartupCondition, TimeRangeParams,
};

/// 86,400 秒分の `time_code` テーブル
type RangedTimeCodeTable = Box<[Option<u32>; 86400]>;

/// `time_code` テーブルを構築 (独立軸の直積)
#[allow(clippy::large_stack_arrays)]
fn build_ranged_time_code_table(
    range: &TimeRangeParams,
    hardware: Hardware,
) -> RangedTimeCodeTable {
    let mut table: RangedTimeCodeTable = Box::new([None; 86400]);
    let is_ds_or_lite = matches!(hardware, Hardware::DsLite | Hardware::Ds);

    // 各軸を独立にイテレーション (直積)
    for hour in range.hour_start..=range.hour_end {
        for minute in range.minute_start..=range.minute_end {
            for second in range.second_start..=range.second_end {
                let seconds_of_day =
                    u32::from(hour) * 3600 + u32::from(minute) * 60 + u32::from(second);
                let idx = seconds_of_day as usize;
                table[idx] = Some(get_time_code_for_hardware(seconds_of_day, is_ds_or_lite));
            }
        }
    }
    table
}

/// 日時エントリ
type DateTimeEntry = (u16, u8, u8, u8, u8, u8, u32, u32);

/// 日時コード列挙器
pub struct DateTimeCodeEnumerator {
    time_code_table: RangedTimeCodeTable,
    /// 2000年1月1日からの経過秒数
    current_seconds: u64,
    /// 検索終了秒数
    end_seconds: u64,
    /// 日付キャッシュ: `days_to_date()` は O(year − 2000) のため、
    /// 日が変わった時のみ再計算する (1 日 86,400 回の呼び出しを 1 回に削減)
    cached_days: u32,
    cached_date: (u16, u8, u8),
}

impl DateTimeCodeEnumerator {
    #[allow(clippy::cast_possible_truncation)]
    pub fn new(
        time_code_table: RangedTimeCodeTable,
        start_seconds: u64,
        range_seconds: u32,
    ) -> Self {
        let start_days = (start_seconds / 86400) as u32;
        let date = days_to_date(start_days);
        Self {
            time_code_table,
            current_seconds: start_seconds,
            end_seconds: start_seconds + u64::from(range_seconds),
            cached_days: start_days,
            cached_date: date,
        }
    }

    /// 次の有効な日時エントリを取得
    #[allow(clippy::cast_possible_truncation)]
    fn advance(&mut self) -> Option<DateTimeEntry> {
        while self.current_seconds < self.end_seconds {
            // DS の探索範囲 (2000-2099) では u32 への truncation は発生しない
            let days = (self.current_seconds / 86400) as u32;
            let secs = (self.current_seconds % 86400) as u32;
            let second_of_day = secs as usize;

            self.current_seconds += 1;

            if let Some(time_code) = self.time_code_table[second_of_day] {
                // 日付キャッシュ: days が変わった時のみ再計算
                if days != self.cached_days {
                    self.cached_days = days;
                    self.cached_date = days_to_date(days);
                }
                let (year, month, day) = self.cached_date;
                let hour = (secs / 3600) as u8;
                let minute = ((secs % 3600) / 60) as u8;
                let second = (secs % 60) as u8;
                let date_code = get_date_code(days);
                return Some((year, month, day, hour, minute, second, date_code, time_code));
            }
        }
        None
    }

    /// 4件まとめて取得
    pub fn next_quad(&mut self) -> ([DateTimeEntry; 4], u8) {
        let mut entries = [(0u16, 0u8, 0u8, 0u8, 0u8, 0u8, 0u32, 0u32); 4];
        let mut count = 0u8;

        for entry in &mut entries {
            if let Some(e) = self.advance() {
                *entry = e;
                count += 1;
            } else {
                break;
            }
        }

        (entries, count)
    }

    pub fn is_exhausted(&self) -> bool {
        self.current_seconds >= self.end_seconds
    }

    pub fn current_seconds(&self) -> u64 {
        self.current_seconds
    }
}

/// 経過秒数から日時に変換
///
/// 2000年1月1日 00:00:00 からの経過秒数を (year, month, day, hour, minute, second) に変換。
#[allow(clippy::cast_possible_truncation)]
pub fn seconds_to_datetime(total_seconds: u64) -> (u16, u8, u8, u8, u8, u8) {
    // DS の探索範囲 (2000-2099) では u32 への truncation は発生しない
    let days = (total_seconds / 86400) as u32;
    let secs = (total_seconds % 86400) as u32;
    seconds_to_datetime_parts(days, secs)
}

/// 日数と秒数から日時パーツに変換
#[allow(clippy::cast_possible_truncation)]
fn seconds_to_datetime_parts(days: u32, secs: u32) -> (u16, u8, u8, u8, u8, u8) {
    let hour = (secs / 3600) as u8;
    let minute = ((secs % 3600) / 60) as u8;
    let second = (secs % 60) as u8;

    let (year, month, day) = days_to_date(days);

    (year, month, day, hour, minute, second)
}

/// 2000年1月1日からの日数を年月日に変換
#[allow(clippy::cast_possible_truncation)]
fn days_to_date(mut days: u32) -> (u16, u8, u8) {
    let mut year = 2000u16;

    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    let leap = is_leap_year(year);
    let month_days: [u32; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1u8;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }

    // days は最大 30 なので truncation は発生しない
    (year, month, (days + 1) as u8)
}

fn is_leap_year(year: u16) -> bool {
    year.is_multiple_of(4) && !year.is_multiple_of(100) || year.is_multiple_of(400)
}

/// 年月日を 2000年1月1日からの経過秒数に変換
pub fn datetime_to_seconds(year: u16, month: u8, day: u8, hour: u8, minute: u8, second: u8) -> u64 {
    let mut days = 0u32;

    for y in 2000..year {
        days += if is_leap_year(y) { 366 } else { 365 };
    }

    let leap = is_leap_year(year);
    let month_days: [u32; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    for &md in month_days.iter().take(usize::from(month - 1)) {
        days += md;
    }
    days += u32::from(day - 1);

    u64::from(days) * 86400 + u64::from(hour) * 3600 + u64::from(minute) * 60 + u64::from(second)
}

/// 起動時刻候補とハッシュ値の生成器
///
/// 指定された日時範囲と `StartupCondition` に対して、
/// 有効な起動時刻候補と対応する `HashValues` を生成する。
pub struct DatetimeHashGenerator {
    base_message: [u32; 16],
    datetime_enumerator: DateTimeCodeEnumerator,
}

impl DatetimeHashGenerator {
    /// 新しい `DatetimeHashGenerator` を作成
    ///
    /// # Errors
    ///
    /// `time_range` のバリデーションに失敗した場合
    pub fn new(
        ds: &DsConfig,
        time_range: &TimeRangeParams,
        search_range: &SearchRangeParams,
        condition: StartupCondition,
    ) -> Result<Self, String> {
        time_range.validate()?;

        let nazo = get_nazo_values(ds);
        let frame = get_frame(ds.hardware);

        let builder = BaseMessageBuilder::new(
            &nazo,
            ds.mac,
            condition.vcount,
            condition.timer0,
            condition.key_code,
            frame,
        );

        let time_code_table = build_ranged_time_code_table(time_range, ds.hardware);

        let start_seconds = datetime_to_seconds(
            search_range.start_year,
            search_range.start_month,
            search_range.start_day,
            0,
            0,
            0,
        ) + u64::from(search_range.start_second_offset);

        let datetime_enumerator =
            DateTimeCodeEnumerator::new(time_code_table, start_seconds, search_range.range_seconds);

        Ok(Self {
            base_message: builder.to_message(),
            datetime_enumerator,
        })
    }

    /// 4件ずつ SHA-1 計算 (SIMD)
    ///
    /// 戻り値: (配列, 有効件数)
    /// `HashValues` には `to_lcg_seed()` / `to_mt_seed()` で Seed を取得可能
    pub(crate) fn next_quad(&mut self) -> ([(Datetime, HashValues); 4], u8) {
        let (entries, len) = self.datetime_enumerator.next_quad();
        if len == 0 {
            return (Default::default(), 0);
        }

        let mut date_codes = [0u32; 4];
        let mut time_codes = [0u32; 4];
        for i in 0..usize::from(len) {
            date_codes[i] = entries[i].6;
            time_codes[i] = entries[i].7;
        }

        let hashes = calculate_pokemon_sha1_simd(date_codes, time_codes, &self.base_message);

        let mut results: [(Datetime, HashValues); 4] = Default::default();
        for i in 0..usize::from(len) {
            let datetime = Datetime::new(
                entries[i].0,
                entries[i].1,
                entries[i].2,
                entries[i].3,
                entries[i].4,
                entries[i].5,
            );
            results[i] = (datetime, hashes[i]);
        }

        (results, len)
    }

    pub(crate) fn is_exhausted(&self) -> bool {
        self.datetime_enumerator.is_exhausted()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// テスト用: 経過秒数から日時に変換
    #[allow(clippy::cast_possible_truncation)]
    fn seconds_to_datetime(total_seconds: u64) -> (u16, u8, u8, u8, u8, u8) {
        let days = (total_seconds / 86400) as u32;
        let secs = (total_seconds % 86400) as u32;
        seconds_to_datetime_parts(days, secs)
    }

    #[test]
    fn test_seconds_to_datetime() {
        // 2000/1/1 00:00:00 = 0 seconds
        assert_eq!(seconds_to_datetime(0), (2000, 1, 1, 0, 0, 0));
        // 2000/1/1 00:00:01
        assert_eq!(seconds_to_datetime(1), (2000, 1, 1, 0, 0, 1));
        // 2000/1/2 00:00:00
        assert_eq!(seconds_to_datetime(86400), (2000, 1, 2, 0, 0, 0));
    }

    #[test]
    #[allow(clippy::many_single_char_names)]
    fn test_datetime_to_seconds_roundtrip() {
        let secs = datetime_to_seconds(2023, 12, 25, 15, 30, 45);
        let (y, m, d, h, mi, s) = seconds_to_datetime(secs);
        assert_eq!((y, m, d, h, mi, s), (2023, 12, 25, 15, 30, 45));
    }

    #[test]
    fn test_leap_year() {
        assert!(is_leap_year(2000));
        assert!(!is_leap_year(2001));
        assert!(is_leap_year(2004));
        assert!(!is_leap_year(2100));
    }

    #[test]
    fn test_days_to_date() {
        // 2000/1/1 = day 0
        assert_eq!(days_to_date(0), (2000, 1, 1));
        // 2000/1/31 = day 30
        assert_eq!(days_to_date(30), (2000, 1, 31));
        // 2000/2/1 = day 31
        assert_eq!(days_to_date(31), (2000, 2, 1));
        // 2000/2/29 (leap year) = day 59
        assert_eq!(days_to_date(59), (2000, 2, 29));
        // 2000/3/1 = day 60
        assert_eq!(days_to_date(60), (2000, 3, 1));
        // 2001/1/1 = day 366
        assert_eq!(days_to_date(366), (2001, 1, 1));
    }

    #[test]
    fn test_time_code_table_full_day() {
        let range = TimeRangeParams {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        let table = build_ranged_time_code_table(&range, Hardware::DsLite);

        // All 86400 entries should be Some
        let count = table.iter().filter(|x| x.is_some()).count();
        assert_eq!(count, 86400);
    }

    #[test]
    fn test_time_code_table_partial() {
        let range = TimeRangeParams {
            hour_start: 10,
            hour_end: 10,
            minute_start: 0,
            minute_end: 0,
            second_start: 0,
            second_end: 59,
        };
        let table = build_ranged_time_code_table(&range, Hardware::DsLite);

        // Only 60 entries (10:00:00 - 10:00:59)
        let count = table.iter().filter(|x| x.is_some()).count();
        assert_eq!(count, 60);
    }

    #[test]
    fn test_time_code_table_cartesian_discontinuous() {
        // 直積で不連続な範囲: hour: 10~12, min: 0~0, sec: 0~0
        let range = TimeRangeParams {
            hour_start: 10,
            hour_end: 12,
            minute_start: 0,
            minute_end: 0,
            second_start: 0,
            second_end: 0,
        };
        let table = build_ranged_time_code_table(&range, Hardware::DsLite);

        // count = 3 (10:00:00, 11:00:00, 12:00:00 のみ)
        let count = table.iter().filter(|x| x.is_some()).count();
        assert_eq!(count, 3);

        // 具体的なエントリを確認
        assert!(table[10 * 3600].is_some()); // 10:00:00
        assert!(table[11 * 3600].is_some()); // 11:00:00
        assert!(table[12 * 3600].is_some()); // 12:00:00
        assert!(table[10 * 3600 + 1].is_none()); // 10:00:01 は None
    }

    #[test]
    fn test_time_code_table_cartesian_expansion() {
        // 直積展開の確認: hour: 10~11, min: 30~31, sec: 0~0
        let range = TimeRangeParams {
            hour_start: 10,
            hour_end: 11,
            minute_start: 30,
            minute_end: 31,
            second_start: 0,
            second_end: 0,
        };
        let table = build_ranged_time_code_table(&range, Hardware::DsLite);

        // count = 4 (10:30:00, 10:31:00, 11:30:00, 11:31:00)
        let count = table.iter().filter(|x| x.is_some()).count();
        assert_eq!(count, 4);

        // 具体的なエントリを確認
        assert!(table[10 * 3600 + 30 * 60].is_some()); // 10:30:00
        assert!(table[10 * 3600 + 31 * 60].is_some()); // 10:31:00
        assert!(table[11 * 3600 + 30 * 60].is_some()); // 11:30:00
        assert!(table[11 * 3600 + 31 * 60].is_some()); // 11:31:00

        // 連続区間なら含まれるはずの時刻が含まれないことを確認
        assert!(table[10 * 3600 + 32 * 60].is_none()); // 10:32:00
        assert!(table[10 * 3600 + 59 * 60].is_none()); // 10:59:00
        assert!(table[11 * 3600].is_none()); // 11:00:00
    }

    #[test]
    fn test_time_code_table_count_matches_valid_seconds() {
        // テーブルエントリ数と count_valid_seconds() の一致テスト
        let test_cases = vec![
            TimeRangeParams {
                hour_start: 10,
                hour_end: 12,
                minute_start: 20,
                minute_end: 40,
                second_start: 0,
                second_end: 59,
            },
            TimeRangeParams {
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
            TimeRangeParams {
                hour_start: 5,
                hour_end: 5,
                minute_start: 30,
                minute_end: 30,
                second_start: 15,
                second_end: 15,
            },
            TimeRangeParams {
                hour_start: 10,
                hour_end: 11,
                minute_start: 30,
                minute_end: 31,
                second_start: 0,
                second_end: 0,
            },
        ];

        for range in test_cases {
            let table = build_ranged_time_code_table(&range, Hardware::DsLite);
            let table_count = table.iter().filter(|x| x.is_some()).count();
            let expected_count = range.count_valid_seconds() as usize;

            assert_eq!(
                table_count, expected_count,
                "Table entry count mismatch for range {range:?}. Expected {expected_count}, got {table_count}"
            );
        }
    }
}
