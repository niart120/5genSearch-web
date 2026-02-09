//! Generator ベンチマーク
//!
//! `PokemonGenerator`, `EggGenerator` の Iterator スループット測定

use std::time::Duration;

use criterion::{Criterion, Throughput, criterion_group, criterion_main};
use wasm_pkg::generation::flows::generator::{EggGenerator, PokemonGenerator};
use wasm_pkg::types::{
    EggGenerationParams, EncounterMethod, EncounterSlotConfig, EncounterType, EverstonePlan,
    GameStartConfig, GenderRatio, GenerationConfig, Ivs, LcgSeed, LeadAbilityEffect,
    MemoryLinkState, PokemonGenerationParams, RomVersion, SavePresence, SeedOrigin,
    ShinyCharmState, StartMode, TrainerInfo,
};

// ===== テスト用パラメータ生成 =====

fn create_base_seed() -> LcgSeed {
    LcgSeed::new(0x123456789ABCDEF0)
}

fn create_source() -> SeedOrigin {
    SeedOrigin::seed(create_base_seed())
}

fn create_trainer() -> TrainerInfo {
    TrainerInfo {
        tid: 12345,
        sid: 54321,
    }
}

fn create_generation_config() -> GenerationConfig {
    GenerationConfig {
        version: RomVersion::Black,
        game_start: GameStartConfig {
            start_mode: StartMode::Continue,
            save: SavePresence::WithSave,
            memory_link: MemoryLinkState::Disabled,
            shiny_charm: ShinyCharmState::NotObtained,
        },
        user_offset: 0,
        max_advance: 10000,
    }
}

fn create_pokemon_params() -> PokemonGenerationParams {
    PokemonGenerationParams {
        trainer: create_trainer(),
        encounter_type: EncounterType::Normal,
        encounter_method: EncounterMethod::Stationary,
        lead_ability: LeadAbilityEffect::None,
        slots: vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_ratio: GenderRatio::F1M1,
            has_held_item: false,
            shiny_locked: false,
        }],
    }
}

fn create_egg_params() -> EggGenerationParams {
    EggGenerationParams {
        trainer: create_trainer(),
        everstone: EverstonePlan::None,
        female_has_hidden: false,
        uses_ditto: false,
        gender_ratio: GenderRatio::F1M1,
        nidoran_flag: false,
        masuda_method: false,
        parent_male: Ivs::default(),
        parent_female: Ivs::default(),
        consider_npc: false,
        species_id: None,
    }
}

fn create_pokemon_generator() -> PokemonGenerator {
    PokemonGenerator::new(
        create_base_seed(),
        create_source(),
        &create_pokemon_params(),
        &create_generation_config(),
    )
    .expect("Failed to create PokemonGenerator")
}

fn create_egg_generator() -> EggGenerator {
    EggGenerator::new(
        create_base_seed(),
        create_source(),
        &create_egg_params(),
        &create_generation_config(),
    )
    .expect("Failed to create EggGenerator")
}

// ===== ベンチマーク =====

fn bench_pokemon_generator(c: &mut Criterion) {
    let mut group = c.benchmark_group("pokemon_generator");
    group.warm_up_time(Duration::from_secs(1));
    group.measurement_time(Duration::from_secs(5));
    group.sample_size(50);

    let generate_count = 1000_u32;
    group.throughput(Throughput::Elements(u64::from(generate_count)));

    group.bench_function("generate_1000", |b| {
        b.iter_batched(
            create_pokemon_generator,
            |mut generator| {
                generator.take(generate_count);
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

fn bench_egg_generator(c: &mut Criterion) {
    let mut group = c.benchmark_group("egg_generator");
    group.warm_up_time(Duration::from_secs(1));
    group.measurement_time(Duration::from_secs(5));
    group.sample_size(50);

    let generate_count = 1000_u32;
    group.throughput(Throughput::Elements(u64::from(generate_count)));

    group.bench_function("generate_1000", |b| {
        b.iter_batched(
            create_egg_generator,
            |mut generator| {
                generator.take(generate_count);
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

criterion_group!(benches, bench_pokemon_generator, bench_egg_generator);
criterion_main!(benches);
