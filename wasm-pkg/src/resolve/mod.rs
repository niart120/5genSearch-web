//! 解決モジュール
//!
//! 生成データから表示用データへの変換 (解決) を行う。

pub mod egg;
pub mod pokemon;

pub use egg::resolve_egg_data;
pub use pokemon::resolve_pokemon_data;
