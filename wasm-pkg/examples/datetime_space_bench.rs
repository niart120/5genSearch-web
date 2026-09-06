//! JSON 条件を固定し、列挙・MT Seed 検索・ポケモン検索を各 5 回計測する。
//! cargo run --release --example datetime_space_bench -- <conditions.json>

use serde::Deserialize;
use std::{hint::black_box, time::Instant};
use wasm_pkg::core::datetime::DatetimeSearchSpace;
use wasm_pkg::{
    MtseedDatetimeSearchParams, MtseedDatetimeSearcher, PokemonDatetimeSearchParams,
    PokemonDatetimeSearcher, PokemonSearchBatchLimits,
};

#[derive(Deserialize)]
struct Case {
    name: String,
    mt: MtseedDatetimeSearchParams,
    pokemon: PokemonDatetimeSearchParams,
}

fn enumerate(params: &MtseedDatetimeSearchParams) -> f64 {
    let space = DatetimeSearchSpace::try_from(params.search_space.clone()).unwrap();
    let start = Instant::now();
    for date in &space {
        black_box(date);
    }
    start.elapsed().as_secs_f64() * 1000.0
}

fn main() {
    let input = std::env::args().nth(1).expect("conditions.json required");
    let cases: Vec<Case> = serde_json::from_str(&std::fs::read_to_string(input).unwrap()).unwrap();
    for case in cases {
        // 初回のコード・テーブル読み込みは計測外。
        enumerate(&case.mt);
        for run in 0..5 {
            let enumeration_ms = enumerate(&case.mt);
            let start = Instant::now();
            let mut mt = MtseedDatetimeSearcher::new(case.mt.clone()).unwrap();
            let mut mt_count = 0;
            while !mt.is_done() {
                mt_count = black_box(mt.next_batch(65536)).processed_count;
            }
            let mt_ms = start.elapsed().as_secs_f64() * 1000.0;
            let start = Instant::now();
            let mut pokemon = PokemonDatetimeSearcher::new(case.pokemon.clone()).unwrap();
            let mut pokemon_count = 0;
            while !pokemon.is_done() {
                pokemon_count = black_box(
                    pokemon
                        .next_batch(PokemonSearchBatchLimits {
                            max_candidates: 65536,
                            max_results: 256,
                        })
                        .unwrap(),
                )
                .processed_count;
            }
            let pokemon_ms = start.elapsed().as_secs_f64() * 1000.0;
            println!(
                "{},{run},{enumeration_ms:.6},{mt_ms:.6},{pokemon_ms:.6},{mt_count},{pokemon_count}",
                case.name
            );
        }
    }
}
