//! SHA-1 SIMD 実装 (4並列)

use std::simd::u32x4;

use super::{H0, H1, H2, H3, H4, HashValues, K};

/// SIMD 版 SHA-1 計算 (4並列)
///
/// 4つの異なる日時コードに対して同時に SHA-1 を計算。
///
/// # Arguments
/// * `date_codes` - 4つの日付コード
/// * `time_codes` - 4つの時刻コード
/// * `base_message` - 基本メッセージ (日時以外の部分)
///
/// # Returns
/// 4つの `HashValues`
#[allow(clippy::many_single_char_names, clippy::needless_range_loop)]
pub fn calculate_pokemon_sha1_simd(
    date_codes: [u32; 4],
    time_codes: [u32; 4],
    base_message: &[u32; 16],
) -> [HashValues; 4] {
    // メッセージを SIMD 用に構築
    let mut w_simd = [u32x4::splat(0); 80];

    // 基本メッセージをコピー (index 8, 9 以外)
    for i in 0..16 {
        if i == 8 {
            w_simd[i] = u32x4::from_array(date_codes);
        } else if i == 9 {
            w_simd[i] = u32x4::from_array(time_codes);
        } else {
            w_simd[i] = u32x4::splat(base_message[i]);
        }
    }

    // メッセージ拡張 (16 → 80)
    for i in 16..80 {
        let xored = w_simd[i - 3] ^ w_simd[i - 8] ^ w_simd[i - 14] ^ w_simd[i - 16];
        // 左回転 1
        w_simd[i] = (xored << 1) | (xored >> 31);
    }

    // 初期ハッシュ値 (SIMD)
    let mut a = u32x4::splat(H0);
    let mut b = u32x4::splat(H1);
    let mut c = u32x4::splat(H2);
    let mut d = u32x4::splat(H3);
    let mut e = u32x4::splat(H4);

    // 80 ラウンド処理 (4 ループに分割して分岐を排除)
    let k0 = u32x4::splat(K[0]);
    let k1 = u32x4::splat(K[1]);
    let k2 = u32x4::splat(K[2]);
    let k3 = u32x4::splat(K[3]);

    // Rounds 0-19: Ch(b, c, d)
    for i in 0..20 {
        let f = simd_choice(b, c, d);
        let temp = simd_left_rotate(a, 5) + f + e + k0 + w_simd[i];
        e = d;
        d = c;
        c = simd_left_rotate(b, 30);
        b = a;
        a = temp;
    }

    // Rounds 20-39: Parity(b, c, d)
    for i in 20..40 {
        let f = simd_parity(b, c, d);
        let temp = simd_left_rotate(a, 5) + f + e + k1 + w_simd[i];
        e = d;
        d = c;
        c = simd_left_rotate(b, 30);
        b = a;
        a = temp;
    }

    // Rounds 40-59: Maj(b, c, d)
    for i in 40..60 {
        let f = simd_majority(b, c, d);
        let temp = simd_left_rotate(a, 5) + f + e + k2 + w_simd[i];
        e = d;
        d = c;
        c = simd_left_rotate(b, 30);
        b = a;
        a = temp;
    }

    // Rounds 60-79: Parity(b, c, d)
    for i in 60..80 {
        let f = simd_parity(b, c, d);
        let temp = simd_left_rotate(a, 5) + f + e + k3 + w_simd[i];
        e = d;
        d = c;
        c = simd_left_rotate(b, 30);
        b = a;
        a = temp;
    }

    // 最終ハッシュ値
    let h0 = u32x4::splat(H0) + a;
    let h1 = u32x4::splat(H1) + b;
    let h2 = u32x4::splat(H2) + c;
    let h3 = u32x4::splat(H3) + d;
    let h4 = u32x4::splat(H4) + e;

    // 結果を抽出
    let h0_arr = h0.to_array();
    let h1_arr = h1.to_array();
    let h2_arr = h2.to_array();
    let h3_arr = h3.to_array();
    let h4_arr = h4.to_array();

    [
        HashValues::new(h0_arr[0], h1_arr[0], h2_arr[0], h3_arr[0], h4_arr[0]),
        HashValues::new(h0_arr[1], h1_arr[1], h2_arr[1], h3_arr[1], h4_arr[1]),
        HashValues::new(h0_arr[2], h1_arr[2], h2_arr[2], h3_arr[2], h4_arr[2]),
        HashValues::new(h0_arr[3], h1_arr[3], h2_arr[3], h3_arr[3], h4_arr[3]),
    ]
}

// ===== SIMD ヘルパー関数 =====

#[inline]
fn simd_choice(x: u32x4, y: u32x4, z: u32x4) -> u32x4 {
    (x & y) | (!x & z)
}

#[inline]
fn simd_parity(x: u32x4, y: u32x4, z: u32x4) -> u32x4 {
    x ^ y ^ z
}

#[inline]
fn simd_majority(x: u32x4, y: u32x4, z: u32x4) -> u32x4 {
    (x & y) | (x & z) | (y & z)
}

#[inline]
fn simd_left_rotate(value: u32x4, amount: u32) -> u32x4 {
    (value << amount) | (value >> (32 - amount))
}

#[cfg(test)]
mod tests {
    use super::super::scalar::calculate_pokemon_sha1;
    use super::*;

    #[test]
    fn test_simd_matches_scalar() {
        let base_message: [u32; 16] = [
            0x0221_5F10,
            0x0221_600C,
            0x0221_600C,
            0x0221_6058,
            0x0221_6058,
            0x0098_0054,
            0x7856_3412,
            0x0600_0000,
            0x0000_0000, // date_code placeholder
            0x0000_0000, // time_code placeholder
            0x0000_0000,
            0x0000_0000,
            0x0000_0000,
            0x8000_0000,
            0x0000_0000,
            0x0000_01A0,
        ];

        let date_codes = [0x2301_0100, 0x2301_0101, 0x2301_0102, 0x2301_0103];
        let time_codes = [0x0000_0006, 0x0000_0106, 0x0000_0206, 0x0000_0306];

        let simd_results = calculate_pokemon_sha1_simd(date_codes, time_codes, &base_message);

        for i in 0..4 {
            let mut msg = base_message;
            msg[8] = date_codes[i];
            msg[9] = time_codes[i];
            let scalar_result = calculate_pokemon_sha1(&msg);

            assert_eq!(
                simd_results[i], scalar_result,
                "Mismatch at lane {i}: SIMD = {:?}, Scalar = {:?}",
                simd_results[i], scalar_result
            );
        }
    }
}
