//! 3DS×BW2 frame 補正の e2e 検証
//!
//! 仕様書: spec/agent/wip/local_106/FRAME_3DS_BW2_FIX.md
//!
//! 3DS で BW2 を起動した場合、frame 値は 9 ではなく 8 となる仕様の検証。
//! 実機で確認した TID と、初期 Seed 探索 → TID 算出パイプラインの結果が
//! 一致することを確認する。

use wasm_pkg::TrainerInfoSearcher;
use wasm_pkg::types::{
    DateRangeParams, DatetimeSearchContext, DsConfig, GameStartConfig, Hardware, KeySpec,
    MemoryLinkState, RomRegion, RomVersion, SavePresence, ShinyCharmState, StartMode,
    TimeRangeParams, Timer0VCountRange, TrainerInfoFilter,
};

/// 実機検証ケース: 3DS × BW2 × JPN
///
/// | 項目 | 値 |
/// | --- | --- |
/// | MAC | 98 B6 E9 1D 7C 3B |
/// | ROM | Black2 (JPN) |
/// | Hardware | 3DS (`Dsi3ds`) |
/// | 日付 | 2026/04/29 |
/// | 時刻 | 10:00:35 〜 10:00:40 |
/// | セーブ | あり |
/// | キー入力 | なし |
/// | 実機 TID | 44844 |
///
/// frame=9 (旧実装) では一致せず、frame=8 (本修正) で一致する。
#[test]
fn test_3ds_bw2_initial_seed_yields_real_tid() {
    let ds = DsConfig {
        mac: [0x98, 0xB6, 0xE9, 0x1D, 0x7C, 0x3B],
        hardware: Hardware::Dsi3ds,
        version: RomVersion::Black2,
        region: RomRegion::Jpn,
    };

    let game_start = GameStartConfig {
        start_mode: StartMode::NewGame,
        save: SavePresence::WithSave,
        memory_link: MemoryLinkState::Disabled,
        shiny_charm: ShinyCharmState::NotObtained,
    };

    // Dsi_Black2_Jpn のデフォルト Timer0/VCount 範囲
    // (src/data/timer0-vcount-defaults.ts と一致)
    let context = DatetimeSearchContext {
        ds: ds.clone(),
        date_range: DateRangeParams {
            start_year: 2026,
            start_month: 4,
            start_day: 29,
            end_year: 2026,
            end_month: 4,
            end_day: 29,
        },
        time_range: TimeRangeParams {
            hour_start: 10,
            hour_end: 10,
            minute_start: 0,
            minute_end: 0,
            second_start: 35,
            second_end: 40,
        },
        ranges: vec![Timer0VCountRange {
            timer0_min: 0x150D,
            timer0_max: 0x1514,
            vcount_min: 0xA2,
            vcount_max: 0xA2,
        }],
        // キー入力なし: 利用可能ボタン空 → 唯一の組み合わせ KeyMask::NONE
        key_spec: KeySpec::default(),
    };

    let filter = TrainerInfoFilter {
        tid: Some(44844),
        sid: None,
        shiny_pid: None,
    };

    // 全 (timer0, vcount, key) の組み合わせ × 時間チャンクをタスク化
    let tasks = wasm_pkg::generate_trainer_info_search_tasks(context, filter, game_start, 1);
    assert!(!tasks.is_empty(), "タスクが生成されること");

    // 全タスクを順次走査し、TID=44844 を含む結果が得られることを確認
    let mut hit = false;
    for task in tasks {
        let mut searcher = TrainerInfoSearcher::new(task).expect("searcher 構築成功");
        while !searcher.is_done() {
            let batch = searcher.next_batch(1024);
            if batch.results.iter().any(|r| r.trainer.tid == 44844) {
                hit = true;
                break;
            }
        }
        if hit {
            break;
        }
    }

    assert!(
        hit,
        "3DS×BW2 で frame=8 を用いた場合、実機 TID=44844 と一致する候補が \
         少なくとも 1 件得られるべき"
    );
}
