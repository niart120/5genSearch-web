//! `EggGenerator` - タマゴ個体生成
//!
//! Iterator パターンで連続的にタマゴを生成。

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_inheritance, calculate_game_offset, calculate_needle_direction,
    generate_rng_ivs_with_offset,
};
use crate::types::{
    EggGenerationParams, GeneratedEggData, GenerationConfig, Ivs, LcgSeed, SeedOrigin,
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
        let game_offset = calculate_game_offset(base_seed, config.version, &config.game_start)?;
        // Egg: MT offset = 7 (固定)
        let mt_offset = 7;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, mt_offset);

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
        )
    }

    /// 指定数の個体を生成
    pub fn take(&mut self, count: u32) -> Vec<GeneratedEggData> {
        (0..count).map(|_| self.generate_next()).collect()
    }
}
