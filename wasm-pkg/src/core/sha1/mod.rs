//! SHA-1 ハッシュエンジン
//!
//! Gen5 初期 Seed 計算用の SHA-1 実装。

mod message;
mod nazo;
mod scalar;
mod simd;

pub use message::{BaseMessageBuilder, build_date_code, build_time_code, get_frame};
pub use nazo::{NazoValues, get_nazo_values};
pub use scalar::calculate_pokemon_sha1;
pub use simd::calculate_pokemon_sha1_simd;

use crate::types::{LcgSeed, MtSeed};

// ===== SHA-1 定数 =====

/// SHA-1 初期ハッシュ値
pub const H0: u32 = 0x6745_2301;
pub const H1: u32 = 0xEFCD_AB89;
pub const H2: u32 = 0x98BA_DCFE;
pub const H3: u32 = 0x1032_5476;
pub const H4: u32 = 0xC3D2_E1F0;

/// SHA-1 ラウンド定数
pub const K: [u32; 4] = [0x5A82_7999, 0x6ED9_EBA1, 0x8F1B_BCDC, 0xCA62_C1D6];

// ===== HashValues =====

/// SHA-1 ハッシュ値 (5 ワード)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct HashValues {
    pub h0: u32,
    pub h1: u32,
    pub h2: u32,
    pub h3: u32,
    pub h4: u32,
}

impl HashValues {
    /// コンストラクタ
    #[inline]
    pub const fn new(h0: u32, h1: u32, h2: u32, h3: u32, h4: u32) -> Self {
        Self { h0, h1, h2, h3, h4 }
    }

    /// 64bit LCG Seed を計算
    ///
    /// h0, h1 をバイトスワップし `(h1_swapped << 32) | h0_swapped`
    #[inline]
    pub fn to_lcg_seed(&self) -> LcgSeed {
        let h0_swapped = self.h0.swap_bytes();
        let h1_swapped = self.h1.swap_bytes();
        let raw = (u64::from(h1_swapped) << 32) | u64::from(h0_swapped);
        LcgSeed::new(raw)
    }

    /// 32bit MT Seed を計算
    ///
    /// `to_lcg_seed()` + `LcgSeed::derive_mt_seed()` の合成。
    #[inline]
    pub fn to_mt_seed(&self) -> MtSeed {
        self.to_lcg_seed().derive_mt_seed()
    }

    /// 16進数文字列に変換 (デバッグ用)
    #[cfg(test)]
    pub fn to_hex_string(&self) -> String {
        format!(
            "{:08X}{:08X}{:08X}{:08X}{:08X}",
            self.h0, self.h1, self.h2, self.h3, self.h4
        )
    }
}

// ===== 補助関数 =====

/// Choice 関数 (ラウンド 0-19)
#[inline]
pub const fn choice(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (!x & z)
}

/// Parity 関数 (ラウンド 20-39, 60-79)
#[inline]
pub const fn parity(x: u32, y: u32, z: u32) -> u32 {
    x ^ y ^ z
}

/// Majority 関数 (ラウンド 40-59)
#[inline]
pub const fn majority(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (x & z) | (y & z)
}

/// 左回転
#[inline]
pub const fn left_rotate(value: u32, amount: u32) -> u32 {
    value.rotate_left(amount)
}

// ===== 内部ヘルパー関数 =====

/// 単一 SHA-1 計算 (crate 内部用)
///
/// # Panics
/// `message` の長さが 16 の場合は panic しない。
/// 16 以外の場合はゼロベクトルを返す。
#[allow(dead_code)]
pub(crate) fn sha1_hash_single(message: &[u32]) -> Option<HashValues> {
    if message.len() != 16 {
        return None;
    }
    let msg: [u32; 16] = message.try_into().expect("length checked");
    Some(calculate_pokemon_sha1(&msg))
}

/// バッチ SHA-1 計算 (crate 内部用)
#[allow(dead_code)]
pub(crate) fn sha1_hash_batch_internal(messages: &[u32]) -> Vec<HashValues> {
    let count = messages.len() / 16;
    let mut results = Vec::with_capacity(count);

    for i in 0..count {
        let msg: [u32; 16] = messages[i * 16..(i + 1) * 16]
            .try_into()
            .expect("slice length is 16");
        results.push(calculate_pokemon_sha1(&msg));
    }

    results
}

/// ハッシュから MT Seed を計算 (crate 内部用)
#[allow(dead_code)]
pub(crate) fn hash_to_mt_seed(h0: u32, h1: u32) -> MtSeed {
    let hash = HashValues::new(h0, h1, 0, 0, 0);
    hash.to_mt_seed()
}

/// ハッシュから LCG Seed を計算 (crate 内部用)
#[allow(dead_code)]
pub(crate) fn hash_to_lcg_seed(h0: u32, h1: u32) -> LcgSeed {
    let hash = HashValues::new(h0, h1, 0, 0, 0);
    hash.to_lcg_seed()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha1_constants() {
        // SHA-1 標準定数の検証
        assert_eq!(H0, 0x6745_2301);
        assert_eq!(H1, 0xEFCD_AB89);
        assert_eq!(H2, 0x98BA_DCFE);
        assert_eq!(H3, 0x1032_5476);
        assert_eq!(H4, 0xC3D2_E1F0);

        assert_eq!(K[0], 0x5A82_7999);
        assert_eq!(K[1], 0x6ED9_EBA1);
        assert_eq!(K[2], 0x8F1B_BCDC);
        assert_eq!(K[3], 0xCA62_C1D6);
    }

    #[test]
    fn test_choice() {
        assert_eq!(choice(0xFFFF_FFFF, 0xAAAA_AAAA, 0x5555_5555), 0xAAAA_AAAA);
        assert_eq!(choice(0x0000_0000, 0xAAAA_AAAA, 0x5555_5555), 0x5555_5555);
    }

    #[test]
    fn test_parity() {
        assert_eq!(parity(0xAAAA_AAAA, 0x5555_5555, 0x0000_0000), 0xFFFF_FFFF);
    }

    #[test]
    fn test_majority() {
        assert_eq!(majority(0xFFFF_FFFF, 0xFFFF_FFFF, 0x0000_0000), 0xFFFF_FFFF);
        assert_eq!(majority(0xFFFF_FFFF, 0x0000_0000, 0x0000_0000), 0x0000_0000);
    }

    #[test]
    fn test_left_rotate() {
        assert_eq!(left_rotate(0x8000_0000, 1), 0x0000_0001);
        assert_eq!(left_rotate(0x0000_0001, 1), 0x0000_0002);
        assert_eq!(left_rotate(0x1234_5678, 4), 0x2345_6781);
    }

    #[test]
    fn test_hash_values_to_lcg_seed() {
        // 既知の値でテスト
        let hash = HashValues::new(0x1234_5678, 0xABCD_EF01, 0, 0, 0);
        let lcg = hash.to_lcg_seed();

        // swap_bytes
        let h0_swapped = 0x1234_5678u32.swap_bytes(); // 0x7856_3412
        let h1_swapped = 0xABCD_EF01u32.swap_bytes(); // 0x01EF_CDAB

        let expected = (u64::from(h1_swapped) << 32) | u64::from(h0_swapped);
        assert_eq!(lcg.value(), expected);
    }

    #[test]
    fn test_hash_to_mt_seed_internal() {
        let h0 = 0x1234_5678;
        let h1 = 0xABCD_EF01;
        let mt = hash_to_mt_seed(h0, h1);
        assert_ne!(mt.value(), 0);
    }
}
