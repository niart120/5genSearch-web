//! PID 生成・色違い判定アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::ShinyType;

/// 色違い判定
///
/// - `xor == 0`: Square (ひし形)
/// - `1 <= xor < 8`: Star (星型)
/// - `8 <= xor`: None (通常)
#[inline]
pub fn calculate_shiny_type(pid: u32, tid: u16, sid: u16) -> ShinyType {
    let pid_high = (pid >> 16) as u16;
    let pid_low = (pid & 0xFFFF) as u16;
    let xor = pid_high ^ pid_low ^ tid ^ sid;

    if xor == 0 {
        ShinyType::Square
    } else if xor < 8 {
        ShinyType::Star
    } else {
        ShinyType::None
    }
}

/// 基本 PID 生成 (XOR 0x10000)
/// BW/BW2 統一仕様: 固定・野生共通
#[inline]
pub fn generate_base_pid(r: u32) -> u32 {
    r ^ 0x10000
}

/// ID 補正処理
/// 性格値下位 ^ トレーナーID ^ 裏ID の奇偶性で最上位ビットを調整
#[inline]
pub fn apply_id_correction(pid: u32, tid: u16, sid: u16) -> u32 {
    let pid_low = (pid & 0xFFFF) as u16;
    let xor_value = pid_low ^ tid ^ sid;

    if xor_value & 1 == 1 {
        pid | 0x8000_0000 // 最上位ビットを 1 に
    } else {
        pid & 0x7FFF_FFFF // 最上位ビットを 0 に
    }
}

/// 野生/固定/徘徊 PID 生成 (ID補正あり)
#[inline]
pub fn generate_wild_pid(r: u32, tid: u16, sid: u16) -> u32 {
    apply_id_correction(generate_base_pid(r), tid, sid)
}

/// イベント/御三家 PID 生成 (ID補正なし)
#[inline]
pub fn generate_event_pid(r: u32) -> u32 {
    generate_base_pid(r)
}

/// 孵化/ギフト PID 生成 (2乱数合成)
#[inline]
pub fn generate_egg_pid(r1: u32, r2: u32) -> u32 {
    ((r1 & 0xFFFF_0000) >> 16) | (r2 & 0xFFFF_0000)
}

/// 色違いロック適用
/// PID を変更して色違いにならないようにする
pub fn apply_shiny_lock(pid: u32, tid: u16, sid: u16) -> u32 {
    if calculate_shiny_type(pid, tid, sid) == ShinyType::None {
        pid
    } else {
        pid ^ 0x1000_0000 // 上位ビットを反転
    }
}

/// ひかるおまもり付き野生 PID 生成
/// 最大 `reroll_count` 回リロール
pub fn generate_wild_pid_with_reroll(
    lcg: &mut Lcg64,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..reroll_count {
        let r = lcg.next().unwrap_or(0);
        let pid = generate_wild_pid(r, tid, sid);
        let shiny = calculate_shiny_type(pid, tid, sid);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let r = lcg.next().unwrap_or(0);
    let pid = generate_wild_pid(r, tid, sid);
    let shiny = calculate_shiny_type(pid, tid, sid);
    (pid, shiny)
}

/// 孵化 PID 生成 (リロール付き)
pub fn generate_egg_pid_with_reroll(
    lcg: &mut Lcg64,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..reroll_count {
        let r1 = lcg.next().unwrap_or(0);
        let r2 = lcg.next().unwrap_or(0);
        let pid = generate_egg_pid(r1, r2);
        let shiny = calculate_shiny_type(pid, tid, sid);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let r1 = lcg.next().unwrap_or(0);
    let r2 = lcg.next().unwrap_or(0);
    let pid = generate_egg_pid(r1, r2);
    let shiny = calculate_shiny_type(pid, tid, sid);
    (pid, shiny)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shiny_type_square() {
        // xor = 0 の場合 → Square
        // pid_high ^ pid_low ^ tid ^ sid = 0
        // 0xABCD ^ 0xABCD ^ 0x0000 ^ 0x0000 = 0
        let pid = 0xABCD_ABCD_u32;
        let tid = 0x0000u16;
        let sid = 0x0000u16;
        assert_eq!(calculate_shiny_type(pid, tid, sid), ShinyType::Square);
    }

    #[test]
    fn test_shiny_type_star() {
        // xor = 1 の場合 → Star
        // pid_high ^ pid_low ^ tid ^ sid = 1
        // 0xABCD ^ 0xABCC ^ 0x0000 ^ 0x0000 = 1
        let pid = 0xABCD_ABCC_u32;
        let tid = 0x0000u16;
        let sid = 0x0000u16;
        assert_eq!(calculate_shiny_type(pid, tid, sid), ShinyType::Star);
    }

    #[test]
    fn test_shiny_type_none() {
        // xor >= 8 の場合 → None
        let pid = 0x1234_5678_u32;
        let tid = 0x0000u16;
        let sid = 0x0000u16;
        assert_eq!(calculate_shiny_type(pid, tid, sid), ShinyType::None);
    }

    #[test]
    fn test_generate_base_pid() {
        // r ^ 0x10000
        assert_eq!(generate_base_pid(0x1234_5678), 0x1234_5678 ^ 0x10000);
        assert_eq!(generate_base_pid(0x0000_0000), 0x0001_0000);
        assert_eq!(generate_base_pid(0xFFFF_FFFF), 0xFFFE_FFFF);
    }

    #[test]
    fn test_apply_id_correction() {
        // pid_low ^ tid ^ sid が奇数なら最上位ビット 1、偶数なら 0
        // 0x5678 ^ 12345 ^ 54321 = 0x5678 ^ 0x3039 ^ 0xD431
        // = 0x5678 ^ 0xE408 = 0xB270 (偶数) → 最上位ビット 0
        let pid = 0x1234_5678_u32;
        let tid = 12345_u16;
        let sid = 54321_u16;
        let corrected = apply_id_correction(pid, tid, sid);

        let pid_low = (pid & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;
        if (xor_result & 1) == 1 {
            assert_eq!(corrected, pid | 0x8000_0000);
        } else {
            assert_eq!(corrected, pid & 0x7FFF_FFFF);
        }
    }

    #[test]
    fn test_generate_wild_pid() {
        // 元実装テストパターン: r1 = 0x12345678, tid = 12345, sid = 54321
        let r = 0x1234_5678_u32;
        let tid = 12345_u16;
        let sid = 54321_u16;
        let pid = generate_wild_pid(r, tid, sid);

        // 基本PID生成 (r ^ 0x10000)
        let expected_base = r ^ 0x10000;

        // ID補正の確認
        let pid_low = (expected_base & 0xFFFF) as u16;
        let xor_result = pid_low ^ tid ^ sid;

        if (xor_result & 1) == 1 {
            assert_eq!(pid, expected_base | 0x8000_0000);
        } else {
            assert_eq!(pid, expected_base & 0x7FFF_FFFF);
        }
    }

    #[test]
    fn test_generate_event_pid() {
        // イベント PID = r ^ 0x10000 (ID補正なし)
        let r = 0x1234_5678_u32;
        let expected = r ^ 0x10000;
        assert_eq!(generate_event_pid(r), expected);
    }

    #[test]
    fn test_generate_egg_pid() {
        // 元実装テストパターン: r1 = 0x12345678, r2 = 0x9ABCDEF0
        let r1 = 0x1234_5678_u32;
        let r2 = 0x9ABC_DEF0_u32;
        let pid = generate_egg_pid(r1, r2);

        // high = r1 >> 16 = 0x1234 (→ low 16bit に配置)
        // r2_high = r2 & 0xFFFF_0000 = 0x9ABC_0000
        // result = 0x9ABC_0000 | 0x1234 = 0x9ABC_1234
        let expected = ((r1 & 0xFFFF_0000) >> 16) | (r2 & 0xFFFF_0000);
        assert_eq!(pid, expected);
        assert_eq!(pid, 0x9ABC_1234);
    }

    #[test]
    fn test_apply_shiny_lock() {
        // 非色違いの PID はそのまま
        let pid = 0x1234_5678_u32;
        let tid = 0u16;
        let sid = 0u16;
        assert_eq!(apply_shiny_lock(pid, tid, sid), pid);

        // 色違いの PID は変更される
        let shiny_pid = 0xABCD_ABCD_u32;
        let locked = apply_shiny_lock(shiny_pid, tid, sid);
        assert_ne!(locked, shiny_pid);
        assert_eq!(calculate_shiny_type(locked, tid, sid), ShinyType::None);
    }
}
