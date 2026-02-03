//! 静的データモジュール
//!
//! 種族データ、特性、名前などの静的マスタデータを提供。
//!
//! このモジュールのファイルは自動生成されています。
//! 生成コマンド: node scripts/generate-species-data.js

pub mod abilities;
pub mod items;
pub mod names;
pub mod species;
pub mod stats;

pub use abilities::get_ability_name;
pub use items::{get_held_item_entry, get_held_item_name, get_item_name, HeldItemEntry};
pub use names::{get_nature_name, get_species_name};
pub use species::{get_species_entry, BaseStats, SpeciesEntry};
pub use stats::{calculate_stats, Stats};
