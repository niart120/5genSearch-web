//! 計算コア
//!
//! PRNG、ハッシュ等の計算基盤を提供。

pub mod bcd;
pub mod datetime_codes;
pub mod lcg;
pub mod mt;
pub mod needle;
pub mod seed_resolver;
pub mod sha1;

// Re-export commonly used items
pub use bcd::{from_bcd, to_bcd};
pub use datetime_codes::{
    days_in_month, get_date_code, get_day_of_week, get_time_code, get_time_code_for_hardware,
    is_leap_year,
};
pub use lcg::{LCG_INCREMENT, LCG_MULTIPLIER, Lcg64, roll_fraction};
pub use mt::{Mt19937, Mt19937x4};
pub use needle::{calc_report_needle_direction, calculate_needle_direction};
pub use sha1::{HashValues, calculate_pokemon_sha1, calculate_pokemon_sha1_simd};
