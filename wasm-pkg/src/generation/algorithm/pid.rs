//! PID 生成・色違い判定アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::{Pid, ShinyType, TrainerInfo};

/// 基本 PID 生成 (XOR 0x10000)
/// BW/BW2 統一仕様: 固定・野生共通
#[inline]
fn generate_base_pid(r: u32) -> Pid {
    Pid(r ^ 0x10000)
}

/// ID 補正処理
/// 性格値下位 ^ トレーナーID ^ 裏ID の奇偶性で最上位ビットを調整
#[inline]
fn apply_id_correction(pid: Pid, trainer: TrainerInfo) -> Pid {
    let pid_low = (pid.raw() & 0xFFFF) as u16;
    let xor_value = pid_low ^ trainer.tid ^ trainer.sid;

    if xor_value & 1 == 1 {
        Pid(pid.raw() | 0x8000_0000) // 最上位ビットを 1 に
    } else {
        Pid(pid.raw() & 0x7FFF_FFFF) // 最上位ビットを 0 に
    }
}

/// 野生/固定/徘徊 PID 生成 (ID補正あり)
#[inline]
fn generate_wild_pid(r: u32, trainer: TrainerInfo) -> Pid {
    apply_id_correction(generate_base_pid(r), trainer)
}

/// イベント/御三家 PID 生成 (ID補正なし)
#[inline]
pub fn generate_event_pid(r: u32) -> Pid {
    generate_base_pid(r)
}

use crate::core::roll_fraction;

/// 孵化 PID 生成 (1乱数方式、参照実装準拠)
#[inline]
fn generate_egg_pid_raw(r: u32) -> Pid {
    Pid(roll_fraction(r, 0xFFFF_FFFF))
}

/// 色違いロック適用
/// PID を変更して色違いにならないようにする
pub fn apply_shiny_lock(pid: Pid, trainer: TrainerInfo) -> Pid {
    if pid.shiny_type(trainer) == ShinyType::None {
        pid
    } else {
        Pid(pid.raw() ^ 0x1000_0000) // 上位ビットを反転
    }
}

/// ひかるおまもり付き野生 PID 生成
/// 最大 `reroll_count` 回リロール
pub fn generate_wild_pid_with_reroll(
    lcg: &mut Lcg64,
    trainer: TrainerInfo,
    reroll_count: u8,
) -> (Pid, ShinyType) {
    for _ in 0..reroll_count {
        let r = lcg.next().unwrap_or(0);
        let pid = generate_wild_pid(r, trainer);
        let shiny = pid.shiny_type(trainer);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let r = lcg.next().unwrap_or(0);
    let pid = generate_wild_pid(r, trainer);
    let shiny = pid.shiny_type(trainer);
    (pid, shiny)
}

/// 孵化 PID 生成 (リロール付き、1乱数方式)
///
/// 国際孵化時は `reroll_count = 5`。
pub fn generate_egg_pid_with_reroll(
    lcg: &mut Lcg64,
    trainer: TrainerInfo,
    reroll_count: u8,
) -> (Pid, ShinyType) {
    for _ in 0..reroll_count {
        let pid = generate_egg_pid_raw(lcg.next().unwrap_or(0));
        let shiny = pid.shiny_type(trainer);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let pid = generate_egg_pid_raw(lcg.next().unwrap_or(0));
    let shiny = pid.shiny_type(trainer);
    (pid, shiny)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_trainer(tid: u16, sid: u16) -> TrainerInfo {
        TrainerInfo { tid, sid }
    }

    #[test]
    fn test_shiny_type_square() {
        // xor = 0 の場合 → Square
        // pid_high ^ pid_low ^ tid ^ sid = 0
        // 0xABCD ^ 0xABCD ^ 0x0000 ^ 0x0000 = 0
        let pid = Pid(0xABCD_ABCD_u32);
        let trainer = make_trainer(0x0000, 0x0000);
        assert_eq!(pid.shiny_type(trainer), ShinyType::Square);
    }

    #[test]
    fn test_shiny_type_star() {
        // xor = 1 の場合 → Star
        // pid_high ^ pid_low ^ tid ^ sid = 1
        // 0xABCD ^ 0xABCC ^ 0x0000 ^ 0x0000 = 1
        let pid = Pid(0xABCD_ABCC_u32);
        let trainer = make_trainer(0x0000, 0x0000);
        assert_eq!(pid.shiny_type(trainer), ShinyType::Star);
    }

    #[test]
    fn test_shiny_type_none() {
        // xor >= 8 の場合 → None
        let pid = Pid(0x1234_5678_u32);
        let trainer = make_trainer(0x0000, 0x0000);
        assert_eq!(pid.shiny_type(trainer), ShinyType::None);
    }

    #[test]
    fn test_generate_base_pid() {
        // r ^ 0x10000
        assert_eq!(generate_base_pid(0x1234_5678), Pid(0x1234_5678 ^ 0x10000));
        assert_eq!(generate_base_pid(0x0000_0000), Pid(0x0001_0000));
        assert_eq!(generate_base_pid(0xFFFF_FFFF), Pid(0xFFFE_FFFF));
    }

    #[test]
    fn test_apply_id_correction() {
        // pid_low ^ tid ^ sid が奇数なら最上位ビット 1、偶数なら 0
        // 0x5678 ^ 12345 ^ 54321 = 0x5678 ^ 0x3039 ^ 0xD431
        // = 0x5678 ^ 0xE408 = 0xB270 (偶数) → 最上位ビット 0
        let pid = Pid(0x1234_5678_u32);
        let trainer = make_trainer(12345, 54321);
        let corrected = apply_id_correction(pid, trainer);

        let pid_low = (pid.0 & 0xFFFF) as u16;
        let xor_result = pid_low ^ trainer.tid ^ trainer.sid;
        if (xor_result & 1) == 1 {
            assert_eq!(corrected, Pid(pid.0 | 0x8000_0000));
        } else {
            assert_eq!(corrected, Pid(pid.0 & 0x7FFF_FFFF));
        }
    }

    #[test]
    fn test_generate_wild_pid() {
        // 元実装テストパターン: r1 = 0x12345678, tid = 12345, sid = 54321
        let r = 0x1234_5678_u32;
        let trainer = make_trainer(12345, 54321);
        let pid = generate_wild_pid(r, trainer);

        // 基本PID生成 (r ^ 0x10000)
        let expected_base = r ^ 0x10000;

        // ID補正の確認
        let pid_low = (expected_base & 0xFFFF) as u16;
        let xor_result = pid_low ^ trainer.tid ^ trainer.sid;

        if (xor_result & 1) == 1 {
            assert_eq!(pid, Pid(expected_base | 0x8000_0000));
        } else {
            assert_eq!(pid, Pid(expected_base & 0x7FFF_FFFF));
        }
    }

    #[test]
    fn test_generate_event_pid() {
        // イベント PID = r ^ 0x10000 (ID補正なし)
        let r = 0x1234_5678_u32;
        let expected = Pid(r ^ 0x10000);
        assert_eq!(generate_event_pid(r), expected);
    }

    #[test]
    fn test_roll_fraction() {
        // 境界値テスト
        assert_eq!(roll_fraction(0, 4), 0);
        assert_eq!(roll_fraction(0xFFFF_FFFF, 4), 3);
        assert_eq!(roll_fraction(0x8000_0000, 4), 2);
        assert_eq!(roll_fraction(0x4000_0000, 4), 1);
    }

    #[test]
    fn test_apply_shiny_lock() {
        // 非色違いの PID はそのまま
        let pid = Pid(0x1234_5678_u32);
        let trainer = make_trainer(0, 0);
        assert_eq!(apply_shiny_lock(pid, trainer), pid);

        // 色違いの PID は変更される
        let shiny_pid = Pid(0xABCD_ABCD_u32);
        let locked = apply_shiny_lock(shiny_pid, trainer);
        assert_ne!(locked, shiny_pid);
        assert_eq!(locked.shiny_type(trainer), ShinyType::None);
    }
}
