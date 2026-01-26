//! ポケモン生成フロー
//!
//! 固定エンカウント (static) と野生エンカウント (wild) のロジックを提供。

pub mod static_encounter;
pub mod wild;

pub use static_encounter::generate_static_pokemon;
pub use wild::generate_wild_pokemon;
