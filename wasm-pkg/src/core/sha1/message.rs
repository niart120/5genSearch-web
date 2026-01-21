//! SHA-1 メッセージビルダー

use crate::core::bcd::to_bcd;
use crate::types::Hardware;

use super::nazo::NazoValues;

/// GX_STAT 固定値
const GX_STAT: u32 = 0x0600_0000;

/// 日時パラメータ
#[derive(Clone, Copy, Debug)]
pub struct DateTime {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}

impl DateTime {
    pub const fn new(year: u16, month: u8, day: u8, hour: u8, minute: u8, second: u8) -> Self {
        Self {
            year,
            month,
            day,
            hour,
            minute,
            second,
        }
    }
}

/// 日付コードを生成
///
/// フォーマット: 0xYYMMDDWW
/// - YY: 年 (2000年からのオフセット、BCD)
/// - MM: 月 (BCD)
/// - DD: 日 (BCD)
/// - WW: 曜日 (0=日曜)
pub fn build_date_code(year: u16, month: u8, day: u8) -> u32 {
    let weekday = calc_weekday(year, month, day);

    ((to_bcd((year - 2000) as u8) as u32) << 24)
        | ((to_bcd(month) as u32) << 16)
        | ((to_bcd(day) as u32) << 8)
        | (weekday as u32)
}

/// 時刻コードを生成
///
/// フォーマット: 0xHHMMSSFF
/// - HH: 時 (BCD、12時以降は +0x40 の PM フラグ)
/// - MM: 分 (BCD)
/// - SS: 秒 (BCD)
/// - FF: frame 値
pub fn build_time_code(hour: u8, minute: u8, second: u8, frame: u8) -> u32 {
    let hour_bcd = if hour >= 12 {
        to_bcd(hour) | 0x40 // PM フラグ
    } else {
        to_bcd(hour)
    };

    ((hour_bcd as u32) << 24)
        | ((to_bcd(minute) as u32) << 16)
        | ((to_bcd(second) as u32) << 8)
        | (frame as u32)
}

/// 曜日計算 (Zeller の公式)
fn calc_weekday(year: u16, month: u8, day: u8) -> u8 {
    let mut y = year as i32;
    let mut m = month as i32;

    if m < 3 {
        m += 12;
        y -= 1;
    }

    let q = day as i32;
    let k = y % 100;
    let j = y / 100;

    let h = (q + (13 * (m + 1)) / 5 + k + k / 4 + j / 4 - 2 * j) % 7;
    let weekday = ((h + 6) % 7) as u8; // 0=日曜 に調整

    weekday
}

/// Hardware から frame 値を取得
pub const fn get_frame(hardware: Hardware) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite => 6,
        Hardware::Dsi => 6,
        Hardware::Dsi3ds => 9,
    }
}

/// MAC アドレスから message[6], message[7] を構築
fn build_mac_words(mac: [u8; 6], frame: u8) -> (u32, u32) {
    // MAC 下位 4 バイト (リトルエンディアン)
    let mac_lower = u32::from_le_bytes([mac[0], mac[1], mac[2], mac[3]]);

    // MAC 上位 2 バイト
    let mac_upper = ((mac[5] as u32) << 8) | (mac[4] as u32);

    let word7 = mac_upper ^ GX_STAT ^ (frame as u32);

    (mac_lower, word7)
}

/// SHA-1 メッセージビルダー
pub struct BaseMessageBuilder {
    buffer: [u32; 16],
}

impl BaseMessageBuilder {
    /// 新しいビルダーを作成
    pub fn new(
        nazo: &NazoValues,
        mac: [u8; 6],
        vcount: u8,
        timer0: u16,
        key_code: u32,
        frame: u8,
    ) -> Self {
        let mut buffer = [0u32; 16];

        // Nazo 値
        buffer[0..5].copy_from_slice(&nazo.values);

        // VCount | Timer0
        buffer[5] = ((vcount as u32) << 16) | (timer0 as u32);

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

        // KeyCode
        buffer[12] = key_code;

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
    fn test_time_code_pm() {
        // 15:30:45, frame=6
        let code = build_time_code(15, 30, 45, 6);
        assert_eq!(code, 0x5530_4506);
    }

    #[test]
    fn test_time_code_am() {
        // 09:15:30, frame=8
        let code = build_time_code(9, 15, 30, 8);
        assert_eq!(code, 0x0915_3008);
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
