//! SHA-1 メッセージビルダー

use crate::core::bcd::to_bcd;
use crate::types::{Hardware, KeyCode};

use super::nazo::NazoValues;

/// `GX_STAT` 固定値
const GX_STAT: u32 = 0x0600_0000;

/// 32bit 値のバイトスワップ (エンディアン変換)
#[inline]
const fn swap_bytes_32(value: u32) -> u32 {
    value.swap_bytes()
}

/// 日付コードを生成
///
/// フォーマット: 0xYYMMDDWW
/// - YY: 年 (2000年からのオフセット、BCD)
/// - MM: 月 (BCD)
/// - DD: 日 (BCD)
/// - WW: 曜日 (0=日曜)
#[allow(clippy::cast_possible_truncation)]
pub fn build_date_code(year: u16, month: u8, day: u8) -> u32 {
    let weekday = calc_weekday(year, month, day);

    (u32::from(to_bcd((year - 2000) as u8)) << 24)
        | (u32::from(to_bcd(month)) << 16)
        | (u32::from(to_bcd(day)) << 8)
        | u32::from(weekday)
}

/// 時刻コードを生成
///
/// フォーマット: 0xPHMMSS00
/// - P: PM フラグ (DS/DS Lite のみ、12時以降は bit30 = 1)
/// - H: 時 (BCD)
/// - MM: 分 (BCD)
/// - SS: 秒 (BCD)
/// - 00: 固定値 0x00 (frame は message[7] で使用)
///
/// # Arguments
/// * `hour` - 時 (0-23)
/// * `minute` - 分 (0-59)
/// * `second` - 秒 (0-59)
/// * `is_ds_or_lite` - DS または DS Lite の場合 true (PM フラグを適用)
pub fn build_time_code(hour: u8, minute: u8, second: u8, is_ds_or_lite: bool) -> u32 {
    let hour_bcd = to_bcd(hour);
    let pm_flag: u32 = u32::from(is_ds_or_lite && hour >= 12);

    (pm_flag << 30)
        | (u32::from(hour_bcd) << 24)
        | (u32::from(to_bcd(minute)) << 16)
        | (u32::from(to_bcd(second)) << 8)
}

/// 曜日計算 (Zeller の公式)
#[allow(clippy::many_single_char_names, clippy::cast_sign_loss)]
fn calc_weekday(year: u16, month: u8, day: u8) -> u8 {
    let mut year_adj = i32::from(year);
    let mut month_adj = i32::from(month);

    if month_adj < 3 {
        month_adj += 12;
        year_adj -= 1;
    }

    let day_i32 = i32::from(day);
    let century_remainder = year_adj % 100;
    let century = year_adj / 100;

    let h = (day_i32
        + (13 * (month_adj + 1)) / 5
        + century_remainder
        + century_remainder / 4
        + century / 4
        - 2 * century)
        % 7;

    // 0=日曜 に調整
    ((h + 6) % 7) as u8
}

/// Hardware から frame 値を取得
pub const fn get_frame(hardware: Hardware) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite | Hardware::Dsi => 6,
        Hardware::Dsi3ds => 9,
    }
}

/// MAC アドレスから message[6], message[7] を構築
///
/// - message[6]: MAC 下位 16bit (エンディアン変換なし)
/// - message[7]: MAC 上位 32bit XOR `GX_STAT` XOR frame (エンディアン変換あり)
fn build_mac_words(mac: [u8; 6], frame: u8) -> (u32, u32) {
    // message[6]: MAC 下位 16bit (mac[4], mac[5]) - エンディアン変換なし
    let mac_lower = (u32::from(mac[4]) << 8) | u32::from(mac[5]);

    // message[7]: MAC 上位 32bit (mac[0-3] as little-endian) XOR GX_STAT XOR frame
    let mac_upper = u32::from(mac[0])
        | (u32::from(mac[1]) << 8)
        | (u32::from(mac[2]) << 16)
        | (u32::from(mac[3]) << 24);

    // エンディアン変換を適用
    let word7 = swap_bytes_32(mac_upper ^ GX_STAT ^ u32::from(frame));

    (mac_lower, word7)
}

/// SHA-1 メッセージビルダー
pub struct BaseMessageBuilder {
    buffer: [u32; 16],
}

impl BaseMessageBuilder {
    /// 新しいビルダーを作成
    ///
    /// エンディアン変換は内部で自動適用される。
    pub fn new(
        nazo: &NazoValues,
        mac: [u8; 6],
        vcount: u8,
        timer0: u16,
        key_code: KeyCode,
        frame: u8,
    ) -> Self {
        let mut buffer = [0u32; 16];

        // Nazo 値 (エンディアン変換)
        for (i, &nazo_val) in nazo.values.iter().enumerate() {
            buffer[i] = swap_bytes_32(nazo_val);
        }

        // VCount | Timer0 (エンディアン変換)
        buffer[5] = swap_bytes_32((u32::from(vcount) << 16) | u32::from(timer0));

        // MAC アドレス
        let (mac_lower, mac_word7) = build_mac_words(mac, frame);
        buffer[6] = mac_lower;
        buffer[7] = mac_word7;

        // 日時 (後で設定)
        buffer[8] = 0;
        buffer[9] = 0;

        // 未使用
        buffer[10] = 0;
        buffer[11] = 0;

        // KeyCode (エンディアン変換)
        buffer[12] = swap_bytes_32(key_code.value());

        // SHA-1 パディング
        buffer[13] = 0x8000_0000;
        buffer[14] = 0;
        buffer[15] = 0x0000_01A0;

        Self { buffer }
    }

    /// 日時コードを設定
    pub fn set_datetime(&mut self, date_code: u32, time_code: u32) {
        self.buffer[8] = date_code;
        self.buffer[9] = time_code;
    }

    /// メッセージを取得
    pub const fn message(&self) -> &[u32; 16] {
        &self.buffer
    }

    /// メッセージをコピーして取得
    pub const fn to_message(&self) -> [u32; 16] {
        self.buffer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date_code() {
        // 2023年12月25日(月)
        let code = build_date_code(2023, 12, 25);
        assert_eq!(code, 0x2312_2501);
    }

    #[test]
    fn test_time_code_pm_ds() {
        // 15:30:45, DS/DS Lite (PM flag enabled)
        // PM flag at bit30 = 0x40000000
        // hour_bcd = 0x15, min_bcd = 0x30, sec_bcd = 0x45
        // Result: (1 << 30) | (0x15 << 24) | (0x30 << 16) | (0x45 << 8) = 0x5530_4500
        let code = build_time_code(15, 30, 45, true);
        assert_eq!(code, 0x5530_4500);
    }

    #[test]
    fn test_time_code_am_ds() {
        // 09:15:30, DS/DS Lite (AM, no PM flag)
        // Result: (0 << 30) | (0x09 << 24) | (0x15 << 16) | (0x30 << 8) = 0x0915_3000
        let code = build_time_code(9, 15, 30, true);
        assert_eq!(code, 0x0915_3000);
    }

    #[test]
    fn test_time_code_pm_dsi() {
        // 15:30:45, DSi (PM flag disabled, no PM flag even for afternoon)
        // Result: (0 << 30) | (0x15 << 24) | (0x30 << 16) | (0x45 << 8) = 0x1530_4500
        let code = build_time_code(15, 30, 45, false);
        assert_eq!(code, 0x1530_4500);
    }

    #[test]
    fn test_weekday_known_dates() {
        // 2023年1月1日 = 日曜日 (0)
        assert_eq!(calc_weekday(2023, 1, 1), 0);
        // 2023年12月25日 = 月曜日 (1)
        assert_eq!(calc_weekday(2023, 12, 25), 1);
        // 2024年2月29日 = 木曜日 (4) - 閏年
        assert_eq!(calc_weekday(2024, 2, 29), 4);
    }

    #[test]
    fn test_get_frame() {
        assert_eq!(get_frame(Hardware::Ds), 8);
        assert_eq!(get_frame(Hardware::DsLite), 6);
        assert_eq!(get_frame(Hardware::Dsi), 6);
        assert_eq!(get_frame(Hardware::Dsi3ds), 9);
    }
}
