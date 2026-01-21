//! SHA-1 スカラー実装

use super::{choice, left_rotate, majority, parity, HashValues, H0, H1, H2, H3, H4, K};

/// ポケモン BW/BW2 用 SHA-1 計算
///
/// # Arguments
/// * `message` - 16 ワードメッセージ
///
/// # Returns
/// HashValues (h0-h4)
pub fn calculate_pokemon_sha1(message: &[u32; 16]) -> HashValues {
    // メッセージ拡張 (16 → 80 ワード)
    let mut w = [0u32; 80];
    w[..16].copy_from_slice(message);

    for i in 16..80 {
        w[i] = left_rotate(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    // 初期ハッシュ値
    let (mut a, mut b, mut c, mut d, mut e) = (H0, H1, H2, H3, H4);

    // 80 ラウンド処理
    for (i, &w_val) in w.iter().enumerate() {
        let (f, k) = match i {
            0..=19 => (choice(b, c, d), K[0]),
            20..=39 => (parity(b, c, d), K[1]),
            40..=59 => (majority(b, c, d), K[2]),
            _ => (parity(b, c, d), K[3]),
        };

        let temp = left_rotate(a, 5)
            .wrapping_add(f)
            .wrapping_add(e)
            .wrapping_add(k)
            .wrapping_add(w_val);

        e = d;
        d = c;
        c = left_rotate(b, 30);
        b = a;
        a = temp;
    }

    HashValues::new(
        H0.wrapping_add(a),
        H1.wrapping_add(b),
        H2.wrapping_add(c),
        H3.wrapping_add(d),
        H4.wrapping_add(e),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha1_deterministic() {
        let message: [u32; 16] = [
            0x0221_5F10,
            0x0221_600C,
            0x0221_600C,
            0x0221_6058,
            0x0221_6058,
            0x1234_5678,
            0x9ABC_DEF0,
            0x0000_0000,
            0x2312_2501,
            0x5530_4506,
            0x0000_0000,
            0x0000_0000,
            0x0000_0000,
            0x8000_0000,
            0x0000_0000,
            0x0000_01A0,
        ];

        let hash1 = calculate_pokemon_sha1(&message);
        let hash2 = calculate_pokemon_sha1(&message);

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_values_consistency() {
        let message: [u32; 16] = [
            0x0221_5F10,
            0x0221_600C,
            0x0221_600C,
            0x0221_6058,
            0x0221_6058,
            0x0098_0054,
            0x7856_3412,
            0x0600_0000,
            0x2301_0100,
            0x0000_0006,
            0x0000_0000,
            0x0000_0000,
            0x0000_0000,
            0x8000_0000,
            0x0000_0000,
            0x0000_01A0,
        ];

        let hash = calculate_pokemon_sha1(&message);

        // LCG Seed と MT Seed が有効な値であること
        let lcg_seed = hash.to_lcg_seed();
        let mt_seed = hash.to_mt_seed();

        assert_ne!(lcg_seed.value(), 0);
        assert!(mt_seed.value() <= u32::MAX);
    }
}
