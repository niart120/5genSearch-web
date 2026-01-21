//! Game Offset 計算アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::{GameStartConfig, LcgSeed, RomVersion, SaveState, StartMode};

/// Probability Table 閾値
const PT_THRESHOLD: u32 = 0x8000_0000;

/// 固定回数の乱数を消費
#[inline]
fn consume_random(lcg: &mut Lcg64, count: u32) -> u32 {
    for _ in 0..count {
        lcg.next();
    }
    count
}

/// Probability Table 処理 (条件を満たすまで消費)
#[inline]
fn probability_table_process(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    loop {
        let r = lcg.next().unwrap_or(0);
        advances += 1;
        if r < PT_THRESHOLD {
            break;
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

// ===== BW パターン =====

fn bw_new_game_with_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += probability_table_multiple(lcg, 2);
    advances += consume_random(lcg, 3); // チラーミィ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 4);
    advances
}

fn bw_new_game_no_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 4);
    advances
}

fn bw_continue(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 5);
    advances
}

// ===== BW2 パターン =====

fn bw2_new_game_with_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += consume_random(lcg, 3); // チラチーノ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances
}

fn bw2_new_game_with_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 3);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += consume_random(lcg, 3); // チラチーノ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances
}

fn bw2_new_game_no_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 4);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += consume_random(lcg, 3); // チラチーノ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances
}

fn bw2_continue_with_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += probability_table_multiple(lcg, 4);
    advances
}

fn bw2_continue_no_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 3);
    advances += probability_table_multiple(lcg, 4);
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
    let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);

    let advances = match (is_bw2, config.start_mode, config.save_state) {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bw_continue() {
        let seed = LcgSeed::new(0x1234_5678_0000_0000);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black, &config);
        assert!(offset.is_ok());
        assert!(offset.unwrap() > 0);
    }

    #[test]
    fn test_bw2_new_game_no_save() {
        let seed = LcgSeed::new(0xABCD_EF01_2345_6789);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config);
        assert!(offset.is_ok());
        assert!(offset.unwrap() > 0);
    }

    #[test]
    fn test_invalid_combination() {
        let seed = LcgSeed::new(0x1234_5678_0000_0000);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::NoSave,
        };
        let result = calculate_game_offset(seed, RomVersion::Black, &config);
        assert!(result.is_err());
    }
}
