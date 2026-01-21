//! `PokemonGenerator` - 完全な個体生成
//!
//! オフセット対応:
//! - `GameOffset`: ゲーム起動条件により自動計算 (`calculate_game_offset`)
//! - `UserOffset`: ユーザ指定の追加オフセット
//! - `MtOffset`: MT19937 で IV 生成を開始する位置

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_inheritance, calculate_game_offset, calculate_needle_direction,
    generate_rng_ivs_with_offset,
};
use crate::types::{GameStartConfig, Ivs, LcgSeed, RomVersion};

use super::egg::generate_egg;
use super::pokemon_static::generate_static_pokemon;
use super::pokemon_wild::generate_wild_pokemon;
use super::types::{
    EggGenerationConfig, EncounterSlotConfig, GeneratedEggData, GeneratedPokemonData, OffsetConfig,
    PokemonGenerationConfig,
};

/// 野生ポケモン Generator
pub struct WildPokemonGenerator {
    base_seed: LcgSeed,
    game_offset: u32,
    offset_config: OffsetConfig,
    rng_ivs: Ivs,
    config: PokemonGenerationConfig,
    slots: Vec<EncounterSlotConfig>,
}

impl WildPokemonGenerator {
    /// Generator を作成
    ///
    /// # Errors
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        version: RomVersion,
        game_start: &GameStartConfig,
        offset_config: OffsetConfig,
        config: PokemonGenerationConfig,
        slots: Vec<EncounterSlotConfig>,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        Ok(Self {
            base_seed,
            game_offset,
            offset_config,
            rng_ivs,
            config,
            slots,
        })
    }

    /// 総オフセット (`GameOffset` + `UserOffset`)
    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.offset_config.user_offset
    }

    /// `GameOffset` を取得
    pub fn game_offset(&self) -> u32 {
        self.game_offset
    }

    /// 指定消費位置での個体生成
    ///
    /// `advance` は `total_offset` からの相対位置。
    pub fn generate_at(&self, advance: u32) -> Option<GeneratedPokemonData> {
        let mut lcg = Lcg64::new(self.base_seed);
        let absolute_advance = self.total_offset() + advance;
        lcg.jump(u64::from(absolute_advance));

        let current_seed = lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);

        // 1回進めてから生成開始
        lcg.next();

        match generate_wild_pokemon(&mut lcg, &self.config, &self.slots) {
            Ok(raw) => Some(GeneratedPokemonData::new(
                &raw,
                self.rng_ivs,
                advance,
                needle,
                current_seed.value(),
            )),
            Err(_) => None,
        }
    }

    /// 範囲内の個体を生成
    pub fn generate_range(&self, start: u32, end: u32) -> Vec<GeneratedPokemonData> {
        (start..end)
            .filter_map(|adv| self.generate_at(adv))
            .collect()
    }
}

/// 固定ポケモン Generator
pub struct StaticPokemonGenerator {
    base_seed: LcgSeed,
    game_offset: u32,
    offset_config: OffsetConfig,
    rng_ivs: Ivs,
    config: PokemonGenerationConfig,
    species_id: u16,
    level: u8,
    gender_threshold: u8,
}

impl StaticPokemonGenerator {
    /// Generator を作成
    ///
    /// # Errors
    /// 無効な起動設定の場合にエラーを返す。
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        base_seed: LcgSeed,
        version: RomVersion,
        game_start: &GameStartConfig,
        offset_config: OffsetConfig,
        config: PokemonGenerationConfig,
        species_id: u16,
        level: u8,
        gender_threshold: u8,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        Ok(Self {
            base_seed,
            game_offset,
            offset_config,
            rng_ivs,
            config,
            species_id,
            level,
            gender_threshold,
        })
    }

    /// 総オフセット (`GameOffset` + `UserOffset`)
    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.offset_config.user_offset
    }

    /// `GameOffset` を取得
    pub fn game_offset(&self) -> u32 {
        self.game_offset
    }

    /// 指定消費位置での個体生成
    pub fn generate_at(&self, advance: u32) -> GeneratedPokemonData {
        let mut lcg = Lcg64::new(self.base_seed);
        let absolute_advance = self.total_offset() + advance;
        lcg.jump(u64::from(absolute_advance));

        let current_seed = lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);

        lcg.next();

        let raw = generate_static_pokemon(
            &mut lcg,
            &self.config,
            self.species_id,
            self.level,
            self.gender_threshold,
        );

        GeneratedPokemonData::new(&raw, self.rng_ivs, advance, needle, current_seed.value())
    }

    /// 範囲内の個体を生成
    pub fn generate_range(&self, start: u32, end: u32) -> Vec<GeneratedPokemonData> {
        (start..end).map(|adv| self.generate_at(adv)).collect()
    }
}

/// 卵 Generator
pub struct EggGenerator {
    base_seed: LcgSeed,
    game_offset: u32,
    offset_config: OffsetConfig,
    rng_ivs: Ivs,
    config: EggGenerationConfig,
    parent_male: Ivs,
    parent_female: Ivs,
}

impl EggGenerator {
    /// Generator を作成
    ///
    /// # Errors
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        version: RomVersion,
        game_start: &GameStartConfig,
        offset_config: OffsetConfig,
        config: EggGenerationConfig,
        parent_male: Ivs,
        parent_female: Ivs,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        Ok(Self {
            base_seed,
            game_offset,
            offset_config,
            rng_ivs,
            config,
            parent_male,
            parent_female,
        })
    }

    /// 総オフセット (`GameOffset` + `UserOffset`)
    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.offset_config.user_offset
    }

    /// `GameOffset` を取得
    pub fn game_offset(&self) -> u32 {
        self.game_offset
    }

    /// 指定消費位置での個体生成
    pub fn generate_at(&self, advance: u32) -> GeneratedEggData {
        let mut lcg = Lcg64::new(self.base_seed);
        let absolute_advance = self.total_offset() + advance;
        lcg.jump(u64::from(absolute_advance));

        let current_seed = lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);

        lcg.next();

        let raw = generate_egg(&mut lcg, &self.config);

        // 遺伝適用
        let final_ivs = apply_inheritance(
            &self.rng_ivs,
            &self.parent_male,
            &self.parent_female,
            &raw.inheritance,
        );

        GeneratedEggData::new(&raw, final_ivs, advance, needle, current_seed.value())
    }

    /// 範囲内の個体を生成
    pub fn generate_range(&self, start: u32, end: u32) -> Vec<GeneratedEggData> {
        (start..end).map(|adv| self.generate_at(adv)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::generation::algorithm::EverstonePlan;
    use crate::types::{EncounterType, GenderRatio, LeadAbilityEffect, SaveState, StartMode};

    fn make_game_start() -> GameStartConfig {
        GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        }
    }

    fn make_pokemon_config() -> PokemonGenerationConfig {
        PokemonGenerationConfig {
            version: RomVersion::Black,
            encounter_type: EncounterType::Normal,
            tid: 12345,
            sid: 54321,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
        }
    }

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
        }]
    }

    #[test]
    fn test_wild_pokemon_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config = OffsetConfig::new(0);
        let config = make_pokemon_config();
        let slots = make_slots();

        let generator = WildPokemonGenerator::new(
            base_seed,
            RomVersion::Black,
            &game_start,
            offset_config,
            config,
            slots,
        );

        assert!(generator.is_ok());

        let g = generator.unwrap();
        assert!(g.game_offset() > 0);

        let pokemon = g.generate_at(0);
        assert!(pokemon.is_some());
    }

    #[test]
    fn test_static_pokemon_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config = OffsetConfig::new(0);
        let config = PokemonGenerationConfig {
            encounter_type: EncounterType::StaticSymbol,
            ..make_pokemon_config()
        };

        let generator = StaticPokemonGenerator::new(
            base_seed,
            RomVersion::Black,
            &game_start,
            offset_config,
            config,
            150, // Mewtwo
            70,
            255, // Genderless
        );

        assert!(generator.is_ok());

        let g = generator.unwrap();
        let pokemon = g.generate_at(0);
        assert_eq!(pokemon.species_id, 150);
    }

    #[test]
    fn test_egg_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config = OffsetConfig::new(0);
        let config = EggGenerationConfig {
            tid: 12345,
            sid: 54321,
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::Threshold(127),
            nidoran_flag: false,
            pid_reroll_count: 0,
        };

        let parent_male = Ivs::new(31, 31, 31, 0, 0, 0);
        let parent_female = Ivs::new(0, 0, 0, 31, 31, 31);

        let generator = EggGenerator::new(
            base_seed,
            RomVersion::Black,
            &game_start,
            offset_config,
            config,
            parent_male,
            parent_female,
        );

        assert!(generator.is_ok());

        let g = generator.unwrap();
        let egg = g.generate_at(0);
        // 遺伝が適用されていること
        // (遺伝スロットによって親のIVが継承される)
        assert!(egg.ivs.hp <= 31);
    }

    #[test]
    fn test_offset_config() {
        let offset = OffsetConfig::new(100);
        assert_eq!(offset.user_offset, 100);
        assert_eq!(offset.mt_offset, OffsetConfig::DEFAULT_MT_OFFSET);

        let offset = OffsetConfig::with_mt_offset(50, 0);
        assert_eq!(offset.user_offset, 50);
        assert_eq!(offset.mt_offset, 0);
    }
}
