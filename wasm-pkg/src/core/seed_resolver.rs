//! Seed 解決ヘルパー
//!
//! `SeedInput` から `SeedOrigin` リストを解決する。

use wasm_bindgen::prelude::*;

use crate::core::sha1::{
    BaseMessageBuilder, build_date_code, build_time_code, calculate_pokemon_sha1, get_frame,
    get_nazo_values,
};
use crate::types::{LcgSeed, SeedInput, SeedOrigin, StartupCondition};

/// Seed 解決 (公開 API)
///
/// `SeedInput` から `SeedOrigin` のリストを生成。
/// UI/Worker 側で事前に呼び出す。
///
/// # Errors
/// - `Seeds` が空の場合
/// - `Startup` で `ranges` が空の場合
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn resolve_seeds(input: SeedInput) -> Result<Vec<SeedOrigin>, String> {
    let results = resolve_all_seeds(&input)?;
    Ok(results.into_iter().map(|(_, origin)| origin).collect())
}

/// `SeedInput` から単一の `LcgSeed` を解決
///
/// - `Seeds`: 最初の Seed を返す (単一解決用)
/// - `Startup`: SHA-1 計算で導出 (最初の range の min 値を使用)
///
/// # Errors
/// - `Seeds` が空の場合
/// - `Startup` で `ranges` が空の場合
pub fn resolve_single_seed(input: &SeedInput) -> Result<(LcgSeed, SeedOrigin), String> {
    match input {
        SeedInput::Seeds { seeds } => {
            let seed = seeds.first().ok_or("Seeds is empty")?;
            Ok((*seed, SeedOrigin::seed(*seed)))
        }
        SeedInput::Startup {
            ds,
            datetime,
            ranges,
            key_input,
        } => {
            let range = ranges.first().ok_or("Startup ranges is empty")?;
            let timer0 = range.timer0_min;
            let vcount = range.vcount_min;
            let key_code = key_input.to_key_code();

            // SHA-1 計算
            let nazo = get_nazo_values(ds.version, ds.region);
            let frame = get_frame(ds.hardware);

            let mut builder =
                BaseMessageBuilder::new(&nazo, ds.mac, vcount, timer0, key_code, frame);

            let date_code = build_date_code(datetime.year, datetime.month, datetime.day);
            let time_code = build_time_code(
                datetime.hour,
                datetime.minute,
                datetime.second,
                matches!(
                    ds.hardware,
                    crate::types::Hardware::Ds | crate::types::Hardware::DsLite
                ),
            );
            builder.set_datetime(date_code, time_code);

            let hash = calculate_pokemon_sha1(builder.message());
            let lcg_seed = hash.to_lcg_seed();

            Ok((
                lcg_seed,
                SeedOrigin::startup(
                    lcg_seed,
                    *datetime,
                    StartupCondition::new(timer0, vcount, key_code),
                ),
            ))
        }
    }
}

/// `SeedInput` から複数の `(LcgSeed, SeedOrigin)` を解決
///
/// - `Seeds`: 全 Seed を返す
/// - `Startup`: 全 range × `key_input` 組み合わせを返す
///
/// # Errors
/// - `Seeds` が空の場合
/// - 起動設定が無効な場合
pub fn resolve_all_seeds(input: &SeedInput) -> Result<Vec<(LcgSeed, SeedOrigin)>, String> {
    match input {
        SeedInput::Seeds { seeds } => {
            if seeds.is_empty() {
                return Err("Seeds is empty".into());
            }
            Ok(seeds
                .iter()
                .map(|seed| (*seed, SeedOrigin::seed(*seed)))
                .collect())
        }
        SeedInput::Startup {
            ds,
            datetime,
            ranges,
            key_input,
        } => {
            if ranges.is_empty() {
                return Err("Startup ranges is empty".into());
            }

            let key_code = key_input.to_key_code();
            let nazo = get_nazo_values(ds.version, ds.region);
            let frame = get_frame(ds.hardware);
            let is_ds_or_lite = matches!(
                ds.hardware,
                crate::types::Hardware::Ds | crate::types::Hardware::DsLite
            );
            let date_code = build_date_code(datetime.year, datetime.month, datetime.day);
            let time_code = build_time_code(
                datetime.hour,
                datetime.minute,
                datetime.second,
                is_ds_or_lite,
            );

            let mut results = Vec::new();

            for range in ranges {
                for timer0 in range.timer0_min..=range.timer0_max {
                    for vcount in range.vcount_min..=range.vcount_max {
                        let mut builder =
                            BaseMessageBuilder::new(&nazo, ds.mac, vcount, timer0, key_code, frame);
                        builder.set_datetime(date_code, time_code);

                        let hash = calculate_pokemon_sha1(builder.message());
                        let lcg_seed = hash.to_lcg_seed();

                        results.push((
                            lcg_seed,
                            SeedOrigin::startup(
                                lcg_seed,
                                *datetime,
                                StartupCondition::new(timer0, vcount, key_code),
                            ),
                        ));
                    }
                }
            }

            Ok(results)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        Datetime, DsConfig, Hardware, KeyInput, RomRegion, RomVersion, Timer0VCountRange,
    };

    #[test]
    fn test_resolve_single_seed_from_seeds() {
        let input = SeedInput::Seeds {
            seeds: vec![LcgSeed::new(0x1111), LcgSeed::new(0x2222)],
        };
        let (seed, origin) = resolve_single_seed(&input).unwrap();
        assert_eq!(seed.value(), 0x1111);
        assert!(matches!(origin, SeedOrigin::Seed { .. }));
    }

    #[test]
    fn test_resolve_single_seed_from_startup() {
        let input = SeedInput::Startup {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            datetime: Datetime::new(2010, 9, 18, 18, 13, 11),
            ranges: vec![Timer0VCountRange::fixed(0x0C79, 0x60)],
            key_input: KeyInput::new(),
        };
        let result = resolve_single_seed(&input);
        assert!(result.is_ok());
        let (_, origin) = result.unwrap();
        assert!(matches!(origin, SeedOrigin::Startup { .. }));
    }

    #[test]
    fn test_resolve_all_seeds() {
        let input = SeedInput::Seeds {
            seeds: vec![
                LcgSeed::new(0x1111),
                LcgSeed::new(0x2222),
                LcgSeed::new(0x3333),
            ],
        };
        let results = resolve_all_seeds(&input).unwrap();
        assert_eq!(results.len(), 3);
    }
}
