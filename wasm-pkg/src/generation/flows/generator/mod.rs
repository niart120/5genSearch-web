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
