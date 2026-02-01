//! オフセット計算アルゴリズム
//!
//! - `GameOffset`: LCG オフセット (起動条件による乱数消費)
//! - `MtOffset`: MT19937 で IV 生成を開始する位置
//!
//! 元実装: <https://github.com/niart120/pokemon-gen5-initseed/blob/main/wasm-pkg/src/offset_calculator.rs>

use super::lcg::Lcg64;
use crate::types::{
    EncounterType, GameStartConfig, LcgSeed, RomVersion, SaveState, StartMode, TrainerInfo,
};

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
    config: GameStartConfig,
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

// ===== MT オフセット計算 =====

/// エンカウント種別とバージョンから MT オフセットを計算
///
/// MT19937 で IV 生成を開始する位置を決定する。
///
/// | エンカウント種別 | BW | BW2 |
/// |------------------|---:|----:|
/// | Egg              |  7 |   7 |
/// | Roamer           |  1 |   - |
/// | Wild / Static    |  0 |   2 |
pub const fn calculate_mt_offset(version: RomVersion, encounter_type: EncounterType) -> u32 {
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

// ===== TrainerInfo 算出 =====

/// TID/SID 決定直前まで LCG を進める (BW)
fn advance_to_tid_sid_point_bw(lcg: &mut Lcg64, save_state: SaveState) {
    match save_state {
        SaveState::WithSave => {
            // PT×2 + チラーミィPID + チラーミィID
            probability_table_multiple(lcg, 2);
            consume_random(lcg, 2);
        }
        SaveState::NoSave => {
            // PT×3 + チラーミィPID + チラーミィID
            probability_table_multiple(lcg, 3);
            consume_random(lcg, 2);
        }
        SaveState::WithMemoryLink => {
            // BW では MemoryLink は使用不可 (validate で弾かれる)
        }
    }
}

/// TID/SID 決定直前まで LCG を進める (BW2)
fn advance_to_tid_sid_point_bw2(lcg: &mut Lcg64, save_state: SaveState) {
    match save_state {
        SaveState::WithMemoryLink => {
            // Rand×1 + PT×1 + Rand×2 + PT×1 + Rand×2 + チラチーノPID + チラチーノID
            consume_random(lcg, 1);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 2);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 2);
            consume_random(lcg, 2);
        }
        SaveState::WithSave => {
            // Rand×1 + PT×1 + Rand×3 + PT×1 + Rand×2 + チラチーノPID + チラチーノID
            consume_random(lcg, 1);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 3);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 2);
            consume_random(lcg, 2);
        }
        SaveState::NoSave => {
            // Rand×1 + PT×1 + Rand×2 + PT×1 + Rand×4 + PT×1 + Rand×2 + チラチーノPID + チラチーノID
            consume_random(lcg, 1);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 2);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 4);
            probability_table_multiple(lcg, 1);
            consume_random(lcg, 2);
            consume_random(lcg, 2);
        }
    }
}

/// `LcgSeed` から `TrainerInfo` を算出
///
/// ゲーム初期化処理を経て TID/SID が決定されるポイントまで LCG を進め、
/// その時点の乱数値から TID/SID を計算する。
///
/// # Errors
/// - `StartMode::Continue` の場合 (ID 調整対象外)
/// - 無効な `GameStartConfig` の組み合わせ
pub fn calculate_trainer_info(
    seed: LcgSeed,
    version: RomVersion,
    config: GameStartConfig,
) -> Result<TrainerInfo, String> {
    // Continue モードは ID 調整不可
    if config.start_mode == StartMode::Continue {
        return Err("TrainerInfo search requires NewGame mode".into());
    }

    config.validate(version)?;

    let mut lcg = Lcg64::new(seed);

    // TID/SID 決定直前まで進める
    if version.is_bw2() {
        advance_to_tid_sid_point_bw2(&mut lcg, config.save_state);
    } else {
        advance_to_tid_sid_point_bw(&mut lcg, config.save_state);
    }

    // TID/SID 算出 (元実装準拠)
    let rand_value = lcg.next().unwrap_or(0);
    let tid_sid_combined = ((u64::from(rand_value) * 0xFFFF_FFFF) >> 32) as u32;
    let tid = (tid_sid_combined & 0xFFFF) as u16;
    let sid = ((tid_sid_combined >> 16) & 0xFFFF) as u16;

    Ok(TrainerInfo { tid, sid })
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
        let offset = calculate_game_offset(seed, RomVersion::Black, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black2, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black2, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black2, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black2, config).unwrap();
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
        let offset = calculate_game_offset(seed, RomVersion::Black2, config).unwrap();
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
        let result = calculate_game_offset(seed, RomVersion::Black, config);
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
        let result = calculate_game_offset(seed, RomVersion::Black, config);
        assert!(result.is_err());
    }

    // ===== オフセット適用テスト =====

    #[test]
    fn test_apply_game_offset_via_lcg() {
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black, config).unwrap();
        let mut lcg = Lcg64::new(seed);
        lcg.jump(u64::from(offset));
        let result_seed = lcg.current_seed();
        // オフセット適用後の seed は元と異なる
        assert_ne!(result_seed, seed);
    }

    // ===== TrainerInfo テスト =====

    #[test]
    fn test_calculate_trainer_info_continue_mode_error() {
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let result = calculate_trainer_info(seed, RomVersion::Black, config);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("NewGame"));
    }

    #[test]
    fn test_calculate_trainer_info_bw_memory_link_error() {
        let seed = LcgSeed::new(0x1234_5678);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::WithMemoryLink,
        };
        let result = calculate_trainer_info(seed, RomVersion::Black, config);
        assert!(result.is_err());
    }

    #[test]
    fn test_bw_new_game_no_save_tid_sid() {
        // 元実装互換性テスト
        let seed = LcgSeed::new(0x96FD_2CBD_8A22_63A3);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
        };
        let trainer = calculate_trainer_info(seed, RomVersion::Black, config).unwrap();
        assert_eq!(trainer.tid, 42267);
        assert_eq!(trainer.sid, 29515);
    }

    #[test]
    fn test_bw2_new_game_no_save_tid_sid() {
        // 元実装互換性テスト
        let seed = LcgSeed::new(0x90AB_CDEF);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
        };
        let trainer = calculate_trainer_info(seed, RomVersion::Black2, config).unwrap();
        assert_eq!(trainer.tid, 910);
        assert_eq!(trainer.sid, 42056);
    }
}
