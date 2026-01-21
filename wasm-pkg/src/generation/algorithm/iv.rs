//! IV 生成・遺伝アルゴリズム

use crate::core::mt::Mt19937;
use crate::types::{Ivs, MtSeed};

/// MT19937 出力から IV を抽出 (0-31)
#[inline]
pub fn extract_iv(mt_output: u32) -> u8 {
    (mt_output >> 27) as u8
}

/// 乱数 IV を生成 (野生・固定シンボル用)
///
/// MT19937 の最初の 7 回を破棄後、6 回取得。
pub fn generate_rng_ivs(seed: MtSeed) -> Ivs {
    let mut mt = Mt19937::new(seed);

    // 最初の 7 回を破棄
    for _ in 0..7 {
        mt.next_u32();
    }

    Ivs::new(
        extract_iv(mt.next_u32()), // HP
        extract_iv(mt.next_u32()), // Atk
        extract_iv(mt.next_u32()), // Def
        extract_iv(mt.next_u32()), // SpA
        extract_iv(mt.next_u32()), // SpD
        extract_iv(mt.next_u32()), // Spe
    )
}

/// 指定オフセットで IV 生成
///
/// BW2 固定シンボル等、オフセットが異なるケースで使用。
pub fn generate_rng_ivs_with_offset(seed: MtSeed, offset: u32) -> Ivs {
    let mut mt = Mt19937::new(seed);

    for _ in 0..offset {
        mt.next_u32();
    }

    Ivs::new(
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
    )
}

/// 徘徊ポケモン用 IV 生成 (特殊順序)
///
/// HP/Atk のみ乱数、他は 0 固定。
pub fn generate_roamer_ivs(seed: MtSeed) -> Ivs {
    let mut mt = Mt19937::new(seed);

    for _ in 0..7 {
        mt.next_u32();
    }

    let hp = extract_iv(mt.next_u32());
    let atk = extract_iv(mt.next_u32());

    Ivs::new(hp, atk, 0, 0, 0, 0)
}

/// 親の役割
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ParentRole {
    #[default]
    Male,
    Female,
}

/// 遺伝スロット
#[derive(Clone, Copy, Debug, Default)]
pub struct InheritanceSlot {
    /// 遺伝先ステータス (0=HP, 1=Atk, 2=Def, 3=SpA, 4=SpD, 5=Spe)
    pub stat: usize,
    /// 遺伝元親
    pub parent: ParentRole,
}

/// 遺伝適用
pub fn apply_inheritance(
    rng_ivs: &Ivs,
    parent_male: &Ivs,
    parent_female: &Ivs,
    slots: &[InheritanceSlot; 3],
) -> Ivs {
    let mut result = *rng_ivs;

    for slot in slots {
        let parent_iv = match slot.parent {
            ParentRole::Male => parent_male.get(slot.stat),
            ParentRole::Female => parent_female.get(slot.stat),
        };
        result.set(slot.stat, parent_iv);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_rng_ivs() {
        let seed = MtSeed::new(0x1234_5678);
        let ivs = generate_rng_ivs(seed);
        // 各 IV は 0-31 の範囲
        assert!(ivs.hp <= 31);
        assert!(ivs.atk <= 31);
        assert!(ivs.def <= 31);
        assert!(ivs.spa <= 31);
        assert!(ivs.spd <= 31);
        assert!(ivs.spe <= 31);
    }

    #[test]
    fn test_apply_inheritance() {
        let rng_ivs = Ivs::new(10, 10, 10, 10, 10, 10);
        let male = Ivs::new(31, 0, 0, 0, 0, 0);
        let female = Ivs::new(0, 31, 0, 0, 0, 0);
        let slots = [
            InheritanceSlot {
                stat: 0,
                parent: ParentRole::Male,
            }, // HP from male
            InheritanceSlot {
                stat: 1,
                parent: ParentRole::Female,
            }, // Atk from female
            InheritanceSlot {
                stat: 2,
                parent: ParentRole::Male,
            }, // Def from male
        ];
        let result = apply_inheritance(&rng_ivs, &male, &female, &slots);
        assert_eq!(result.hp, 31);
        assert_eq!(result.atk, 31);
        assert_eq!(result.def, 0);
    }
}
