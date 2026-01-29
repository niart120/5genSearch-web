//! GPU 起動時刻検索ベンチマーク
//!
//! `GpuMtseedDatetimeSearcher::next_batch()` スループット測定
//!
//! GPU が利用できない環境ではスキップされる。
//! 注意: このベンチマークは WASM 環境 (WebGPU) を想定している。
//! ネイティブ環境では GPU バックエンドの互換性問題によりクラッシュする可能性がある。

#![cfg(feature = "gpu")]
#![cfg_attr(not(target_arch = "wasm32"), allow(unused_imports, dead_code))]

use std::time::Duration;

use criterion::{Criterion, Throughput, criterion_group, criterion_main};
use wasm_pkg::datetime_search::MtseedDatetimeSearchParams;
use wasm_pkg::gpu::GpuMtseedDatetimeSearcher;
use wasm_pkg::gpu::context::GpuDeviceContext;
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
        start_year: 2011,
        start_month: 1,
        start_day: 1,
        start_second_offset: 0,
        range_seconds: 86400 * 7, // 1週間
    }
}

fn create_condition() -> StartupCondition {
    StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE)
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
        condition: create_condition(),
    }
}

fn create_gpu_searcher(ctx: &GpuDeviceContext) -> GpuMtseedDatetimeSearcher {
    GpuMtseedDatetimeSearcher::new(ctx, &create_params())
        .expect("Failed to create GpuMtseedDatetimeSearcher")
}

// ===== ベンチマーク =====

fn bench_gpu_mtseed_datetime_search(c: &mut Criterion) {
    // ネイティブ環境では GPU ベンチマークをスキップ
    // (WebGPU は WASM 環境専用、ネイティブでは Vulkan/DX12 バックエンドが必要)
    #[cfg(not(target_arch = "wasm32"))]
    {
        eprintln!("GPU benchmark is only supported in WASM environment, skipping");
        // 空のベンチマークグループを作成して正常終了
        let group = c.benchmark_group("gpu_mtseed_datetime_search");
        drop(group);
    }

    #[cfg(target_arch = "wasm32")]
    {
        // GPU コンテキスト初期化 (ベンチマーク外)
        let ctx = pollster::block_on(async { GpuDeviceContext::new().await });

        let ctx = match ctx {
            Ok(ctx) => ctx,
            Err(e) => {
                eprintln!("GPU unavailable: {e}, skipping GPU benchmark");
                return;
            }
        };

        let mut group = c.benchmark_group("gpu_mtseed_datetime_search");
        group.warm_up_time(Duration::from_secs(2));
        group.measurement_time(Duration::from_secs(5));
        group.sample_size(10);

        let chunk_size = 100000_u32;
        group.throughput(Throughput::Elements(u64::from(chunk_size)));

        group.bench_function("next_batch", |b| {
            b.iter_batched(
                || create_gpu_searcher(&ctx),
                |mut searcher| pollster::block_on(searcher.next_batch(chunk_size)),
                criterion::BatchSize::SmallInput,
            );
        });

        group.finish();
    }
}

criterion_group!(benches, bench_gpu_mtseed_datetime_search);
criterion_main!(benches);
