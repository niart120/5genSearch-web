//! BW / BW2 の配達員から受け取る一個体の生成。
//!
//! 起動時消費・操作による消費を適用済みの LCG を受け取り、カード前処理から消費する。
//! 個体値・PID・性格はすべて同じ LCG から取得する。

use crate::core::lcg::{Lcg64, roll_fraction};
use crate::generation::algorithm::{apply_shiny_lock, extract_iv, nature_roll};
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
mod tests;
