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
//! - `generate_pokemon_list` - ポケモン一括生成 (複数 Seed 対応、フィルタ対応)
//! - `generate_egg_list` - タマゴ一括生成 (複数 Seed 対応、フィルタ対応)

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_inheritance, calculate_game_offset, calculate_needle_direction,
    generate_moving_encounter_info, generate_rng_ivs_with_offset, generate_special_encounter_info,
    is_moving_encounter_type, is_special_encounter_type,
};
use crate::generation::seed_resolver::resolve_all_seeds;
use crate::types::{
    EggGeneratorParams, EncounterMethod, EncounterType, GeneratedEggData, GeneratedPokemonData,
    IvFilter, Ivs, LcgSeed, MovingEncounterInfo, PokemonGeneratorParams, RomVersion, SeedOrigin,
    SpecialEncounterInfo,
};

use super::egg::generate_egg;
use super::pokemon_static::generate_static_pokemon;
use super::pokemon_wild::generate_wild_pokemon;

// ===== MT オフセット計算 =====

/// エンカウント種別とバージョンから MT オフセットを計算
///
/// MT19937 で IV 生成を開始する位置を決定する。
const fn calculate_mt_offset(version: RomVersion, encounter_type: EncounterType) -> u32 {
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
/// - 複数 Seed 対応: `SeedInput` の全バリアントを処理
/// - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
///
/// # Arguments
///
/// * `params` - 生成パラメータ (Wild / Static 統合)
/// * `count` - 各 Seed から生成する個体数
/// * `filter` - IV フィルタ (None の場合は全件返却)
///
/// # Errors
///
/// - `SeedInput` の解決に失敗した場合
/// - 起動設定が無効な場合
/// - エンカウントスロットが空の場合
pub fn generate_pokemon_list(
    params: &PokemonGeneratorParams,
    count: u32,
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

    // 複数 Seed を解決
    let seeds = resolve_all_seeds(&params.config.input)?;

    // 各 Seed に対して生成
    let results: Result<Vec<_>, String> = seeds
        .into_iter()
        .map(|(seed, origin)| generate_pokemon_for_seed(seed, origin, params, count, filter))
        .collect();

    Ok(results?.into_iter().flatten().collect())
}

/// タマゴ一括生成 (公開 API)
///
/// - 複数 Seed 対応: `SeedInput` の全バリアントを処理
/// - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
///
/// # Arguments
///
/// * `params` - 生成パラメータ
/// * `count` - 各 Seed から生成する個体数
/// * `filter` - IV フィルタ (None の場合は全件返却)
///
/// # Errors
///
/// - `SeedInput` の解決に失敗した場合
/// - 起動設定が無効な場合
pub fn generate_egg_list(
    params: &EggGeneratorParams,
    count: u32,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedEggData>, String> {
    // 複数 Seed を解決
    let seeds = resolve_all_seeds(&params.config.input)?;

    // 各 Seed に対して生成
    let results: Result<Vec<_>, String> = seeds
        .into_iter()
        .map(|(seed, origin)| generate_egg_for_seed(seed, origin, params, count, filter))
        .collect();

    Ok(results?.into_iter().flatten().collect())
}

/// エンカウント種別が Static かどうか判定
fn is_static_encounter(encounter_type: EncounterType) -> bool {
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
    seed: LcgSeed,
    origin: SeedOrigin,
    params: &PokemonGeneratorParams,
    count: u32,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedPokemonData>, String> {
    let mut generator = PokemonGenerator::new(seed, origin, params)?;

    let pokemons = generator.take(count);
    Ok(apply_filter(pokemons, filter))
}

/// 単一 Seed に対してタマゴを生成 (内部関数)
fn generate_egg_for_seed(
    seed: LcgSeed,
    origin: SeedOrigin,
    params: &EggGeneratorParams,
    count: u32,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedEggData>, String> {
    let mut generator = EggGenerator::new(seed, origin, params)?;

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

// ===== Generator 構造体 =====

/// ポケモン Generator (Wild / Static 統合)
///
/// Iterator パターンで連続的に個体を生成。
/// `encounter_type` により Wild / Static を判別し、内部で適切な生成処理を実行。
pub struct PokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: SeedOrigin,
    params: PokemonGeneratorParams,
}

impl PokemonGenerator {
    /// Generator を作成
    ///
    /// # Arguments
    ///
    /// * `base_seed` - LCG 初期シード
    /// * `source` - 生成元情報
    /// * `params` - 生成パラメータ
    ///
    /// # Errors
    ///
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        source: SeedOrigin,
        params: &PokemonGeneratorParams,
    ) -> Result<Self, String> {
        let cfg = &params.config;
        let game_offset = calculate_game_offset(base_seed, cfg.version, &cfg.game_start)?;
        let mt_offset = calculate_mt_offset(cfg.version, params.encounter_type);
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, mt_offset);

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = game_offset + cfg.user_offset;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: cfg.user_offset,
            current_advance: 0,
            rng_ivs,
            source,
            params: params.clone(),
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
            let raw = generate_static_pokemon(&mut gen_lcg, &self.params, slot);

            self.lcg.next();
            self.current_advance += 1;

            Some(GeneratedPokemonData::from_raw(
                &raw,
                self.rng_ivs,
                advance,
                needle,
                self.source.clone(),
                current_seed.value(),
                None,
                None,
            ))
        } else {
            // Wild: エンカウント付加情報あり
            let (moving_encounter, special_encounter) =
                self.calculate_encounter_info(current_seed, &mut gen_lcg);

            if let Ok(raw) = generate_wild_pokemon(&mut gen_lcg, &self.params) {
                self.lcg.next();
                self.current_advance += 1;

                Some(GeneratedPokemonData::from_raw(
                    &raw,
                    self.rng_ivs,
                    advance,
                    needle,
                    self.source.clone(),
                    current_seed.value(),
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
            let moving_info =
                generate_moving_encounter_info(self.params.config.version, rand_value);
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

/// 卵 Generator (Iterator パターン)
pub struct EggGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: SeedOrigin,
    params: EggGeneratorParams,
}

impl EggGenerator {
    /// Generator を作成
    ///
    /// # Arguments
    ///
    /// * `base_seed` - LCG 初期シード
    /// * `source` - 生成元情報
    /// * `params` - 生成パラメータ
    ///
    /// # Errors
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        source: SeedOrigin,
        params: &EggGeneratorParams,
    ) -> Result<Self, String> {
        let cfg = &params.config;
        let game_offset = calculate_game_offset(base_seed, cfg.version, &cfg.game_start)?;
        // Egg: MT offset = 7 (固定)
        let mt_offset = 7;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, mt_offset);

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = game_offset + cfg.user_offset;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: cfg.user_offset,
            current_advance: 0,
            rng_ivs,
            source,
            params: params.clone(),
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
    pub fn generate_next(&mut self) -> GeneratedEggData {
        let current_seed = self.lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);
        let advance = self.current_advance;

        let mut gen_lcg = self.lcg.clone();

        let raw = generate_egg(&mut gen_lcg, &self.params);

        // 遺伝適用
        let final_ivs = apply_inheritance(
            &self.rng_ivs,
            &self.params.parent_male,
            &self.params.parent_female,
            &raw.inheritance,
        );

        // 次の消費位置へ移動
        self.lcg.next();
        self.current_advance += 1;

        GeneratedEggData::from_raw(
            &raw,
            final_ivs,
            advance,
            needle,
            self.source.clone(),
            current_seed.value(),
        )
    }

    /// 指定数の個体を生成
    pub fn take(&mut self, count: u32) -> Vec<GeneratedEggData> {
        (0..count).map(|_| self.generate_next()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        EncounterMethod, EncounterSlotConfig, EncounterType, EverstonePlan, GameStartConfig,
        GenderRatio, GeneratorConfig, LeadAbilityEffect, Nature, RomVersion, SaveState, SeedInput,
        StartMode, TrainerInfo,
    };

    fn make_game_start() -> GameStartConfig {
        GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        }
    }

    fn make_config() -> GeneratorConfig {
        GeneratorConfig {
            input: SeedInput::Seeds { seeds: vec![] },
            version: RomVersion::Black,
            game_start: make_game_start(),
            user_offset: 0,
        }
    }

    fn make_trainer() -> TrainerInfo {
        TrainerInfo {
            tid: 12345,
            sid: 54321,
        }
    }

    fn make_pokemon_params() -> PokemonGeneratorParams {
        PokemonGeneratorParams {
            config: make_config(),
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
        let params = PokemonGeneratorParams {
            slots: slots.clone(),
            ..make_pokemon_params()
        };

        let generator = PokemonGenerator::new(base_seed, source, &params);

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
        let params = PokemonGeneratorParams {
            slots: slots.clone(),
            ..make_pokemon_params()
        };

        let mut g = PokemonGenerator::new(base_seed, source, &params).unwrap();

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
        let params = PokemonGeneratorParams {
            encounter_type: EncounterType::StaticSymbol,
            slots: slots.clone(),
            ..make_pokemon_params()
        };

        let generator = PokemonGenerator::new(base_seed, source, &params);

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
        let params = EggGeneratorParams {
            config: make_config(),
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

        let generator = EggGenerator::new(base_seed, source, &params);

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

    /// 元実装テストパターン: PID生成の具体値検証
    #[test]
    fn test_pid_generation_reference_values() {
        use crate::generation::algorithm::{generate_base_pid, generate_wild_pid};

        let r = 0x1234_5678_u32;
        let tid = 12345_u16;
        let sid = 54321_u16;

        let base_pid = generate_base_pid(r);
        assert_eq!(base_pid, 0x1234_5678 ^ 0x10000);
        assert_eq!(base_pid, 0x1235_5678);

        let wild_pid = generate_wild_pid(r, tid, sid);
        assert_eq!(wild_pid, 0x1235_5678 & 0x7FFF_FFFF);
        assert_eq!(wild_pid, 0x1235_5678);
    }

    // =========================================================================
    // 統合テストパターン: 元実装 (niart120/pokemon-gen5-initseed) の期待値検証
    // =========================================================================

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

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGeneratorParams {
            config: GeneratorConfig {
                input: SeedInput::Seeds { seeds: vec![] },
                version: RomVersion::Black,
                game_start,
                user_offset: 0,
            },
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::Normal,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::Synchronize(Nature::Adamant),
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params).expect("Generator作成失敗");
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

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGeneratorParams {
            config: GeneratorConfig {
                input: SeedInput::Seeds { seeds: vec![] },
                version: RomVersion::Black2,
                game_start,
                user_offset: 0,
            },
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::Normal,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params).expect("Generator作成失敗");
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

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGeneratorParams {
            config: GeneratorConfig {
                input: SeedInput::Seeds { seeds: vec![] },
                version: RomVersion::Black,
                game_start,
                user_offset: 0,
            },
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::Surfing,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params).expect("Generator作成失敗");
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

        let slots = vec![EncounterSlotConfig {
            species_id: 150,
            level_min: 50,
            level_max: 50,
            gender_threshold: 255, // genderless
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGeneratorParams {
            config: GeneratorConfig {
                input: SeedInput::Seeds { seeds: vec![] },
                version: RomVersion::Black2,
                game_start,
                user_offset: 0,
            },
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::StaticSymbol,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params).expect("Generator作成失敗");
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

        let slots = vec![EncounterSlotConfig {
            species_id: 495, // Snivy
            level_min: 5,
            level_max: 5,
            gender_threshold: 31, // 7:1 ratio
            has_held_item: false,
            shiny_locked: false,
        }];

        let params = PokemonGeneratorParams {
            config: GeneratorConfig {
                input: SeedInput::Seeds { seeds: vec![] },
                version: RomVersion::Black2,
                game_start,
                user_offset: 0,
            },
            trainer: TrainerInfo { tid, sid },
            encounter_type: EncounterType::StaticStarter,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: slots.clone(),
        };

        let source = make_source(initial_seed);
        let mut generator =
            PokemonGenerator::new(initial_seed, source, &params).expect("Generator作成失敗");
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
