//! `PokemonGenerator` / `EggGenerator` - 完全な個体生成
//!
//! Iterator パターンで連続的に個体を生成。
//!
//! オフセット対応:
//! - `GameOffset`: ゲーム起動条件により自動計算 (`calculate_game_offset`)
//! - `UserOffset`: ユーザ指定の追加オフセット
//! - `MtOffset`: MT19937 で IV 生成を開始する位置
//!
//! ## 公開 API
//!
//! - `generate_pokemon_list` - ポケモン一括生成 (解決済み Seed 対応、フィルタ対応)
//! - `generate_egg_list` - タマゴ一括生成 (解決済み Seed 対応、フィルタ対応)

mod egg;
mod pokemon;

pub use egg::EggGenerator;
pub use pokemon::PokemonGenerator;

use crate::types::{
    EggGenerationParams, EncounterType, GeneratedEggData, GeneratedPokemonData, GenerationConfig,
    IvFilter, PokemonGenerationParams, RomVersion, SeedOrigin,
};

// ===== MT オフセット計算 =====

/// エンカウント種別とバージョンから MT オフセットを計算
///
/// MT19937 で IV 生成を開始する位置を決定する。
pub(super) const fn calculate_mt_offset(version: RomVersion, encounter_type: EncounterType) -> u32 {
    match encounter_type {
        EncounterType::Egg => 7,
        EncounterType::Roamer => 1,
        _ => {
            if version.is_bw2() {
                2
            } else {
                0
            }
        }
    }
}

// ===== 公開 API =====

/// ポケモン一括生成 (公開 API)
///
/// - 解決済み Seed 対応: `Vec<SeedOrigin>` を受け取る
/// - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
///
/// # Arguments
///
/// * `origins` - 解決済み Seed リスト
/// * `params` - 生成パラメータ (Wild / Static 統合)
/// * `config` - 共通設定 (バージョン、オフセット、検索範囲)
/// * `filter` - IV フィルタ (None の場合は全件返却)
///
/// # Errors
///
/// - 起動設定が無効な場合
/// - エンカウントスロットが空の場合
pub fn generate_pokemon_list(
    origins: Vec<SeedOrigin>,
    params: &PokemonGenerationParams,
    config: &GenerationConfig,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedPokemonData>, String> {
    // バリデーション
    if params.slots.is_empty() {
        return Err("Encounter slots is empty".into());
    }

    // Static の場合はスロットが1件のみ許容
    if is_static_encounter(params.encounter_type) && params.slots.len() > 1 {
        return Err("Static encounter requires exactly one slot".into());
    }

    // 各 Seed に対して生成
    let results: Result<Vec<_>, String> = origins
        .into_iter()
        .map(|origin| generate_pokemon_for_seed(origin, params, config, filter))
        .collect();

    Ok(results?.into_iter().flatten().collect())
}

/// タマゴ一括生成 (公開 API)
///
/// - 解決済み Seed 対応: `Vec<SeedOrigin>` を受け取る
/// - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
///
/// # Arguments
///
/// * `origins` - 解決済み Seed リスト
/// * `params` - 生成パラメータ
/// * `config` - 共通設定 (バージョン、オフセット、検索範囲)
/// * `filter` - IV フィルタ (None の場合は全件返却)
///
/// # Errors
///
/// - 起動設定が無効な場合
pub fn generate_egg_list(
    origins: Vec<SeedOrigin>,
    params: &EggGenerationParams,
    config: &GenerationConfig,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedEggData>, String> {
    // 各 Seed に対して生成
    let results: Result<Vec<_>, String> = origins
        .into_iter()
        .map(|origin| generate_egg_for_seed(origin, params, config, filter))
        .collect();

    Ok(results?.into_iter().flatten().collect())
}

/// エンカウント種別が Static かどうか判定
pub(super) fn is_static_encounter(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::StaticSymbol
            | EncounterType::StaticStarter
            | EncounterType::StaticFossil
            | EncounterType::StaticEvent
            | EncounterType::Roamer
    )
}

/// 単一 Seed に対してポケモンを生成 (内部関数)
fn generate_pokemon_for_seed(
    origin: SeedOrigin,
    params: &PokemonGenerationParams,
    config: &GenerationConfig,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedPokemonData>, String> {
    let base_seed = origin.base_seed();
    let mut generator = PokemonGenerator::new(base_seed, origin, params, config)?;

    let count = config.max_advance - config.user_offset;
    let pokemons = generator.take(count);
    Ok(apply_filter(pokemons, filter))
}

/// 単一 Seed に対してタマゴを生成 (内部関数)
fn generate_egg_for_seed(
    origin: SeedOrigin,
    params: &EggGenerationParams,
    config: &GenerationConfig,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedEggData>, String> {
    let base_seed = origin.base_seed();
    let mut generator = EggGenerator::new(base_seed, origin, params, config)?;

    let count = config.max_advance - config.user_offset;
    let eggs = generator.take(count);
    Ok(apply_egg_filter(eggs, filter))
}

/// IV フィルタを適用
fn apply_filter(
    pokemons: Vec<GeneratedPokemonData>,
    filter: Option<&IvFilter>,
) -> Vec<GeneratedPokemonData> {
    match filter {
        Some(f) => pokemons.into_iter().filter(|p| f.matches(&p.ivs)).collect(),
        None => pokemons,
    }
}

/// IV フィルタを適用 (タマゴ用)
fn apply_egg_filter(
    eggs: Vec<GeneratedEggData>,
    filter: Option<&IvFilter>,
) -> Vec<GeneratedEggData> {
    match filter {
        Some(f) => eggs.into_iter().filter(|e| f.matches(&e.ivs)).collect(),
        None => eggs,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        EncounterMethod, EncounterSlotConfig, EncounterType, EverstonePlan, GameStartConfig,
        GenderRatio, Ivs, LeadAbilityEffect, LcgSeed, Nature, RomVersion, SaveState, SeedOrigin,
        StartMode, TrainerInfo,
    };

    fn make_game_start() -> GameStartConfig {
        GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        }
    }

    fn make_config() -> GenerationConfig {
        GenerationConfig {
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

    fn make_pokemon_params(version: RomVersion) -> PokemonGenerationParams {
        PokemonGenerationParams {
            version,
            trainer: make_trainer(),
            encounter_type: EncounterType::Normal,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: vec![],
        }
    }

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
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
            ..make_pokemon_params(RomVersion::Black)
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
            ..make_pokemon_params(RomVersion::Black)
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
            gender_threshold: 255, // Genderless
            has_held_item: false,
            shiny_locked: false,
        }];
        let params = PokemonGenerationParams {
            version: RomVersion::Black,
            encounter_type: EncounterType::StaticSymbol,
            slots: slots.clone(),
            ..make_pokemon_params(RomVersion::Black)
        };
        let config = make_config();

        let generator = PokemonGenerator::new(base_seed, source, &params, &config);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let pokemon = g.generate_next();
        assert!(pokemon.is_some());
        assert_eq!(pokemon.unwrap().species_id, 150);
        assert_eq!(g.current_advance(), 1);
    }

    #[test]
    fn test_egg_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let source = make_source(base_seed);
        let params = EggGenerationParams {
            version: RomVersion::Black,
            trainer: make_trainer(),
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::Threshold(127),
            nidoran_flag: false,
            masuda_method: false,
            parent_male: Ivs::new(31, 31, 31, 0, 0, 0),
            parent_female: Ivs::new(0, 0, 0, 31, 31, 31),
        };
        let config = make_config();

        let generator = EggGenerator::new(base_seed, source, &params, &config);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let egg = g.generate_next();
        assert!(egg.ivs.hp <= 31);
        assert_eq!(g.current_advance(), 1);
    }

    #[test]
    fn test_calculate_mt_offset() {
        // Egg: mt_offset = 7
        assert_eq!(
            calculate_mt_offset(RomVersion::Black, EncounterType::Egg),
            7
        );
        assert_eq!(
            calculate_mt_offset(RomVersion::Black2, EncounterType::Egg),
            7
        );

        // Roamer: mt_offset = 1
        assert_eq!(
            calculate_mt_offset(RomVersion::Black, EncounterType::Roamer),
            1
        );

        // BW Wild/Static: mt_offset = 0
        assert_eq!(
            calculate_mt_offset(RomVersion::Black, EncounterType::Normal),
            0
        );
        assert_eq!(
            calculate_mt_offset(RomVersion::White, EncounterType::StaticSymbol),
            0
        );

        // BW2 Wild/Static: mt_offset = 2
        assert_eq!(
            calculate_mt_offset(RomVersion::Black2, EncounterType::Normal),
            2
        );
        assert_eq!(
            calculate_mt_offset(RomVersion::White2, EncounterType::StaticSymbol),
            2
        );
    }

    /// 統合テスト: BW 続きから + 野生 + シンクロあり(いじっぱり)
    #[test]
    fn test_integrated_bw_continue_wild_sync_adamant() {
        let initial_seed = LcgSeed::new(0x1C40_524D_87E8_0030);
        let tid = 0_u16;
        let sid = 0_u16;
        let expected_pid = 0xDF8F_ECE9_u32;
        let expected_nature = 14_u8; // むじゃき (Naive)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = GenerationConfig {
            game_start,
            user_offset: 0,
            max_advance: 1000,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGenerationParams {
            version: RomVersion::Black,
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::Normal,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::Synchronize(Nature::Adamant),
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params, &config).expect("Generator作成失敗");
        let pokemon = generator.generate_next().expect("生成に失敗しました");

        assert_eq!(
            pokemon.pid, expected_pid,
            "PID が期待値と一致しません: calculated=0x{:08X}, expected=0x{:08X}",
            pokemon.pid, expected_pid
        );
        assert_eq!(
            pokemon.nature as u8, expected_nature,
            "性格が期待値と一致しません: calculated={}, expected={} (むじゃき)",
            pokemon.nature as u8, expected_nature
        );
        assert!(
            !pokemon.sync_applied,
            "シンクロは失敗するはずだが適用されている"
        );
    }

    /// 統合テスト: BW2 続きから(思い出リンクなし) + 通常エンカウント
    #[test]
    fn test_integrated_pattern1_bw2_continue_no_memory_link() {
        let initial_seed = LcgSeed::new(0x11111);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0x5642_E610_u32;
        let expected_nature = 1_u8; // さみしがり (Lonely)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = GenerationConfig {
            game_start,
            user_offset: 0,
            max_advance: 1000,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGenerationParams {
            version: RomVersion::Black2,
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::Normal,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params, &config).expect("Generator作成失敗");
        let pokemon = generator.generate_next().expect("生成に失敗しました");

        assert_eq!(
            pokemon.pid, expected_pid,
            "PID mismatch: 0x{:08X} vs expected 0x{:08X}",
            pokemon.pid, expected_pid
        );
        assert_eq!(
            pokemon.nature as u8, expected_nature,
            "Nature mismatch: {} vs expected {} (さみしがり)",
            pokemon.nature as u8, expected_nature
        );
    }

    /// 統合テスト: BW 続きから + なみのり
    #[test]
    fn test_integrated_pattern2_bw_continue_surfing() {
        let initial_seed = LcgSeed::new(0x77777);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0x8E0F_06F1_u32;
        let expected_nature = 17_u8; // れいせい (Quiet)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = GenerationConfig {
            game_start,
            user_offset: 0,
            max_advance: 1000,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGenerationParams {
            version: RomVersion::Black,
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::Surfing,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params, &config).expect("Generator作成失敗");
        let pokemon = generator.generate_next().expect("生成に失敗しました");

        assert_eq!(
            pokemon.pid, expected_pid,
            "Pattern2 PID mismatch: 0x{:08X} vs expected 0x{:08X}",
            pokemon.pid, expected_pid
        );
        assert_eq!(
            pokemon.nature as u8, expected_nature,
            "Pattern2 Nature mismatch: {} vs expected {} (れいせい)",
            pokemon.nature as u8, expected_nature
        );
    }

    /// 統合テスト: BW2 続きから(思い出リンク有り) + 固定シンボル(伝説)
    #[test]
    fn test_integrated_pattern3_bw2_continue_with_memory_link_static() {
        let initial_seed = LcgSeed::new(0x99999);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0x59E0_C098_u32;
        let expected_nature = 15_u8; // ひかえめ (Modest)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithMemoryLink,
        };

        let config = GenerationConfig {
            game_start,
            user_offset: 0,
            max_advance: 1000,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 150,
            level_min: 50,
            level_max: 50,
            gender_threshold: 255, // genderless
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGenerationParams {
            version: RomVersion::Black2,
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::StaticSymbol,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params, &config).expect("Generator作成失敗");
        let pokemon = generator.generate_next().expect("生成に失敗しました");

        assert_eq!(
            pokemon.pid, expected_pid,
            "Pattern3 PID mismatch: 0x{:08X} vs expected 0x{:08X}",
            pokemon.pid, expected_pid
        );
        assert_eq!(
            pokemon.nature as u8, expected_nature,
            "Pattern3 Nature mismatch: {} vs expected {} (ひかえめ)",
            pokemon.nature as u8, expected_nature
        );
    }

    /// 統合テスト: BW2 続きから(思い出リンクなし) + ギフト(御三家)
    #[test]
    fn test_integrated_pattern4_bw2_continue_starter() {
        let initial_seed = LcgSeed::new(0xBBBBB);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0xC423_5DBE_u32;
        let expected_nature = 9_u8; // のうてんき (Lax)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = GenerationConfig {
            game_start,
            user_offset: 0,
            max_advance: 1000,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 495, // Snivy
            level_min: 5,
            level_max: 5,
            gender_threshold: 31, // 7:1 ratio
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGenerationParams {
            version: RomVersion::Black2,
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::StaticStarter,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params, &config).expect("Generator作成失敗");
        let pokemon = generator.generate_next().expect("生成に失敗しました");

        assert_eq!(
            pokemon.pid, expected_pid,
            "Pattern4 PID mismatch: 0x{:08X} vs expected 0x{:08X}",
            pokemon.pid, expected_pid
        );
        assert_eq!(
            pokemon.nature as u8, expected_nature,
            "Pattern4 Nature mismatch: {} vs expected {} (のうてんき)",
            pokemon.nature as u8, expected_nature
        );
    }
}
