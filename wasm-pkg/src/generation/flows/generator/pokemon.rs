//! `PokemonGenerator` - ポケモン個体生成
//!
//! Iterator パターンで連続的に個体を生成。
//! `encounter_type` により Wild / Static を判別し、内部で適切な生成処理を実行。

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_game_offset, calculate_mt_offset, calculate_needle_direction,
    generate_moving_encounter_info, generate_rng_ivs_with_offset, generate_special_encounter_info,
    is_moving_encounter_type, is_special_encounter_type,
};
use crate::generation::flows::pokemon::{generate_static_pokemon, generate_wild_pokemon};
use crate::types::{
    EncounterMethod, GeneratedPokemonData, GenerationConfig, Ivs, LcgSeed, MovingEncounterInfo,
    PokemonGenerationParams, SeedOrigin, SpecialEncounterInfo,
};

use super::is_static_encounter;

/// ポケモン Generator (Wild / Static 統合)
/// Iterator パターンで連続的に個体を生成。
/// `encounter_type` により Wild / Static を判別し、内部で適切な生成処理を実行。
pub struct PokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: SeedOrigin,
    params: PokemonGenerationParams,
    config: GenerationConfig,
}

impl PokemonGenerator {
    /// Generator を作成
    ///
    /// # Arguments
    ///
    /// * `base_seed` - LCG 初期シード
    /// * `source` - 生成元情報
    /// * `params` - 生成パラメータ
    /// * `config` - 共通設定
    ///
    /// # Errors
    ///
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        source: SeedOrigin,
        params: &PokemonGenerationParams,
        config: &GenerationConfig,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, config.version, config.game_start)?;
        let mt_offset = calculate_mt_offset(config.version, params.encounter_type);
        let mt_seed = base_seed.derive_mt_seed();
        let is_roamer = params.encounter_type == crate::types::EncounterType::Roamer;
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, mt_offset, is_roamer);

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = game_offset + config.user_offset;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: config.user_offset,
            current_advance: config.user_offset,
            rng_ivs,
            source,
            params: params.clone(),
            config: config.clone(),
        })
    }

    /// 総オフセット (`GameOffset` + `UserOffset`)
    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.user_offset
    }

    /// `GameOffset` を取得
    pub fn game_offset(&self) -> u32 {
        self.game_offset
    }

    /// 現在の消費位置 (`total_offset` からの相対)
    pub fn current_advance(&self) -> u32 {
        self.current_advance
    }

    /// 次の個体を生成
    pub fn generate_next(&mut self) -> Option<GeneratedPokemonData> {
        let current_seed = self.lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);
        let advance = self.current_advance;

        // 生成用の LCG をクローン（生成処理で消費される分を分離）
        let mut gen_lcg = self.lcg.clone();

        // Static か Wild かで分岐
        if is_static_encounter(self.params.encounter_type) {
            // Static: スロットは1件、常に成功
            let slot = &self.params.slots[0];
            let raw = generate_static_pokemon(&mut gen_lcg, &self.params, slot, &self.config);

            self.lcg.next();
            self.current_advance += 1;

            Some(GeneratedPokemonData::from_raw(
                &raw,
                self.rng_ivs,
                advance,
                needle,
                self.source.clone(),
                None,
                None,
            ))
        } else {
            // Wild: エンカウント付加情報あり
            let (moving_encounter, special_encounter) =
                self.calculate_encounter_info(current_seed, &mut gen_lcg);

            if let Ok(raw) = generate_wild_pokemon(&mut gen_lcg, &self.params, &self.config) {
                self.lcg.next();
                self.current_advance += 1;

                Some(GeneratedPokemonData::from_raw(
                    &raw,
                    self.rng_ivs,
                    advance,
                    needle,
                    self.source.clone(),
                    moving_encounter,
                    special_encounter,
                ))
            } else {
                self.lcg.next();
                self.current_advance += 1;
                None
            }
        }
    }

    /// エンカウント付加情報を計算
    ///
    /// - Normal/Surfing + Moving: 移動エンカウント情報 (消費 2)
    /// - 特殊エンカウント種別: 特殊エンカウント情報 (消費なし、参考情報)
    fn calculate_encounter_info(
        &self,
        seed: LcgSeed,
        gen_lcg: &mut Lcg64,
    ) -> (Option<MovingEncounterInfo>, Option<SpecialEncounterInfo>) {
        let enc_type = self.params.encounter_type;

        // 移動エンカウント情報 (消費あり)
        if is_moving_encounter_type(enc_type)
            && self.params.encounter_method == EncounterMethod::Moving
        {
            gen_lcg.next(); // 空消費 1
            let rand_value = gen_lcg.next().unwrap_or(0); // エンカウント判定 1
            let moving_info = generate_moving_encounter_info(self.config.version, rand_value);
            return (Some(moving_info), None);
        }

        // 特殊エンカウント情報 (消費なし、参考情報として算出)
        if is_special_encounter_type(enc_type) {
            let mut info_lcg = Lcg64::new(seed);
            let trigger_rand = info_lcg.next().unwrap_or(0);
            let direction_rand = info_lcg.next().unwrap_or(0);
            let special_info = generate_special_encounter_info(trigger_rand, direction_rand);
            return (None, Some(special_info));
        }

        (None, None)
    }

    /// 指定数の個体を生成
    pub fn take(&mut self, count: u32) -> Vec<GeneratedPokemonData> {
        (0..count).filter_map(|_| self.generate_next()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        EncounterMethod, EncounterSlotConfig, EncounterType, GameStartConfig, GenderRatio, LcgSeed,
        LeadAbilityEffect, RomVersion, SaveState, SeedOrigin, StartMode, TrainerInfo,
    };

    fn make_game_start() -> GameStartConfig {
        GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
            shiny_charm: false,
        }
    }

    fn make_config() -> GenerationConfig {
        GenerationConfig {
            version: RomVersion::Black,
            game_start: make_game_start(),
            user_offset: 0,
            max_advance: 1000,
        }
    }

    fn make_trainer() -> TrainerInfo {
        TrainerInfo {
            tid: 12345,
            sid: 54321,
        }
    }

    fn make_pokemon_params() -> PokemonGenerationParams {
        PokemonGenerationParams {
            trainer: make_trainer(),
            encounter_type: EncounterType::Normal,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,

            slots: vec![],
        }
    }

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_ratio: GenderRatio::F1M1,
            has_held_item: false,
            shiny_locked: false,
        }]
    }

    fn make_source(seed: LcgSeed) -> SeedOrigin {
        SeedOrigin::seed(seed)
    }

    #[test]
    fn test_pokemon_generator_wild() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let source = make_source(base_seed);
        let slots = make_slots();
        let params = PokemonGenerationParams {
            slots: slots.clone(),
            ..make_pokemon_params()
        };
        let config = make_config();

        let generator = PokemonGenerator::new(base_seed, source, &params, &config);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        assert!(g.game_offset() > 0);

        let pokemon = g.generate_next();
        assert!(pokemon.is_some());
        assert_eq!(g.current_advance(), 1);

        let pokemon2 = g.generate_next();
        assert!(pokemon2.is_some());
        assert_eq!(g.current_advance(), 2);
    }

    #[test]
    fn test_pokemon_generator_take() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let source = make_source(base_seed);
        let slots = make_slots();
        let params = PokemonGenerationParams {
            slots: slots.clone(),
            ..make_pokemon_params()
        };
        let config = make_config();

        let mut g = PokemonGenerator::new(base_seed, source, &params, &config).unwrap();

        let results = g.take(5);
        assert_eq!(results.len(), 5);
        assert_eq!(g.current_advance(), 5);

        for (i, pokemon) in results.iter().enumerate() {
            #[allow(clippy::cast_possible_truncation)]
            let expected_advance = i as u32;
            assert_eq!(pokemon.advance, expected_advance);
        }
    }

    #[test]
    fn test_pokemon_generator_static() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let source = make_source(base_seed);
        let slots = vec![EncounterSlotConfig {
            species_id: 150, // Mewtwo
            level_min: 70,
            level_max: 70,
            gender_ratio: GenderRatio::Genderless,
            has_held_item: false,
            shiny_locked: false,
        }];
        let params = PokemonGenerationParams {
            encounter_type: EncounterType::StaticSymbol,
            slots: slots.clone(),
            ..make_pokemon_params()
        };
        let config = make_config();

        let generator = PokemonGenerator::new(base_seed, source, &params, &config);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let pokemon = g.generate_next();
        assert!(pokemon.is_some());
        assert_eq!(pokemon.unwrap().core.species_id, 150);
        assert_eq!(g.current_advance(), 1);
    }
}
