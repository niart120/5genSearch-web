//! 生成アルゴリズム

mod encounter;
mod game_offset;
mod iv;
mod nature;
mod pid;

// needle 関連は外部公開 (WASM API で使用)
pub mod needle;
pub use needle::{calc_report_needle_direction, calculate_needle_direction};

// その他のアルゴリズムは crate 内部のみ (使用されている関数のみ re-export)
pub(crate) use encounter::{
    calculate_encounter_slot, determine_held_item_slot, dust_cloud_item_table_consume,
    dust_cloud_result, encounter_type_supports_held_item, fishing_success,
    generate_moving_encounter_info, generate_special_encounter_info, is_moving_encounter_type,
    is_special_encounter_type, pokemon_shadow_item_table_consume, pokemon_shadow_result,
    rand_to_percent,
};
pub(crate) use game_offset::calculate_game_offset;
pub(crate) use iv::{InheritanceSlot, ParentRole};
pub(crate) use iv::{apply_inheritance, generate_rng_ivs_with_offset, generate_roamer_ivs};
pub(crate) use nature::EverstonePlan;
pub(crate) use nature::{determine_egg_nature, determine_nature, nature_roll, perform_sync_check};
pub(crate) use pid::{
    apply_shiny_lock, calculate_shiny_type, generate_egg_pid_with_reroll, generate_event_pid,
    generate_wild_pid_with_reroll,
};
// テスト用 (generator.rs のテストで使用)
#[cfg(test)]
pub(crate) use pid::{generate_base_pid, generate_wild_pid};
