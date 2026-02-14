//! GPU MT Seed IV 全探索ベンチマーク
//!
//! 全 Seed 空間 (2^32) のスループット測定
//!
//! GPU が利用できない環境ではスキップされる。

#![cfg(feature = "gpu")]

use std::time::{Duration, Instant};

use criterion::{Criterion, criterion_group, criterion_main};
use wasm_pkg::gpu::GpuMtseedSearchIterator;
use wasm_pkg::types::{IvFilter, MtseedSearchContext};

// ===== テスト用パラメータ生成 =====

fn create_context() -> MtseedSearchContext {
    MtseedSearchContext {
        iv_filter: IvFilter::six_v(),
        mt_offset: 7,
        is_roamer: false,
    }
}

fn create_gpu_iterator() -> GpuMtseedSearchIterator {
    pollster::block_on(GpuMtseedSearchIterator::create(create_context()))
        .expect("Failed to create GpuMtseedSearchIterator")
}

/// 全探索を実行し、処理数と経過時間を返す
fn run_full_search() -> (u64, Duration) {
    let mut iterator = create_gpu_iterator();
    let start = Instant::now();
    let mut processed = 0u64;

    while let Some(batch) = pollster::block_on(iterator.next()) {
        processed = batch.processed;
    }

    (processed, start.elapsed())
}

// ===== ベンチマーク =====

fn bench_gpu_mtseed_search(c: &mut Criterion) {
    // GPU 初期化テスト (ベンチマーク外)
    let test_iterator = pollster::block_on(GpuMtseedSearchIterator::create(create_context()));

    if let Err(e) = test_iterator {
        eprintln!("GPU unavailable: {e}, skipping GPU mtseed benchmark");
        return;
    }

    let expected_total = 0x1_0000_0000u64;

    // ウォームアップ: 1回全探索
    eprintln!("Warmup: running full 2^32 MT Seed IV search...");
    let (warmup_processed, warmup_time) = run_full_search();
    let warmup_throughput = warmup_processed as f64 / warmup_time.as_secs_f64() / 1e6;
    eprintln!(
        "Warmup complete: {} seeds in {:.2}s ({:.2} Mseed/s)",
        warmup_processed,
        warmup_time.as_secs_f64(),
        warmup_throughput
    );

    let mut group = c.benchmark_group("gpu_mtseed_search");
    group.measurement_time(Duration::from_secs(120));
    group.sample_size(10);

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
    let final_throughput = final_processed as f64 / final_time.as_secs_f64() / 1e6;
    eprintln!(
        "Final: {} seeds in {:.2}s ({:.2} Mseed/s)",
        final_processed,
        final_time.as_secs_f64(),
        final_throughput
    );
}

criterion_group!(benches, bench_gpu_mtseed_search);
criterion_main!(benches);
