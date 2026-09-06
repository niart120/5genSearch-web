//! DS 時計の半開区間と日内直積からなる、検証済み日時探索空間。

use std::{num::NonZeroU32, ops::Range};

use crate::types::{DateRangeParams, Datetime, DatetimeSearchSpaceParams, TimeRangeParams};

pub const SECONDS_PER_DAY: u32 = 86_400;
/// 2100-01-01。終了境界専用であり検索候補には含めない。
pub const END_SECONDS: u32 = 3_155_760_000;

#[allow(clippy::manual_is_multiple_of)]
pub const fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

pub const fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => 0,
    }
}

/// 検証済み年月日の通算日番号。日付の入力検証は探索空間の入口で行う。
pub(crate) fn date_to_days(year: u16, month: u8, day: u8) -> u32 {
    let years = u32::from(year) - 2000;
    years * 365
        + years.div_ceil(4)
        + (1..u32::from(month))
            .map(|m| days_in_month(u32::from(year), m))
            .sum::<u32>()
        + u32::from(day)
        - 1
}

#[allow(clippy::cast_possible_truncation)] // 日は月内、年は DS 時計範囲内。
pub(crate) fn days_to_date(mut days: u32) -> (u16, u8, u8) {
    let mut year = 2000;
    loop {
        let count = if is_leap_year(year) { 366 } else { 365 };
        if days < count {
            break;
        }
        days -= count;
        year += 1;
    }
    let mut month = 1;
    while days >= days_in_month(year, month) {
        days -= days_in_month(year, month);
        month += 1;
    }
    (year as u16, month as u8, (days + 1) as u8)
}

fn validate_date(year: u16, month: u8, day: u8) -> Result<(), String> {
    if !(2000..=2099).contains(&year)
        || day == 0
        || u32::from(day) > days_in_month(u32::from(year), u32::from(month))
    {
        return Err("Invalid date (expected an existing date in 2000-2099)".into());
    }
    Ok(())
}

#[derive(Clone, Debug)]
pub struct DatetimeSearchSpace {
    seconds: Range<u32>,
    starts: [u8; 3],
    counts: [u8; 3],
}

impl TryFrom<DatetimeSearchSpaceParams> for DatetimeSearchSpace {
    type Error = String;

    fn try_from(params: DatetimeSearchSpaceParams) -> Result<Self, String> {
        if params.start_seconds > params.end_seconds || params.end_seconds > END_SECONDS {
            return Err("Invalid datetime interval".into());
        }
        let time = params.time_range;
        let starts = [time.hour_start, time.minute_start, time.second_start];
        let ends = [time.hour_end, time.minute_end, time.second_end];
        for ((start, end), limit) in starts.iter().zip(ends).zip([23, 59, 59]) {
            if *start > end || end > limit {
                return Err("Invalid time range".into());
            }
        }
        Ok(Self {
            seconds: params.start_seconds..params.end_seconds,
            starts,
            counts: std::array::from_fn(|i| ends[i] - starts[i] + 1),
        })
    }
}

impl DatetimeSearchSpace {
    /// # Errors
    /// 実在しない日付、逆転区間、不正な時刻軸を拒否する。
    pub fn from_date_range(date: &DateRangeParams, time: &TimeRangeParams) -> Result<Self, String> {
        validate_date(date.start_year, date.start_month, date.start_day)?;
        validate_date(date.end_year, date.end_month, date.end_day)?;
        let start = date_to_days(date.start_year, date.start_month, date.start_day);
        let end = date_to_days(date.end_year, date.end_month, date.end_day);
        if start > end {
            return Err("Start date must precede end date".into());
        }
        Self::try_from(DatetimeSearchSpaceParams {
            start_seconds: start * SECONDS_PER_DAY,
            end_seconds: (end + 1) * SECONDS_PER_DAY,
            time_range: time.clone(),
        })
    }

    pub fn into_params(self) -> DatetimeSearchSpaceParams {
        let [hour_start, minute_start, second_start] = self.starts;
        DatetimeSearchSpaceParams {
            start_seconds: self.seconds.start,
            end_seconds: self.seconds.end,
            time_range: TimeRangeParams {
                hour_start,
                hour_end: hour_start + self.counts[0] - 1,
                minute_start,
                minute_end: minute_start + self.counts[1] - 1,
                second_start,
                second_end: second_start + self.counts[2] - 1,
            },
        }
    }

    pub fn split(&self, count: NonZeroU32) -> Vec<Self> {
        if self.seconds.is_empty() {
            return vec![self.clone()];
        }
        let length = (self.seconds.end - self.seconds.start).div_ceil(count.get());
        let mut result = Vec::new();
        let mut start = self.seconds.start;
        while start < self.seconds.end {
            let end = start + length.min(self.seconds.end - start);
            result.push(Self {
                seconds: start..end,
                ..self.clone()
            });
            start = end;
        }
        result
    }

    pub fn count(&self) -> u64 {
        let (_, bounds) = self.candidate_bounds();
        u64::from(bounds.end - bounds.start)
    }

    pub fn candidate_bounds(&self) -> (u32, Range<u32>) {
        let anchor = self.seconds.start / SECONDS_PER_DAY;
        let offset = anchor * self.per_day();
        (
            anchor,
            (self.prefix(self.seconds.start) - offset)..(self.prefix(self.seconds.end) - offset),
        )
    }

    pub fn datetime_at(&self, index: u32) -> Option<Datetime> {
        let (anchor, bounds) = self.candidate_bounds();
        if !bounds.contains(&index) {
            return None;
        }
        let (year, month, day) = days_to_date(anchor + index / self.per_day());
        let [hour, minute, second] = self.time_at(index % self.per_day());
        Some(Datetime::new(year, month, day, hour, minute, second))
    }

    pub fn iter(&self) -> DatetimeSearchIter {
        let (anchor, candidates) = self.candidate_bounds();
        DatetimeSearchIter {
            space: self.clone(),
            current: self
                .datetime_at(candidates.start)
                .map(|date| (anchor + candidates.start / self.per_day(), date)),
            candidates,
        }
    }

    /// GPU の直積分解に渡す検証済みの各軸。
    pub fn axes(&self) -> ([u8; 3], [u8; 3]) {
        (self.starts, self.counts)
    }

    fn per_day(&self) -> u32 {
        self.counts.iter().map(|v| u32::from(*v)).product()
    }

    fn prefix(&self, seconds: u32) -> u32 {
        let tail = seconds % SECONDS_PER_DAY;
        let values = [tail / 3600, tail / 60 % 60, tail % 60];
        let mut inside = true;
        let mut count = 0;
        for (i, value) in values.into_iter().enumerate() {
            let start = u32::from(self.starts[i]);
            let size = u32::from(self.counts[i]);
            if inside {
                count += value.saturating_sub(start).min(size)
                    * self.counts[i + 1..]
                        .iter()
                        .map(|v| u32::from(*v))
                        .product::<u32>();
            }
            inside &= (start..start + size).contains(&value);
        }
        seconds / SECONDS_PER_DAY * self.per_day() + count
    }

    #[allow(clippy::cast_possible_truncation)] // 直積分解した各軸は検証済み範囲内。
    fn time_at(&self, index: u32) -> [u8; 3] {
        let seconds = u32::from(self.counts[2]);
        let minutes = u32::from(self.counts[1]);
        [
            self.starts[0] + (index / seconds / minutes) as u8,
            self.starts[1] + (index / seconds % minutes) as u8,
            self.starts[2] + (index % seconds) as u8,
        ]
    }
}

/// 列挙位置と日付キャッシュを所有し、候補以外の秒を走査しない。
pub struct DatetimeSearchIter {
    space: DatetimeSearchSpace,
    candidates: Range<u32>,
    current: Option<(u32, Datetime)>,
}

impl DatetimeSearchIter {
    pub fn is_exhausted(&self) -> bool {
        self.candidates.is_empty()
    }
}

impl Iterator for DatetimeSearchIter {
    type Item = Datetime;
    fn next(&mut self) -> Option<Datetime> {
        self.candidates.next()?;
        let (days, date) = self.current?;
        if self.candidates.is_empty() {
            self.current = None;
        } else {
            let mut next = date;
            let [hour, minute, second] = self.space.starts;
            let [hours, minutes, seconds] = self.space.counts;
            // 密な条件の可変除算を避ける。初期値は共通の候補番号変換から取得する。
            if next.second < second + seconds - 1 {
                next.second += 1;
            } else {
                next.second = second;
                if next.minute < minute + minutes - 1 {
                    next.minute += 1;
                } else {
                    next.minute = minute;
                    if next.hour < hour + hours - 1 {
                        next.hour += 1;
                    } else {
                        next.hour = hour;
                        let (year, month, day) = days_to_date(days + 1);
                        next.year = year;
                        next.month = month;
                        next.day = day;
                        self.current = Some((days + 1, next));
                        return Some(date);
                    }
                }
            }
            self.current = Some((days, next));
        }
        Some(date)
    }
    fn size_hint(&self) -> (usize, Option<usize>) {
        self.candidates.size_hint()
    }
}

impl std::iter::FusedIterator for DatetimeSearchIter {}

impl IntoIterator for &DatetimeSearchSpace {
    type Item = Datetime;
    type IntoIter = DatetimeSearchIter;
    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn time(starts: [u8; 3], ends: [u8; 3]) -> TimeRangeParams {
        TimeRangeParams {
            hour_start: starts[0],
            hour_end: ends[0],
            minute_start: starts[1],
            minute_end: ends[1],
            second_start: starts[2],
            second_end: ends[2],
        }
    }
    fn space(start: u32, end: u32, time_range: TimeRangeParams) -> DatetimeSearchSpace {
        DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
            start_seconds: start,
            end_seconds: end,
            time_range,
        })
        .unwrap()
    }
    fn full() -> TimeRangeParams {
        time([0, 0, 0], [23, 59, 59])
    }

    #[test]
    #[allow(clippy::cast_possible_truncation)] // 参照列挙は最大2日・86400候補。
    fn independent_seconds_reference_matches_prefix_indices_and_splits() {
        for time in [
            full(),
            time([10, 30, 0], [11, 30, 0]),
            time([2, 3, 5], [5, 7, 9]),
            time([0, 0, 0], [23, 59, 0]),
            time([23, 59, 59], [23, 59, 59]),
            time([12, 0, 0], [12, 0, 0]),
        ] {
            let all = space(0, 86400, time.clone());
            let mut expected = Vec::new();
            for seconds in 0..86400 {
                assert_eq!(all.prefix(seconds), expected.len() as u32);
                let h = (seconds / 3600) as u8;
                let m = (seconds / 60 % 60) as u8;
                let s = (seconds % 60) as u8;
                if (time.hour_start..=time.hour_end).contains(&h)
                    && (time.minute_start..=time.minute_end).contains(&m)
                    && (time.second_start..=time.second_end).contains(&s)
                {
                    expected.push(Datetime::new(2000, 1, 1, h, m, s));
                }
            }
            assert_eq!(all.iter().collect::<Vec<_>>(), expected);
            assert_eq!(all.count(), expected.len() as u64);
            for (start, end) in [
                (0, 0),
                (0, 1),
                (39599, 39600),
                (39600, 43200),
                (86397, 86404),
                (100, 86400),
            ] {
                let partial = space(start, end, time.clone());
                let reference: Vec<_> = (start..end)
                    .filter_map(|s| {
                        let day = s / 86400;
                        let h = (s / 3600 % 24) as u8;
                        let m = (s / 60 % 60) as u8;
                        let sec = (s % 60) as u8;
                        ((time.hour_start..=time.hour_end).contains(&h)
                            && (time.minute_start..=time.minute_end).contains(&m)
                            && (time.second_start..=time.second_end).contains(&sec))
                        .then(|| Datetime::new(2000, 1, (day + 1) as u8, h, m, sec))
                    })
                    .collect();
                assert_eq!(partial.iter().collect::<Vec<_>>(), reference);
                let (_, bounds) = partial.candidate_bounds();
                assert_eq!(
                    bounds
                        .clone()
                        .map(|i| partial.datetime_at(i).unwrap())
                        .collect::<Vec<_>>(),
                    reference
                );
                assert!(partial.datetime_at(bounds.end).is_none());
                if bounds.start > 0 {
                    assert!(partial.datetime_at(bounds.start - 1).is_none());
                }
                for n in [1, 2, 3, 17] {
                    let parts = partial.split(NonZeroU32::new(n).unwrap());
                    assert_eq!(
                        parts
                            .iter()
                            .flat_map(DatetimeSearchSpace::iter)
                            .collect::<Vec<_>>(),
                        reference
                    );
                    assert_eq!(
                        parts.iter().map(DatetimeSearchSpace::count).sum::<u64>(),
                        partial.count()
                    );
                }
            }
        }
    }

    #[test]
    fn partial_day_uses_candidate_one_and_excludes_end() {
        let space = space(11 * 3600, 12 * 3600, time([10, 30, 0], [11, 30, 0]));
        assert_eq!(space.candidate_bounds(), (0, 1..2));
        assert_eq!(
            space.iter().collect::<Vec<_>>(),
            vec![Datetime::new(2000, 1, 1, 11, 30, 0)]
        );
    }

    #[test]
    fn calendar_boundaries_and_upper_empty_interval() {
        for (date, next) in [
            ((2000, 2, 28), (2000, 2, 29)),
            ((2000, 2, 29), (2000, 3, 1)),
            ((2001, 2, 28), (2001, 3, 1)),
            ((2023, 12, 31), (2024, 1, 1)),
        ] {
            let start = date_to_days(date.0, date.1, date.2) * 86400 + 86399;
            assert_eq!(
                space(start, start + 2, full()).iter().collect::<Vec<_>>(),
                vec![
                    Datetime::new(date.0, date.1, date.2, 23, 59, 59),
                    Datetime::new(next.0, next.1, next.2, 0, 0, 0)
                ]
            );
        }
        assert_eq!(
            space(END_SECONDS - 1, END_SECONDS, full())
                .iter()
                .collect::<Vec<_>>(),
            vec![Datetime::new(2099, 12, 31, 23, 59, 59)]
        );
        let empty = space(END_SECONDS, END_SECONDS, full());
        assert_eq!(empty.count(), 0);
        assert!(empty.iter().next().is_none());
        assert!(empty.datetime_at(0).is_none());
        assert_eq!(empty.split(NonZeroU32::MAX).len(), 1);
        assert_eq!(space(0, 2, full()).split(NonZeroU32::MAX).len(), 2);
        assert_eq!(
            space(0, END_SECONDS, full()).count(),
            u64::from(END_SECONDS)
        );
    }

    #[test]
    fn input_validation_and_transfer_roundtrip() {
        for (year, month, day) in [
            (1999, 1, 1),
            (2100, 1, 1),
            (2001, 2, 29),
            (2000, 0, 1),
            (2000, 13, 1),
            (2000, 1, 0),
            (2000, 4, 31),
        ] {
            let date = DateRangeParams {
                start_year: year,
                start_month: month,
                start_day: day,
                end_year: year,
                end_month: month,
                end_day: day,
            };
            assert!(DatetimeSearchSpace::from_date_range(&date, &full()).is_err());
        }
        for (start, end) in [(1, 0), (0, END_SECONDS + 1)] {
            assert!(
                DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
                    start_seconds: start,
                    end_seconds: end,
                    time_range: full()
                })
                .is_err()
            );
        }
        for time in [
            time([12, 0, 0], [11, 0, 0]),
            time([0, 2, 0], [0, 1, 0]),
            time([0, 0, 2], [0, 0, 1]),
            time([0, 0, 0], [24, 0, 0]),
            time([0, 0, 0], [0, 60, 0]),
            time([0, 0, 0], [0, 0, 60]),
        ] {
            assert!(
                DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
                    start_seconds: 0,
                    end_seconds: 0,
                    time_range: time
                })
                .is_err()
            );
        }
        let date = DateRangeParams {
            start_year: 2099,
            start_month: 12,
            start_day: 31,
            end_year: 2099,
            end_month: 12,
            end_day: 31,
        };
        let original = DatetimeSearchSpace::from_date_range(&date, &full()).unwrap();
        assert_eq!(original.count(), 86400);
        let restored = DatetimeSearchSpace::try_from(original.clone().into_params()).unwrap();
        assert_eq!(
            original.iter().collect::<Vec<_>>(),
            restored.iter().collect::<Vec<_>>()
        );
        let backwards = DateRangeParams {
            start_day: 31,
            end_day: 30,
            ..date
        };
        assert!(DatetimeSearchSpace::from_date_range(&backwards, &full()).is_err());
    }
}
