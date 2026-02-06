//! MT Seed 全探索ベンチマーク
//!
//! `MtseedSearcher::next_batch()` スループット測定

use std::time::Duration;

use criterion::{Criterion, Throughput, criterion_group, criterion_main};
use wasm_pkg::MtseedSearchParams;
use wasm_pkg::misc::MtseedSearcher;
use wasm_pkg::types::IvFilter;

// ===== テスト用パラメータ生成 =====

fn create_mtseed_searcher() -> MtseedSearcher {
    let params = MtseedSearchParams {
        iv_filter: IvFilter {
            hp: (31, 31),
            atk: (0, 31),
            def: (31, 31),
            spa: (31, 31),
            spd: (31, 31),
            spe: (31, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        },
        mt_offset: 7,
        is_roamer: false,
        start_seed: 0,
        end_seed: 0xFFFF_FFFF,
    };
    MtseedSearcher::new(params)
}

// ===== ベンチマーク =====

fn bench_mtseed_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("mtseed_search");
    group.warm_up_time(Duration::from_secs(1));
    group.measurement_time(Duration::from_secs(5));
    group.sample_size(20);

    let chunk_size = 10000_u32;
    group.throughput(Throughput::Elements(u64::from(chunk_size)));

    group.bench_function("next_batch", |b| {
        b.iter_batched(
            create_mtseed_searcher,
            |mut searcher| searcher.next_batch(chunk_size),
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

criterion_group!(benches, bench_mtseed_search);
criterion_main!(benches);
