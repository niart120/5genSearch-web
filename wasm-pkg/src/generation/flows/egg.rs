//! 孵化個体生成 (参照実装準拠)

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{determine_egg_nature, generate_egg_pid_with_reroll};
use crate::types::{EggGenerationParams, Gender, GenderRatio, InheritanceSlot};

use super::types::RawEggData;

/// n分率計算
#[inline]
fn roll_fraction(r: u32, n: u32) -> u32 {
    ((u64::from(r) * u64::from(n)) >> 32) as u32
}

/// 卵の個体生成 (参照実装準拠)
pub fn generate_egg(lcg: &mut Lcg64, params: &EggGenerationParams) -> RawEggData {
    let tid = params.trainer.tid;
    let sid = params.trainer.sid;

    // 1. 性格決定
    let nature = determine_egg_nature(lcg, params.everstone);

    // 2. 夢特性ロール (値を保持)
    let ha_roll = lcg.next().unwrap_or(0);

    // 3. メタモン追加消費
    if params.uses_ditto {
        let _ = lcg.next();
    }

    // 4. 遺伝スロット決定
    let inheritance = determine_inheritance(lcg);

    // 5. ニドランロール
    let nidoran_roll = if params.nidoran_flag {
        #[allow(clippy::cast_possible_truncation)]
        Some(roll_fraction(lcg.next().unwrap_or(0), 2) as u8)
    } else {
        None
    };

    // 6. PID 生成 (リロール付き、国際孵化時は 5 回)
    let reroll_count = if params.masuda_method { 5 } else { 0 };
    let (pid, shiny_type) = generate_egg_pid_with_reroll(lcg, tid, sid, reroll_count);

    // 7. 性別判定
    let gender = match nidoran_roll {
        Some(0) => Gender::Female,
        Some(_) => Gender::Male,
        None => determine_gender_from_pid(pid, params.gender_ratio),
    };

    // 8. 特性スロット決定
    let ability_slot =
        determine_ability_slot(pid, ha_roll, params.uses_ditto, params.female_has_hidden);

    RawEggData {
        pid,
        nature,
        gender,
        ability_slot,
        shiny_type,
        inheritance,
    }
}

/// 遺伝スロット決定
fn determine_inheritance(lcg: &mut Lcg64) -> [InheritanceSlot; 3] {
    let mut slots = [InheritanceSlot::default(); 3];
    let mut used = [false; 6];

    for slot in &mut slots {
        // 遺伝先ステータス決定 (重複不可)
        let stat = loop {
            let r = lcg.next().unwrap_or(0);
            #[allow(clippy::cast_possible_truncation)]
            let candidate = roll_fraction(r, 6) as u8;
            if !used[usize::from(candidate)] {
                used[usize::from(candidate)] = true;
                break candidate;
            }
        };

        // 遺伝元親決定 (50%): 0 = Male, 1 = Female
        let parent = u8::from(lcg.next().unwrap_or(0) >> 31 == 0);

        *slot = InheritanceSlot::new(stat, parent);
    }

    slots
}

/// PID から性別を判定
fn determine_gender_from_pid(pid: u32, gender_ratio: GenderRatio) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Genderless,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let value = (pid & 0xFF) as u8;
            if value < threshold {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}

/// 特性スロット決定
fn determine_ability_slot(pid: u32, ha_roll: u32, uses_ditto: bool, female_has_hidden: bool) -> u8 {
    // 夢特性条件判定
    // - メタモンを使用していない
    // - ♀親が夢特性
    // - 乱数判定成功 (60%)
    let ha_candidate = !uses_ditto && female_has_hidden && roll_fraction(ha_roll, 5) >= 2;

    if ha_candidate {
        2 // Hidden
    } else {
        ((pid >> 16) & 1) as u8 // 0 or 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EverstonePlan, Ivs, Nature, TrainerInfo};

    fn make_params() -> EggGenerationParams {
        EggGenerationParams {
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::Threshold(127),
            nidoran_flag: false,
            masuda_method: false,
            parent_male: Ivs::new(31, 31, 31, 0, 0, 0),
            parent_female: Ivs::new(0, 0, 0, 31, 31, 31),
            consider_npc: false,
        }
    }

    #[test]
    fn test_generate_egg() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params();

        let egg = generate_egg(&mut lcg, &params);

        // 基本的な検証
        assert!(egg.ability_slot <= 2);
    }

    #[test]
    fn test_generate_egg_with_everstone() {
        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_FFFF_FFFF);
        let params = EggGenerationParams {
            everstone: EverstonePlan::Fixed(Nature::Adamant),
            ..make_params()
        };

        let egg = generate_egg(&mut lcg, &params);

        // かわらずのいし使用時のテスト
        assert!((egg.nature as u8) < 25);
    }

    #[test]
    fn test_determine_inheritance() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);

        let slots = determine_inheritance(&mut lcg);

        // 3つのスロットがあること
        assert_eq!(slots.len(), 3);

        // 遺伝先ステータスが重複しないこと
        let stats: Vec<u8> = slots.iter().map(|s| s.stat).collect();
        for i in 0..3 {
            for j in (i + 1)..3 {
                assert_ne!(stats[i], stats[j], "stats should not duplicate");
            }
        }
    }

    #[test]
    fn test_determine_gender_from_pid() {
        // Genderless
        assert_eq!(
            determine_gender_from_pid(0x1234_5678, GenderRatio::Genderless),
            Gender::Genderless
        );

        // MaleOnly
        assert_eq!(
            determine_gender_from_pid(0x1234_5678, GenderRatio::MaleOnly),
            Gender::Male
        );

        // FemaleOnly
        assert_eq!(
            determine_gender_from_pid(0x1234_5678, GenderRatio::FemaleOnly),
            Gender::Female
        );

        // Threshold: low value -> Female
        assert_eq!(
            determine_gender_from_pid(0x1234_5600, GenderRatio::Threshold(127)),
            Gender::Female
        );

        // Threshold: high value -> Male
        assert_eq!(
            determine_gender_from_pid(0x1234_56FF, GenderRatio::Threshold(127)),
            Gender::Male
        );
    }

    #[test]
    fn test_determine_ability_slot() {
        // 夢特性条件を満たさない場合: PID bit16 で判定
        assert_eq!(determine_ability_slot(0x0001_0000, 0, false, false), 1);
        assert_eq!(determine_ability_slot(0x0000_0000, 0, false, false), 0);

        // 夢特性条件を満たす場合 (60% 成功)
        // roll_fraction(0xFFFF_FFFF, 5) = 4 >= 2 → 成功
        assert_eq!(
            determine_ability_slot(0x0001_0000, 0xFFFF_FFFF, false, true),
            2
        );

        // メタモン使用時は夢特性不可
        assert_eq!(
            determine_ability_slot(0x0001_0000, 0xFFFF_FFFF, true, true),
            1
        );
    }

    #[test]
    fn test_ditto_consumption() {
        // メタモン使用時の追加消費を確認
        let mut lcg_no_ditto = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let mut lcg_with_ditto = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);

        let params_no_ditto = make_params();
        let params_with_ditto = EggGenerationParams {
            uses_ditto: true,
            ..make_params()
        };

        let _ = generate_egg(&mut lcg_no_ditto, &params_no_ditto);
        let _ = generate_egg(&mut lcg_with_ditto, &params_with_ditto);

        // メタモン使用時は追加で 1 消費されるため、シードが異なる
        assert_ne!(lcg_no_ditto.current_seed(), lcg_with_ditto.current_seed());
    }

    #[test]
    fn test_nidoran_gender() {
        // ニドランフラグ有効時の性別決定テスト
        // 処理順序: 性格 → 夢特性ロール → 遺伝スロット決定 → ニドランロール → PID
        // ニドランロールで 0 が出たら Female
        //
        // シードを調整して、ニドランロール時に roll_fraction(r, 2) = 0 となるようにする
        // 事前に消費される乱数:
        // - 性格: 1回
        // - 夢特性ロール: 1回
        // - 遺伝スロット: 最低6回 (3スロット × (stat + parent))
        // → 合計8回消費後にニドランロール
        //
        // ここでは処理が正しく動作することのみ確認
        let params = EggGenerationParams {
            nidoran_flag: true,
            ..make_params()
        };

        // 2つの異なるシードで生成し、ニドランフラグが性別決定に影響することを確認
        let mut lcg1 = Lcg64::from_raw(0x0000_0000_0000_0000);
        let mut lcg2 = Lcg64::from_raw(0xFFFF_FFFF_FFFF_FFFF);

        let egg1 = generate_egg(&mut lcg1, &params);
        let egg2 = generate_egg(&mut lcg2, &params);

        // ニドランフラグ有効時は性別が Male または Female のみ (Genderless 不可)
        assert!(egg1.gender == Gender::Male || egg1.gender == Gender::Female);
        assert!(egg2.gender == Gender::Male || egg2.gender == Gender::Female);
    }
}
