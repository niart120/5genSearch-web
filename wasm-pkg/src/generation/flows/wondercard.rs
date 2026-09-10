//! BW / BW2 の配達員から受け取る一個体の生成。
//!
//! 起動時消費・操作による消費を適用済みの LCG を受け取り、カード前処理から消費する。
//! 個体値・PID・性格はすべて同じ LCG から取得する。

use crate::core::lcg::{Lcg64, roll_fraction};
use crate::generation::algorithm::{apply_shiny_lock, extract_iv, nature_roll};
use crate::generation::flows::types::GenerationError;
use crate::types::{
    AbilitySlot, Gender, GenderRatio, Ivs, Nature, Pid, ShinyType, TrainerInfo,
    WonderCardShinyPolicy,
};

/// 構築時に検証済みの配達員生成条件。
///
/// 条件を変更する場合は `new()` で再構築する。種族の性別比と使用する TID / SID は
/// 呼び出し側で解決し、通常配布は配布元、配布タマゴは受取人の ID を渡す。
#[derive(Clone, Debug)]
pub struct WonderCardGenerationParams {
    trainer: TrainerInfo,
    gender_ratio: GenderRatio,
    fixed_ivs: [Option<u8>; 6],
    fixed_nature: Option<Nature>,
    fixed_gender: Option<Gender>,
    fixed_ability_slot: Option<AbilitySlot>,
    shiny_policy: WonderCardShinyPolicy,
}

impl WonderCardGenerationParams {
    /// 固定値と性別条件を検証する。個体値の配列順は H・A・B・C・D・S。
    ///
    /// # Errors
    /// 固定個体値が 31 を超える場合、性別不明を固定指定した場合、または性別比と
    /// 固定性別が矛盾する場合は `GenerationError::InvalidConfig` を返す。
    pub fn new(
        trainer: TrainerInfo,
        gender_ratio: GenderRatio,
        fixed_ivs: [Option<u8>; 6],
        fixed_nature: Option<Nature>,
        fixed_gender: Option<Gender>,
        fixed_ability_slot: Option<AbilitySlot>,
        shiny_policy: WonderCardShinyPolicy,
    ) -> Result<Self, GenerationError> {
        if fixed_ivs.iter().flatten().any(|&iv| iv > 31) {
            return Err(GenerationError::InvalidConfig(
                "Fixed IVs must be in 0..=31".into(),
            ));
        }
        if let Some(gender) = fixed_gender
            && (gender == Gender::Genderless
                || gender_ratio == GenderRatio::Genderless
                || matches!(
                    (gender_ratio, gender),
                    (GenderRatio::MaleOnly, Gender::Female)
                        | (GenderRatio::FemaleOnly, Gender::Male)
                ))
        {
            return Err(GenerationError::InvalidConfig(
                "Fixed gender must be male or female and compatible with the gender ratio".into(),
            ));
        }

        Ok(Self {
            trainer,
            gender_ratio,
            fixed_ivs,
            fixed_nature,
            fixed_gender,
            fixed_ability_slot,
            shiny_policy,
        })
    }
}

/// 配達員の個体情報。種族・レベル・実数値・生成元情報は呼び出し側で付与する。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RawWonderCardData {
    pub ivs: Ivs,
    pub pid: Pid,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: AbilitySlot,
    pub shiny_type: ShinyType,
}

/// 受取開始位置から一個体を生成し、LCG を生成終了位置まで進める。
///
/// ランダム個体値数を R、性別指定の有無を G、ランダム性格の有無を N とすると、
/// 前処理は `2 * (R + G + N + 4)`、本体は `R + G + N + 4` 消費する。
/// 開始位置の列挙は呼び出し側で行い、各開始位置の LCG を複製して渡す。
#[allow(clippy::cast_possible_truncation)] // 個体値数は最大 6。
pub fn generate_wondercard_pokemon(
    lcg: &mut Lcg64,
    params: &WonderCardGenerationParams,
) -> RawWonderCardData {
    let random_iv_count = params.fixed_ivs.iter().filter(|iv| iv.is_none()).count() as u32;
    let body_advances = random_iv_count
        + u32::from(params.fixed_gender.is_some())
        + u32::from(params.fixed_nature.is_none())
        + 4;
    lcg.advance(2 * body_advances);

    let ivs = Ivs::from_array(
        params
            .fixed_ivs
            .map(|fixed| fixed.unwrap_or_else(|| extract_iv(lcg.next().unwrap_or(0)))),
    );
    lcg.advance(2);
    let mut pid = lcg.next().unwrap_or(0);

    if let Some(gender) = params.fixed_gender {
        let threshold = u32::from(params.gender_ratio.to_threshold());
        // 単一性別の種族でも、性別指定があれば一消費して下位 8 bit を補正する。
        let (range, offset) = match params.gender_ratio {
            GenderRatio::MaleOnly => (246, 8),
            GenderRatio::FemaleOnly => (8, 1),
            _ if gender == Gender::Male => (254 - threshold, threshold),
            _ => (threshold - 1, 1),
        };
        let gender_value = roll_fraction(lcg.next().unwrap_or(0), range) + offset;
        pid = (pid & 0xFFFF_FF00) | gender_value;
    }

    pid = match params.shiny_policy {
        WonderCardShinyPolicy::Never => apply_shiny_lock(Pid(pid), params.trainer).raw(),
        WonderCardShinyPolicy::Random => pid,
        WonderCardShinyPolicy::Always => {
            // 確定色違いで保持するのは下位 8 bit のみ。
            let low = pid & 0xFF;
            ((low ^ u32::from(params.trainer.tid) ^ u32::from(params.trainer.sid)) << 16) | low
        }
    };

    pid = match params.fixed_ability_slot {
        Some(AbilitySlot::First | AbilitySlot::Hidden) => pid & !0x0001_0000,
        Some(AbilitySlot::Second) => pid | 0x0001_0000,
        None => pid ^ 0x0001_0000,
    };
    let pid = Pid(pid);

    // 性格固定時にも、この一消費は省略しない。
    lcg.advance(1);
    let nature = params
        .fixed_nature
        .unwrap_or_else(|| Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))));

    RawWonderCardData {
        ivs,
        pid,
        nature,
        gender: pid.gender(params.gender_ratio),
        ability_slot: params
            .fixed_ability_slot
            .unwrap_or_else(|| pid.ability_slot()),
        shiny_type: pid.shiny_type(params.trainer),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const START: u64 = 0x1234_5678_9ABC_DEF0;
    const TRAINER: TrainerInfo = TrainerInfo {
        tid: 12345,
        sid: 54321,
    };

    fn params(
        fixed_ivs: [Option<u8>; 6],
        fixed_nature: Option<Nature>,
        fixed_gender: Option<Gender>,
    ) -> WonderCardGenerationParams {
        WonderCardGenerationParams::new(
            TRAINER,
            GenderRatio::F1M1,
            fixed_ivs,
            fixed_nature,
            fixed_gender,
            None,
            WonderCardShinyPolicy::Random,
        )
        .unwrap()
    }

    fn generate_at(seed: u64, params: &WonderCardGenerationParams) -> (RawWonderCardData, u64) {
        let mut lcg = Lcg64::from_raw(seed);
        let result = generate_wondercard_pokemon(&mut lcg, params);
        (result, lcg.current_seed().value())
    }

    // 以下の期待値は生成関数を使わず、仕様の LCG 漸化式を整数演算で展開して固定した。
    // START からの取得位置 (1 始まり):
    // 11=104544C9, 21=F7C5D056, 22=5C5F20AB, 23=8CD194FB, 24=857A814B,
    // 25=B0AA2831, 26=9BEAE9E5, 27=740D5B92, 28=C48918D3, 29=32BAE83A,
    // 30=7EC64DD5, 31=E9A82FBC, 33=4E73E9E3, 34=FBEC6E0A。
    #[test]
    fn generation_positions_and_end_states_match_the_four_spec_examples() {
        let cases = [
            (
                params([None; 6], None, None),
                RawWonderCardData {
                    ivs: Ivs::new(17, 16, 22, 19, 14, 24), // 23..=28
                    pid: Pid(0xE9A9_2FBC),                 // 31
                    nature: Nature::Relaxed,               // 33: rand(25) = 7
                    gender: Gender::Male,
                    ability_slot: AbilitySlot::Second,
                    shiny_type: ShinyType::None,
                },
                0x4E73_E9E3_FAB6_5793, // 33 消費
            ),
            (
                params([None; 6], None, Some(Gender::Male)),
                RawWonderCardData {
                    ivs: Ivs::new(22, 19, 14, 24, 6, 15), // 25..=30
                    pid: Pid(0x4E72_E9FB),                // 33、性別値は 34 から 251
                    nature: Nature::Relaxed,              // 36: rand(25) = 7
                    gender: Gender::Male,
                    ability_slot: AbilitySlot::First,
                    shiny_type: ShinyType::None,
                },
                0x4BE3_CD76_66C2_E924, // 36 消費
            ),
            (
                params(
                    [Some(31), None, None, None, None, None],
                    Some(Nature::Jolly),
                    Some(Gender::Female),
                ),
                RawWonderCardData {
                    ivs: Ivs::new(31, 30, 11, 17, 16, 22), // 固定、21..=25
                    pid: Pid(0xC488_1819),                 // 28、性別値は 29 から 25
                    nature: Nature::Jolly,
                    gender: Gender::Female,
                    ability_slot: AbilitySlot::First,
                    shiny_type: ShinyType::None,
                },
                0x7EC6_4DD5_8CA3_0A0E, // 性格固定でも 30 まで消費
            ),
            (
                params(
                    [Some(0), Some(1), Some(2), Some(29), Some(30), Some(31)],
                    Some(Nature::Timid),
                    None,
                ),
                RawWonderCardData {
                    ivs: Ivs::new(0, 1, 2, 29, 30, 31),
                    pid: Pid(0x1044_44C9), // 11
                    nature: Nature::Timid,
                    gender: Gender::Male,
                    ability_slot: AbilitySlot::First,
                    shiny_type: ShinyType::None,
                },
                0x9C10_7FC3_AC9F_06EC, // 12 消費
            ),
        ];

        for (params, expected, end_seed) in cases {
            assert_eq!(generate_at(START, &params), (expected, end_seed));
        }
    }

    #[test]
    fn fixing_each_iv_preserves_its_slot_and_shifts_later_draws() {
        // R=5, G=0, N=1: 前処理20、IV21..=25、PID28、性格30。
        let expected_ivs = [
            [0, 30, 11, 17, 16, 22],
            [30, 0, 11, 17, 16, 22],
            [30, 11, 0, 17, 16, 22],
            [30, 11, 17, 0, 16, 22],
            [30, 11, 17, 16, 0, 22],
            [30, 11, 17, 16, 22, 0],
        ];
        for (index, expected_ivs) in expected_ivs.into_iter().enumerate() {
            let mut fixed_ivs = [None; 6];
            fixed_ivs[index] = Some(0);
            let expected = RawWonderCardData {
                ivs: Ivs::from_array(expected_ivs),
                pid: Pid(0xC488_18D3),
                nature: Nature::Serious,
                gender: Gender::Male,
                ability_slot: AbilitySlot::First,
                shiny_type: ShinyType::None,
            };
            assert_eq!(
                generate_at(START, &params(fixed_ivs, None, None)),
                (expected, 0x7EC6_4DD5_8CA3_0A0E),
                "fixed IV index: {index}"
            );
        }
    }

    #[test]
    fn interleaved_fixed_ivs_use_only_three_random_draws() {
        // 前処理14、ランダムIV15..=17=E36E5CDE/5FF21B9B/37BDD371、PID20。
        let params = params(
            [Some(0), None, Some(31), None, Some(7), None],
            Some(Nature::Modest),
            None,
        );
        assert_eq!(
            generate_at(START, &params),
            (
                RawWonderCardData {
                    ivs: Ivs::new(0, 28, 31, 11, 7, 6),
                    pid: Pid(0x20B4_3DAF),
                    nature: Nature::Modest,
                    gender: Gender::Male,
                    ability_slot: AbilitySlot::First,
                    shiny_type: ShinyType::None,
                },
                0xF7C5_D056_D73D_26E7,
            )
        );
    }

    #[test]
    fn random_nature_uses_the_full_25_fraction_range() {
        // IV 固定・性別指定なし・性格ランダム: PID13、空消費14、性格15。
        // 15 回目の状態を 0 / FFFFFFFF00000000 として開始状態を逆算した。
        for (seed, pid, nature, end_seed) in [
            (0x5B2E_264E_3E42_32B3, 0x1C14_30CD, Nature::Hardy, 0),
            (
                0xA36C_D9A9_3E42_32B3,
                0xEFF9_0264,
                Nature::Quirky,
                0xFFFF_FFFF_0000_0000,
            ),
        ] {
            let (result, actual_end_seed) = generate_at(seed, &params([Some(31); 6], None, None));
            assert_eq!(
                (result.pid, result.nature, actual_end_seed),
                (Pid(pid), nature, end_seed)
            );
        }
    }

    #[test]
    fn every_fixed_iv_mask_has_the_expected_total_consumption() {
        // START の 12,15,18,21,24,27,30,33,36 消費後の状態。
        let end_states = [
            0x9C10_7FC3_AC9F_06EC,
            0xE36E_5CDE_E0E1_D5B9,
            0xF905_EAFC_129B_4872,
            0xF7C5_D056_D73D_26E7,
            0x857A_814B_3BB1_EBA8,
            0x740D_5B92_2E83_F105,
            0x7EC6_4DD5_8CA3_0A0E,
            0x4E73_E9E3_FAB6_5793,
            0x4BE3_CD76_66C2_E924,
        ];
        for mask in 0_u8..64 {
            let fixed_ivs = std::array::from_fn(|index| {
                if mask & (1 << index) == 0 {
                    None
                } else {
                    Some(31)
                }
            });
            for gender in [None, Some(Gender::Male), Some(Gender::Female)] {
                for nature in [None, Some(Nature::Hardy)] {
                    let params = params(fixed_ivs, nature, gender);
                    let (result, end_seed) = generate_at(START, &params);
                    let random_fields = 6 - mask.count_ones() as usize
                        + usize::from(gender.is_some())
                        + usize::from(nature.is_none());
                    assert_eq!(end_seed, end_states[random_fields], "{params:?}");
                    for (iv, fixed) in result.ivs.to_array().into_iter().zip(fixed_ivs) {
                        assert!(iv <= 31);
                        if let Some(fixed) = fixed {
                            assert_eq!(iv, fixed);
                        }
                    }
                }
            }
        }
    }

    fn fixed_params(
        ratio: GenderRatio,
        gender: Option<Gender>,
        ability: Option<AbilitySlot>,
        shiny: WonderCardShinyPolicy,
        trainer: TrainerInfo,
    ) -> WonderCardGenerationParams {
        WonderCardGenerationParams::new(
            trainer,
            ratio,
            [Some(31); 6],
            Some(Nature::Jolly),
            gender,
            ability,
            shiny,
        )
        .unwrap()
    }

    #[test]
    fn fixed_gender_rewrites_the_low_byte_for_every_ratio_and_range_endpoint() {
        // IV・性格固定、性別指定あり: PID13、性別14、終了15。
        // 範囲端の Seed は、14 回目の状態を 0 / FFFFFFFF00000000 として逆算した。
        let traces = [
            (
                START, // PID13=02AECDF4, r14=8D64EF9F。元 PID は全性別比でオス。
                0x02AF_CD00,
                0xE36E_5CDE_E0E1_D5B9,
                [154, 168, 197, 225, 143],
                [17, 35, 70, 105, 5],
            ),
            (
                1, // PID13=06C67F4A, r14=4D08C043。元 PID は F1M1/F3M1 でメス。
                0x06C7_7F00,
                0x5C6B_DBDF_49BB_10B6,
                [98, 120, 165, 209, 82],
                [10, 19, 38, 58, 3],
            ),
            (
                0xB049_CF01_E44B_6A62, // PID13=9B1AE6E9, r14=0
                0x9B1B_E600,
                0x0000_0000_0026_9EC3,
                [31, 63, 127, 191, 8],
                [1, 1, 1, 1, 1],
            ),
            (
                0x0A7F_44E8_E44B_6A62, // PID13=04E2667C, r14=FFFFFFFF
                0x04E3_6600,
                0x93F8_769B_0026_9EC3,
                [253, 253, 253, 253, 253],
                [30, 62, 126, 190, 8],
            ),
        ];
        for (seed, pid_upper, end_state, male_values, female_values) in traces {
            for (gender, single_ratio, values) in [
                (Gender::Male, GenderRatio::MaleOnly, male_values),
                (Gender::Female, GenderRatio::FemaleOnly, female_values),
            ] {
                let ratios = [
                    GenderRatio::F1M7,
                    GenderRatio::F1M3,
                    GenderRatio::F1M1,
                    GenderRatio::F3M1,
                    single_ratio,
                ];
                for (ratio, value) in ratios.into_iter().zip(values) {
                    let params = fixed_params(
                        ratio,
                        Some(gender),
                        None,
                        WonderCardShinyPolicy::Random,
                        TRAINER,
                    );
                    let (result, end_seed) = generate_at(seed, &params);
                    assert_eq!(
                        (result.pid, result.gender, end_seed),
                        (Pid(pid_upper | value), gender, end_state),
                        "{seed:016X}, {ratio:?}, {gender:?}"
                    );
                }
            }
        }
    }

    #[test]
    fn unspecified_gender_uses_the_species_ratio_without_an_extra_draw() {
        for (ratio, gender) in [
            (GenderRatio::F1M7, Gender::Male),
            (GenderRatio::F1M3, Gender::Male),
            (GenderRatio::F1M1, Gender::Male),
            (GenderRatio::F3M1, Gender::Male),
            (GenderRatio::MaleOnly, Gender::Male),
            (GenderRatio::FemaleOnly, Gender::Female),
            (GenderRatio::Genderless, Gender::Genderless),
        ] {
            let params = fixed_params(ratio, None, None, WonderCardShinyPolicy::Random, TRAINER);
            let (result, end_seed) = generate_at(START, &params);
            assert_eq!(
                (result.pid, result.gender, end_seed),
                (Pid(0x1044_44C9), gender, 0x9C10_7FC3_AC9F_06EC),
                "{ratio:?}"
            );
        }
    }

    #[test]
    fn ability_conditions_correct_both_values_of_bit_16() {
        let cases = [
            // PID11=104544C9 (bit16=1)
            (
                START,
                0x1044_44C9,
                0x1045_44C9,
                AbilitySlot::First,
                0x9C10_7FC3_AC9F_06EC,
            ),
            // PID11=C0AAEBC7 (bit16=0)
            (
                0,
                0xC0AA_EBC7,
                0xC0AB_EBC7,
                AbilitySlot::Second,
                0x06F2_A159_CA9C_04FC,
            ),
        ];
        for (seed, first_pid, second_pid, random_slot, end_state) in cases {
            for (fixed, expected_pid, expected_slot) in [
                (Some(AbilitySlot::First), first_pid, AbilitySlot::First),
                (Some(AbilitySlot::Second), second_pid, AbilitySlot::Second),
                (Some(AbilitySlot::Hidden), first_pid, AbilitySlot::Hidden),
                (
                    None,
                    if random_slot == AbilitySlot::First {
                        first_pid
                    } else {
                        second_pid
                    },
                    random_slot,
                ),
            ] {
                let params = fixed_params(
                    GenderRatio::F1M1,
                    None,
                    fixed,
                    WonderCardShinyPolicy::Random,
                    TRAINER,
                );
                let (result, end_seed) = generate_at(seed, &params);
                assert_eq!(
                    (result.pid, result.ability_slot, end_seed),
                    (Pid(expected_pid), expected_slot, end_state)
                );
            }
        }
    }

    #[test]
    fn shiny_lock_distinguishes_xor_seven_from_eight() {
        // 元 PID11=104544C9、上位16 bit ^ 下位16 bit = 548C。
        for (sid, expected_pid) in [(0x548B, 0x0044_44C9), (0x5484, 0x1044_44C9)] {
            let params = fixed_params(
                GenderRatio::F1M1,
                None,
                None,
                WonderCardShinyPolicy::Never,
                TrainerInfo { tid: 0, sid },
            );
            let (result, end_seed) = generate_at(START, &params);
            assert_eq!(
                (result.pid, result.shiny_type, end_seed),
                (Pid(expected_pid), ShinyType::None, 0x9C10_7FC3_AC9F_06EC)
            );
        }
    }

    #[test]
    fn random_shininess_is_classified_after_ability_correction() {
        for (sid, unchanged_shiny, changed_shiny) in [
            (0x548C, ShinyType::Square, ShinyType::Star), // 元 XOR=0 → 1
            (0x548D, ShinyType::Star, ShinyType::Square), // 元 XOR=1 → 0
            (0x548B, ShinyType::Star, ShinyType::Star),   // 元 XOR=7 → 6
            (0x5484, ShinyType::None, ShinyType::None),   // 元 XOR=8 → 9
        ] {
            for (ability, expected_pid, expected_shiny) in [
                (Some(AbilitySlot::First), 0x1044_44C9, changed_shiny),
                (Some(AbilitySlot::Second), 0x1045_44C9, unchanged_shiny),
                (Some(AbilitySlot::Hidden), 0x1044_44C9, changed_shiny),
                (None, 0x1044_44C9, changed_shiny),
            ] {
                let params = fixed_params(
                    GenderRatio::F1M1,
                    None,
                    ability,
                    WonderCardShinyPolicy::Random,
                    TrainerInfo { tid: 0, sid },
                );
                let (result, end_seed) = generate_at(START, &params);
                assert_eq!(
                    (result.pid, result.shiny_type, end_seed),
                    (Pid(expected_pid), expected_shiny, 0x9C10_7FC3_AC9F_06EC)
                );
            }
        }
    }

    #[test]
    fn always_shiny_keeps_only_the_low_byte_before_ability_correction() {
        // 元 PID11=104544C9。44C9 ではなく C9 を保持し、TID/SID から上位を作る。
        for (trainer, first_pid, second_pid, first_shiny, second_shiny, random_pid) in [
            (
                TRAINER,
                0xE4C0_00C9,
                0xE4C1_00C9,
                ShinyType::Star,
                ShinyType::Square,
                0xE4C0_00C9,
            ),
            (
                TrainerInfo { tid: 1, sid: 0 },
                0x00C8_00C9,
                0x00C9_00C9,
                ShinyType::Square,
                ShinyType::Star,
                0x00C9_00C9,
            ),
        ] {
            for (ability, expected_pid, expected_shiny, expected_slot) in [
                (
                    Some(AbilitySlot::First),
                    first_pid,
                    first_shiny,
                    AbilitySlot::First,
                ),
                (
                    Some(AbilitySlot::Second),
                    second_pid,
                    second_shiny,
                    AbilitySlot::Second,
                ),
                (
                    Some(AbilitySlot::Hidden),
                    first_pid,
                    first_shiny,
                    AbilitySlot::Hidden,
                ),
                (
                    None,
                    random_pid,
                    ShinyType::Star,
                    if random_pid == first_pid {
                        AbilitySlot::First
                    } else {
                        AbilitySlot::Second
                    },
                ),
            ] {
                let params = fixed_params(
                    GenderRatio::F1M1,
                    None,
                    ability,
                    WonderCardShinyPolicy::Always,
                    trainer,
                );
                let (result, end_seed) = generate_at(START, &params);
                assert_eq!(
                    (result.pid, result.shiny_type, result.ability_slot, end_seed),
                    (
                        Pid(expected_pid),
                        expected_shiny,
                        expected_slot,
                        0x9C10_7FC3_AC9F_06EC
                    )
                );
            }
        }
    }

    #[test]
    fn gender_correction_precedes_every_shiny_policy() {
        // 元 PID13=02AECDF4 → 性別補正02AECD46。SID=CFE8 で補正後だけ XOR=0。
        for (policy, expected_pid, expected_shiny) in [
            (WonderCardShinyPolicy::Never, 0x12AF_CD46, ShinyType::None),
            (WonderCardShinyPolicy::Random, 0x02AF_CD46, ShinyType::Star),
            (WonderCardShinyPolicy::Always, 0xCFAF_0046, ShinyType::Star),
        ] {
            let params = fixed_params(
                GenderRatio::F1M1,
                Some(Gender::Female),
                Some(AbilitySlot::Second),
                policy,
                TrainerInfo {
                    tid: 0,
                    sid: 0xCFE8,
                },
            );
            let (result, end_seed) = generate_at(START, &params);
            assert_eq!(
                (result.pid, result.gender, result.shiny_type, end_seed),
                (
                    Pid(expected_pid),
                    Gender::Female,
                    expected_shiny,
                    0xE36E_5CDE_E0E1_D5B9
                )
            );
        }
    }

    #[test]
    fn constructor_rejects_out_of_range_ivs_in_every_position() {
        for index in 0..6 {
            for value in [32, 33, 255] {
                let mut fixed_ivs = [None; 6];
                fixed_ivs[index] = Some(value);
                let result = WonderCardGenerationParams::new(
                    TRAINER,
                    GenderRatio::F1M1,
                    fixed_ivs,
                    None,
                    None,
                    None,
                    WonderCardShinyPolicy::Random,
                );
                assert!(matches!(result, Err(GenerationError::InvalidConfig(_))));
            }
        }
    }

    #[test]
    fn constructor_accepts_only_compatible_gender_conditions() {
        let both = &[None, Some(Gender::Male), Some(Gender::Female)][..];
        for (ratio, allowed) in [
            (GenderRatio::F1M7, both),
            (GenderRatio::F1M3, both),
            (GenderRatio::F1M1, both),
            (GenderRatio::F3M1, both),
            (GenderRatio::MaleOnly, &[None, Some(Gender::Male)][..]),
            (GenderRatio::FemaleOnly, &[None, Some(Gender::Female)][..]),
            (GenderRatio::Genderless, &[None][..]),
        ] {
            for gender in [
                None,
                Some(Gender::Male),
                Some(Gender::Female),
                Some(Gender::Genderless),
            ] {
                let result = WonderCardGenerationParams::new(
                    TRAINER,
                    ratio,
                    [None; 6],
                    None,
                    gender,
                    None,
                    WonderCardShinyPolicy::Random,
                );
                if allowed.contains(&gender) {
                    assert!(result.is_ok(), "{ratio:?}, {gender:?}");
                } else {
                    assert!(
                        matches!(result, Err(GenerationError::InvalidConfig(_))),
                        "{ratio:?}, {gender:?}"
                    );
                }
            }
        }
    }

    #[test]
    fn constructor_accepts_zero_ids_valid_ivs_and_all_ability_conditions() {
        for (tid, sid) in [(0, 0), (0, u16::MAX), (u16::MAX, 0), (u16::MAX, u16::MAX)] {
            for value in 0..=31 {
                for ability in [
                    None,
                    Some(AbilitySlot::First),
                    Some(AbilitySlot::Second),
                    Some(AbilitySlot::Hidden),
                ] {
                    let result = WonderCardGenerationParams::new(
                        TrainerInfo { tid, sid },
                        GenderRatio::Genderless,
                        [Some(value); 6],
                        Some(Nature::Hardy),
                        None,
                        ability,
                        WonderCardShinyPolicy::Always,
                    );
                    assert!(result.is_ok());
                }
            }
        }
    }

    #[test]
    fn validated_conditions_and_their_clone_reproduce_multiple_start_states() {
        let params = params([None; 6], None, None);
        let cloned = params.clone();
        let fixtures = [
            (
                START,
                [17, 16, 22, 19, 14, 24],
                0xE9A9_2FBC,
                Nature::Relaxed,
                Gender::Male,
                AbilitySlot::Second,
                0x4E73_E9E3_FAB6_5793,
            ),
            (
                0,
                [5, 11, 31, 19, 1, 30],
                0x2B64_413D,
                Nature::Hardy,
                Gender::Female,
                AbilitySlot::First,
                0x093A_15BE_D414_0AE3,
            ),
            (
                1,
                [14, 31, 2, 20, 26, 14],
                0x2C2C_6EAD,
                Nature::Jolly,
                Gender::Male,
                AbilitySlot::First,
                0x8F25_61FF_50F5_FDC8,
            ),
            (
                u64::MAX,
                [28, 23, 29, 17, 8, 13],
                0x2A9C_13CE,
                Nature::Serious,
                Gender::Male,
                AbilitySlot::First,
                0x834E_C97E_5732_17FE,
            ),
        ];
        for _ in 0..2 {
            for (seed, ivs, pid, nature, gender, ability_slot, end_seed) in fixtures {
                let expected = RawWonderCardData {
                    ivs: Ivs::from_array(ivs),
                    pid: Pid(pid),
                    nature,
                    gender,
                    ability_slot,
                    shiny_type: ShinyType::None,
                };
                assert_eq!(generate_at(seed, &params), (expected, end_seed));
                assert_eq!(generate_at(seed, &cloned), (expected, end_seed));
            }
        }
    }
}
