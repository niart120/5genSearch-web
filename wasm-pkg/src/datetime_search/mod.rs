//! 起動時刻検索

pub mod base;
pub mod egg;
pub mod mtseed;
pub mod pokemon;
pub use pokemon::{PokemonDatetimeSearcher, generate_pokemon_search_tasks};
pub mod trainer_info;

use std::num::NonZeroU32;

use crate::types::{DatetimeSearchContext, StartupCondition};

// Searcher と関数のみ re-export (型は types モジュールから)
pub use egg::{EggDatetimeSearcher, generate_egg_search_tasks};
pub use mtseed::{MtseedDatetimeSearcher, generate_mtseed_search_tasks};
pub use trainer_info::{TrainerInfoSearcher, generate_trainer_info_search_tasks};

/// 組み合わせ展開 (共通関数)
///
/// `DatetimeSearchContext` から `Timer0` × `VCount` × `KeyMask` の全組み合わせを展開する。
pub(crate) fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    let key_masks = context.key_spec.combinations();
    let mut combinations = Vec::new();

    for range in &context.ranges {
        for timer0 in range.timer0_min..=range.timer0_max {
            for vcount in range.vcount_min..=range.vcount_max {
                for &key_mask in &key_masks {
                    combinations.push(StartupCondition::new(timer0, vcount, key_mask));
                }
            }
        }
    }
    combinations
}

/// 組み合わせ数と Worker 数から時間分割数を計算
///
/// # Arguments
/// - `combo_count`: 組み合わせ数 (`Timer0` × `VCount` × `KeyMask`)
/// - `worker_count`: Worker 数
///
/// # Returns
/// 時間分割数 (最低 1)
pub(crate) fn calculate_time_chunks(
    combo_count: u32,
    worker_count: u32,
) -> Result<NonZeroU32, String> {
    let workers = NonZeroU32::new(worker_count).ok_or("Worker count must be positive")?;
    Ok(NonZeroU32::new(workers.get().div_ceil(combo_count.max(1))).unwrap_or(NonZeroU32::MIN))
}
