//! レポート針パターン検索
//!
//! 観測したレポート針パターンから消費位置を特定する。
//! 既に解決された `SeedOrigin` を使用する。

use wasm_bindgen::prelude::*;

use crate::core::lcg::Lcg64;
use crate::core::needle::calc_report_needle_direction;
use crate::generation::algorithm::calculate_game_offset;
use crate::types::{
    GenerationConfig, NeedleDirection, NeedlePattern, NeedleSearchResult, RomVersion, SeedOrigin,
};

/// レポート針パターン検索 (公開 API)
///
/// 各 `SeedOrigin` について、`NeedlePattern` が出現する位置を検索。
/// 返却する `advance` はパターン末尾位置 (ユーザーが最後に観測した針の位置)。
///
/// # Arguments
/// * `origins` - 既に解決された Seed リスト
/// * `pattern` - 検索する針パターン
/// * `version` - ROM バージョン
/// * `config` - 生成設定 (`game_start`, `user_offset`, `max_advance`)
///
/// # Returns
/// パターンが一致した全件の結果リスト
///
/// # Errors
/// - 起動設定が無効な場合
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn search_needle_pattern(
    origins: Vec<SeedOrigin>,
    pattern: NeedlePattern,
    version: RomVersion,
    config: &GenerationConfig,
) -> Result<Vec<NeedleSearchResult>, String> {
    let pattern_dirs = pattern.directions();

    if pattern_dirs.is_empty() {
        return Err("Pattern is empty".into());
    }

    let mut results = Vec::new();

    for origin in origins {
        let seed = origin.base_seed();

        // game_offset 計算
        let game_offset = calculate_game_offset(seed, version, &config.game_start)?;

        // 検索範囲: user_offset ～ max_advance
        let start = config.user_offset;
        let end = config.max_advance;

        // パターン長を考慮した終了位置の調整
        // パターン末尾が end を超えないようにする
        #[allow(clippy::cast_possible_truncation)]
        let pattern_len = pattern_dirs.len() as u32;
        if pattern_len == 0 || start + pattern_len - 1 > end {
            continue;
        }
        let search_end = end - pattern_len + 1;

        // LCG を初期化してジャンプ
        let mut lcg = Lcg64::new(seed);
        lcg.jump(u64::from(game_offset + start));

        // パターン検索
        for advance in start..=search_end {
            if matches_pattern(&lcg, pattern_dirs) {
                // パターン末尾位置を返す
                let end_advance = advance + pattern_len - 1;
                results.push(NeedleSearchResult {
                    advance: end_advance,
                    source: origin.clone(),
                });
            }
            lcg.next();
        }
    }

    Ok(results)
}

/// 現在の LCG 位置からパターンが一致するか確認
///
/// LCG を消費せずにクローンで確認
fn matches_pattern(lcg: &Lcg64, pattern: &[NeedleDirection]) -> bool {
    let mut check_lcg = lcg.clone();
    for expected in pattern {
        let seed = check_lcg.current_seed();
        let direction = calc_report_needle_direction(seed);
        if direction != *expected {
            return false;
        }
        check_lcg.next();
    }
    true
}

/// 針パターンを取得 (ユーティリティ関数)
///
/// 指定した Seed と advance から始まる針パターンを取得。
#[wasm_bindgen]
pub fn get_needle_pattern_at(seed_value: u64, advance: u32, count: u32) -> Vec<u8> {
    let seed = crate::types::LcgSeed::new(seed_value);
    let mut lcg = Lcg64::new(seed);
    lcg.jump(u64::from(advance));

    (0..count)
        .map(|_| {
            let direction = calc_report_needle_direction(lcg.current_seed());
            lcg.next();
            direction.value()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        GameStartConfig, GenerationConfig, LcgSeed, NeedlePattern, RomVersion, SaveState,
        SeedOrigin, StartMode,
    };

    fn make_config() -> GenerationConfig {
        GenerationConfig {
            game_start: GameStartConfig {
                start_mode: StartMode::Continue,
                save_state: SaveState::WithSave,
            },
            user_offset: 0,
            max_advance: 100,
        }
    }

    #[test]
    fn test_search_needle_pattern_finds_match() {
        use crate::generation::algorithm::calculate_game_offset;

        let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let config = make_config();
        let version = RomVersion::Black;

        // game_offset を計算
        let game_offset = calculate_game_offset(seed, version, &config.game_start).unwrap();

        // game_offset を考慮した位置で針パターンを取得
        // advance=10 は game_offset からの相対なので、実際の LCG 位置は game_offset + 10
        let target_advance = 10_u32;
        let pattern = get_needle_pattern_at(seed.value(), game_offset + target_advance, 3);
        let needle_pattern = NeedlePattern::from_values(&pattern);

        // SeedOrigin を構築
        let mt_seed = seed.derive_mt_seed();
        let origin = SeedOrigin::Seed {
            base_seed: seed,
            mt_seed,
        };

        let results = search_needle_pattern(vec![origin], needle_pattern, version, &config);
        assert!(results.is_ok());

        let results = results.unwrap();
        // パターン末尾位置 (10 + 3 - 1 = 12) を返す
        assert!(!results.is_empty(), "Expected to find pattern match");
        assert_eq!(results[0].advance, target_advance + 3 - 1);
    }

    #[test]
    fn test_search_needle_pattern_empty_pattern() {
        let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let config = make_config();
        let version = RomVersion::Black;

        let mt_seed = seed.derive_mt_seed();
        let origin = SeedOrigin::Seed {
            base_seed: seed,
            mt_seed,
        };

        let result = search_needle_pattern(vec![origin], NeedlePattern::new(vec![]), version, &config);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn test_get_needle_pattern_at() {
        let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let pattern = get_needle_pattern_at(seed.value(), 0, 5);
        assert_eq!(pattern.len(), 5);
        for direction in &pattern {
            assert!(*direction < 8);
        }
    }
}
