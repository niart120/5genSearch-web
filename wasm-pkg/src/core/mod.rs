//! 計算コア
//!
//! PRNG、ハッシュ等の計算基盤を提供。

pub mod bcd;
pub mod lcg;
pub mod mt;

// Re-export commonly used items
pub use bcd::{from_bcd, to_bcd};
pub use lcg::{Lcg64, LCG_INCREMENT, LCG_MULTIPLIER};
pub use mt::{Mt19937, Mt19937x4};
