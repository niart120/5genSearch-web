//! 起動時刻検索用型定義

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// 1日内の時刻範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TimeRangeParams {
    pub hour_start: u8,
    pub hour_end: u8,
    pub minute_start: u8,
    pub minute_end: u8,
    pub second_start: u8,
    pub second_end: u8,
}

impl TimeRangeParams {
    /// バリデーション
    ///
    /// # Errors
    ///
    /// 時間・分・秒の範囲が不正な場合
    pub fn validate(&self) -> Result<(), String> {
        if self.hour_end > 23 || self.hour_start > self.hour_end {
            return Err("Invalid hour range".into());
        }
        if self.minute_end > 59 || self.minute_start > self.minute_end {
            return Err("Invalid minute range".into());
        }
        if self.second_end > 59 || self.second_start > self.second_end {
            return Err("Invalid second range".into());
        }
        Ok(())
    }
}

/// 検索範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchRangeParams {
    pub start_year: u16,
    pub start_month: u8,
    pub start_day: u8,
    /// 開始日内のオフセット秒 (0-86399)
    pub start_second_offset: u32,
    /// 検索範囲秒数
    pub range_seconds: u32,
}

/// ハッシュエントリ (日時 + ハッシュ結果) - 内部実装用
#[derive(Clone, Default, Debug)]
#[allow(dead_code)]
pub(crate) struct HashEntry {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub date_code: u32,
    pub time_code: u32,
    pub lcg_seed: u64,
    pub mt_seed: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_range_validate_valid() {
        let range = TimeRangeParams {
            hour_start: 10,
            hour_end: 12,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        assert!(range.validate().is_ok());
    }

    #[test]
    fn test_time_range_validate_invalid_hour() {
        let range = TimeRangeParams {
            hour_start: 12,
            hour_end: 10,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        assert!(range.validate().is_err());
    }

    #[test]
    fn test_time_range_validate_hour_over_23() {
        let range = TimeRangeParams {
            hour_start: 0,
            hour_end: 24,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        assert!(range.validate().is_err());
    }
}
