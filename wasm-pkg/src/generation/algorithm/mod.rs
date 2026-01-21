//! 生成アルゴリズム

pub mod encounter;
pub mod game_offset;
pub mod iv;
pub mod nature;
pub mod needle;
pub mod pid;

pub use encounter::{
    EncounterResult, HeldItemSlot, ItemContent, calculate_encounter_slot, determine_held_item_slot,
    dust_cloud_result, encounter_type_supports_held_item, fishing_encounter_slot, fishing_success,
    normal_encounter_slot, pokemon_shadow_result, rand_to_percent, surfing_encounter_slot,
};
pub use game_offset::{apply_game_offset, calculate_game_offset, create_offset_lcg};
pub use iv::{
    InheritanceSlot, ParentRole, apply_inheritance, extract_iv, generate_rng_ivs,
    generate_rng_ivs_with_offset, generate_roamer_ivs,
};
pub use nature::{
    EverstonePlan, determine_egg_nature, determine_nature, nature_roll, perform_sync_check,
    supports_sync, sync_check,
};
pub use needle::calculate_needle_direction;
pub use pid::{
    apply_shiny_lock, calculate_shiny_type, generate_egg_pid, generate_egg_pid_with_reroll,
    generate_event_pid, generate_wild_pid, generate_wild_pid_with_reroll,
};
