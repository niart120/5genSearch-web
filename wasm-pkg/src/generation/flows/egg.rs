//! 孵化個体生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    InheritanceSlot, ParentRole, determine_egg_nature, generate_egg_pid_with_reroll,
};
use crate::types::{EggGenerationParams, Gender, GenderRatio};

use super::types::RawEggData;

/// 卵の個体生成 (IV なし)
pub fn generate_egg(lcg: &mut Lcg64, params: &EggGenerationParams) -> RawEggData {
    // 1. 性格決定 (既存関数を使用)
    let nature = determine_egg_nature(lcg, params.everstone);

    // 2. 遺伝スロット決定
    let inheritance = determine_inheritance(lcg);

    // 3. 夢特性判定
    let has_hidden = determine_hidden_ability(lcg, params.female_has_hidden, params.uses_ditto);

    // 4. 性別判定
    let gender = determine_egg_gender(lcg, params.gender_ratio);

    // 5. PID 生成 (国際孵化: BW は +5 回リロール)
    let pid_reroll_count = if params.masuda_method { 5 } else { 0 };
    let (pid, shiny_type) = generate_egg_pid_with_reroll(
        lcg,
        params.trainer.tid,
        params.trainer.sid,
        pid_reroll_count,
    );

    // 特性スロット決定
    let ability_slot = if has_hidden {
        2
    } else {
        ((pid >> 16) & 1) as u8
    };

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
            let candidate = ((u64::from(r) * 6) >> 32) as usize;
            if !used[candidate] {
                used[candidate] = true;
                break candidate;
            }
        };

        // 遺伝元親決定 (50%)
        let parent = if lcg.next().unwrap_or(0) >> 31 == 1 {
            ParentRole::Male
        } else {
            ParentRole::Female
        };

        *slot = InheritanceSlot { stat, parent };
    }

    slots
}

/// 夢特性判定
fn determine_hidden_ability(lcg: &mut Lcg64, female_has_hidden: bool, uses_ditto: bool) -> bool {
    let r = lcg.next().unwrap_or(0);

    // 夢特性条件:
    // - メタモンを使用していない
    // - ♀親が夢特性
    // - 乱数判定成功 (60%)
    if !uses_ditto && female_has_hidden {
        ((u64::from(r) * 5) >> 32) >= 2
    } else {
        false
    }
}

/// 卵の性別判定
fn determine_egg_gender(lcg: &mut Lcg64, gender_ratio: GenderRatio) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Genderless,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let r = lcg.next().unwrap_or(0);
            #[allow(clippy::cast_possible_truncation)]
            let value = ((u64::from(r) * 252) >> 32) as u8;
            if value < threshold {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EverstonePlan, Ivs, Nature, RomVersion, TrainerInfo};

    fn make_params() -> EggGenerationParams {
        EggGenerationParams {
            version: RomVersion::Black,
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
        // 乱数によって遺伝するかどうかが決まる
        // 性格が25種のいずれかであることを確認
        assert!((egg.nature as u8) < 25);
    }

    #[test]
    fn test_determine_inheritance() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);

        let slots = determine_inheritance(&mut lcg);

        // 3つのスロットがあること
        assert_eq!(slots.len(), 3);

        // 遺伝先ステータスが重複しないこと
        let stats: Vec<usize> = slots.iter().map(|s| s.stat).collect();
        for i in 0..3 {
            for j in (i + 1)..3 {
                assert_ne!(stats[i], stats[j], "stats should not duplicate");
            }
        }
    }

    #[test]
    fn test_determine_hidden_ability() {
        // 条件を満たさない場合は false
        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_FFFF_FFFF);
        assert!(!determine_hidden_ability(&mut lcg, false, false));

        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_FFFF_FFFF);
        assert!(!determine_hidden_ability(&mut lcg, true, true)); // メタモン使用

        // 条件を満たす場合 (female_has_hidden = true, uses_ditto = false)
        // 結果は乱数依存
    }

    #[test]
    fn test_determine_egg_gender() {
        // Genderless
        let mut lcg = Lcg64::from_raw(0x0);
        assert_eq!(
            determine_egg_gender(&mut lcg, GenderRatio::Genderless),
            Gender::Genderless
        );

        // MaleOnly
        let mut lcg = Lcg64::from_raw(0x0);
        assert_eq!(
            determine_egg_gender(&mut lcg, GenderRatio::MaleOnly),
            Gender::Male
        );

        // FemaleOnly
        let mut lcg = Lcg64::from_raw(0x0);
        assert_eq!(
            determine_egg_gender(&mut lcg, GenderRatio::FemaleOnly),
            Gender::Female
        );
    }
}
