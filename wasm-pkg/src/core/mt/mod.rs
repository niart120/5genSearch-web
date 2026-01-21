//! MT19937 (Mersenne Twister) 乱数生成器

mod scalar;
mod simd;

pub use scalar::Mt19937;
pub use simd::Mt19937x4;

// ===== 共通定数 =====

/// 状態配列サイズ
pub const N: usize = 624;

/// Twist オフセット
pub const M: usize = 397;

/// Twist マスク
pub const MATRIX_A: u32 = 0x9908_B0DF;

/// 上位ビットマスク
pub const UPPER_MASK: u32 = 0x8000_0000;

/// 下位ビットマスク
pub const LOWER_MASK: u32 = 0x7FFF_FFFF;

/// 初期化乗数
pub const INIT_MULTIPLIER: u32 = 1_812_433_253;
