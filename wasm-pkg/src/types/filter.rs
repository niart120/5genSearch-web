//! フィルター型
//!
//! Generator / Searcher 共通で利用可能なフィルター型体系。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::generation::{GeneratedEggData, GeneratedPokemonData};
use super::pokemon::{Gender, IvFilter, Ivs, Nature, ShinyType};

// ===== ShinyFilter =====

/// 色違いフィルター
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyFilter {
    /// 色違いのみ (Star or Square)
    Any,
    /// 星型のみ
    Star,
    /// ひし形のみ
    Square,
}

impl ShinyFilter {
    /// 色違い条件に一致するか判定
    #[inline]
    pub fn matches(&self, shiny_type: ShinyType) -> bool {
        match self {
            Self::Any => shiny_type != ShinyType::None,
            Self::Star => shiny_type == ShinyType::Star,
            Self::Square => shiny_type == ShinyType::Square,
        }
    }
}

// ===== ResultFilter =====

/// 生成結果の共通フィルター条件
///
/// Pokemon / Egg 共通の属性をフィルタリング。
/// 各フィールドが `None` の場合は条件なし (全件通過)。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct ResultFilter {
    /// IV フィルター
    pub iv: Option<IvFilter>,
    /// 性格
    pub nature: Option<Nature>,
    /// 性別
    pub gender: Option<Gender>,
    /// 特性スロット (0, 1, 2)
    pub ability_slot: Option<u8>,
    /// 色違い
    pub shiny: Option<ShinyFilter>,
}

impl ResultFilter {
    /// 条件なしフィルター (全件通過)
    pub const fn any() -> Self {
        Self {
            iv: None,
            nature: None,
            gender: None,
            ability_slot: None,
            shiny: None,
        }
    }

    /// `GeneratedPokemonData` が条件に一致するか判定
    pub fn matches_pokemon(&self, data: &GeneratedPokemonData) -> bool {
        self.matches_core(
            data.ivs,
            data.nature,
            data.gender,
            data.ability_slot,
            data.shiny_type,
        )
    }

    /// `GeneratedEggData` が条件に一致するか判定
    pub fn matches_egg(&self, data: &GeneratedEggData) -> bool {
        self.matches_core(
            data.ivs,
            data.nature,
            data.gender,
            data.ability_slot,
            data.shiny_type,
        )
    }

    /// 共通の判定ロジック
    fn matches_core(
        &self,
        ivs: Ivs,
        nature: Nature,
        gender: Gender,
        ability_slot: u8,
        shiny_type: ShinyType,
    ) -> bool {
        // IV フィルター
        if let Some(ref iv_filter) = self.iv
            && !iv_filter.matches(&ivs)
        {
            return false;
        }

        // 性格
        if let Some(required_nature) = self.nature
            && nature != required_nature
        {
            return false;
        }

        // 性別
        if let Some(required_gender) = self.gender
            && gender != required_gender
        {
            return false;
        }

        // 特性スロット
        if let Some(required_slot) = self.ability_slot
            && ability_slot != required_slot
        {
            return false;
        }

        // 色違い
        if let Some(ref shiny_filter) = self.shiny
            && !shiny_filter.matches(shiny_type)
        {
            return false;
        }

        true
    }
}

// ===== PokemonFilter =====

/// ポケモンフィルター (野生/固定用)
///
/// `ResultFilter` に加え、種族・レベル条件をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonFilter {
    /// 共通条件
    #[serde(flatten)]
    pub base: ResultFilter,
    /// 種族 ID (複数指定可、いずれかに一致)
    pub species_ids: Option<Vec<u16>>,
    /// レベル範囲 (min, max)
    pub level_range: Option<(u8, u8)>,
}

impl PokemonFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            base: ResultFilter::any(),
            species_ids: None,
            level_range: None,
        }
    }

    /// `GeneratedPokemonData` が条件に一致するか判定
    pub fn matches(&self, data: &GeneratedPokemonData) -> bool {
        // 共通条件
        if !self.base.matches_pokemon(data) {
            return false;
        }

        // 種族 ID
        if let Some(ref ids) = self.species_ids
            && !ids.is_empty()
            && !ids.contains(&data.species_id)
        {
            return false;
        }

        // レベル範囲
        if let Some((min, max)) = self.level_range
            && (data.level < min || data.level > max)
        {
            return false;
        }

        true
    }
}

// ===== EggFilter =====

/// 孵化フィルター
///
/// `ResultFilter` に加え、猶予フレーム条件をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggFilter {
    /// 共通条件
    #[serde(flatten)]
    pub base: ResultFilter,
    /// 猶予フレーム最小値 (NPC消費考慮時)
    pub min_margin_frames: Option<u32>,
}

impl EggFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            base: ResultFilter::any(),
            min_margin_frames: None,
        }
    }

    /// `GeneratedEggData` が条件に一致するか判定
    pub fn matches(&self, data: &GeneratedEggData) -> bool {
        // 共通条件
        if !self.base.matches_egg(data) {
            return false;
        }

        // 猶予フレーム
        if let Some(min_margin) = self.min_margin_frames {
            match data.margin_frames {
                Some(margin) if margin >= min_margin => {}
                _ => return false,
            }
        }

        true
    }
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{InheritanceSlot, Ivs, NeedleDirection, SeedOrigin};

    // テスト用ヘルパー: GeneratedPokemonData を生成
    fn make_pokemon(
        ivs: Ivs,
        nature: Nature,
        gender: Gender,
        ability_slot: u8,
        shiny_type: ShinyType,
        species_id: u16,
        level: u8,
    ) -> GeneratedPokemonData {
        GeneratedPokemonData {
            advance: 0,
            needle_direction: NeedleDirection::E,
            source: SeedOrigin::seed(0.into()),
            pid: 0,
            species_id,
            level,
            nature,
            sync_applied: false,
            ability_slot,
            gender,
            shiny_type,
            held_item_slot: crate::types::HeldItemSlot::None,
            ivs,
            moving_encounter: None,
            special_encounter: None,
            encounter_result: crate::types::EncounterResult::Pokemon,
        }
    }

    // テスト用ヘルパー: GeneratedEggData を生成
    fn make_egg(
        ivs: Ivs,
        nature: Nature,
        gender: Gender,
        ability_slot: u8,
        shiny_type: ShinyType,
        margin_frames: Option<u32>,
    ) -> GeneratedEggData {
        GeneratedEggData {
            advance: 0,
            needle_direction: NeedleDirection::E,
            source: SeedOrigin::seed(0.into()),
            pid: 0,
            nature,
            gender,
            ability_slot,
            shiny_type,
            inheritance: [InheritanceSlot::default(); 3],
            ivs,
            margin_frames,
        }
    }

    // === ShinyFilter Tests ===

    #[test]
    fn test_shiny_filter_any() {
        let filter = ShinyFilter::Any;
        assert!(!filter.matches(ShinyType::None));
        assert!(filter.matches(ShinyType::Star));
        assert!(filter.matches(ShinyType::Square));
    }

    #[test]
    fn test_shiny_filter_star() {
        let filter = ShinyFilter::Star;
        assert!(!filter.matches(ShinyType::None));
        assert!(filter.matches(ShinyType::Star));
        assert!(!filter.matches(ShinyType::Square));
    }

    #[test]
    fn test_shiny_filter_square() {
        let filter = ShinyFilter::Square;
        assert!(!filter.matches(ShinyType::None));
        assert!(!filter.matches(ShinyType::Star));
        assert!(filter.matches(ShinyType::Square));
    }

    // === ResultFilter Tests ===

    #[test]
    fn test_result_filter_any_passes_all() {
        let filter = ResultFilter::any();
        let pokemon = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon));
    }

    #[test]
    fn test_result_filter_iv() {
        let filter = ResultFilter {
            iv: Some(IvFilter::six_v()),
            ..Default::default()
        };
        // 6V: 通過
        let pokemon_6v = make_pokemon(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_6v));
        // 5V: 不通過
        let pokemon_5v = make_pokemon(
            Ivs::new(31, 31, 31, 31, 31, 30),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(!filter.matches_pokemon(&pokemon_5v));
    }

    #[test]
    fn test_result_filter_nature() {
        let filter = ResultFilter {
            nature: Some(Nature::Adamant),
            ..Default::default()
        };
        let pokemon_adamant = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_timid = make_pokemon(
            Ivs::uniform(15),
            Nature::Timid,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_adamant));
        assert!(!filter.matches_pokemon(&pokemon_timid));
    }

    #[test]
    fn test_result_filter_gender() {
        let filter = ResultFilter {
            gender: Some(Gender::Female),
            ..Default::default()
        };
        let pokemon_female = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Female,
            0,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_male = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_female));
        assert!(!filter.matches_pokemon(&pokemon_male));
    }

    #[test]
    fn test_result_filter_ability() {
        let filter = ResultFilter {
            ability_slot: Some(2),
            ..Default::default()
        };
        let pokemon_slot2 = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            2,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_slot0 = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_slot2));
        assert!(!filter.matches_pokemon(&pokemon_slot0));
    }

    #[test]
    fn test_result_filter_shiny() {
        let filter = ResultFilter {
            shiny: Some(ShinyFilter::Any),
            ..Default::default()
        };
        let pokemon_shiny = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::Star,
            1,
            50,
        );
        let pokemon_normal = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_shiny));
        assert!(!filter.matches_pokemon(&pokemon_normal));
    }

    #[test]
    fn test_result_filter_combined() {
        // 複合条件: 6V + Adamant + Female + Shiny
        let filter = ResultFilter {
            iv: Some(IvFilter::six_v()),
            nature: Some(Nature::Adamant),
            gender: Some(Gender::Female),
            shiny: Some(ShinyFilter::Any),
            ..Default::default()
        };
        // すべて満たす
        let pokemon_pass = make_pokemon(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Female,
            0,
            ShinyType::Star,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_pass));
        // 性格が異なる
        let pokemon_fail = make_pokemon(
            Ivs::uniform(31),
            Nature::Timid,
            Gender::Female,
            0,
            ShinyType::Star,
            1,
            50,
        );
        assert!(!filter.matches_pokemon(&pokemon_fail));
    }

    // === PokemonFilter Tests ===

    #[test]
    fn test_pokemon_filter_species() {
        let filter = PokemonFilter {
            species_ids: Some(vec![25, 26]), // Pikachu, Raichu
            ..Default::default()
        };
        let pokemon_pikachu = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            25,
            50,
        );
        let pokemon_other = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches(&pokemon_pikachu));
        assert!(!filter.matches(&pokemon_other));
    }

    #[test]
    fn test_pokemon_filter_level() {
        let filter = PokemonFilter {
            level_range: Some((50, 60)),
            ..Default::default()
        };
        let pokemon_in_range = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            55,
        );
        let pokemon_below = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            49,
        );
        let pokemon_above = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            1,
            61,
        );
        assert!(filter.matches(&pokemon_in_range));
        assert!(!filter.matches(&pokemon_below));
        assert!(!filter.matches(&pokemon_above));
    }

    // === EggFilter Tests ===

    #[test]
    fn test_egg_filter_margin() {
        let filter = EggFilter {
            min_margin_frames: Some(10),
            ..Default::default()
        };
        let egg_enough = make_egg(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            Some(15),
        );
        let egg_not_enough = make_egg(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            Some(5),
        );
        let egg_none = make_egg(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::None,
            None,
        );
        assert!(filter.matches(&egg_enough));
        assert!(!filter.matches(&egg_not_enough));
        assert!(!filter.matches(&egg_none));
    }

    #[test]
    fn test_egg_filter_combined() {
        let filter = EggFilter {
            base: ResultFilter {
                nature: Some(Nature::Jolly),
                shiny: Some(ShinyFilter::Any),
                ..Default::default()
            },
            min_margin_frames: Some(5),
        };
        let egg_pass = make_egg(
            Ivs::uniform(31),
            Nature::Jolly,
            Gender::Male,
            0,
            ShinyType::Square,
            Some(10),
        );
        let egg_fail_nature = make_egg(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Male,
            0,
            ShinyType::Square,
            Some(10),
        );
        let egg_fail_margin = make_egg(
            Ivs::uniform(31),
            Nature::Jolly,
            Gender::Male,
            0,
            ShinyType::Square,
            Some(3),
        );
        assert!(filter.matches(&egg_pass));
        assert!(!filter.matches(&egg_fail_nature));
        assert!(!filter.matches(&egg_fail_margin));
    }
}
