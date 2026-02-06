//! `EggGenerator` - タマゴ個体生成
//!
//! Iterator パターンで連続的にタマゴを生成。

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_inheritance, calculate_game_offset, calculate_mt_offset, calculate_needle_direction,
    generate_rng_ivs_with_offset, resolve_egg_npc_advance,
};
use crate::types::{
    EggGenerationParams, EncounterType, GeneratedEggData, GenerationConfig, Ivs, LcgSeed,
    SeedOrigin,
};

use super::super::egg::generate_egg;

pub struct EggGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: SeedOrigin,
    params: EggGenerationParams,
}

impl EggGenerator {
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
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        source: SeedOrigin,
        params: &EggGenerationParams,
        config: &GenerationConfig,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, config.version, config.game_start)?;
        let mt_offset = calculate_mt_offset(config.version, EncounterType::Egg);
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, mt_offset, false);

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

        // NPC消費を考慮する場合
        let (gen_lcg, margin_frames) = if self.params.consider_npc {
            let result = resolve_egg_npc_advance(current_seed);
            (Lcg64::new(result.seed), Some(result.margin_frames))
        } else {
            (self.lcg.clone(), None)
        };

        let mut gen_lcg = gen_lcg;
        let raw = generate_egg(&mut gen_lcg, &self.params);

        // 遺伝適用
        let final_ivs = apply_inheritance(
            self.rng_ivs,
            self.params.parent_male,
            self.params.parent_female,
            raw.inheritance,
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
            margin_frames,
            self.params.species_id,
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
        EverstonePlan, GameStartConfig, GenderRatio, Ivs, LcgSeed, RomVersion, SaveState,
        SeedOrigin, StartMode, TrainerInfo,
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

    fn make_source(seed: LcgSeed) -> SeedOrigin {
        SeedOrigin::seed(seed)
    }

    #[test]
    fn test_egg_generator() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let source = make_source(base_seed);
        let params = EggGenerationParams {
            trainer: make_trainer(),
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::F1M1,
            nidoran_flag: false,
            masuda_method: false,
            parent_male: Ivs::new(31, 31, 31, 0, 0, 0),
            parent_female: Ivs::new(0, 0, 0, 31, 31, 31),
            consider_npc: false,
            species_id: None,
        };
        let config = make_config();

        let generator = EggGenerator::new(base_seed, source, &params, &config);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let egg = g.generate_next();
        assert!(egg.core.ivs.hp <= 31);
        assert_eq!(g.current_advance(), 1);
        assert!(egg.margin_frames.is_none());
    }

    #[test]
    fn test_egg_generator_with_npc() {
        let base_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let source = make_source(base_seed);
        let params = EggGenerationParams {
            trainer: make_trainer(),
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::F1M1,
            nidoran_flag: false,
            masuda_method: false,
            parent_male: Ivs::new(31, 31, 31, 0, 0, 0),
            parent_female: Ivs::new(0, 0, 0, 31, 31, 31),
            consider_npc: true,
            species_id: None,
        };
        let config = make_config();

        let generator = EggGenerator::new(base_seed, source, &params, &config);

        assert!(generator.is_ok());

        let mut g = generator.unwrap();
        let egg = g.generate_next();
        assert!(egg.core.ivs.hp <= 31);
        assert!(egg.margin_frames.is_some());
    }
}
