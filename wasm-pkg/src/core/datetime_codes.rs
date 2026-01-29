//! 日時コード事前計算テーブル
//!
//! `date_code` / `time_code` のコンパイル時計算で BCD 変換のオーバーヘッドを排除する。

// =============================================================================
// time_code テーブル (86,400 エントリ = 24×60×60 秒)
// =============================================================================

/// 全 86,400 秒分の `time_code` を事前計算 (24時間制ベース、PM フラグなし)
#[allow(clippy::large_stack_arrays)]
const fn generate_all_time_codes() -> [u32; 86400] {
    let mut codes = [0u32; 86400];
    let mut index = 0;

    let mut hour = 0u32;
    while hour < 24 {
        let h_tens = hour / 10;
        let h_ones = hour % 10;
        let h_code = (h_tens << 28) | (h_ones << 24);

        let mut minute = 0u32;
        while minute < 60 {
            let min_code = ((minute / 10) << 20) | ((minute % 10) << 16);

            let mut second = 0u32;
            while second < 60 {
                let sec_code = ((second / 10) << 12) | ((second % 10) << 8);
                codes[index] = h_code | min_code | sec_code;
                index += 1;
                second += 1;
            }
            minute += 1;
        }
        hour += 1;
    }
    codes
}

/// コンパイル時計算済み `time_code` テーブル
#[allow(clippy::large_const_arrays)]
pub static TIME_CODES: [u32; 86400] = generate_all_time_codes();

/// `time_code` を取得 (O(1))
#[inline]
pub fn get_time_code(seconds_of_day: u32) -> u32 {
    let idx = seconds_of_day as usize;
    if idx < TIME_CODES.len() {
        TIME_CODES[idx]
    } else {
        0
    }
}

/// ハードウェア別 `time_code` を取得
///
/// DS/DS Lite は午後 (12時以降) に PM フラグ (`0x4000_0000`) を付加
#[inline]
pub fn get_time_code_for_hardware(seconds_of_day: u32, is_ds_or_lite: bool) -> u32 {
    let base = get_time_code(seconds_of_day);
    if is_ds_or_lite && seconds_of_day >= 12 * 3600 {
        base | 0x4000_0000
    } else {
        base
    }
}

// =============================================================================
// date_code テーブル (36,525 エントリ = 100年分)
// =============================================================================

/// うるう年判定
#[allow(clippy::manual_is_multiple_of)]
pub const fn is_leap_year(year: u32) -> bool {
    // const fn では is_multiple_of() が使えないため % を使用
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

/// 月の日数
pub const fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// 曜日計算 (Zeller の公式)
///
/// # Returns
/// 0: 日曜, 1: 月曜, ..., 6: 土曜
#[allow(
    clippy::many_single_char_names,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
pub const fn get_day_of_week(year: u32, month: u32, day: u32) -> u32 {
    // Zeller の公式では符号付き整数が必要
    let mut year_adj = year as i32;
    let mut month_adj = month as i32;
    let day_val = day as i32;

    if month_adj < 3 {
        month_adj += 12;
        year_adj -= 1;
    }

    let century_mod = year_adj % 100;
    let century_div = year_adj / 100;
    let zeller_result = (day_val
        + (13 * (month_adj + 1)) / 5
        + century_mod
        + century_mod / 4
        + century_div / 4
        + 5 * century_div)
        % 7;

    // Zeller: 0=土, 1=日, 2=月 → 変換: 0=日, 1=月, ...
    ((zeller_result + 6) % 7) as u32
}

/// 全 100 年分 (36,525 日) の `date_code` を事前計算
#[allow(clippy::large_stack_arrays)]
const fn generate_all_date_codes() -> [u32; 36525] {
    let mut codes = [0u32; 36525];
    let mut index = 0;

    let mut year = 2000u32;
    while year < 2100 {
        let mut month = 1u32;
        while month <= 12 {
            let days = days_in_month(year, month);
            let mut day = 1u32;
            while day <= days {
                let dow = get_day_of_week(year, month, day);

                let year_val = year % 100;
                let yy_bcd = ((year_val / 10) << 4) | (year_val % 10);
                let mm_bcd = ((month / 10) << 4) | (month % 10);
                let dd_bcd = ((day / 10) << 4) | (day % 10);
                let ww_bcd = ((dow / 10) << 4) | (dow % 10);

                codes[index] = (yy_bcd << 24) | (mm_bcd << 16) | (dd_bcd << 8) | ww_bcd;

                index += 1;
                day += 1;
            }
            month += 1;
        }
        year += 1;
    }
    codes
}

/// コンパイル時計算済み `date_code` テーブル
#[allow(clippy::large_const_arrays)]
pub static DATE_CODES: [u32; 36525] = generate_all_date_codes();

/// `date_code` を取得 (O(1))
#[inline]
pub fn get_date_code(days_since_2000: u32) -> u32 {
    let idx = days_since_2000 as usize;
    if idx < DATE_CODES.len() {
        DATE_CODES[idx]
    } else {
        0
    }
}

// =============================================================================
// テスト
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// 2000/1/1 からの日数を計算
    fn calc_days_since_2000(year: u32, month: u32, day: u32) -> u32 {
        let mut total = 0u32;
        let mut y_iter = 2000;
        while y_iter < year {
            total += if is_leap_year(y_iter) { 366 } else { 365 };
            y_iter += 1;
        }
        let mut m_iter = 1;
        while m_iter < month {
            total += days_in_month(year, m_iter);
            m_iter += 1;
        }
        total + day - 1
    }

    // -------------------------------------------------------------------------
    // time_code テスト
    // -------------------------------------------------------------------------

    #[test]
    fn test_time_code_boundary() {
        // 元実装: test_time_code_generation, test_time_code_boundary_values
        assert_eq!(get_time_code(0), 0x0000_0000); // 00:00:00
        assert_eq!(get_time_code(12 * 3600 + 30 * 60 + 45), 0x1230_4500); // 12:30:45
        assert_eq!(get_time_code(23 * 3600 + 59 * 60 + 59), 0x2359_5900); // 23:59:59
        assert_eq!(get_time_code(11 * 3600 + 59 * 60 + 59), 0x1159_5900); // 11:59:59
        assert_eq!(get_time_code(12 * 3600), 0x1200_0000); // 12:00:00
    }

    #[test]
    #[allow(clippy::similar_names)]
    fn test_time_code_hardware_variants() {
        // 元実装: test_time_code_hardware_variants
        let noon = 12 * 3600 + 30 * 60 + 45;
        let base = get_time_code(noon);

        // 3DS: PM フラグなし
        let code_for_3ds = get_time_code_for_hardware(noon, false);
        assert_eq!(code_for_3ds, base);

        // DS/DS Lite: PM フラグあり
        let code_for_ds = get_time_code_for_hardware(noon, true);
        assert_eq!(code_for_ds, base | 0x4000_0000);

        // 午前は DS でも PM フラグなし
        let morning = 10 * 3600 + 15 * 60 + 30;
        let morning_base = get_time_code(morning);
        let morning_ds = get_time_code_for_hardware(morning, true);
        assert_eq!(morning_ds, morning_base);
    }

    // -------------------------------------------------------------------------
    // date_code テスト
    // -------------------------------------------------------------------------

    #[test]
    fn test_date_code_2000_01_01() {
        // 元実装: test_date_code_generation
        // 2000/1/1 土曜日 → 0x00010106
        let code = get_date_code(0);
        assert_eq!(code, 0x0001_0106);
    }

    #[test]
    fn test_date_code_2024_12_31() {
        // 元実装: test_date_code_generation
        // 2024/12/31 火曜日 → 0x24123102
        let days = calc_days_since_2000(2024, 12, 31);
        let code = get_date_code(days);
        assert_eq!(code, 0x2412_3102);
    }

    #[test]
    fn test_date_code_2023_12_31() {
        // 元実装: test_date_code_generation
        // 2023/12/31 日曜日 → 0x23123100
        let days = calc_days_since_2000(2023, 12, 31);
        let code = get_date_code(days);
        assert_eq!(code, 0x2312_3100);
    }

    #[test]
    fn test_day_of_week() {
        // 元実装: test_day_of_week_calculation
        assert_eq!(get_day_of_week(2000, 1, 1), 6); // 土曜日
        assert_eq!(get_day_of_week(2023, 12, 31), 0); // 日曜日
        assert_eq!(get_day_of_week(2024, 12, 31), 2); // 火曜日
        assert_eq!(get_day_of_week(2024, 1, 1), 1); // 月曜日
    }

    #[test]
    fn test_leap_year() {
        // 元実装: test_leap_year
        assert!(is_leap_year(2000));
        assert!(!is_leap_year(1900));
        assert!(is_leap_year(2004));
        assert!(!is_leap_year(2001));
    }

    #[test]
    fn test_days_in_month_values() {
        // 元実装: test_days_in_month
        assert_eq!(days_in_month(2001, 1), 31);
        assert_eq!(days_in_month(2001, 2), 28);
        assert_eq!(days_in_month(2000, 2), 29);
        assert_eq!(days_in_month(2004, 2), 29);
        assert_eq!(days_in_month(1900, 2), 28);
        assert_eq!(days_in_month(2001, 4), 30);
    }

    #[test]
    fn test_date_code_boundary() {
        // 元実装: test_date_code_boundary_values
        // うるう年 2/29
        let days_feb29_2004 = calc_days_since_2000(2004, 2, 29);
        assert_ne!(get_date_code(days_feb29_2004), 0);

        // 非うるう年 2/28
        let days_feb28_2001 = calc_days_since_2000(2001, 2, 28);
        assert_ne!(get_date_code(days_feb28_2001), 0);

        // 年末年始
        let days_dec31_2020 = calc_days_since_2000(2020, 12, 31);
        let days_jan01_2021 = calc_days_since_2000(2021, 1, 1);
        assert_ne!(get_date_code(days_dec31_2020), 0);
        assert_ne!(get_date_code(days_jan01_2021), 0);
    }
}
