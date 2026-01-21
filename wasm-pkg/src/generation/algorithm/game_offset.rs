//! Game Offset 計算アルゴリズム
//!
//! 元実装: <https://github.com/niart120/pokemon-gen5-initseed/blob/main/wasm-pkg/src/offset_calculator.rs>

use crate::core::lcg::Lcg64;
use crate::types::{GameStartConfig, LcgSeed, RomVersion, SaveState, StartMode};

/// PT操作の6段階テーブル定義（元実装準拠）
/// 各レベルで最大5つの閾値をチェックする
const PT_TABLES: [[u32; 5]; 6] = [
    [50, 100, 100, 100, 100],  // L1
    [50, 50, 100, 100, 100],   // L2
    [30, 50, 100, 100, 100],   // L3
    [25, 30, 50, 100, 100],    // L4
    [20, 25, 33, 50, 100],     // L5
    [100, 100, 100, 100, 100], // L6
];

/// 固定回数の乱数を消費
#[inline]
fn consume_random(lcg: &mut Lcg64, count: u32) -> u32 {
    for _ in 0..count {
        lcg.next();
    }
    count
}

/// Probability Table 処理（元実装準拠の6段階テーブル処理）
///
/// L1〜L6の各レベルで最大5つの閾値をチェックし、
/// 乱数から算出した確率がテーブルの値以下なら次のレベルへ進む。
#[inline]
fn probability_table_process(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;

    for thresholds in &PT_TABLES {
        for &threshold in thresholds.iter().take(5) {
            // 確率が100なら、次のレベルへ
            if threshold == 100 {
                break;
            }

            let rand_value = lcg.next().unwrap_or(0);
            advances += 1;

            // 元実装の計算式: r = ((rand_value as u64 * 101) >> 32) as u32
            let r = ((u64::from(rand_value) * 101) >> 32) as u32;

            if r <= threshold {
                // 取得した確率がテーブルの値以下なら次のレベルへ
                break;
            }
        }
    }

    advances
}

/// Probability Table 処理を複数回実行
#[inline]
fn probability_table_multiple(lcg: &mut Lcg64, count: u32) -> u32 {
    let mut total = 0;
    for _ in 0..count {
        total += probability_table_process(lcg);
    }
    total
}

/// Extra処理（BW2専用：重複値回避ループ）
/// 3つの値（0-14範囲）がすべて異なるまでループ
#[inline]
fn extra_process(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;

    loop {
        // 3つの値を生成（元実装の計算式）
        let r1 = lcg.next().unwrap_or(0);
        let value1 = ((u64::from(r1) * 15) >> 32) as u32;
        advances += 1;

        let r2 = lcg.next().unwrap_or(0);
        let value2 = ((u64::from(r2) * 15) >> 32) as u32;
        advances += 1;

        let r3 = lcg.next().unwrap_or(0);
        let value3 = ((u64::from(r3) * 15) >> 32) as u32;
        advances += 1;

        // 3つとも異なるかチェック
        if value1 != value2 && value2 != value3 && value3 != value1 {
            break;
        }
        // 同じ値が含まれている場合は継続
    }

    advances
}

// ===== BW パターン (元実装準拠) =====

fn bw_new_game_with_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW 始めから（セーブ有り）- リファレンス実装準拠
    advances += probability_table_multiple(lcg, 2); // PT×2
    advances += consume_random(lcg, 1); // チラーミィPID決定
    advances += consume_random(lcg, 1); // チラーミィID決定
    advances += consume_random(lcg, 1); // TID/SID決定
    advances += probability_table_multiple(lcg, 4); // PT×4
    // 住人決定は別途計算されるためoffsetには含めない
    advances
}

fn bw_new_game_no_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW 始めから（セーブ無し）- リファレンス実装準拠
    advances += probability_table_multiple(lcg, 3); // PT×3
    advances += consume_random(lcg, 1); // チラーミィPID決定
    advances += consume_random(lcg, 1); // チラーミィID決定
    advances += consume_random(lcg, 1); // TID/SID決定
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 4); // PT×4
    // 住人決定は別途計算されるためoffsetには含めない
    advances
}

fn bw_continue(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW 続きから - リファレンス実装準拠
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 5); // PT×5
    advances
}

// ===== BW2 パターン (元実装準拠) =====

fn bw2_new_game_with_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW2 始めから（思い出リンク済みセーブ有り）
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 2); // Rand×2
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 2); // Rand×2
    advances += consume_random(lcg, 1); // チラチーノPID決定
    advances += consume_random(lcg, 1); // チラチーノID決定
    advances += consume_random(lcg, 1); // TID/SID決定
    advances
}

fn bw2_new_game_with_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW2 始めから（思い出リンク無しセーブ有り）
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 3); // Rand×3
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 2); // Rand×2
    advances += consume_random(lcg, 1); // チラチーノPID決定
    advances += consume_random(lcg, 1); // チラチーノID決定
    advances += consume_random(lcg, 1); // TID/SID決定
    advances
}

fn bw2_new_game_no_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW2 始めから（セーブ無し）
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 2); // Rand×2
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 4); // Rand×4
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 2); // Rand×2
    advances += consume_random(lcg, 1); // チラチーノPID決定
    advances += consume_random(lcg, 1); // チラチーノID決定
    advances += consume_random(lcg, 1); // TID/SID決定
    advances
}

fn bw2_continue_with_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW2 続きから（思い出リンク済み）
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 2); // Rand×2
    advances += probability_table_multiple(lcg, 4); // PT×4
    advances += extra_process(lcg); // Extra処理
    advances
}

fn bw2_continue_no_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    // BW2 続きから（思い出リンク無し）
    advances += consume_random(lcg, 1); // Rand×1
    advances += probability_table_multiple(lcg, 1); // PT×1
    advances += consume_random(lcg, 3); // Rand×3
    advances += probability_table_multiple(lcg, 4); // PT×4
    advances += extra_process(lcg); // Extra処理
    advances
}

/// Game Offset を計算
///
/// 初期シード、ゲームバージョン、起動設定から固定乱数消費数を算出する。
///
/// # Errors
/// 無効な起動設定の組み合わせの場合にエラーを返す。
pub fn calculate_game_offset(
    seed: LcgSeed,
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<u32, String> {
    config.validate(version)?;

    let mut lcg = Lcg64::new(seed);

    let advances = match (version.is_bw2(), config.start_mode, config.save_state) {
        // BW
        (false, StartMode::NewGame, SaveState::WithSave) => bw_new_game_with_save(&mut lcg),
        (false, StartMode::NewGame, SaveState::NoSave) => bw_new_game_no_save(&mut lcg),
        (false, StartMode::Continue, _) => bw_continue(&mut lcg),

        // BW2
        (true, StartMode::NewGame, SaveState::WithMemoryLink) => {
            bw2_new_game_with_memory_link(&mut lcg)
        }
        (true, StartMode::NewGame, SaveState::WithSave) => bw2_new_game_with_save(&mut lcg),
        (true, StartMode::NewGame, SaveState::NoSave) => bw2_new_game_no_save(&mut lcg),
        (true, StartMode::Continue, SaveState::WithMemoryLink) => {
            bw2_continue_with_memory_link(&mut lcg)
        }
        (true, StartMode::Continue, SaveState::WithSave | SaveState::NoSave) => {
            bw2_continue_no_memory_link(&mut lcg)
        }

        _ => return Err("Invalid combination".into()),
    };

    Ok(advances)
}

/// 初期 Seed に Game Offset を適用し、オフセット適用後の Seed を返す
///
/// # Errors
/// 無効な起動設定の組み合わせの場合にエラーを返す。
pub fn apply_game_offset(
    seed: LcgSeed,
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<LcgSeed, String> {
    let offset = calculate_game_offset(seed, version, config)?;
    let mut lcg = Lcg64::new(seed);
    lcg.jump(u64::from(offset));
    Ok(lcg.current_seed())
}

/// 初期 Seed に Game Offset を適用し、オフセット適用済みの Lcg64 を返す
///
/// 呼び出し側はそのまま乱数生成を続けられる。
///
/// # Errors
/// 無効な起動設定の組み合わせの場合にエラーを返す。
pub fn create_offset_lcg(
    seed: LcgSeed,
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<Lcg64, String> {
    let offset = calculate_game_offset(seed, version, config)?;
    let mut lcg = Lcg64::new(seed);
    lcg.jump(u64::from(offset));
    Ok(lcg)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== 元実装との互換性テスト =====
    // 元実装: https://github.com/niart120/pokemon-gen5-initseed
    // offset_calculator.rs のテストケースに基づく厳密な検証

    #[test]
    fn test_bw_new_game_no_save_seed_0x12345678() {
        // 元実装期待値: offset=71
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black, &config).unwrap();
        assert_eq!(offset, 71, "BW1 最初から（セーブなし）のオフセット");
    }

    #[test]
    fn test_bw_new_game_with_save_seed_0x12345678() {
        // 元実装期待値: offset=59
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black, &config).unwrap();
        assert_eq!(offset, 59, "BW1 最初から（セーブあり）のオフセット");
    }

    #[test]
    fn test_bw_continue_seed_0x12345678() {
        // 元実装期待値: offset=49
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black, &config).unwrap();
        assert_eq!(offset, 49, "BW1 続きからのオフセット");
    }

    // ===== BW2 テスト (seed=0x90ABCDEF) =====

    #[test]
    fn test_bw2_new_game_no_save_seed_0x90abcdef() {
        // 元実装期待値: offset=44
        let seed = LcgSeed::new(0x90AB_CDEF);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config).unwrap();
        assert_eq!(offset, 44, "BW2 最初から（セーブなし）のオフセット");
    }

    #[test]
    fn test_bw2_new_game_with_save_no_memory_link_seed_0x90abcdef() {
        // 元実装期待値: offset=29
        let seed = LcgSeed::new(0x90AB_CDEF);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config).unwrap();
        assert_eq!(
            offset, 29,
            "BW2 最初から（セーブあり、思い出リンクなし）のオフセット"
        );
    }

    #[test]
    fn test_bw2_new_game_with_memory_link_seed_0x90abcdef() {
        // 元実装期待値: offset=29
        let seed = LcgSeed::new(0x90AB_CDEF);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::WithMemoryLink,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config).unwrap();
        assert_eq!(offset, 29, "BW2 最初から（思い出リンクあり）のオフセット");
    }

    #[test]
    fn test_bw2_continue_no_memory_link_seed_0x90abcdef() {
        // 元実装期待値: offset=55
        let seed = LcgSeed::new(0x90AB_CDEF);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config).unwrap();
        assert_eq!(offset, 55, "BW2 続きから（思い出リンクなし）のオフセット");
    }

    #[test]
    fn test_bw2_continue_with_memory_link_seed_0x90abcdef() {
        // 元実装期待値: offset=55
        let seed = LcgSeed::new(0x90AB_CDEF);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithMemoryLink,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config).unwrap();
        assert_eq!(offset, 55, "BW2 続きから（思い出リンクあり）のオフセット");
    }

    // ===== バリデーションテスト =====

    #[test]
    fn test_invalid_combination_continue_no_save() {
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::NoSave,
        };
        let result = calculate_game_offset(seed, RomVersion::Black, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_combination_bw_memory_link() {
        // BW では MemoryLink は使用不可
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::WithMemoryLink,
        };
        let result = calculate_game_offset(seed, RomVersion::Black, &config);
        assert!(result.is_err());
    }

    // ===== apply_game_offset テスト =====

    #[test]
    fn test_apply_game_offset() {
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let result = apply_game_offset(seed, RomVersion::Black, &config);
        assert!(result.is_ok());
        // オフセット適用後の seed は元と異なる
        assert_ne!(result.unwrap(), seed);
    }
}
