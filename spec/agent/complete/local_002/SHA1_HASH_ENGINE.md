# SHA-1 ハッシュエンジン 仕様書

## 1. 概要

### 1.1 目的

Gen5 初期 Seed 計算に使用される SHA-1 ハッシュ実装を行う。mig_002 仕様書の Phase 2 (コア計算層) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| SHA-1 | Secure Hash Algorithm 1 (160bit ハッシュ) |
| HashValues | SHA-1 の出力 (h0-h4 の5つの32bit値) |
| Nazo | ROM バージョン・リージョン固有の5つの32bit定数 |
| BCD | Binary-Coded Decimal (10進各桁を4bitで表現) |
| date_code | 日付を表す32bit値 (0xYYMMDDWW形式) |
| time_code | 時刻を表す32bit値 (0xHHMMSSFF形式) |
| frame | Hardware 依存のフレーム値 (DS=8, DS Lite=6, DSi/3DS=9) |
| BaseMessageBuilder | SHA-1 メッセージの共通部分を構築するビルダー |

### 1.3 背景・問題

- local_001 で BCD 変換と LCG/MT 実装が完了予定
- SHA-1 ハッシュは起動時刻検索の中核計算
- スカラー版と SIMD 版 (4並列) の両方が必要

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 初期Seed計算 | 起動条件からLcgSeed/MtSeedを導出可能に |
| SIMD高速化 | 4系統並列計算による約4倍のスループット |
| 再利用性 | datetime_search, seed_search から参照可能 |

### 1.5 着手条件

- local_001 (TYPES_AND_CORE_FOUNDATION.md) の実装が完了していること
- `wasm-pkg/src/types/mod.rs` が存在すること
- `wasm-pkg/src/core/bcd.rs` が存在すること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/mod.rs` | 変更 | sha1 モジュール追加 |
| `wasm-pkg/src/core/sha1/mod.rs` | 新規 | SHA-1 共通インターフェース |
| `wasm-pkg/src/core/sha1/scalar.rs` | 新規 | SHA-1 スカラー実装 |
| `wasm-pkg/src/core/sha1/simd.rs` | 新規 | SHA-1 SIMD 実装 (4並列) |
| `wasm-pkg/src/core/sha1/message.rs` | 新規 | メッセージビルダー |
| `wasm-pkg/src/core/sha1/nazo.rs` | 新規 | Nazo 値テーブル |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/core/
├── mod.rs              # sha1 モジュール追加
└── sha1/
    ├── mod.rs          # 共通インターフェース + HashValues
    ├── scalar.rs       # スカラー版 SHA-1
    ├── simd.rs         # SIMD 版 SHA-1 (4並列)
    ├── message.rs      # BaseMessageBuilder + 日時コード生成
    └── nazo.rs         # Nazo 値テーブル (ROM毎)
```

### 3.2 依存関係

```
types/ (LcgSeed, MtSeed, Hardware, RomVersion, RomRegion)
  ↑
core/bcd.rs (to_bcd)
  ↑
core/lcg.rs (LCG_MULTIPLIER, LCG_INCREMENT) ← LcgSeed::derive_mt_seed()
  ↑
core/sha1/
    ├── nazo.rs ← types/ (RomVersion, RomRegion)
    ├── message.rs ← bcd.rs, nazo.rs, types/ (Hardware)
    ├── scalar.rs ← (依存なし、純粋計算)
    ├── simd.rs ← (依存なし、純粋計算)
    └── mod.rs ← scalar, simd, message, nazo, types/ (LcgSeed, MtSeed)
```

### 3.3 HashValues からの Seed 導出

```
HashValues (h0, h1, h2, h3, h4)
    │
    ├── to_lcg_seed() → LcgSeed
    │   └── h0, h1 をバイトスワップし ((h1_swap << 32) | h0_swap)
    │
    └── to_mt_seed() → MtSeed
        └── to_lcg_seed().derive_mt_seed()
```

### 3.4 SIMD 戦略

- `std::simd` の `u32x4` で4系統並列
- 日時コード (date_code, time_code) のみ異なる4メッセージを同時計算
- BaseMessage (Nazo, MAC, VCount, Timer0 等) は共通

## 4. 実装仕様

### 4.1 core/sha1/mod.rs

参照: [mig_002/core/sha1.md](../mig_002/core/sha1.md)

```rust
//! SHA-1 ハッシュエンジン
//!
//! Gen5 初期 Seed 計算用の SHA-1 実装。

mod message;
mod nazo;
mod scalar;
mod simd;

pub use message::{build_date_code, build_time_code, BaseMessageBuilder, DateTime};
pub use nazo::{get_nazo_values, NazoValues};
pub use scalar::calculate_pokemon_sha1;
pub use simd::calculate_pokemon_sha1_simd;

use crate::types::{LcgSeed, MtSeed};
use wasm_bindgen::prelude::*;

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
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
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
        let raw = ((h1_swapped as u64) << 32) | (h0_swapped as u64);
        LcgSeed::new(raw)
    }

    /// 32bit MT Seed を計算
    ///
    /// to_lcg_seed() + LcgSeed::derive_mt_seed() の合成。
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
    (value << amount) | (value >> (32 - amount))
}

// ===== wasm-bindgen エクスポート =====

/// 単一 SHA-1 計算
#[wasm_bindgen]
pub fn sha1_hash_single(message: &[u32]) -> Vec<u32> {
    if message.len() != 16 {
        return vec![0; 5];
    }
    let msg: [u32; 16] = message.try_into().expect("length checked");
    let hash = calculate_pokemon_sha1(&msg);
    vec![hash.h0, hash.h1, hash.h2, hash.h3, hash.h4]
}

/// バッチ SHA-1 計算
#[wasm_bindgen]
pub fn sha1_hash_batch(messages: &[u32]) -> Vec<u32> {
    let count = messages.len() / 16;
    let mut results = Vec::with_capacity(count * 5);

    for i in 0..count {
        let msg: [u32; 16] = messages[i * 16..(i + 1) * 16]
            .try_into()
            .expect("slice length is 16");
        let hash = calculate_pokemon_sha1(&msg);
        results.extend_from_slice(&[hash.h0, hash.h1, hash.h2, hash.h3, hash.h4]);
    }

    results
}

/// ハッシュから MT Seed を計算
#[wasm_bindgen]
pub fn hash_to_mt_seed(h0: u32, h1: u32) -> u32 {
    let hash = HashValues::new(h0, h1, 0, 0, 0);
    hash.to_mt_seed().value()
}

/// ハッシュから LCG Seed を計算
#[wasm_bindgen]
pub fn hash_to_lcg_seed(h0: u32, h1: u32) -> u64 {
    let hash = HashValues::new(h0, h1, 0, 0, 0);
    hash.to_lcg_seed().value()
}
```

### 4.2 core/sha1/scalar.rs

```rust
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
```

### 4.3 core/sha1/simd.rs

```rust
//! SHA-1 SIMD 実装 (4並列)

use std::simd::u32x4;

use super::{HashValues, H0, H1, H2, H3, H4, K};

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
/// 4つの HashValues
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

    // 80 ラウンド処理
    for i in 0..80 {
        let (f, k) = match i {
            0..=19 => (simd_choice(b, c, d), u32x4::splat(K[0])),
            20..=39 => (simd_parity(b, c, d), u32x4::splat(K[1])),
            40..=59 => (simd_majority(b, c, d), u32x4::splat(K[2])),
            _ => (simd_parity(b, c, d), u32x4::splat(K[3])),
        };

        let temp = simd_left_rotate(a, 5) + f + e + k + w_simd[i];

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
```

### 4.4 core/sha1/message.rs

```rust
//! SHA-1 メッセージビルダー

use crate::core::bcd::to_bcd;
use crate::types::Hardware;

use super::nazo::NazoValues;

/// GX_STAT 固定値
const GX_STAT: u32 = 0x0600_0000;

/// 日時パラメータ
#[derive(Clone, Copy, Debug)]
pub struct DateTime {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}

impl DateTime {
    pub const fn new(year: u16, month: u8, day: u8, hour: u8, minute: u8, second: u8) -> Self {
        Self {
            year,
            month,
            day,
            hour,
            minute,
            second,
        }
    }
}

/// 日付コードを生成
///
/// フォーマット: 0xYYMMDDWW
/// - YY: 年 (2000年からのオフセット、BCD)
/// - MM: 月 (BCD)
/// - DD: 日 (BCD)
/// - WW: 曜日 (0=日曜)
pub fn build_date_code(year: u16, month: u8, day: u8) -> u32 {
    let weekday = calc_weekday(year, month, day);

    ((to_bcd((year - 2000) as u8) as u32) << 24)
        | ((to_bcd(month) as u32) << 16)
        | ((to_bcd(day) as u32) << 8)
        | (weekday as u32)
}

/// 時刻コードを生成
///
/// フォーマット: 0xHHMMSSFF
/// - HH: 時 (BCD、12時以降は +0x40 の PM フラグ)
/// - MM: 分 (BCD)
/// - SS: 秒 (BCD)
/// - FF: frame 値
pub fn build_time_code(hour: u8, minute: u8, second: u8, frame: u8) -> u32 {
    let hour_bcd = if hour >= 12 {
        to_bcd(hour) | 0x40 // PM フラグ
    } else {
        to_bcd(hour)
    };

    ((hour_bcd as u32) << 24)
        | ((to_bcd(minute) as u32) << 16)
        | ((to_bcd(second) as u32) << 8)
        | (frame as u32)
}

/// 曜日計算 (Zeller の公式)
fn calc_weekday(year: u16, month: u8, day: u8) -> u8 {
    let mut y = year as i32;
    let mut m = month as i32;

    if m < 3 {
        m += 12;
        y -= 1;
    }

    let q = day as i32;
    let k = y % 100;
    let j = y / 100;

    let h = (q + (13 * (m + 1)) / 5 + k + k / 4 + j / 4 - 2 * j) % 7;
    let weekday = ((h + 6) % 7) as u8; // 0=日曜 に調整

    weekday
}

/// Hardware から frame 値を取得
pub const fn get_frame(hardware: Hardware) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite | Hardware::Dsi | Hardware::Dsi3ds => 6,
    }
}

/// MAC アドレスから message[6], message[7] を構築
fn build_mac_words(mac: [u8; 6], frame: u8) -> (u32, u32) {
    // MAC 下位 4 バイト (リトルエンディアン)
    let mac_lower = u32::from_le_bytes([mac[0], mac[1], mac[2], mac[3]]);

    // MAC 上位 2 バイト
    let mac_upper = ((mac[5] as u32) << 8) | (mac[4] as u32);

    let word7 = mac_upper ^ GX_STAT ^ (frame as u32);

    (mac_lower, word7)
}

/// SHA-1 メッセージビルダー
pub struct BaseMessageBuilder {
    buffer: [u32; 16],
}

impl BaseMessageBuilder {
    /// 新しいビルダーを作成
    pub fn new(
        nazo: &NazoValues,
        mac: [u8; 6],
        vcount: u8,
        timer0: u16,
        key_code: u32,
        frame: u8,
    ) -> Self {
        let mut buffer = [0u32; 16];

        // Nazo 値
        buffer[0..5].copy_from_slice(&nazo.values);

        // VCount | Timer0
        buffer[5] = ((vcount as u32) << 16) | (timer0 as u32);

        // MAC アドレス
        let (mac_lower, mac_word7) = build_mac_words(mac, frame);
        buffer[6] = mac_lower;
        buffer[7] = mac_word7;

        // 日時 (後で設定)
        buffer[8] = 0;
        buffer[9] = 0;

        // 未使用
        buffer[10] = 0;
        buffer[11] = 0;

        // KeyCode
        buffer[12] = key_code;

        // SHA-1 パディング
        buffer[13] = 0x8000_0000;
        buffer[14] = 0;
        buffer[15] = 0x0000_01A0;

        Self { buffer }
    }

    /// 日時コードを設定
    pub fn set_datetime(&mut self, date_code: u32, time_code: u32) {
        self.buffer[8] = date_code;
        self.buffer[9] = time_code;
    }

    /// メッセージを取得
    pub const fn message(&self) -> &[u32; 16] {
        &self.buffer
    }

    /// メッセージをコピーして取得
    pub const fn to_message(&self) -> [u32; 16] {
        self.buffer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date_code() {
        // 2023年12月25日(月)
        let code = build_date_code(2023, 12, 25);
        assert_eq!(code, 0x2312_2501);
    }

    #[test]
    fn test_time_code_pm() {
        // 15:30:45, frame=6
        let code = build_time_code(15, 30, 45, 6);
        assert_eq!(code, 0x5530_4506);
    }

    #[test]
    fn test_time_code_am() {
        // 09:15:30, frame=8
        let code = build_time_code(9, 15, 30, 8);
        assert_eq!(code, 0x0915_3008);
    }

    #[test]
    fn test_weekday_known_dates() {
        // 2023年1月1日 = 日曜日 (0)
        assert_eq!(calc_weekday(2023, 1, 1), 0);
        // 2023年12月25日 = 月曜日 (1)
        assert_eq!(calc_weekday(2023, 12, 25), 1);
        // 2024年2月29日 = 木曜日 (4) - 閏年
        assert_eq!(calc_weekday(2024, 2, 29), 4);
    }

    #[test]
    fn test_get_frame() {
        assert_eq!(get_frame(Hardware::Ds), 8);
        assert_eq!(get_frame(Hardware::DsLite), 6);
        assert_eq!(get_frame(Hardware::Dsi), 6);
        assert_eq!(get_frame(Hardware::Dsi3ds), 9);
    }
}
```

### 4.5 core/sha1/nazo.rs

Nazo 値は ROM バージョン (Black/White/Black2/White2) とリージョン (Jpn/Usa/Kor/Ger/Fra/Spa/Ita) の組み合わせごとに定義された 5 つの 32bit 定数である。

#### 設計

```rust
/// Nazo 値 (5つの32bit定数)
#[derive(Debug, Clone, Copy)]
pub struct NazoValues {
    pub values: [u32; 5],
}

/// ROM バージョンとリージョンに対応する Nazo 値を返す
pub const fn get_nazo_values(version: RomVersion, region: RomRegion) -> NazoValues;
```

#### Nazo 値の参照元

正確な Nazo 値は以下を参照:
- 元実装: <https://github.com/niart120/pokemon-gen5-initseed/blob/main/src/data/rom-parameters.ts>
- 技術解説: <https://blog.bzl-web.com/entry/2020/09/18/235128>

**注意**: 仕様書の値より実装を正とする。4 バージョン × 7 リージョン = 28 パターン全てを実装すること。

#### テスト例

```rust
#[test]
fn test_nazo_black_jpn() {
    let nazo = get_nazo_values(RomVersion::Black, RomRegion::Jpn);
    assert_eq!(nazo.values[0], 0x0221_5F10);
}

#[test]
fn test_nazo_black2_jpn() {
    let nazo = get_nazo_values(RomVersion::Black2, RomRegion::Jpn);
    assert_eq!(nazo.values[0], 0x0209_A8DC);
}

#[test]
fn test_nazo_different_regions() {
        let jpn = get_nazo_values(RomVersion::Black, RomRegion::Jpn);
        let usa = get_nazo_values(RomVersion::Black, RomRegion::Usa);
        // 日本語版とUSA版は異なる
        assert_ne!(jpn.values[0], usa.values[0]);
    }
}
```

### 4.6 core/mod.rs の更新

```rust
//! 計算コア
//!
//! PRNG、ハッシュ等の計算基盤を提供。

pub mod bcd;
pub mod lcg;
pub mod mt;
pub mod sha1;

// Re-export commonly used items
pub use bcd::{from_bcd, to_bcd};
pub use lcg::{Lcg64, LCG_INCREMENT, LCG_MULTIPLIER};
pub use mt::{Mt19937, Mt19937x4};
pub use sha1::{calculate_pokemon_sha1, calculate_pokemon_sha1_simd, HashValues};
```

### 4.7 lib.rs の更新 (追加分)

```rust
// 既存の re-export に追加
pub use core::sha1::{
    hash_to_lcg_seed, hash_to_mt_seed, sha1_hash_batch, sha1_hash_single,
};
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `sha1/scalar.rs` | 決定性テスト、ハッシュ値の有効性検証 |
| `sha1/simd.rs` | スカラー版との結果一致検証 |
| `sha1/message.rs` | date_code/time_code のフォーマット検証、曜日計算 |
| `sha1/nazo.rs` | 既知の Nazo 値との一致確認 |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| HashValues → LcgSeed | バイトスワップと結合が正しいこと |
| LcgSeed → MtSeed | derive_mt_seed() の結果が正しいこと |
| BaseMessageBuilder | 構築したメッセージの各フィールドが正しいこと |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/core/sha1/mod.rs` 作成
  - [ ] SHA-1 定数 (H0-H4, K)
  - [ ] HashValues 構造体
  - [ ] 補助関数 (choice, parity, majority, left_rotate)
  - [ ] wasm-bindgen エクスポート
- [ ] `wasm-pkg/src/core/sha1/scalar.rs` 作成
  - [ ] calculate_pokemon_sha1 関数
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/core/sha1/simd.rs` 作成
  - [ ] calculate_pokemon_sha1_simd 関数
  - [ ] SIMD ヘルパー関数
  - [ ] スカラー版との一致テスト
- [ ] `wasm-pkg/src/core/sha1/message.rs` 作成
  - [ ] DateTime 構造体
  - [ ] build_date_code, build_time_code 関数
  - [ ] calc_weekday 関数
  - [ ] get_frame 関数
  - [ ] BaseMessageBuilder
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/core/sha1/nazo.rs` 作成
  - [ ] NazoValues 構造体
  - [ ] get_nazo_values 関数 (全リージョン対応)
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/core/mod.rs` 更新
  - [ ] sha1 モジュール追加
  - [ ] re-export 追加
- [ ] `wasm-pkg/src/lib.rs` 更新
  - [ ] sha1 関数の re-export 追加
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認
