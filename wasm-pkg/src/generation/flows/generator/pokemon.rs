//! `PokemonGenerator` - ポケモン個体生成
//!
//! 一回につき一つの消費位置を処理し、一致個体だけを返す。
//! `encounter_type` により Wild / Static を判別し、内部で適切な生成処理を実行。

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calc_report_needle_direction, calculate_game_offset, calculate_mt_offset,
    generate_moving_encounter_info, generate_rng_ivs_with_offset, generate_special_encounter_info,
    is_moving_encounter_type, is_special_encounter_type,
};
use crate::generation::flows::pokemon::{generate_static_pokemon, generate_wild_pokemon};
use crate::types::{
    EncounterMethod, GeneratedPokemonData, GenerationConfig, Ivs, LcgSeed, MovingEncounterInfo,
    PokemonFilter, PokemonGenerationParams, SeedOrigin, SpecialEncounterInfo,
};

use super::is_static_encounter;

/// ポケモン Generator (Wild / Static 統合)
/// 一回につき一つの消費位置を処理し、一致個体だけを返す。
/// `encounter_type` により Wild / Static を判別し、内部で適切な生成処理を実行。
pub struct PokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Option<Ivs>,
    filter: Option<PokemonFilter>,
    #[cfg(test)]
    mt_calculations: u32,
    #[cfg(test)]
    stats_calculations: u32,
    source: SeedOrigin,
    params: PokemonGenerationParams,
    config: GenerationConfig,
}

impl PokemonGenerator {
    /// Generator を作成
    ///
    /// # Arguments
    ///
    /// * `source` - 生成元情報
    /// * `params` - 生成パラメータ
    /// * `config` - 共通設定
    ///
    /// # Errors
    ///
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        source: SeedOrigin,
        params: &PokemonGenerationParams,
        config: &GenerationConfig,
        filter: Option<&PokemonFilter>,
    ) -> Result<Self, String> {
        let base_seed = source.base_seed();
        let game_offset = calculate_game_offset(base_seed, config.version, config.game_start)?;
        if params.slots.is_empty()
            || (is_static_encounter(params.encounter_type) && params.slots.len() != 1)
        {
            return Err("Invalid encounter slot count".into());
        }

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = config.initial_advance(game_offset)?;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: config.user_offset,
            current_advance: config.user_offset,
            rng_ivs: None,
            filter: filter.cloned(),
            #[cfg(test)]
            mt_calculations: 0,
            #[cfg(test)]
            stats_calculations: 0,
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
        let needle = calc_report_needle_direction(current_seed);
        let advance = self.current_advance;

        // 生成用の LCG をクローン（生成処理で消費される分を分離）
        let mut gen_lcg = self.lcg.clone();

        let (raw, moving_encounter, special_encounter) =
            if is_static_encounter(self.params.encounter_type) {
                (
                    Some(generate_static_pokemon(
                        &mut gen_lcg,
                        &self.params,
                        &self.params.slots[0],
                        &self.config,
                    )),
                    None,
                    None,
                )
            } else {
                let (moving, special) = self.calculate_encounter_info(current_seed, &mut gen_lcg);
                (
                    generate_wild_pokemon(&mut gen_lcg, &self.params, &self.config).ok(),
                    moving,
                    special,
                )
            };

        // 不一致の位置も処理済みにしてから短絡する。
        self.lcg.next();
        self.current_advance += 1;
        let raw = raw?;
        if self.filter.as_ref().is_some_and(|filter| {
            !filter.matches_non_iv(&raw.filter_input(special_encounter.as_ref()))
        }) {
            return None;
        }
        let ivs = self.ensure_rng_ivs();
        if self
            .filter
            .as_ref()
            .is_some_and(|filter| !filter.base.matches_ivs(ivs))
        {
            return None;
        }
        #[cfg(test)]
        {
            self.stats_calculations += u32::from(raw.species_id > 0);
        }
        let data = GeneratedPokemonData::from_raw(
            &raw,
            ivs,
            advance,
            needle,
            self.source.clone(),
            moving_encounter,
            special_encounter,
        );
        if self
            .filter
            .as_ref()
            .is_some_and(|filter| !filter.base.matches_stats(&data.core.stats))
        {
            return None;
        }
        Some(data)
    }

    fn ensure_rng_ivs(&mut self) -> Ivs {
        if let Some(ivs) = self.rng_ivs {
            return ivs;
        }
        let mt_seed = self.source.base_seed().derive_mt_seed();
        let offset = calculate_mt_offset(self.config.version, self.params.encounter_type);
        let is_roamer = self.params.encounter_type == crate::types::EncounterType::Roamer;
        let ivs = generate_rng_ivs_with_offset(mt_seed, offset, is_roamer);
        self.rng_ivs = Some(ivs);
        #[cfg(test)]
        {
            self.mt_calculations += 1;
        }
        ivs
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

    /// 指定回数の生成試行から一致個体を収集
    pub fn take(&mut self, count: u32) -> Vec<GeneratedPokemonData> {
        (0..count).filter_map(|_| self.generate_next()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        EncounterMethod, EncounterSlotConfig, EncounterType, GameStartConfig, GenderRatio, LcgSeed,
        LeadAbilityEffect, MemoryLinkState, RomVersion, SavePresence, SeedOrigin, ShinyCharmState,
        StartMode, TrainerInfo,
    };

    fn make_game_start() -> GameStartConfig {
        GameStartConfig {
            start_mode: StartMode::Continue,
            save: SavePresence::WithSave,
            memory_link: MemoryLinkState::Disabled,
            shiny_charm: ShinyCharmState::NotObtained,
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

        let generator = PokemonGenerator::new(source, &params, &config, None);

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

        let mut g = PokemonGenerator::new(source, &params, &config, None).unwrap();

        let results = g.take(5);
        assert_eq!(results.len(), 5);
        assert_eq!(g.current_advance(), 5);

        for (i, pokemon) in results.iter().enumerate() {
            #[allow(clippy::cast_possible_truncation)]
            let expected_advance = i as u32;
            assert_eq!(pokemon.advance, expected_advance);

            let state_seed =
                Lcg64::compute_advance(base_seed, u64::from(g.game_offset() + expected_advance));
            assert_eq!(
                pokemon.needle_direction,
                calc_report_needle_direction(state_seed)
            );
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

        let generator = PokemonGenerator::new(source, &params, &config, None);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let pokemon = g.generate_next();
        assert!(pokemon.is_some());
        assert_eq!(pokemon.unwrap().core.species_id, 150);
        assert_eq!(g.current_advance(), 1);
    }
    fn filtered_generator(filter: Option<&PokemonFilter>) -> PokemonGenerator {
        let params = PokemonGenerationParams {
            slots: make_slots(),
            ..make_pokemon_params()
        };
        PokemonGenerator::new(
            make_source(LcgSeed::new(0x1234_5678_9ABC_DEF0)),
            &params,
            &make_config(),
            filter,
        )
        .unwrap()
    }

    #[test]
    fn rejects_before_mt_and_counts_attempts_instead_of_matches() {
        let filter = PokemonFilter {
            species_ids: Some(vec![999]),
            ..PokemonFilter::any()
        };
        let mut generator = filtered_generator(Some(&filter));
        assert!(generator.rng_ivs.is_none());
        assert!(generator.take(30).is_empty());
        assert_eq!(
            (
                generator.current_advance(),
                generator.mt_calculations,
                generator.stats_calculations
            ),
            (30, 0, 0)
        );
    }

    #[test]
    fn later_match_uses_initial_seed_and_preserves_cache_across_batches() {
        let expected = filtered_generator(None).take(100);
        let nature = expected
            .iter()
            .find(|p| p.core.nature != expected[0].core.nature)
            .unwrap()
            .core
            .nature;
        let filter = PokemonFilter {
            base: crate::types::CoreDataFilter {
                natures: Some(vec![nature]),
                ..crate::types::CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        };
        let mut generator = filtered_generator(Some(&filter));
        assert!(generator.generate_next().is_none());
        assert_eq!(generator.mt_calculations, 0);
        let mut actual = generator.take(19);
        actual.extend(generator.take(80));
        let expected: Vec<_> = expected
            .into_iter()
            .filter(|p| p.core.nature == nature)
            .collect();
        assert_eq!(
            serde_json::to_string(&actual).unwrap(),
            serde_json::to_string(&expected).unwrap()
        );
        assert_eq!(generator.mt_calculations, 1);
        assert_eq!(generator.stats_calculations as usize, actual.len());
    }

    #[test]
    fn iv_rejection_caches_once_and_skips_stats() {
        let filter = PokemonFilter {
            base: crate::types::CoreDataFilter {
                iv: Some(crate::types::IvFilter::six_v()),
                ..crate::types::CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        };
        let mut generator = filtered_generator(Some(&filter));
        assert!(generator.take(10).is_empty());
        assert!(generator.take(20).is_empty());
        assert_eq!(
            (generator.mt_calculations, generator.stats_calculations),
            (1, 0)
        );
    }

    #[test]
    fn empty_range_does_not_initialize_mt() {
        let mut generator = filtered_generator(None);
        assert!(generator.take(0).is_empty());
        assert_eq!(generator.mt_calculations, 0);
    }

    #[test]
    fn invalid_ranges_and_overflows_are_errors() {
        let params = PokemonGenerationParams {
            slots: make_slots(),
            ..make_pokemon_params()
        };
        for (user_offset, max_advance) in [(10, 9), (0, u32::MAX)] {
            let config = GenerationConfig {
                user_offset,
                max_advance,
                ..make_config()
            };
            assert!(
                PokemonGenerator::new(make_source(LcgSeed::new(1)), &params, &config, None)
                    .is_err()
            );
        }
    }
    #[test]
    #[ignore = "release profile measurement"]
    fn measure_pipeline_costs() {
        use crate::types::{CoreDataFilter, ShinyFilter};
        for (seeds, advances) in [(100_u32, 24_u32), (10, 1000)] {
            for (name, filter) in [
                ("all", PokemonFilter::any()),
                (
                    "none",
                    PokemonFilter {
                        species_ids: Some(vec![999]),
                        ..PokemonFilter::any()
                    },
                ),
                (
                    "shiny",
                    PokemonFilter {
                        base: CoreDataFilter {
                            shiny: Some(ShinyFilter::Shiny),
                            ..CoreDataFilter::any()
                        },
                        ..PokemonFilter::any()
                    },
                ),
            ] {
                let started = std::time::Instant::now();
                let (mut mt, mut stats, mut matches) = (0, 0, 0);
                for index in 0..seeds {
                    let params = PokemonGenerationParams {
                        slots: make_slots(),
                        ..make_pokemon_params()
                    };
                    let mut generator = PokemonGenerator::new(
                        make_source(LcgSeed::new(0x1234_5678_9ABC_DEF0 + u64::from(index))),
                        &params,
                        &make_config(),
                        Some(&filter),
                    )
                    .unwrap();
                    matches += generator.take(advances).len();
                    mt += generator.mt_calculations;
                    stats += generator.stats_calculations;
                }
                println!(
                    "{name} seeds={seeds} advances={advances} attempts={} mt={mt} stats={stats} matches={matches} elapsed={:?}",
                    seeds * advances,
                    started.elapsed()
                );
            }
        }
    }
}
