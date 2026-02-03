//! 起動時刻検索ベンチマーク
//!
//! `MtseedDatetimeSearcher`, `EggDatetimeSearcher` の `next_batch()` スループット測定

use std::time::Duration;

use criterion::{Criterion, Throughput, criterion_group, criterion_main};
use wasm_pkg::datetime_search::{EggDatetimeSearcher, MtseedDatetimeSearcher};
use wasm_pkg::types::{
    DsConfig, EggGenerationParams, EverstonePlan, GameStartConfig, GenderRatio, GenerationConfig,
    Hardware, Ivs, KeyCode, MtSeed, RomRegion, RomVersion, SaveState, SearchRangeParams, StartMode,
    StartupCondition, TimeRangeParams, TrainerInfo,
};
use wasm_pkg::{EggDatetimeSearchParams, MtseedDatetimeSearchParams};

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

fn create_mtseed_searcher() -> MtseedDatetimeSearcher {
    let params = MtseedDatetimeSearchParams {
        target_seeds: vec![
            MtSeed::new(0x12345678),
            MtSeed::new(0x87654321),
            MtSeed::new(0xABCDEF01),
        ],
        ds: create_ds_config(),
        time_range: create_time_range(),
        search_range: create_search_range(),
        condition: create_condition(),
    };
    MtseedDatetimeSearcher::new(params).expect("Failed to create MtseedDatetimeSearcher")
}

fn create_egg_searcher() -> EggDatetimeSearcher {
    let params = EggDatetimeSearchParams {
        ds: create_ds_config(),
        time_range: create_time_range(),
        search_range: create_search_range(),
        condition: create_condition(),
        egg_params: EggGenerationParams {
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::Genderless,
            nidoran_flag: false,
            masuda_method: false,
            parent_male: Ivs::default(),
            parent_female: Ivs::default(),
            consider_npc: false,
            species_id: None,
        },
        gen_config: GenerationConfig {
            version: RomVersion::Black,
            game_start: GameStartConfig {
                start_mode: StartMode::Continue,
                save_state: SaveState::WithSave,
            },
            user_offset: 0,
            max_advance: 100,
        },
        filter: None,
    };
    EggDatetimeSearcher::new(params).expect("Failed to create EggDatetimeSearcher")
}

// ===== ベンチマーク =====

fn bench_mtseed_datetime_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("mtseed_datetime_search");
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

fn bench_egg_datetime_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("egg_datetime_search");
    group.warm_up_time(Duration::from_secs(1));
    group.measurement_time(Duration::from_secs(5));
    group.sample_size(20);

    let chunk_size = 1000_u32;
    group.throughput(Throughput::Elements(u64::from(chunk_size)));

    group.bench_function("next_batch", |b| {
        b.iter_batched(
            create_egg_searcher,
            |mut searcher| searcher.next_batch(chunk_size),
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_mtseed_datetime_search,
    bench_egg_datetime_search
);
criterion_main!(benches);
