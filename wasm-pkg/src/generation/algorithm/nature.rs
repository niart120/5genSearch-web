//! 性格決定・シンクロアルゴリズム
#![allow(clippy::trivially_copy_pass_by_ref)]

use crate::core::lcg::Lcg64;
use crate::types::{EncounterType, LeadAbilityEffect, Nature};

/// 乱数から性格 ID を決定 (0-24)
#[inline]
#[allow(clippy::cast_possible_truncation)]
pub fn nature_roll(r: u32) -> u8 {
    ((u64::from(r) * 25) >> 32) as u8
}

/// シンクロ成否判定
#[inline]
pub fn sync_check(r: u32) -> bool {
    ((u64::from(r) * 2) >> 32) == 1
}

/// シンクロ対応エンカウントかどうか
pub fn supports_sync(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Normal
            | EncounterType::Surfing
            | EncounterType::Fishing
            | EncounterType::ShakingGrass
            | EncounterType::DustCloud
            | EncounterType::PokemonShadow
            | EncounterType::SurfingBubble
            | EncounterType::FishingBubble
            | EncounterType::StaticSymbol
    )
}

/// シンクロ判定を実行
/// 対応エンカウントでは常に乱数を消費
pub fn perform_sync_check(
    lcg: &mut Lcg64,
    encounter_type: EncounterType,
    lead_ability: &LeadAbilityEffect,
) -> bool {
    if !supports_sync(encounter_type) {
        return false; // 乱数消費なし
    }

    let r = lcg.next().unwrap_or(0); // 対応エンカウントでは常に消費

    matches!(lead_ability, LeadAbilityEffect::Synchronize(_)) && sync_check(r)
}

/// 性格決定 (シンクロ考慮)
pub fn determine_nature(
    lcg: &mut Lcg64,
    sync_success: bool,
    lead_ability: &LeadAbilityEffect,
) -> (Nature, bool) {
    let rng_nature = nature_roll(lcg.next().unwrap_or(0)); // 常に消費

    if sync_success && let LeadAbilityEffect::Synchronize(nature) = lead_ability {
        return (*nature, true);
    }
    (Nature::from_u8(rng_nature), false)
}

/// かわらずのいし効果
#[derive(Clone, Copy, Debug, Default)]
pub enum EverstonePlan {
    #[default]
    None,
    Fixed(Nature),
}

/// 孵化時の性格決定
pub fn determine_egg_nature(lcg: &mut Lcg64, everstone: EverstonePlan) -> Nature {
    let nature_idx = nature_roll(lcg.next().unwrap_or(0));

    match everstone {
        EverstonePlan::None => Nature::from_u8(nature_idx),
        EverstonePlan::Fixed(parent_nature) => {
            // かわらずのいし判定: 最上位ビットが 0 で成功
            let inherit = (lcg.next().unwrap_or(0) >> 31) == 0;
            if inherit {
                parent_nature
            } else {
                Nature::from_u8(nature_idx)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nature_roll() {
        // 0 〜 24 の範囲
        for i in 0u32..100 {
            let r = i * 0x0100_0000;
            let nature = nature_roll(r);
            assert!(nature < 25);
        }
    }

    #[test]
    fn test_nature_roll_hardcoded() {
        // 計算式: ((r as u64) * 25) >> 32
        // 各性格は 2^32 / 25 ≈ 0x0A3D70A4 ずつの範囲を持つ
        assert_eq!(nature_roll(0x0000_0000), 0); // がんばりや
        assert_eq!(nature_roll(0x0A3D_70A3), 0); // 閾値直前 (まだ性格 0)
        assert_eq!(nature_roll(0x0A3D_70A4), 1); // さみしがり (閾値)
        assert_eq!(nature_roll(0xFFFF_FFFF), 24); // きまぐれ

        // 性格 id 3 (いじっぱり) の検証
        // 閾値: 3 * 0x0A3D70A4 = 0x1EB851EC
        assert_eq!(nature_roll(0x1EB8_51EB), 2); // ゆうかん (まだ 2)
        assert_eq!(nature_roll(0x1EB8_51EC), 3); // いじっぱり
        assert_eq!(nature_roll(0x2800_0000), 3);
    }

    #[test]
    fn test_sync_check() {
        // ((r as u64) * 2) >> 32 == 1 で成功
        // 最上位ビット 1 で成功
        assert!(sync_check(0x8000_0000));
        assert!(sync_check(0xFFFF_FFFF));
        assert!(!sync_check(0x7FFF_FFFF));
        assert!(!sync_check(0x0000_0000));
    }

    #[test]
    fn test_supports_sync() {
        // シンクロ対応
        assert!(supports_sync(EncounterType::Normal));
        assert!(supports_sync(EncounterType::Surfing));
        assert!(supports_sync(EncounterType::StaticSymbol));

        // シンクロ非対応
        assert!(!supports_sync(EncounterType::Roamer));
    }
}
