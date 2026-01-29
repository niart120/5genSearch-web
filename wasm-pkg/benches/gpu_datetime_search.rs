//! GPU 起動時刻検索ベンチマーク
//!
//! `GpuDatetimeSearchIterator::next()` スループット測定
//!
//! GPU が利用できない環境ではスキップされる。

#![cfg(feature = "gpu")]

use std::time::Duration;

use criterion::{BenchmarkId, Criterion, Throughput, criterion_group, criterion_main};
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

/// Timer0×3件、VCount×1件の複数条件を作成
fn create_conditions() -> Vec<StartupCondition> {
    vec![
        StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
        StartupCondition::new(0x0C7A, 0x5F, KeyCode::NONE),
        StartupCondition::new(0x0C7B, 0x5F, KeyCode::NONE),
    ]
}

fn create_params() -> MtseedDatetimeSearchParams {
    // Timer0×3 × VCount×1 = 3通りの起動条件で検索
    let conditions = create_conditions();
    MtseedDatetimeSearchParams {
        target_seeds: vec![
            MtSeed::new(0x12345678),
            MtSeed::new(0x87654321),
            MtSeed::new(0xABCDEF01),
        ],
        ds: create_ds_config(),
        time_range: create_time_range(),
        search_range: create_search_range(),
        condition: conditions[0],
    }
}

fn create_gpu_iterator() -> GpuDatetimeSearchIterator {
    pollster::block_on(GpuDatetimeSearchIterator::new(create_params()))
        .expect("Failed to create GpuDatetimeSearchIterator")
}

/// 5バッチ分処理して合計処理数を返す
fn run_batches(iterator: &mut GpuDatetimeSearchIterator, batch_count: usize) -> u64 {
    let mut total_processed = 0u64;
    for _ in 0..batch_count {
        if let Some(batch) = pollster::block_on(iterator.next()) {
            total_processed += batch.processed_count - (total_processed);
        } else {
            break;
        }
    }
    total_processed
}

// ===== ベンチマーク =====

fn bench_gpu_mtseed_datetime_search(c: &mut Criterion) {
    // GPU 初期化テスト (ベンチマーク外)
    let test_iterator =
        pollster::block_on(async { GpuDatetimeSearchIterator::new(create_params()).await });

    if let Err(e) = test_iterator {
        eprintln!("GPU unavailable: {e}, skipping GPU benchmark");
        return;
    }

    let mut group = c.benchmark_group("gpu_mtseed_datetime_search");
    group.warm_up_time(Duration::from_secs(5));
    group.measurement_time(Duration::from_secs(50));
    group.sample_size(10);

    // 5バッチ分の推定処理数 (256 × 65535 × 5)
    const BATCH_COUNT: usize = 5;
    let estimated_batch_size = 16_776_960_u64; // 256 × 65535
    let total_elements = estimated_batch_size * BATCH_COUNT as u64;
    group.throughput(Throughput::Elements(total_elements));

    group.bench_function(
        BenchmarkId::new("next", format!("{}batches", BATCH_COUNT)),
        |b| {
            // イテレータを1回だけ作成し、複数バッチを処理
            let mut iterator = create_gpu_iterator();
            b.iter(|| {
                // イテレータがまだ処理可能な場合は継続、そうでなければ再作成
                if iterator.is_done() {
                    iterator = create_gpu_iterator();
                }
                run_batches(&mut iterator, BATCH_COUNT)
            });
        },
    );

    group.finish();
}

criterion_group!(benches, bench_gpu_mtseed_datetime_search);
criterion_main!(benches);
