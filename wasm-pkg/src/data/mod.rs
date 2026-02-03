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
pub use items::{HeldItemEntry, get_held_item_entry, get_held_item_name, get_item_name};
pub use names::{get_nature_name, get_species_name};
pub use species::{BaseStats, SpeciesEntry, get_species_entry};
pub use stats::{Stats, calculate_stats};
