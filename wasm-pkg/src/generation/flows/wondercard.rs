//! BW / BW2 の配達員から受け取る一個体の生成。
//!
//! 起動時消費・操作による消費を適用済みの LCG を受け取り、カード前処理から消費する。
//! 個体値・PID・性格はすべて同じ LCG から取得する。

use crate::core::lcg::{Lcg64, roll_fraction};
use crate::generation::algorithm::apply_shiny_lock;
use crate::generation::flows::types::GenerationError;
use crate::types::{AbilitySlot, Gender, GenderRatio, Ivs, Nature, Pid, ShinyType, TrainerInfo};

/// 配布条件による色違いの扱い。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WonderCardShinyPolicy {
    Never,
    Random,
    Always,
}

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
#[allow(clippy::cast_possible_truncation)] // 個体値は上位 5 bit、性格は 0..25、個体値数は最大 6。
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
            .map(|fixed| fixed.unwrap_or_else(|| (lcg.next().unwrap_or(0) >> 27) as u8)),
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
        .unwrap_or_else(|| Nature::from_u8(roll_fraction(lcg.next().unwrap_or(0), 25) as u8));

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
}
