//! GPU 起動時刻検索ベンチマーク
//!
//! 100年分全探索のスループット測定
//!
//! GPU が利用できない環境ではスキップされる。

#![cfg(feature = "gpu")]

use std::time::{Duration, Instant};

use criterion::{Criterion, criterion_group, criterion_main};
use wasm_pkg::datetime_search::MtseedDatetimeSearchParams;
use wasm_pkg::gpu::GpuDatetimeSearchIterator;
use wasm_pkg::types::{
    DsConfig, Hardware, KeyCode, MtSeed, RomRegion, RomVersion, SearchRangeParams,
    StartupCondition, TimeRangeParams,
};

// ===== テスト用パラメータ生成 =====

fn create_ds_config() -> DsConfig {
    DsConfig {
        mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
        hardware: Hardware::DsLite,
        version: RomVersion::Black,
        region: RomRegion::Jpn,
    }
}

fn create_time_range() -> TimeRangeParams {
    TimeRangeParams {
        hour_start: 0,
        hour_end: 23,
        minute_start: 0,
        minute_end: 59,
        second_start: 0,
        second_end: 59,
    }
}

fn create_search_range() -> SearchRangeParams {
    SearchRangeParams {
        start_year: 2000,
        start_month: 1,
        start_day: 1,
        start_second_offset: 0,
        range_seconds: 86400 * 365 * 100, // 100年間 (~3.15G秒)
    }
}

fn create_params() -> MtseedDatetimeSearchParams {
    MtseedDatetimeSearchParams {
        target_seeds: vec![
            MtSeed::new(0x12345678),
            MtSeed::new(0x87654321),
            MtSeed::new(0xABCDEF01),
        ],
        ds: create_ds_config(),
        time_range: create_time_range(),
        search_range: create_search_range(),
        condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
    }
}

fn create_gpu_iterator() -> GpuDatetimeSearchIterator {
    pollster::block_on(GpuDatetimeSearchIterator::new(create_params()))
        .expect("Failed to create GpuDatetimeSearchIterator")
}

/// 100年分全探索を実行し、処理数と経過時間を返す
fn run_full_search() -> (u64, Duration) {
    let mut iterator = create_gpu_iterator();
    let start = Instant::now();
    let mut processed = 0u64;

    while let Some(batch) = pollster::block_on(iterator.next()) {
        processed = batch.processed_count;
    }

    (processed, start.elapsed())
}

// ===== ベンチマーク =====

fn bench_gpu_full_search(c: &mut Criterion) {
    // GPU 初期化テスト (ベンチマーク外)
    let test_iterator =
        pollster::block_on(async { GpuDatetimeSearchIterator::new(create_params()).await });

    if let Err(e) = test_iterator {
        eprintln!("GPU unavailable: {e}, skipping GPU benchmark");
        return;
    }

    // 期待する総メッセージ数: 24h * 60m * 60s * 365days * 100years
    // = 86400 * 36500 ≈ 3.15G
    let expected_total = 86400u64 * 36500;

    // ウォームアップ: 1回全探索
    eprintln!("Warmup: running full 100-year search...");
    let (warmup_processed, warmup_time) = run_full_search();
    let warmup_throughput = warmup_processed as f64 / warmup_time.as_secs_f64() / 1e9;
    eprintln!(
        "Warmup complete: {} elements in {:.2}s ({:.2} Gelem/s)",
        warmup_processed,
        warmup_time.as_secs_f64(),
        warmup_throughput
    );

    let mut group = c.benchmark_group("gpu_full_100year_search");
    group.measurement_time(Duration::from_secs(20));
    group.sample_size(10); // 20秒内で可能なサンプル数

    group.bench_function("full_search", |b| {
        b.iter_custom(|iters| {
            let mut total_time = Duration::ZERO;
            for _ in 0..iters {
                let (processed, elapsed) = run_full_search();
                assert!(
                    processed >= expected_total * 99 / 100,
                    "Incomplete search: {} < {}",
                    processed,
                    expected_total
                );
                total_time += elapsed;
            }
            total_time
        });
    });

    group.finish();

    // 最終スループット表示
    let (final_processed, final_time) = run_full_search();
    let final_throughput = final_processed as f64 / final_time.as_secs_f64() / 1e9;
    eprintln!(
        "Final: {} elements in {:.2}s ({:.2} Gelem/s)",
        final_processed,
        final_time.as_secs_f64(),
        final_throughput
    );
}

criterion_group!(benches, bench_gpu_full_search);
criterion_main!(benches);
