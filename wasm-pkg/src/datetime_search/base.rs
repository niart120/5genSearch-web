//! 起動時刻検索 共通基盤

use crate::core::sha1::{
    BaseMessageBuilder, build_date_code, build_time_code, calculate_pokemon_sha1_simd, get_frame,
    get_nazo_values,
};
use crate::types::{DsConfig, Hardware, SearchSegment};

use super::types::{HashEntry, SearchRangeParams, TimeRangeParams};

/// 86,400 秒分の `time_code` テーブル
type RangedTimeCodeTable = Box<[Option<u32>; 86400]>;

/// `time_code` テーブルを構築
#[allow(clippy::large_stack_arrays)]
fn build_ranged_time_code_table(
    range: &TimeRangeParams,
    hardware: Hardware,
) -> RangedTimeCodeTable {
    let mut table: RangedTimeCodeTable = Box::new([None; 86400]);
    let frame = get_frame(hardware);

    for hour in range.hour_start..=range.hour_end {
        let min_start = if hour == range.hour_start {
            range.minute_start
        } else {
            0
        };
        let min_end = if hour == range.hour_end {
            range.minute_end
        } else {
            59
        };

        for minute in min_start..=min_end {
            let sec_start = if hour == range.hour_start && minute == range.minute_start {
                range.second_start
            } else {
                0
            };
            let sec_end = if hour == range.hour_end && minute == range.minute_end {
                range.second_end
            } else {
                59
            };

            for second in sec_start..=sec_end {
                let idx = usize::from(hour) * 3600 + usize::from(minute) * 60 + usize::from(second);
                table[idx] = Some(build_time_code(hour, minute, second, frame));
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
}

impl DateTimeCodeEnumerator {
    pub fn new(
        time_code_table: RangedTimeCodeTable,
        start_seconds: u64,
        range_seconds: u32,
    ) -> Self {
        Self {
            time_code_table,
            current_seconds: start_seconds,
            end_seconds: start_seconds + u64::from(range_seconds),
        }
    }

    /// 次の有効な日時エントリを取得
    fn advance(&mut self) -> Option<DateTimeEntry> {
        while self.current_seconds < self.end_seconds {
            let (year, month, day, hour, minute, second) =
                seconds_to_datetime(self.current_seconds);
            let second_of_day =
                usize::from(hour) * 3600 + usize::from(minute) * 60 + usize::from(second);

            self.current_seconds += 1;

            if let Some(time_code) = self.time_code_table[second_of_day] {
                let date_code = build_date_code(year, month, day);
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

/// 2000年1月1日からの経過秒数を日時に変換
#[allow(clippy::cast_possible_truncation)]
fn seconds_to_datetime(total_seconds: u64) -> (u16, u8, u8, u8, u8, u8) {
    // 探索範囲は DS の設定可能範囲 (2000-2099) なので truncation は発生しない
    let days = (total_seconds / 86400) as u32;
    let secs = (total_seconds % 86400) as u32;

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

/// ハッシュ値列挙器
pub struct HashValuesEnumerator {
    base_message: [u32; 16],
    datetime_enumerator: DateTimeCodeEnumerator,
    segment: SearchSegment,
    start_seconds: u64,
}

impl HashValuesEnumerator {
    /// 新しい `HashValuesEnumerator` を作成
    ///
    /// # Errors
    ///
    /// `time_range` のバリデーションに失敗した場合
    pub fn new(
        ds: &DsConfig,
        time_range: &TimeRangeParams,
        search_range: &SearchRangeParams,
        segment: SearchSegment,
    ) -> Result<Self, String> {
        time_range.validate()?;

        let nazo = get_nazo_values(ds.version, ds.region);
        let frame = get_frame(ds.hardware);

        let builder = BaseMessageBuilder::new(
            &nazo,
            ds.mac,
            segment.vcount,
            segment.timer0,
            segment.key_code,
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
            segment,
            start_seconds,
        })
    }

    /// 4件ずつ SHA-1 計算 (SIMD)
    pub(crate) fn next_quad(&mut self) -> ([HashEntry; 4], u8) {
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

        let mut results: [HashEntry; 4] = Default::default();
        for i in 0..usize::from(len) {
            let lcg_seed = hashes[i].to_lcg_seed().value();
            let mt_seed = hashes[i].to_mt_seed().value();
            results[i] = HashEntry {
                year: entries[i].0,
                month: entries[i].1,
                day: entries[i].2,
                hour: entries[i].3,
                minute: entries[i].4,
                second: entries[i].5,
                date_code: entries[i].6,
                time_code: entries[i].7,
                lcg_seed,
                mt_seed,
            };
        }

        (results, len)
    }

    pub(crate) fn is_exhausted(&self) -> bool {
        self.datetime_enumerator.is_exhausted()
    }

    pub(crate) fn processed_seconds(&self) -> u64 {
        self.datetime_enumerator
            .current_seconds()
            .saturating_sub(self.start_seconds)
    }

    #[allow(dead_code)]
    pub(crate) fn segment(&self) -> &SearchSegment {
        &self.segment
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
