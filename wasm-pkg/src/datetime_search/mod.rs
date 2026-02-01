//! 起動時刻検索

pub mod base;
pub mod egg;
pub mod mtseed;
pub mod trainer_info;

use crate::types::{DatetimeSearchContext, StartupCondition};

pub use egg::{
    EggDatetimeSearchBatch, EggDatetimeSearchParams, EggDatetimeSearchResult, EggDatetimeSearcher,
    generate_egg_search_tasks,
};
pub use mtseed::{
    MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams, MtseedDatetimeSearcher,
    generate_mtseed_search_tasks,
};
pub use trainer_info::{
    TrainerInfoSearchBatch, TrainerInfoSearchParams, TrainerInfoSearchResult, TrainerInfoSearcher,
    generate_trainer_info_search_tasks,
};

/// 組み合わせ展開 (共通関数)
///
/// `DatetimeSearchContext` から `Timer0` × `VCount` × `KeyCode` の全組み合わせを展開する。
pub(crate) fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    let key_codes = context.key_spec.combinations();
    let mut combinations = Vec::new();

    for range in &context.ranges {
        for timer0 in range.timer0_min..=range.timer0_max {
            for vcount in range.vcount_min..=range.vcount_max {
                for &key_code in &key_codes {
                    combinations.push(StartupCondition::new(timer0, vcount, key_code));
                }
            }
        }
    }
    combinations
}
