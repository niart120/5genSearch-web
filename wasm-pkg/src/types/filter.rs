//! フィルター型
//!
//! Generator / Searcher 共通で利用可能なフィルター型体系。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::generation::{CorePokemonData, GeneratedEggData, GeneratedPokemonData};
use super::pokemon::{
    AbilitySlot, Gender, HiddenPowerType, Ivs, Nature, Pid, ShinyType, TrainerInfo,
};
use crate::data::Stats;

// ===== IvFilter =====

/// IV フィルタ条件
///
/// 各ステータスの範囲指定に加え、めざめるパワーのタイプ・威力条件を指定可能。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvFilter {
    /// HP (min, max)
    pub hp: (u8, u8),
    /// 攻撃 (min, max)
    pub atk: (u8, u8),
    /// 防御 (min, max)
    pub def: (u8, u8),
    /// 特攻 (min, max)
    pub spa: (u8, u8),
    /// 特防 (min, max)
    pub spd: (u8, u8),
    /// 素早さ (min, max)
    pub spe: (u8, u8),
    /// めざパタイプ条件 (指定タイプのいずれかに一致)
    #[serde(default)]
    pub hidden_power_types: Option<Vec<HiddenPowerType>>,
    /// めざパ威力下限 (30-70)
    #[serde(default)]
    pub hidden_power_min_power: Option<u8>,
}

impl IvFilter {
    /// 全範囲 (0-31) を許容するフィルタ
    pub const fn any() -> Self {
        Self {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        }
    }

    /// 6V フィルタ
    pub const fn six_v() -> Self {
        Self {
            hp: (31, 31),
            atk: (31, 31),
            def: (31, 31),
            spa: (31, 31),
            spd: (31, 31),
            spe: (31, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        }
    }

    /// 指定 IV が条件を満たすか判定
    ///
    /// IV が `IV_VALUE_UNKNOWN` (32) の場合の特別扱い:
    /// - 範囲が任意 (min=0, max>=31) なら通過
    /// - それ以外 (特定範囲指定) なら不通過
    /// - めざパフィルタがある場合、Unknown IV が含まれていればめざパチェックをスキップ
    #[inline]
    pub fn matches(&self, ivs: &Ivs) -> bool {
        use super::pokemon::IV_VALUE_UNKNOWN;

        // 各ステータスの範囲チェック (Unknown 対応)
        if !Self::check_stat(ivs.hp, self.hp)
            || !Self::check_stat(ivs.atk, self.atk)
            || !Self::check_stat(ivs.def, self.def)
            || !Self::check_stat(ivs.spa, self.spa)
            || !Self::check_stat(ivs.spd, self.spd)
            || !Self::check_stat(ivs.spe, self.spe)
        {
            return false;
        }

        // Unknown IV が含まれている場合、めざパチェックをスキップ
        let has_unknown = ivs.hp == IV_VALUE_UNKNOWN
            || ivs.atk == IV_VALUE_UNKNOWN
            || ivs.def == IV_VALUE_UNKNOWN
            || ivs.spa == IV_VALUE_UNKNOWN
            || ivs.spd == IV_VALUE_UNKNOWN
            || ivs.spe == IV_VALUE_UNKNOWN;

        // めざパタイプチェック (Unknown IV が含まれている場合はスキップ)
        if !has_unknown {
            if let Some(ref types) = self.hidden_power_types
                && !types.is_empty()
                && !types.contains(&ivs.hidden_power_type())
            {
                return false;
            }

            // めざパ威力チェック (Unknown IV が含まれている場合はスキップ)
            if let Some(min_power) = self.hidden_power_min_power
                && ivs.hidden_power_power() < min_power
            {
                return false;
            }
        }

        true
    }

    /// 単一ステータスの範囲チェック (Unknown 対応)
    ///
    /// - `value == IV_VALUE_UNKNOWN` かつ 任意範囲 (min=0, max>=31) なら通過
    /// - `value == IV_VALUE_UNKNOWN` かつ 特定範囲指定なら不通過
    /// - それ以外は通常の範囲チェック
    #[inline]
    fn check_stat(value: u8, range: (u8, u8)) -> bool {
        use super::pokemon::IV_VALUE_UNKNOWN;
        if value == IV_VALUE_UNKNOWN {
            // Unknown は任意範囲 (min=0, max>=31) のみ通過
            range.0 == 0 && range.1 >= 31
        } else {
            value >= range.0 && value <= range.1
        }
    }
}

// ===== ShinyFilter =====

/// 色違いフィルター
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyFilter {
    /// 色違いのみ (Star or Square)
    Shiny,
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
            Self::Shiny => shiny_type != ShinyType::None,
            Self::Star => shiny_type == ShinyType::Star,
            Self::Square => shiny_type == ShinyType::Square,
        }
    }
}

// ===== StatsFilter =====

/// 実ステータスフィルター
///
/// 各フィールドが `Some(v)` の場合、stats の対応する値が `Some(v)` に一致する場合のみ通過。
/// stats 側が `None` (IV 不明等) の場合、フィルタ条件の有無にかかわらず通過する。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct StatsFilter {
    pub hp: Option<u16>,
    pub atk: Option<u16>,
    pub def: Option<u16>,
    pub spa: Option<u16>,
    pub spd: Option<u16>,
    pub spe: Option<u16>,
}

impl StatsFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            hp: None,
            atk: None,
            def: None,
            spa: None,
            spd: None,
            spe: None,
        }
    }

    /// 指定した Stats が条件に一致するか判定
    pub fn matches(&self, stats: &Stats) -> bool {
        Self::check(self.hp, stats.hp)
            && Self::check(self.atk, stats.attack)
            && Self::check(self.def, stats.defense)
            && Self::check(self.spa, stats.special_attack)
            && Self::check(self.spd, stats.special_defense)
            && Self::check(self.spe, stats.speed)
    }

    /// 単一ステータスのマッチング
    ///
    /// - フィルタ `None`: 無条件通過
    /// - stats `None` (不明): フィルタ値に依らず通過
    /// - 両方 `Some`: 値の一致判定
    #[inline]
    fn check(filter: Option<u16>, actual: Option<u16>) -> bool {
        match (filter, actual) {
            (None, _) | (Some(_), None) => true,
            (Some(f), Some(a)) => f == a,
        }
    }
}

// ===== TrainerInfoFilter =====

/// `TrainerInfo` 検索フィルタ
///
/// TID/SID の完全一致、または `ShinyPID` による色違い判定を行う。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoFilter {
    /// 検索対象の TID (None で条件なし)
    pub tid: Option<u16>,
    /// 検索対象の SID (None で条件なし)
    pub sid: Option<u16>,
    /// 色違いにしたい個体の PID (None で条件なし)
    pub shiny_pid: Option<Pid>,
}

impl TrainerInfoFilter {
    /// フィルタ条件に一致するか判定
    ///
    /// - TID/SID は完全一致
    /// - `ShinyPID` 指定時は色違いであることを要求
    #[inline]
    pub fn matches(&self, trainer: &TrainerInfo, shiny_type: ShinyType) -> bool {
        // TID フィルタ
        if let Some(tid) = self.tid
            && trainer.tid != tid
        {
            return false;
        }
        // SID フィルタ
        if let Some(sid) = self.sid
            && trainer.sid != sid
        {
            return false;
        }
        // ShinyPID フィルタ (指定時は色違いであることを要求)
        if self.shiny_pid.is_some() && shiny_type == ShinyType::None {
            return false;
        }
        true
    }
}

// ===== CoreDataFilter =====

/// 生成結果の共通フィルター条件
///
/// `CorePokemonData` に対応するフィルター。
/// 各フィールドが `None` の場合は条件なし (全件通過)。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CoreDataFilter {
    /// IV フィルター
    pub iv: Option<IvFilter>,
    /// 性格 (複数指定可、いずれかに一致)
    pub natures: Option<Vec<Nature>>,
    /// 性別
    pub gender: Option<Gender>,
    /// 特性スロット
    pub ability_slot: Option<AbilitySlot>,
    /// 色違い
    pub shiny: Option<ShinyFilter>,
    /// 実ステータスフィルター
    pub stats: Option<StatsFilter>,
}

impl CoreDataFilter {
    /// 条件なしフィルター (全件通過)
    pub const fn any() -> Self {
        Self {
            iv: None,
            natures: None,
            gender: None,
            ability_slot: None,
            shiny: None,
            stats: None,
        }
    }

    /// `CorePokemonData` が条件に一致するか判定
    pub fn matches(&self, core: &CorePokemonData) -> bool {
        // IV フィルター
        if let Some(ref iv_filter) = self.iv
            && !iv_filter.matches(&core.ivs)
        {
            return false;
        }

        // 性格 (複数指定のいずれかに一致)
        if let Some(ref required_natures) = self.natures
            && !required_natures.is_empty()
            && !required_natures.contains(&core.nature)
        {
            return false;
        }

        // 性別
        if let Some(required_gender) = self.gender
            && core.gender != required_gender
        {
            return false;
        }

        // 特性スロット
        if let Some(required_slot) = self.ability_slot
            && core.ability_slot != required_slot
        {
            return false;
        }

        // 色違い
        if let Some(ref shiny_filter) = self.shiny
            && !shiny_filter.matches(core.shiny_type)
        {
            return false;
        }

        // 実ステータスフィルター
        if let Some(ref stats_filter) = self.stats
            && !stats_filter.matches(&core.stats)
        {
            return false;
        }

        true
    }

    /// `GeneratedPokemonData` が条件に一致するか判定
    pub fn matches_pokemon(&self, data: &GeneratedPokemonData) -> bool {
        self.matches(&data.core)
    }

    /// `GeneratedEggData` が条件に一致するか判定
    pub fn matches_egg(&self, data: &GeneratedEggData) -> bool {
        self.matches(&data.core)
    }
}

// ===== PokemonFilter =====

/// ポケモンフィルター (野生/固定用)
///
/// `CoreDataFilter` に加え、種族・レベル条件をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonFilter {
    /// 共通条件
    #[serde(flatten)]
    pub base: CoreDataFilter,
    /// 種族 ID (複数指定可、いずれかに一致)
    pub species_ids: Option<Vec<u16>>,
    /// レベル範囲 (min, max)
    pub level_range: Option<(u8, u8)>,
}

impl PokemonFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            base: CoreDataFilter::any(),
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
            && !ids.contains(&data.core.species_id)
        {
            return false;
        }

        // レベル範囲
        if let Some((min, max)) = self.level_range
            && (data.core.level < min || data.core.level > max)
        {
            return false;
        }

        true
    }
}

// ===== EggFilter =====

/// 孵化フィルター
///
/// `CoreDataFilter` に加え、猶予フレーム条件をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggFilter {
    /// 共通条件
    #[serde(flatten)]
    pub base: CoreDataFilter,
    /// 猶予フレーム最小値 (NPC消費考慮時)
    pub min_margin_frames: Option<u32>,
}

impl EggFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            base: CoreDataFilter::any(),
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
    use crate::data::Stats;
    use crate::types::{HiddenPowerType, InheritanceSlot, Ivs, NeedleDirection, Pid, SeedOrigin};

    // テスト用ヘルパー: GeneratedPokemonData を生成
    fn make_pokemon(
        ivs: Ivs,
        nature: Nature,
        gender: Gender,
        ability_slot: AbilitySlot,
        shiny_type: ShinyType,
        species_id: u16,
        level: u8,
    ) -> GeneratedPokemonData {
        GeneratedPokemonData {
            advance: 0,
            needle_direction: NeedleDirection::E,
            source: SeedOrigin::seed(0.into()),
            core: CorePokemonData {
                pid: Pid::ZERO,
                nature,
                ability_slot,
                gender,
                shiny_type,
                ivs,
                stats: Stats::UNKNOWN,
                species_id,
                level,
            },
            sync_applied: false,
            held_item_slot: crate::types::HeldItemSlot::None,
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
        ability_slot: AbilitySlot,
        shiny_type: ShinyType,
        margin_frames: Option<u32>,
    ) -> GeneratedEggData {
        GeneratedEggData {
            advance: 0,
            needle_direction: NeedleDirection::E,
            source: SeedOrigin::seed(0.into()),
            core: CorePokemonData {
                pid: Pid::ZERO,
                nature,
                ability_slot,
                gender,
                shiny_type,
                ivs,
                stats: Stats::UNKNOWN,
                species_id: 0, // 卵は種族ID未定義
                level: 1,
            },
            inheritance: [InheritanceSlot::default(); 3],
            margin_frames,
        }
    }

    // === ShinyFilter Tests ===

    #[test]
    fn test_shiny_filter_shiny() {
        let filter = ShinyFilter::Shiny;
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

    // === CoreDataFilter Tests ===

    #[test]
    fn test_result_filter_any_passes_all() {
        let filter = CoreDataFilter::any();
        let pokemon = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon));
    }

    #[test]
    fn test_result_filter_iv() {
        let filter = CoreDataFilter {
            iv: Some(IvFilter::six_v()),
            ..Default::default()
        };
        // 6V: 通過
        let pokemon_6v = make_pokemon(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
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
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        assert!(!filter.matches_pokemon(&pokemon_5v));
    }

    #[test]
    fn test_result_filter_nature() {
        let filter = CoreDataFilter {
            natures: Some(vec![Nature::Adamant]),
            ..Default::default()
        };
        let pokemon_adamant = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_timid = make_pokemon(
            Ivs::uniform(15),
            Nature::Timid,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_adamant));
        assert!(!filter.matches_pokemon(&pokemon_timid));
    }

    #[test]
    fn test_result_filter_nature_multiple() {
        // 複数性格指定: Adamant or Jolly
        let filter = CoreDataFilter {
            natures: Some(vec![Nature::Adamant, Nature::Jolly]),
            ..Default::default()
        };
        let pokemon_adamant = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_jolly = make_pokemon(
            Ivs::uniform(15),
            Nature::Jolly,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_timid = make_pokemon(
            Ivs::uniform(15),
            Nature::Timid,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_adamant));
        assert!(filter.matches_pokemon(&pokemon_jolly));
        assert!(!filter.matches_pokemon(&pokemon_timid));
    }

    #[test]
    fn test_result_filter_gender() {
        let filter = CoreDataFilter {
            gender: Some(Gender::Female),
            ..Default::default()
        };
        let pokemon_female = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Female,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_male = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_female));
        assert!(!filter.matches_pokemon(&pokemon_male));
    }

    #[test]
    fn test_result_filter_ability() {
        let filter = CoreDataFilter {
            ability_slot: Some(AbilitySlot::Hidden),
            ..Default::default()
        };
        let pokemon_slot2 = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::Hidden,
            ShinyType::None,
            1,
            50,
        );
        let pokemon_slot0 = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        assert!(filter.matches_pokemon(&pokemon_slot2));
        assert!(!filter.matches_pokemon(&pokemon_slot0));
    }

    #[test]
    fn test_result_filter_shiny() {
        let filter = CoreDataFilter {
            shiny: Some(ShinyFilter::Shiny),
            ..Default::default()
        };
        let pokemon_shiny = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::Star,
            1,
            50,
        );
        let pokemon_normal = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
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
        let filter = CoreDataFilter {
            iv: Some(IvFilter::six_v()),
            natures: Some(vec![Nature::Adamant]),
            gender: Some(Gender::Female),
            shiny: Some(ShinyFilter::Shiny),
            ..Default::default()
        };
        // すべて満たす
        let pokemon_pass = make_pokemon(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Female,
            AbilitySlot::First,
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
            AbilitySlot::First,
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
            AbilitySlot::First,
            ShinyType::None,
            25,
            50,
        );
        let pokemon_other = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
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
            AbilitySlot::First,
            ShinyType::None,
            1,
            55,
        );
        let pokemon_below = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            49,
        );
        let pokemon_above = make_pokemon(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
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
            AbilitySlot::First,
            ShinyType::None,
            Some(15),
        );
        let egg_not_enough = make_egg(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            Some(5),
        );
        let egg_none = make_egg(
            Ivs::uniform(15),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
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
            base: CoreDataFilter {
                natures: Some(vec![Nature::Jolly]),
                shiny: Some(ShinyFilter::Shiny),
                ..Default::default()
            },
            min_margin_frames: Some(5),
        };
        let egg_pass = make_egg(
            Ivs::uniform(31),
            Nature::Jolly,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::Square,
            Some(10),
        );
        let egg_fail_nature = make_egg(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::Square,
            Some(10),
        );
        let egg_fail_margin = make_egg(
            Ivs::uniform(31),
            Nature::Jolly,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::Square,
            Some(3),
        );
        assert!(filter.matches(&egg_pass));
        assert!(!filter.matches(&egg_fail_nature));
        assert!(!filter.matches(&egg_fail_margin));
    }

    // === IvFilter Tests ===

    #[test]
    fn test_iv_filter_any() {
        let filter = IvFilter::any();
        let ivs = Ivs::new(15, 15, 15, 15, 15, 15);
        assert!(filter.matches(&ivs));
    }

    #[test]
    fn test_iv_filter_six_v() {
        let filter = IvFilter::six_v();
        let ivs_6v = Ivs::new(31, 31, 31, 31, 31, 31);
        let ivs_5v = Ivs::new(31, 30, 31, 31, 31, 31);
        assert!(filter.matches(&ivs_6v));
        assert!(!filter.matches(&ivs_5v));
    }

    #[test]
    fn test_iv_filter_hidden_power_type() {
        let filter = IvFilter {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: Some(vec![HiddenPowerType::Ice]),
            hidden_power_min_power: None,
        };

        // めざ氷: 31-30-30-31-31-31
        let ivs_ice = Ivs::new(31, 30, 30, 31, 31, 31);
        assert!(filter.matches(&ivs_ice));

        // めざ炎: 30-31-30-30-31-30
        let ivs_fire = Ivs::new(30, 31, 30, 30, 31, 30);
        assert!(!filter.matches(&ivs_fire));
    }

    #[test]
    fn test_iv_filter_hidden_power_power() {
        let filter = IvFilter {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: None,
            hidden_power_min_power: Some(70),
        };

        // 威力最大 (70): 6V
        let ivs_max = Ivs::new(31, 31, 31, 31, 31, 31);
        assert!(filter.matches(&ivs_max));

        // 威力最小 (30): 0V
        let ivs_min = Ivs::new(0, 0, 0, 0, 0, 0);
        assert!(!filter.matches(&ivs_min));
    }

    #[test]
    fn test_iv_filter_unknown_any_range() {
        use super::super::pokemon::IV_VALUE_UNKNOWN;

        // 任意範囲 (0, 31) のフィルタ
        let filter = IvFilter::any();

        // Unknown IV を含む個体は通過
        let ivs = Ivs::new(IV_VALUE_UNKNOWN, 20, 25, 30, 15, 10);
        assert!(filter.matches(&ivs));

        // 全て Unknown でも通過
        let ivs_all_unknown = Ivs::new(
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
        );
        assert!(filter.matches(&ivs_all_unknown));
    }

    #[test]
    fn test_iv_filter_unknown_specific_range() {
        use super::super::pokemon::IV_VALUE_UNKNOWN;

        // 特定範囲 (31, 31) のフィルタ
        let filter = IvFilter {
            hp: (31, 31),
            atk: (31, 31),
            def: (31, 31),
            spa: (31, 31),
            spd: (31, 31),
            spe: (31, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        };

        // Unknown IV を含む個体は不通過
        let ivs = Ivs::new(IV_VALUE_UNKNOWN, 31, 31, 31, 31, 31);
        assert!(!filter.matches(&ivs));

        // 6V は通過
        let ivs_6v = Ivs::new(31, 31, 31, 31, 31, 31);
        assert!(filter.matches(&ivs_6v));
    }

    #[test]
    fn test_iv_filter_unknown_with_hidden_power() {
        use super::super::pokemon::IV_VALUE_UNKNOWN;

        // めざパタイプ指定のフィルタ
        let filter = IvFilter {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: Some(vec![HiddenPowerType::Fire]),
            hidden_power_min_power: None,
        };

        // Unknown IV を含む個体 → めざパチェックスキップで通過
        let ivs_unknown = Ivs::new(IV_VALUE_UNKNOWN, 20, 25, 30, 15, 10);
        assert!(filter.matches(&ivs_unknown));

        // 全て Unknown でも通過
        let ivs_all_unknown = Ivs::new(
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
        );
        assert!(filter.matches(&ivs_all_unknown));
    }

    #[test]
    fn test_iv_filter_unknown_partial_range() {
        use super::super::pokemon::IV_VALUE_UNKNOWN;

        // 一部ステータスが特定範囲
        let filter = IvFilter {
            hp: (0, 31),   // 任意
            atk: (25, 31), // 特定範囲
            def: (0, 31),  // 任意
            spa: (0, 31),  // 任意
            spd: (0, 31),  // 任意
            spe: (0, 31),  // 任意
            hidden_power_types: None,
            hidden_power_min_power: None,
        };

        // HP が Unknown → 通過 (HP は任意範囲)
        let ivs_hp_unknown = Ivs::new(IV_VALUE_UNKNOWN, 30, 20, 15, 10, 5);
        assert!(filter.matches(&ivs_hp_unknown));

        // ATK が Unknown → 不通過 (ATK は特定範囲)
        let ivs_atk_unknown = Ivs::new(25, IV_VALUE_UNKNOWN, 20, 15, 10, 5);
        assert!(!filter.matches(&ivs_atk_unknown));
    }

    #[test]
    fn test_iv_filter_unknown_max32_range() {
        use super::super::pokemon::IV_VALUE_UNKNOWN;

        // allowUnknown により max=32 (0, 32) となる範囲のフィルタ
        let filter = IvFilter {
            hp: (0, 32), // Unknown 許容の任意範囲
            atk: (0, 32),
            def: (0, 32),
            spa: (0, 32),
            spd: (0, 32),
            spe: (0, 32),
            hidden_power_types: None,
            hidden_power_min_power: None,
        };

        // Unknown IV → 通過 (max >= 31 なので任意扱い)
        let ivs_unknown = Ivs::new(IV_VALUE_UNKNOWN, 20, 25, 30, 15, 10);
        assert!(filter.matches(&ivs_unknown));

        // 通常値も通過
        let ivs_normal = Ivs::new(15, 20, 25, 30, 10, 5);
        assert!(filter.matches(&ivs_normal));

        // 全て Unknown でも通過
        let ivs_all_unknown = Ivs::new(
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
            IV_VALUE_UNKNOWN,
        );
        assert!(filter.matches(&ivs_all_unknown));
    }

    #[test]
    fn test_iv_filter_unknown_mixed_max32_and_specific() {
        use super::super::pokemon::IV_VALUE_UNKNOWN;

        // HP は (0, 32) で Unknown 許容、ATK は (31, 31) で特定範囲
        let filter = IvFilter {
            hp: (0, 32),
            atk: (31, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        };

        // HP Unknown + ATK 31 → 通過
        let ivs_hp_unknown = Ivs::new(IV_VALUE_UNKNOWN, 31, 20, 15, 10, 5);
        assert!(filter.matches(&ivs_hp_unknown));

        // HP Unknown + ATK Unknown → 不通過 (ATK は特定範囲)
        let ivs_both_unknown = Ivs::new(IV_VALUE_UNKNOWN, IV_VALUE_UNKNOWN, 20, 15, 10, 5);
        assert!(!filter.matches(&ivs_both_unknown));
    }

    // === StatsFilter Tests ===

    #[test]
    fn test_stats_filter_any_passes_all() {
        let filter = StatsFilter::any();
        let stats = Stats {
            hp: Some(110),
            attack: Some(82),
            defense: Some(60),
            special_attack: Some(72),
            special_defense: Some(72),
            speed: Some(130),
        };
        assert!(filter.matches(&stats));
    }

    #[test]
    fn test_stats_filter_any_passes_unknown() {
        let filter = StatsFilter::any();
        assert!(filter.matches(&Stats::UNKNOWN));
    }

    #[test]
    fn test_stats_filter_exact_match() {
        let filter = StatsFilter {
            hp: Some(110),
            atk: None,
            def: None,
            spa: None,
            spd: None,
            spe: None,
        };
        let stats = Stats {
            hp: Some(110),
            attack: Some(82),
            defense: Some(60),
            special_attack: Some(72),
            special_defense: Some(72),
            speed: Some(130),
        };
        assert!(filter.matches(&stats));
    }

    #[test]
    fn test_stats_filter_mismatch() {
        let filter = StatsFilter {
            hp: Some(999),
            atk: None,
            def: None,
            spa: None,
            spd: None,
            spe: None,
        };
        let stats = Stats {
            hp: Some(110),
            attack: Some(82),
            defense: Some(60),
            special_attack: Some(72),
            special_defense: Some(72),
            speed: Some(130),
        };
        assert!(!filter.matches(&stats));
    }

    #[test]
    fn test_stats_filter_unknown_stats_passes() {
        // stats 側が None (不明) の場合、フィルタ条件の有無にかかわらず通過
        let filter = StatsFilter {
            hp: Some(110),
            atk: Some(82),
            def: Some(60),
            spa: Some(72),
            spd: Some(72),
            spe: Some(130),
        };
        assert!(filter.matches(&Stats::UNKNOWN));
    }

    #[test]
    fn test_stats_filter_partial_unknown_passes() {
        let filter = StatsFilter {
            hp: Some(110),
            atk: None,
            def: None,
            spa: None,
            spd: None,
            spe: None,
        };
        let stats = Stats {
            hp: None, // 不明 → 通過
            attack: Some(82),
            defense: Some(60),
            special_attack: Some(72),
            special_defense: Some(72),
            speed: Some(130),
        };
        assert!(filter.matches(&stats));
    }

    #[test]
    fn test_stats_filter_all_fields() {
        let filter = StatsFilter {
            hp: Some(110),
            atk: Some(82),
            def: Some(60),
            spa: Some(72),
            spd: Some(72),
            spe: Some(130),
        };
        let stats = Stats {
            hp: Some(110),
            attack: Some(82),
            defense: Some(60),
            special_attack: Some(72),
            special_defense: Some(72),
            speed: Some(130),
        };
        assert!(filter.matches(&stats));

        // 1つでも不一致なら不通過
        let stats_mismatch = Stats {
            hp: Some(110),
            attack: Some(82),
            defense: Some(60),
            special_attack: Some(72),
            special_defense: Some(72),
            speed: Some(131), // 不一致
        };
        assert!(!filter.matches(&stats_mismatch));
    }

    // === CoreDataFilter + stats Tests ===

    #[test]
    fn test_core_data_filter_with_stats() {
        let filter = CoreDataFilter {
            stats: Some(StatsFilter {
                hp: Some(110),
                ..StatsFilter::any()
            }),
            ..Default::default()
        };
        let pokemon = make_pokemon(
            Ivs::uniform(31),
            Nature::Adamant,
            Gender::Male,
            AbilitySlot::First,
            ShinyType::None,
            1,
            50,
        );
        // make_pokemon は Stats::UNKNOWN を使うため通過 (不明は通過)
        assert!(filter.matches_pokemon(&pokemon));
    }
}
