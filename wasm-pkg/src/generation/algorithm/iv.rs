//! IV 生成・遺伝アルゴリズム

use crate::core::mt::{Mt19937, Mt19937x4};
use crate::types::{InheritanceSlot, Ivs, MtSeed};

/// MT19937 出力から IV を抽出 (0-31)
#[inline]
pub fn extract_iv(mt_output: u32) -> u8 {
    (mt_output >> 27) as u8
}

/// 徘徊ポケモン用 IV 並び替え (HABDSC → HABCDS)
///
/// 徘徊ポケモンは IV が HABDSC 順で生成されるため、
/// 標準順 (HABCDS) に並び替える。
/// pokemon-gen5-initseed の `reorder_for_roamer` に準拠。
#[inline]
fn reorder_for_roamer(ivs: Ivs) -> Ivs {
    // 入力: HABDSC 順 (hp, atk, def, spa, spd, spe として格納)
    // 実際は 4,5,6 番目が D,S,C の順で生成されている
    // 出力: HABCDS 順 (hp, atk, def, spa, spd, spe)
    Ivs::new(
        ivs.hp,  // H
        ivs.atk, // A
        ivs.def, // B
        ivs.spd, // 4番目に生成された値 (D) が C (spa) になる
        ivs.spe, // 5番目に生成された値 (S) が D (spd) になる
        ivs.spa, // 6番目に生成された値 (C) が S (spe) になる
    )
}

/// 指定オフセットで IV 生成
///
/// # Arguments
/// * `seed` - MT19937 シード
/// * `offset` - IV 生成開始位置（破棄する乱数回数）
/// * `is_roamer` - 徘徊ポケモンモード（HABDSC → HABCDS 並び替え適用）
pub fn generate_rng_ivs_with_offset(seed: MtSeed, offset: u32, is_roamer: bool) -> Ivs {
    let mut mt = Mt19937::new(seed);

    for _ in 0..offset {
        mt.next_u32();
    }

    let ivs = Ivs::new(
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
        extract_iv(mt.next_u32()),
    );

    if is_roamer {
        reorder_for_roamer(ivs)
    } else {
        ivs
    }
}

/// 4 つの MT Seed に対して同時に IV を生成する (SIMD)
///
/// `Mt19937x4` を使って 4 系統を並列処理する。
/// 各レーンの出力はスカラー版 `generate_rng_ivs_with_offset` と完全に一致する。
pub fn generate_rng_ivs_with_offset_x4(
    seeds: [MtSeed; 4],
    offset: u32,
    is_roamer: bool,
) -> [Ivs; 4] {
    let mut mt = Mt19937x4::new(seeds);
    mt.discard(offset);

    // 6 回の乱数生成 (各呼び出しで 4 レーン分が一度に得られる)
    let raw: [[u32; 4]; 6] = std::array::from_fn(|_| mt.next_u32x4());

    // raw[stat_idx][lane_idx] → 各レーンごとに IV を組み立て
    std::array::from_fn(|lane| {
        let ivs = Ivs::new(
            extract_iv(raw[0][lane]),
            extract_iv(raw[1][lane]),
            extract_iv(raw[2][lane]),
            extract_iv(raw[3][lane]),
            extract_iv(raw[4][lane]),
            extract_iv(raw[5][lane]),
        );
        if is_roamer {
            reorder_for_roamer(ivs)
        } else {
            ivs
        }
    })
}

/// 遺伝適用
pub fn apply_inheritance(
    rng_ivs: Ivs,
    parent_male: Ivs,
    parent_female: Ivs,
    slots: [InheritanceSlot; 3],
) -> Ivs {
    let mut result = rng_ivs;

    for slot in slots {
        let parent_iv = if slot.parent == 0 {
            parent_male.get(usize::from(slot.stat))
        } else {
            parent_female.get(usize::from(slot.stat))
        };
        result.set(usize::from(slot.stat), parent_iv);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_rng_ivs() {
        let seed = MtSeed::new(0x1234_5678);
        // offset=7 (通常ケース)、is_roamer=false
        let ivs = generate_rng_ivs_with_offset(seed, 7, false);
        // 各 IV は 0-31 の範囲
        assert!(ivs.hp <= 31);
        assert!(ivs.atk <= 31);
        assert!(ivs.def <= 31);
        assert!(ivs.spa <= 31);
        assert!(ivs.spd <= 31);
        assert!(ivs.spe <= 31);
    }

    #[test]
    fn test_generate_rng_ivs_roamer() {
        let seed = MtSeed::new(0x1234_5678);
        // offset=1 (徘徊ケース)、is_roamer=true
        let roamer_ivs = generate_rng_ivs_with_offset(seed, 1, true);
        // 各 IV は 0-31 の範囲
        assert!(roamer_ivs.hp <= 31);
        assert!(roamer_ivs.atk <= 31);
        assert!(roamer_ivs.def <= 31);
        assert!(roamer_ivs.spa <= 31);
        assert!(roamer_ivs.spd <= 31);
        assert!(roamer_ivs.spe <= 31);

        // 通常モードとは異なる並び順になる（同じoffsetで比較）
        let normal_ivs = generate_rng_ivs_with_offset(seed, 1, false);
        // roamer では SpA/SpD/Spe の並び替えが発生するため、値が異なる場合がある
        // (同じ値の場合もあり得るが、異なるロジックであることを確認)
        assert_eq!(roamer_ivs.hp, normal_ivs.hp);
        assert_eq!(roamer_ivs.atk, normal_ivs.atk);
        assert_eq!(roamer_ivs.def, normal_ivs.def);
    }

    #[test]
    fn test_apply_inheritance() {
        let rng_ivs = Ivs::new(10, 10, 10, 10, 10, 10);
        let male = Ivs::new(31, 0, 0, 0, 0, 0);
        let female = Ivs::new(0, 31, 0, 0, 0, 0);
        let slots = [
            InheritanceSlot::new(0, 0), // HP from male
            InheritanceSlot::new(1, 1), // Atk from female
            InheritanceSlot::new(2, 0), // Def from male
        ];
        let result = apply_inheritance(rng_ivs, male, female, slots);
        assert_eq!(result.hp, 31);
        assert_eq!(result.atk, 31);
        assert_eq!(result.def, 0);
    }

    #[test]
    fn test_generate_rng_ivs_with_offset_x4_matches_scalar() {
        let seeds = [
            MtSeed::new(0),
            MtSeed::new(100),
            MtSeed::new(0x1234_5678),
            MtSeed::new(0xFFFF_FFFF),
        ];

        for offset in [0, 1, 7, 10, 50] {
            let simd_results = generate_rng_ivs_with_offset_x4(seeds, offset, false);
            for (i, seed) in seeds.iter().enumerate() {
                let scalar_result = generate_rng_ivs_with_offset(*seed, offset, false);
                assert_eq!(
                    simd_results[i],
                    scalar_result,
                    "Mismatch at seed={}, offset={offset}",
                    seed.value()
                );
            }
        }
    }

    #[test]
    fn test_generate_rng_ivs_with_offset_x4_roamer() {
        let seeds = [
            MtSeed::new(42),
            MtSeed::new(1000),
            MtSeed::new(0xDEAD_BEEF),
            MtSeed::new(0x0BAD_F00D),
        ];

        for offset in [0, 1, 7] {
            let simd_results = generate_rng_ivs_with_offset_x4(seeds, offset, true);
            for (i, seed) in seeds.iter().enumerate() {
                let scalar_result = generate_rng_ivs_with_offset(*seed, offset, true);
                assert_eq!(
                    simd_results[i],
                    scalar_result,
                    "Roamer mismatch at seed={}, offset={offset}",
                    seed.value()
                );
            }
        }
    }
}
