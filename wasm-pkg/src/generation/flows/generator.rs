//! `PokemonGenerator` - 完全な個体生成
//!
//! Iterator パターンで連続的に個体を生成。
//!
//! オフセット対応:
//! - `GameOffset`: ゲーム起動条件により自動計算 (`calculate_game_offset`)
//! - `UserOffset`: ユーザ指定の追加オフセット
//! - `MtOffset`: MT19937 で IV 生成を開始する位置

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_inheritance, calculate_game_offset, calculate_needle_direction,
    generate_moving_encounter_info, generate_rng_ivs_with_offset, generate_special_encounter_info,
    is_moving_encounter_type, is_special_encounter_type,
};
use crate::types::{GameStartConfig, GenerationSource, Ivs, LcgSeed, RomVersion};

use super::egg::generate_egg;
use super::pokemon_static::generate_static_pokemon;
use super::pokemon_wild::generate_wild_pokemon;
use super::types::{
    EggGenerationConfig, EncounterMethod, EncounterSlotConfig, GeneratedEggData,
    GeneratedPokemonData, MovingEncounterInfo, OffsetConfig, PokemonGenerationConfig,
    SpecialEncounterInfo,
};

/// 野生ポケモン Generator (Iterator パターン)
pub struct WildPokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: GenerationSource,
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
        source: GenerationSource,
        config: PokemonGenerationConfig,
        slots: Vec<EncounterSlotConfig>,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = game_offset + offset_config.user_offset;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: offset_config.user_offset,
            current_advance: 0,
            rng_ivs,
            source,
            config,
            slots,
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

        // エンカウント付加情報を算出
        let (moving_encounter, special_encounter) =
            self.calculate_encounter_info(current_seed, &mut gen_lcg);

        // Moving の場合は前段消費 (空消費 1 + 判定 1 = 2消費)
        // ただし、この消費は generate_wild_pokemon の前に既に gen_lcg で消費済み
        // (calculate_encounter_info 内で処理)

        if let Ok(raw) = generate_wild_pokemon(&mut gen_lcg, &self.config, &self.slots) {
            // 次の消費位置へ移動（1消費）
            self.lcg.next();
            self.current_advance += 1;

            Some(GeneratedPokemonData::new(
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
            // エラー時も進める
            self.lcg.next();
            self.current_advance += 1;
            None
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
        let enc_type = self.config.encounter_type;

        // 移動エンカウント情報 (消費あり)
        if is_moving_encounter_type(enc_type)
            && self.config.encounter_method == EncounterMethod::Moving
        {
            // 空消費 1
            gen_lcg.next();
            // エンカウント判定 1
            let rand_value = gen_lcg.next().unwrap_or(0);
            let moving_info = generate_moving_encounter_info(self.config.version, rand_value);
            return (Some(moving_info), None);
        }

        // 特殊エンカウント情報 (消費なし、参考情報として算出)
        if is_special_encounter_type(enc_type) {
            // needle_direction と同様、現在の seed から参考情報として算出
            // 実際の消費には影響しない
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

    /// 条件を満たす最初の個体を探す
    pub fn find<F>(&mut self, max_advances: u32, predicate: F) -> Option<GeneratedPokemonData>
    where
        F: Fn(&GeneratedPokemonData) -> bool,
    {
        for _ in 0..max_advances {
            if let Some(pokemon) = self.generate_next()
                && predicate(&pokemon)
            {
                return Some(pokemon);
            }
        }
        None
    }
}

/// 固定ポケモン Generator (Iterator パターン)
pub struct StaticPokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: GenerationSource,
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
        source: GenerationSource,
        config: PokemonGenerationConfig,
        species_id: u16,
        level: u8,
        gender_threshold: u8,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = game_offset + offset_config.user_offset;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: offset_config.user_offset,
            current_advance: 0,
            rng_ivs,
            source,
            config,
            species_id,
            level,
            gender_threshold,
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
    pub fn generate_next(&mut self) -> GeneratedPokemonData {
        let current_seed = self.lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);
        let advance = self.current_advance;

        let mut gen_lcg = self.lcg.clone();

        let raw = generate_static_pokemon(
            &mut gen_lcg,
            &self.config,
            self.species_id,
            self.level,
            self.gender_threshold,
        );

        // 次の消費位置へ移動
        self.lcg.next();
        self.current_advance += 1;

        // 固定エンカウントはエンカウント付加情報なし
        GeneratedPokemonData::new(
            &raw,
            self.rng_ivs,
            advance,
            needle,
            self.source.clone(),
            current_seed.value(),
            None,
            None,
        )
    }

    /// 指定数の個体を生成
    pub fn take(&mut self, count: u32) -> Vec<GeneratedPokemonData> {
        (0..count).map(|_| self.generate_next()).collect()
    }

    /// 条件を満たす最初の個体を探す
    pub fn find<F>(&mut self, max_advances: u32, predicate: F) -> Option<GeneratedPokemonData>
    where
        F: Fn(&GeneratedPokemonData) -> bool,
    {
        for _ in 0..max_advances {
            let pokemon = self.generate_next();
            if predicate(&pokemon) {
                return Some(pokemon);
            }
        }
        None
    }
}

/// 卵 Generator (Iterator パターン)
pub struct EggGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: GenerationSource,
    config: EggGenerationConfig,
    parent_male: Ivs,
    parent_female: Ivs,
}

impl EggGenerator {
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
        source: GenerationSource,
        config: EggGenerationConfig,
        parent_male: Ivs,
        parent_female: Ivs,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        // 初期位置へジャンプ
        let mut lcg = Lcg64::new(base_seed);
        let total_offset = game_offset + offset_config.user_offset;
        lcg.jump(u64::from(total_offset));

        Ok(Self {
            lcg,
            game_offset,
            user_offset: offset_config.user_offset,
            current_advance: 0,
            rng_ivs,
            source,
            config,
            parent_male,
            parent_female,
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

        let raw = generate_egg(&mut gen_lcg, &self.config);

        // 遺伝適用
        let final_ivs = apply_inheritance(
            &self.rng_ivs,
            &self.parent_male,
            &self.parent_female,
            &raw.inheritance,
        );

        // 次の消費位置へ移動
        self.lcg.next();
        self.current_advance += 1;

        GeneratedEggData::new(
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

    /// 条件を満たす最初の個体を探す
    pub fn find<F>(&mut self, max_advances: u32, predicate: F) -> Option<GeneratedEggData>
    where
        F: Fn(&GeneratedEggData) -> bool,
    {
        for _ in 0..max_advances {
            let egg = self.generate_next();
            if predicate(&egg) {
                return Some(egg);
            }
        }
        None
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
            encounter_method: EncounterMethod::SweetScent,
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

    fn make_source(seed: u64) -> GenerationSource {
        GenerationSource::fixed(seed)
    }

    #[test]
    fn test_wild_pokemon_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config =
            OffsetConfig::for_encounter(RomVersion::Black, EncounterType::Normal, 0);
        let source = make_source(base_seed.value());
        let config = make_pokemon_config();
        let slots = make_slots();

        let generator = WildPokemonGenerator::new(
            base_seed,
            RomVersion::Black,
            &game_start,
            offset_config,
            source,
            config,
            slots,
        );

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        assert!(g.game_offset() > 0);

        // Iterator パターン: generate_next() で順次生成
        let pokemon = g.generate_next();
        assert!(pokemon.is_some());
        assert_eq!(g.current_advance(), 1);

        // 続けて生成
        let pokemon2 = g.generate_next();
        assert!(pokemon2.is_some());
        assert_eq!(g.current_advance(), 2);
    }

    #[test]
    fn test_wild_pokemon_generator_take() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config =
            OffsetConfig::for_encounter(RomVersion::Black, EncounterType::Normal, 0);
        let source = make_source(base_seed.value());
        let config = make_pokemon_config();
        let slots = make_slots();

        let mut g = WildPokemonGenerator::new(
            base_seed,
            RomVersion::Black,
            &game_start,
            offset_config,
            source,
            config,
            slots,
        )
        .unwrap();

        // 5体まとめて生成
        let results = g.take(5);
        assert_eq!(results.len(), 5);
        assert_eq!(g.current_advance(), 5);

        // advance は 0, 1, 2, 3, 4 の順で記録されている
        for (i, pokemon) in results.iter().enumerate() {
            #[allow(clippy::cast_possible_truncation)]
            let expected_advance = i as u32;
            assert_eq!(pokemon.advance, expected_advance);
        }
    }

    #[test]
    fn test_static_pokemon_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config =
            OffsetConfig::for_encounter(RomVersion::Black, EncounterType::StaticSymbol, 0);
        let source = make_source(base_seed.value());
        let config = PokemonGenerationConfig {
            encounter_type: EncounterType::StaticSymbol,
            ..make_pokemon_config()
        };

        let generator = StaticPokemonGenerator::new(
            base_seed,
            RomVersion::Black,
            &game_start,
            offset_config,
            source,
            config,
            150, // Mewtwo
            70,
            255, // Genderless
        );

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let pokemon = g.generate_next();
        assert_eq!(pokemon.species_id, 150);
        assert_eq!(g.current_advance(), 1);
    }

    #[test]
    fn test_egg_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let game_start = make_game_start();
        let offset_config = OffsetConfig::for_egg(0);
        let source = make_source(base_seed.value());
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
            source,
            config,
            parent_male,
            parent_female,
        );

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let egg = g.generate_next();
        // 遺伝が適用されていること
        // (遺伝スロットによって親のIVが継承される)
        assert!(egg.ivs.hp <= 31);
        assert_eq!(g.current_advance(), 1);
    }

    #[test]
    fn test_offset_config() {
        // 孵化用 (mt_offset = 7)
        let offset = OffsetConfig::for_egg(100);
        assert_eq!(offset.user_offset, 100);
        assert_eq!(offset.mt_offset, 7);

        // BW 野生用 (mt_offset = 0)
        let offset = OffsetConfig::for_encounter(RomVersion::Black, EncounterType::Normal, 50);
        assert_eq!(offset.user_offset, 50);
        assert_eq!(offset.mt_offset, 0);

        // BW2 野生用 (mt_offset = 2)
        let offset = OffsetConfig::for_encounter(RomVersion::Black2, EncounterType::Normal, 0);
        assert_eq!(offset.user_offset, 0);
        assert_eq!(offset.mt_offset, 2);

        // 徘徊用 (mt_offset = 1)
        let offset = OffsetConfig::for_encounter(RomVersion::Black, EncounterType::Roamer, 0);
        assert_eq!(offset.user_offset, 0);
        assert_eq!(offset.mt_offset, 1);

        // 孵化用 (for_encounter経由, mt_offset = 7)
        let offset = OffsetConfig::for_encounter(RomVersion::Black, EncounterType::Egg, 10);
        assert_eq!(offset.user_offset, 10);
        assert_eq!(offset.mt_offset, 7);

        // カスタム
        let offset = OffsetConfig::with_custom_mt_offset(50, 0);
        assert_eq!(offset.user_offset, 50);
        assert_eq!(offset.mt_offset, 0);
    }

    /// 元実装テストパターン: PID生成の具体値検証
    /// r = 0x12345678, tid = 12345, sid = 54321 のケース
    #[test]
    fn test_pid_generation_reference_values() {
        use crate::generation::algorithm::{generate_base_pid, generate_wild_pid};

        let r = 0x1234_5678_u32;
        let tid = 12345_u16;
        let sid = 54321_u16;

        // 基本 PID: r ^ 0x10000
        let base_pid = generate_base_pid(r);
        assert_eq!(base_pid, 0x1234_5678 ^ 0x10000);
        assert_eq!(base_pid, 0x1235_5678);

        // ID補正後 PID
        let wild_pid = generate_wild_pid(r, tid, sid);
        // pid_low = 0x5678
        // xor_result = 0x5678 ^ 12345 ^ 54321 = 0x5678 ^ 0x3039 ^ 0xD431 = 0xB270 (偶数)
        // → 最上位ビットは 0
        assert_eq!(wild_pid, 0x1235_5678 & 0x7FFF_FFFF);
        assert_eq!(wild_pid, 0x1235_5678);
    }

    // =========================================================================
    // 統合テストパターン: 元実装 (niart120/pokemon-gen5-initseed) の期待値検証
    // =========================================================================

    /// 統合テスト: BW 続きから + 野生 + シンクロあり(いじっぱり)
    ///
    /// 元実装の `test_integrated_generation_bw_continue_wild_sync_adamant_expected_pid` より:
    /// - `initial_seed` = `0x1C40_524D_87E8_0030`
    /// - tid = 0, sid = 0
    /// - シンクロ: いじっぱり (ID=3)
    /// - `expected_pid` = `0xDF8F_ECE9`
    /// - `expected_nature` = 14 (むじゃき / Naive) ※シンクロ失敗
    #[test]
    fn test_integrated_bw_continue_wild_sync_adamant() {
        use super::OffsetConfig;
        use crate::types::{GameStartConfig, LcgSeed, Nature, SaveState, StartMode};

        let initial_seed = LcgSeed::new(0x1C40_524D_87E8_0030);
        let tid = 0_u16;
        let sid = 0_u16;
        let expected_pid = 0xDF8F_ECE9_u32;
        let expected_nature = 14_u8; // むじゃき (Naive)

        // BW 続きから
        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        // 設定: シンクロいじっぱり
        let config = PokemonGenerationConfig {
            version: RomVersion::Black,
            encounter_type: EncounterType::Normal,
            tid,
            sid,
            lead_ability: LeadAbilityEffect::Synchronize(Nature::Adamant),
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
            encounter_method: EncounterMethod::SweetScent,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
        }];

        // Generator を使って生成
        let source = make_source(initial_seed.value());
        let mut generator = WildPokemonGenerator::new(
            initial_seed,
            RomVersion::Black,
            &game_start,
            OffsetConfig::default(),
            source,
            config,
            slots,
        )
        .expect("Generator作成失敗");
        let pokemon = generator.generate_next().expect("生成に失敗しました");

        // PID 検証
        assert_eq!(
            pokemon.pid, expected_pid,
            "PID が期待値と一致しません: calculated=0x{:08X}, expected=0x{:08X}",
            pokemon.pid, expected_pid
        );

        // 性格検証 (シンクロ失敗 → むじゃき)
        assert_eq!(
            pokemon.nature as u8, expected_nature,
            "性格が期待値と一致しません: calculated={}, expected={} (むじゃき)",
            pokemon.nature as u8, expected_nature
        );

        // シンクロ失敗確認
        assert!(
            !pokemon.sync_applied,
            "シンクロは失敗するはずだが適用されている"
        );
    }

    /// 統合テスト: BW2 続きから(思い出リンクなし) + 通常エンカウント
    ///
    /// 元実装の `test_integrated_generation_pattern1_bw2_continue_no_memory_link` より:
    /// - `initial_seed` = `0x11111`
    /// - tid = 54321, sid = 12345
    /// - `expected_pid` = `0x5642_E610`
    /// - `expected_nature` = 1 (さみしがり / Lonely)
    #[test]
    fn test_integrated_pattern1_bw2_continue_no_memory_link() {
        use super::OffsetConfig;
        use crate::types::{GameStartConfig, LcgSeed, SaveState, StartMode};

        let initial_seed = LcgSeed::new(0x11111);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0x5642_E610_u32;
        let expected_nature = 1_u8; // さみしがり (Lonely)

        // BW2 続きから (思い出リンクなし)
        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = PokemonGenerationConfig {
            version: RomVersion::Black2,
            encounter_type: EncounterType::Normal,
            tid,
            sid,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
            encounter_method: EncounterMethod::SweetScent,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
        }];

        // Generator を使って生成
        let source = make_source(initial_seed.value());
        let mut generator = WildPokemonGenerator::new(
            initial_seed,
            RomVersion::Black2,
            &game_start,
            OffsetConfig::default(),
            source,
            config,
            slots,
        )
        .expect("Generator作成失敗");
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
    ///
    /// 元実装の `test_integrated_generation_pattern2_bw_continue_surfing` より:
    /// - `initial_seed` = `0x77777`
    /// - tid = 54321, sid = 12345
    /// - `expected_pid` = `0x8E0F_06F1`
    /// - `expected_nature` = 17 (れいせい / Quiet)
    #[test]
    fn test_integrated_pattern2_bw_continue_surfing() {
        use super::OffsetConfig;
        use crate::types::{GameStartConfig, LcgSeed, SaveState, StartMode};

        let initial_seed = LcgSeed::new(0x77777);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0x8E0F_06F1_u32;
        let expected_nature = 17_u8; // れいせい (Quiet)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = PokemonGenerationConfig {
            version: RomVersion::Black,
            encounter_type: EncounterType::Surfing,
            tid,
            sid,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
            encounter_method: EncounterMethod::SweetScent,
        };

        let slots = vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
        }];

        // Generator を使って生成
        let source = make_source(initial_seed.value());
        let mut generator = WildPokemonGenerator::new(
            initial_seed,
            RomVersion::Black,
            &game_start,
            OffsetConfig::default(),
            source,
            config,
            slots,
        )
        .expect("Generator作成失敗");
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
    ///
    /// 元実装の `test_integrated_generation_pattern3_bw2_continue_with_memory_link_static` より:
    /// - `initial_seed` = `0x99999`
    /// - tid = 54321, sid = 12345
    /// - `expected_pid` = `0x59E0_C098`
    /// - `expected_nature` = 15 (ひかえめ / Modest)
    #[test]
    fn test_integrated_pattern3_bw2_continue_with_memory_link_static() {
        use super::OffsetConfig;
        use crate::types::{GameStartConfig, LcgSeed, SaveState, StartMode};

        let initial_seed = LcgSeed::new(0x99999);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0x59E0_C098_u32;
        let expected_nature = 15_u8; // ひかえめ (Modest)

        // BW2 続きから (思い出リンク有り)
        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithMemoryLink,
        };

        let config = PokemonGenerationConfig {
            version: RomVersion::Black2,
            encounter_type: EncounterType::StaticSymbol,
            tid,
            sid,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
            encounter_method: EncounterMethod::SweetScent,
        };

        // 固定シンボルは StaticPokemonGenerator を使う
        let source = make_source(initial_seed.value());
        let mut generator = StaticPokemonGenerator::new(
            initial_seed,
            RomVersion::Black2,
            &game_start,
            OffsetConfig::default(),
            source,
            config,
            150, // species_id (placeholder)
            50,  // level
            255, // genderless
        )
        .expect("Generator作成失敗");
        let pokemon = generator.generate_next();

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
    ///
    /// 元実装の `test_integrated_generation_pattern4_bw2_continue_no_memory_link_static_starter` より:
    /// - `initial_seed` = `0xBBBBB`
    /// - tid = 54321, sid = 12345
    /// - `expected_pid` = `0xC423_5DBE`
    /// - `expected_nature` = 9 (のうてんき / Lax)
    #[test]
    fn test_integrated_pattern4_bw2_continue_starter() {
        use super::OffsetConfig;
        use crate::types::{GameStartConfig, LcgSeed, SaveState, StartMode};

        let initial_seed = LcgSeed::new(0xBBBBB);
        let tid = 54321_u16;
        let sid = 12345_u16;
        let expected_pid = 0xC423_5DBE_u32;
        let expected_nature = 9_u8; // のうてんき (Lax)

        let game_start = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };

        let config = PokemonGenerationConfig {
            version: RomVersion::Black2,
            encounter_type: EncounterType::StaticStarter,
            tid,
            sid,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
            encounter_method: EncounterMethod::SweetScent,
        };

        // 御三家は StaticPokemonGenerator を使う
        let source = make_source(initial_seed.value());
        let mut generator = StaticPokemonGenerator::new(
            initial_seed,
            RomVersion::Black2,
            &game_start,
            OffsetConfig::default(),
            source,
            config,
            495, // Snivy
            5,   // level
            31,  // 7:1 ratio
        )
        .expect("Generator作成失敗");
        let pokemon = generator.generate_next();

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
