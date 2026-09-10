//! 配達員の確定個体情報を既存の名称・表示形式へ変換する。

use super::format_hidden_power_type;
use crate::data::{get_ability_name, get_nature_name, get_species_name};
use crate::types::{Gender, GeneratedWonderCardData, SeedOrigin, ShinyType, UiWonderCardData};

pub(crate) fn resolve_wondercard_data(
    data: &GeneratedWonderCardData,
    locale: &str,
) -> UiWonderCardData {
    let (datetime_iso, timer0, vcount, key_input) = match &data.source {
        SeedOrigin::Startup {
            datetime,
            condition,
            ..
        } => (
            Some(format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
                datetime.year,
                datetime.month,
                datetime.day,
                datetime.hour,
                datetime.minute,
                datetime.second
            )),
            Some(format!("{:04X}", condition.timer0)),
            Some(format!("{:02X}", condition.vcount)),
            Some(condition.key_mask.to_display_string()),
        ),
        SeedOrigin::Seed { .. } => (None, None, None, None),
    };
    let core = data.core;
    UiWonderCardData {
        advance: data.advance,
        needle_direction: data.needle_direction.value(),
        base_seed: format!("{:016X}", data.source.base_seed().value()),
        datetime_iso,
        timer0,
        vcount,
        key_input,
        species_name: get_species_name(core.species_id, locale).into(),
        nature_name: get_nature_name(core.nature as u8, locale).into(),
        ability_name: get_ability_name(core.species_id, core.ability_slot, locale).into(),
        gender_symbol: match core.gender {
            Gender::Male => "♂",
            Gender::Female => "♀",
            Gender::Genderless => "-",
        }
        .into(),
        shiny_symbol: match core.shiny_type {
            ShinyType::None => "",
            ShinyType::Star => "☆",
            ShinyType::Square => "◇",
        }
        .into(),
        level: core.level,
        ivs: core.ivs.to_array().map(|iv| iv.to_string()),
        stats: core
            .stats
            .to_array()
            .map(|stat| stat.map_or_else(|| "?".into(), |s| s.to_string())),
        hidden_power_type: format_hidden_power_type(core.ivs.hidden_power_type(), locale),
        hidden_power_power: core.ivs.hidden_power_power().to_string(),
        pid: core.pid.to_hex_string(),
    }
}
