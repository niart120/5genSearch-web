//! WASM 環境での MtseedDatetimeSearcher スループットベンチマーク
//!
//! Worker/JS レイヤーのオーバーヘッドを排除した純 WASM 実行速度を計測する。
//!
//! ## 実行方法
//! ```bash
//! wasm-pack test wasm-pkg --node --release
//! ```
//!
//! ## 計測対象
//! - `MtseedDatetimeSearcher::next_batch()` の純 WASM スループット
//! - ネイティブ Criterion 結果との比較で WASM/Native 比率を算出

use wasm_bindgen_test::*;

use wasm_pkg::MtseedDatetimeSearchParams;
use wasm_pkg::datetime_search::MtseedDatetimeSearcher;
use wasm_pkg::types::{
    DsConfig, Hardware, KeyCode, MtSeed, RomRegion, RomVersion, SearchRangeParams,
    StartupCondition, TimeRangeParams,
};

fn create_mtseed_searcher() -> MtseedDatetimeSearcher {
    let params = MtseedDatetimeSearchParams {
        target_seeds: vec![
            MtSeed::new(0x12345678),
            MtSeed::new(0x87654321),
            MtSeed::new(0xABCDEF01),
        ],
        ds: DsConfig {
            mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
            hardware: Hardware::DsLite,
            version: RomVersion::Black,
            region: RomRegion::Jpn,
        },
        time_range: TimeRangeParams {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        },
        search_range: SearchRangeParams {
            start_year: 2011,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 86400 * 7, // 1 週間
        },
        condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
    };
    MtseedDatetimeSearcher::new(params).expect("Failed to create MtseedDatetimeSearcher")
}

/// js_sys::Date::now() でミリ秒タイムスタンプを取得
/// Node.js 環境でも動作する (web_sys::Performance は browser-only)
fn now_ms() -> f64 {
    js_sys::Date::now()
}

/// MtseedDatetime 検索の純 WASM スループット計測
///
/// ネイティブ Criterion (12.6 Melem/s) との比較用。
/// Worker/postMessage/yield のオーバーヘッドなしの WASM 実行速度を測定する。
#[wasm_bindgen_test]
fn bench_mtseed_datetime_search_throughput() {
    let chunk_size: u32 = 10_000;
    let target_batches: u32 = 50;

    // ウォームアップ (5 バッチ)
    {
        let mut searcher = create_mtseed_searcher();
        for _ in 0..5 {
            if searcher.is_done() {
                break;
            }
            searcher.next_batch(chunk_size);
        }
    }

    // 計測: 複数バッチの合計時間
    let mut total_elements: u64 = 0;
    let mut total_ms: f64 = 0.0;
    let iterations = 5;

    for _ in 0..iterations {
        let mut searcher = create_mtseed_searcher();
        let start = now_ms();
        for _ in 0..target_batches {
            if searcher.is_done() {
                break;
            }
            searcher.next_batch(chunk_size);
        }
        let elapsed = now_ms() - start;

        let elements = u64::from(chunk_size) * u64::from(target_batches);
        total_elements += elements;
        total_ms += elapsed;
    }

    let throughput = (total_elements as f64) / (total_ms / 1000.0);
    let throughput_m = throughput / 1_000_000.0;
    let native_throughput_m = 12.6; // ネイティブ Criterion 結果
    let ratio = throughput_m / native_throughput_m * 100.0;

    // 結果を console.log で出力 (wasm-pack test --node で標準出力に表示)
    web_sys::console::log_1(
        &format!(
            "\n\
             ========================================\n\
             WASM MtseedDatetime Benchmark Results\n\
             ========================================\n\
             Total elements : {total_elements}\n\
             Total time     : {total_ms:.1} ms\n\
             Throughput     : {throughput_m:.2} Melem/s\n\
             Native Criterion: {native_throughput_m:.1} Melem/s\n\
             WASM/Native    : {ratio:.1}%\n\
             ========================================",
        )
        .into(),
    );

    // WASM が最低 1 Melem/s は出ることを検証 (ゼロでないことの確認)
    assert!(
        throughput_m > 1.0,
        "WASM throughput too low: {throughput_m:.2} Melem/s"
    );
}
