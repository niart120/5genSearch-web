# 計算コア: SHA-1 ハッシュ

Gen5 初期 Seed 計算における SHA-1 ハッシュの仕様。メッセージフォーマット、BCD エンコーディング、SIMD 最適化を含む。

## 1. 概要

### 1.1 初期 Seed 計算フロー

```
メッセージ構築 → SHA-1 Hash → LCG Seed (64bit) → MT Seed (32bit)
```

| ステップ | 入力 | 出力 |
|---------|------|------|
| メッセージ構築 | 起動条件 (日時, MAC, Timer0 等) | 16 ワード (64 バイト) |
| SHA-1 Hash | 16 ワードメッセージ | HashValues (h0-h4) |
| LCG Seed 導出 | h0, h1 | 64bit Seed |
| MT Seed 導出 | LCG Seed | 32bit Seed |

### 1.2 用途

| 用途 | 説明 |
|------|------|
| 起動時刻検索 | 日時パラメータを変化させ SHA-1 計算 |
| 初期 Seed 逆算 | 観測値から起動条件を特定 |

## 2. メッセージフォーマット

### 2.1 構造

16 ワード (各 32 ビット、ビッグエンディアン) で構成:

| Index | 内容 | 説明 |
|-------|------|------|
| 0 | `nazo[0]` | ROM 固有値 |
| 1 | `nazo[1]` | ROM 固有値 |
| 2 | `nazo[2]` | ROM 固有値 |
| 3 | `nazo[3]` | ROM 固有値 |
| 4 | `nazo[4]` | ROM 固有値 |
| 5 | `(vcount << 16) \| timer0` | ハードウェアパラメータ |
| 6 | `mac_lower` | MAC アドレス下位 4 バイト (リトルエンディアン) |
| 7 | `mac_upper ^ gx_stat ^ frame` | MAC 上位 2 バイト XOR 固定値 |
| 8 | `date_code` | 日付 (BCD 形式) |
| 9 | `time_code` | 時刻 (BCD 形式 + frame) |
| 10 | `0x00000000` | 未使用 |
| 11 | `0x00000000` | 未使用 |
| 12 | `key_code` | キー入力値 |
| 13 | `0x80000000` | SHA-1 パディング開始 |
| 14 | `0x00000000` | パディング |
| 15 | `0x000001A0` | メッセージ長 (416 ビット) |

### 2.2 Nazo 値

ROM バージョン・リージョン毎に固定された 5 つの 32 ビット値。

```rust
/// Nazo 値テーブル
pub struct NazoValues {
    pub values: [u32; 5],
}

/// 例: Black (JPN)
const NAZO_BLACK_JPN: NazoValues = NazoValues {
    values: [0x02215F10, 0x0221600C, 0x0221600C, 0x02216058, 0x02216058],
};
```

### 2.3 MAC アドレス

```rust
/// MAC アドレスから message[6], message[7] を構築
fn build_mac_words(mac: [u8; 6], frame: u8) -> (u32, u32) {
    // MAC 下位 4 バイト (リトルエンディアン)
    let mac_lower = u32::from_le_bytes([mac[0], mac[1], mac[2], mac[3]]);
    
    // MAC 上位 2 バイト
    let mac_upper = ((mac[5] as u32) << 8) | (mac[4] as u32);
    
    // GX_STAT 固定値
    const GX_STAT: u32 = 0x06000000;
    
    let word7 = mac_upper ^ GX_STAT ^ (frame as u32);
    
    (mac_lower, word7)
}
```

### 2.4 Frame 値

Hardware 依存のフレーム値:

| Hardware | Frame |
|----------|-------|
| DS | 8 |
| DS Lite | 6 |
| DSi / 3DS | 6 |

```rust
pub fn get_frame(hardware: Hardware) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite | Hardware::Dsi | Hardware::Dsi3ds => 6,
    }
}
```

## 3. BCD エンコーディング

### 3.1 BCD 変換

Binary Coded Decimal: 10 進数の各桁を 4bit で表現。

```rust
/// 数値を BCD に変換 (0-99)
#[inline]
pub fn to_bcd(value: u8) -> u8 {
    ((value / 10) << 4) | (value % 10)
}

/// BCD を数値に変換
#[inline]
pub fn from_bcd(bcd: u8) -> u8 {
    ((bcd >> 4) * 10) + (bcd & 0x0F)
}
```

**例**:
- `23` → `0x23`
- `59` → `0x59`
- `0x45` → `45`

### 3.2 date_code

```rust
/// 日付コードを生成
/// 
/// フォーマット: 0xYYMMDDWW
/// - YY: 年 (2000年からのオフセット、BCD)
/// - MM: 月 (BCD)
/// - DD: 日 (BCD)
/// - WW: 曜日 (0=日曜, 1=月曜, ..., 6=土曜)
pub fn build_date_code(year: u16, month: u8, day: u8) -> u32 {
    let weekday = calc_weekday(year, month, day);
    
    ((to_bcd((year - 2000) as u8) as u32) << 24)
        | ((to_bcd(month) as u32) << 16)
        | ((to_bcd(day) as u32) << 8)
        | (weekday as u32)
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
    let weekday = ((h + 6) % 7) as u8;  // 0=日曜 に調整
    
    weekday
}
```

**例**: 2023年12月25日(月) → `0x23122501`

### 3.3 time_code

```rust
/// 時刻コードを生成
/// 
/// フォーマット: 0xHHMMSSFF
/// - HH: 時 (BCD、12時以降は +0x40 の PM フラグ)
/// - MM: 分 (BCD)
/// - SS: 秒 (BCD)
/// - FF: frame 値 (Hardware 依存)
pub fn build_time_code(hour: u8, minute: u8, second: u8, frame: u8) -> u32 {
    let hour_bcd = if hour >= 12 {
        to_bcd(hour) | 0x40  // PM フラグ
    } else {
        to_bcd(hour)
    };
    
    ((hour_bcd as u32) << 24)
        | ((to_bcd(minute) as u32) << 16)
        | ((to_bcd(second) as u32) << 8)
        | (frame as u32)
}
```

**例**: 15:30:45, frame=6 → `0x55304506` (15時 → `0x15 | 0x40 = 0x55`)

### 3.4 DateTimeCodeGenerator

日時コードの列挙用ジェネレータ。

```rust
/// 日時コードジェネレータ
pub struct DateTimeCodeGenerator {
    /// 現在の日時
    current: DateTime,
    /// frame 値
    frame: u8,
}

/// 日時パラメータ
#[derive(Clone, Copy)]
pub struct DateTime {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}

impl DateTimeCodeGenerator {
    pub fn new(start: DateTime, frame: u8) -> Self {
        Self { current: start, frame }
    }

    /// 現在の date_code/time_code を取得
    pub fn current_codes(&self) -> (u32, u32) {
        let date_code = build_date_code(
            self.current.year,
            self.current.month,
            self.current.day,
        );
        let time_code = build_time_code(
            self.current.hour,
            self.current.minute,
            self.current.second,
            self.frame,
        );
        (date_code, time_code)
    }

    /// 次の秒に進める
    pub fn advance_second(&mut self) {
        self.current.second += 1;
        if self.current.second >= 60 {
            self.current.second = 0;
            self.current.minute += 1;
            if self.current.minute >= 60 {
                self.current.minute = 0;
                self.current.hour += 1;
                // 日付繰り上がりは省略
            }
        }
    }
}
```

## 4. HashValues 構造体

### 4.1 定義

```rust
/// SHA-1 ハッシュ値 (5 ワード)
#[derive(Debug, Clone, Copy)]
pub struct HashValues {
    pub h0: u32,
    pub h1: u32,
    pub h2: u32,
    pub h3: u32,
    pub h4: u32,
}
```

### 4.2 メソッド

```rust
use crate::common::types::{LcgSeed, MtSeed};

impl HashValues {
    /// コンストラクタ
    #[inline]
    pub fn new(h0: u32, h1: u32, h2: u32, h3: u32, h4: u32) -> Self {
        Self { h0, h1, h2, h3, h4 }
    }

    /// 64bit LCG Seed を計算
    /// 
    /// # Algorithm
    /// 1. h0, h1 をバイトスワップ (ビッグエンディアン → リトルエンディアン)
    /// 2. `(h1_swapped << 32) | h0_swapped` で 64bit 値を構築
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

    /// 16 進数文字列に変換 (デバッグ用)
    pub fn to_hex_string(&self) -> String {
        format!(
            "{:08X}{:08X}{:08X}{:08X}{:08X}",
            self.h0, self.h1, self.h2, self.h3, self.h4
        )
    }
}
```

**LCG Seed 計算**:
1. h0, h1 をバイトスワップ (ビッグエンディアン → リトルエンディアン)
2. `(h1_swapped << 32) | h0_swapped` で 64bit 値を構築
3. `LcgSeed` 型でラップして返却

**MT Seed 計算**:
LcgSeed の `derive_mt_seed()` メソッドに委譲。

## 5. SHA-1 計算

### 5.1 定数

```rust
/// SHA-1 初期ハッシュ値
const H0: u32 = 0x67452301;
const H1: u32 = 0xEFCDAB89;
const H2: u32 = 0x98BADCFE;
const H3: u32 = 0x10325476;
const H4: u32 = 0xC3D2E1F0;

/// SHA-1 ラウンド定数
const K: [u32; 4] = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];
```

### 5.2 補助関数

```rust
/// Choice 関数 (ラウンド 0-19)
#[inline]
pub fn choice(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (!x & z)
}

/// Parity 関数 (ラウンド 20-39, 60-79)
#[inline]
pub fn parity(x: u32, y: u32, z: u32) -> u32 {
    x ^ y ^ z
}

/// Majority 関数 (ラウンド 40-59)
#[inline]
pub fn majority(x: u32, y: u32, z: u32) -> u32 {
    (x & y) | (x & z) | (y & z)
}

/// 左回転
#[inline]
pub fn left_rotate(value: u32, amount: u32) -> u32 {
    (value << amount) | (value >> (32 - amount))
}

/// バイトスワップ (エンディアン変換)
#[inline]
pub fn swap_bytes_32(value: u32) -> u32 {
    value.swap_bytes()
}
```

### 5.3 スカラー版計算

```rust
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
```

### 5.4 SIMD 版計算

4 つのメッセージを同時に SHA-1 計算。

```rust
#[cfg(target_arch = "wasm32")]
use core::arch::wasm32::*;

/// SIMD 版 SHA-1 計算 (4 並列)
/// 
/// # Arguments
/// * `messages` - 4 つの 16 ワードメッセージ (インターリーブ配置)
/// 
/// # Returns
/// 4 つの HashValues
#[cfg(target_arch = "wasm32")]
pub fn calculate_pokemon_sha1_simd(
    date_codes: [u32; 4],
    time_codes: [u32; 4],
    base_message: &[u32; 16],
) -> [HashValues; 4] {
    // 共通部分をコピー
    let mut w: [[u32; 80]; 4] = [[0; 80]; 4];
    for lane in 0..4 {
        w[lane][..16].copy_from_slice(base_message);
        w[lane][8] = date_codes[lane];
        w[lane][9] = time_codes[lane];
    }

    // SIMD でメッセージ拡張
    let mut w_simd = [u32x4_splat(0); 80];
    for i in 0..16 {
        w_simd[i] = u32x4(w[0][i], w[1][i], w[2][i], w[3][i]);
    }
    for i in 16..80 {
        let xor1 = v128_xor(w_simd[i - 3], w_simd[i - 8]);
        let xor2 = v128_xor(w_simd[i - 14], w_simd[i - 16]);
        let xored = v128_xor(xor1, xor2);
        // 左回転 1
        w_simd[i] = v128_or(
            u32x4_shl(xored, 1),
            u32x4_shr(xored, 31),
        );
    }

    // 初期ハッシュ値 (SIMD)
    let mut a = u32x4_splat(H0);
    let mut b = u32x4_splat(H1);
    let mut c = u32x4_splat(H2);
    let mut d = u32x4_splat(H3);
    let mut e = u32x4_splat(H4);

    // 80 ラウンド処理 (SIMD)
    for i in 0..80 {
        let (f, k) = match i {
            0..=19 => (simd_choice(b, c, d), u32x4_splat(K[0])),
            20..=39 => (simd_parity(b, c, d), u32x4_splat(K[1])),
            40..=59 => (simd_majority(b, c, d), u32x4_splat(K[2])),
            _ => (simd_parity(b, c, d), u32x4_splat(K[3])),
        };

        let temp = u32x4_add(
            u32x4_add(
                u32x4_add(simd_left_rotate(a, 5), f),
                u32x4_add(e, k),
            ),
            w_simd[i],
        );

        e = d;
        d = c;
        c = simd_left_rotate(b, 30);
        b = a;
        a = temp;
    }

    // 最終ハッシュ値
    let h0 = u32x4_add(u32x4_splat(H0), a);
    let h1 = u32x4_add(u32x4_splat(H1), b);
    let h2 = u32x4_add(u32x4_splat(H2), c);
    let h3 = u32x4_add(u32x4_splat(H3), d);
    let h4 = u32x4_add(u32x4_splat(H4), e);

    // 結果を抽出
    [
        HashValues::new(
            u32x4_extract_lane::<0>(h0),
            u32x4_extract_lane::<0>(h1),
            u32x4_extract_lane::<0>(h2),
            u32x4_extract_lane::<0>(h3),
            u32x4_extract_lane::<0>(h4),
        ),
        HashValues::new(
            u32x4_extract_lane::<1>(h0),
            u32x4_extract_lane::<1>(h1),
            u32x4_extract_lane::<1>(h2),
            u32x4_extract_lane::<1>(h3),
            u32x4_extract_lane::<1>(h4),
        ),
        HashValues::new(
            u32x4_extract_lane::<2>(h0),
            u32x4_extract_lane::<2>(h1),
            u32x4_extract_lane::<2>(h2),
            u32x4_extract_lane::<2>(h3),
            u32x4_extract_lane::<2>(h4),
        ),
        HashValues::new(
            u32x4_extract_lane::<3>(h0),
            u32x4_extract_lane::<3>(h1),
            u32x4_extract_lane::<3>(h2),
            u32x4_extract_lane::<3>(h3),
            u32x4_extract_lane::<3>(h4),
        ),
    ]
}

// SIMD ヘルパー関数
#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_choice(x: v128, y: v128, z: v128) -> v128 {
    v128_or(v128_and(x, y), v128_and(v128_not(x), z))
}

#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_parity(x: v128, y: v128, z: v128) -> v128 {
    v128_xor(v128_xor(x, y), z)
}

#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_majority(x: v128, y: v128, z: v128) -> v128 {
    v128_or(v128_or(v128_and(x, y), v128_and(x, z)), v128_and(y, z))
}

#[cfg(target_arch = "wasm32")]
#[inline]
fn simd_left_rotate(value: v128, amount: u32) -> v128 {
    v128_or(
        u32x4_shl(value, amount),
        u32x4_shr(value, 32 - amount),
    )
}
```

## 6. BaseMessageBuilder

メッセージの共通部分を構築するビルダー。

```rust
/// SHA-1 メッセージビルダー
pub struct BaseMessageBuilder {
    buffer: [u32; 16],
}

impl BaseMessageBuilder {
    /// 新しいビルダーを作成
    pub fn new(
        nazo: [u32; 5],
        mac: [u8; 6],
        vcount: u8,
        timer0: u16,
        key_code: u32,
        frame: u8,
    ) -> Self {
        let mut buffer = [0u32; 16];

        // Nazo 値
        buffer[0..5].copy_from_slice(&nazo);

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
        buffer[13] = 0x80000000;
        buffer[14] = 0;
        buffer[15] = 0x000001A0;

        Self { buffer }
    }

    /// 日時コードを設定
    pub fn set_datetime(&mut self, date_code: u32, time_code: u32) {
        self.buffer[8] = date_code;
        self.buffer[9] = time_code;
    }

    /// メッセージを取得
    pub fn message(&self) -> &[u32; 16] {
        &self.buffer
    }

    /// メッセージをコピーして取得
    pub fn to_message(&self) -> [u32; 16] {
        self.buffer
    }
}
```

## 7. wasm-bindgen エクスポート

```rust
use wasm_bindgen::prelude::*;

/// バッチ SHA-1 計算
/// 
/// # Arguments
/// * `messages` - フラットな u32 配列 (16 ワード単位)
/// 
/// # Returns
/// フラットな u32 配列 (5 ワード単位)
#[wasm_bindgen]
pub fn sha1_hash_batch(messages: &[u32]) -> Vec<u32> {
    let count = messages.len() / 16;
    let mut results = Vec::with_capacity(count * 5);

    for i in 0..count {
        let msg: [u32; 16] = messages[i * 16..(i + 1) * 16]
            .try_into()
            .unwrap();
        let hash = calculate_pokemon_sha1(&msg);
        results.extend_from_slice(&[hash.h0, hash.h1, hash.h2, hash.h3, hash.h4]);
    }

    results
}

/// 単一 SHA-1 計算
#[wasm_bindgen]
pub fn sha1_hash_single(message: &[u32]) -> Vec<u32> {
    if message.len() != 16 {
        return vec![0; 5];
    }
    let msg: [u32; 16] = message.try_into().unwrap();
    let hash = calculate_pokemon_sha1(&msg);
    vec![hash.h0, hash.h1, hash.h2, hash.h3, hash.h4]
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

## 8. GPU 実装 (WGSL)

起動時刻検索の GPU カーネルで使用。

```wgsl
// SHA-1 初期ハッシュ値
const H0: u32 = 0x67452301u;
const H1: u32 = 0xEFCDAB89u;
const H2: u32 = 0x98BADCFEu;
const H3: u32 = 0x10325476u;
const H4: u32 = 0xC3D2E1F0u;

// ラウンド定数
const K0: u32 = 0x5A827999u;
const K1: u32 = 0x6ED9EBA1u;
const K2: u32 = 0x8F1BBCDCu;
const K3: u32 = 0xCA62C1D6u;

// 左回転
fn left_rotate(value: u32, amount: u32) -> u32 {
    return (value << amount) | (value >> (32u - amount));
}

// Choice 関数
fn choice(x: u32, y: u32, z: u32) -> u32 {
    return (x & y) | (~x & z);
}

// Parity 関数
fn parity(x: u32, y: u32, z: u32) -> u32 {
    return x ^ y ^ z;
}

// Majority 関数
fn majority(x: u32, y: u32, z: u32) -> u32 {
    return (x & y) | (x & z) | (y & z);
}

// SHA-1 計算
fn sha1_compute(message: array<u32, 16>) -> array<u32, 5> {
    var w: array<u32, 80>;
    
    // メッセージコピー
    for (var i = 0u; i < 16u; i++) {
        w[i] = message[i];
    }
    
    // メッセージ拡張
    for (var i = 16u; i < 80u; i++) {
        w[i] = left_rotate(w[i - 3u] ^ w[i - 8u] ^ w[i - 14u] ^ w[i - 16u], 1u);
    }

    var a = H0;
    var b = H1;
    var c = H2;
    var d = H3;
    var e = H4;

    // 80 ラウンド
    for (var i = 0u; i < 80u; i++) {
        var f: u32;
        var k: u32;
        
        if (i < 20u) {
            f = choice(b, c, d);
            k = K0;
        } else if (i < 40u) {
            f = parity(b, c, d);
            k = K1;
        } else if (i < 60u) {
            f = majority(b, c, d);
            k = K2;
        } else {
            f = parity(b, c, d);
            k = K3;
        }

        let temp = left_rotate(a, 5u) + f + e + k + w[i];
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    return array<u32, 5>(H0 + a, H1 + b, H2 + c, H3 + d, H4 + e);
}
```

## 9. テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bcd_conversion() {
        assert_eq!(to_bcd(0), 0x00);
        assert_eq!(to_bcd(23), 0x23);
        assert_eq!(to_bcd(59), 0x59);
        assert_eq!(to_bcd(99), 0x99);
        
        assert_eq!(from_bcd(0x00), 0);
        assert_eq!(from_bcd(0x23), 23);
        assert_eq!(from_bcd(0x59), 59);
    }

    #[test]
    fn test_date_code() {
        // 2023年12月25日(月)
        let code = build_date_code(2023, 12, 25);
        assert_eq!(code, 0x23122501);
    }

    #[test]
    fn test_time_code() {
        // 15:30:45, frame=6
        let code = build_time_code(15, 30, 45, 6);
        assert_eq!(code, 0x55304506);
        
        // 午前 9:15:30, frame=8
        let code_am = build_time_code(9, 15, 30, 8);
        assert_eq!(code_am, 0x09153008);
    }

    #[test]
    fn test_sha1_deterministic() {
        let message: [u32; 16] = [
            0x02215F10, 0x0221600C, 0x0221600C, 0x02216058,
            0x02216058, 0x12345678, 0x9ABCDEF0, 0x00000000,
            0x23122501, 0x55304506, 0x00000000, 0x00000000,
            0x00000000, 0x80000000, 0x00000000, 0x000001A0,
        ];

        let hash1 = calculate_pokemon_sha1(&message);
        let hash2 = calculate_pokemon_sha1(&message);

        assert_eq!(hash1.h0, hash2.h0);
        assert_eq!(hash1.h1, hash2.h1);
        assert_eq!(hash1.to_mt_seed(), hash2.to_mt_seed());
    }

    #[test]
    fn test_hash_to_seeds() {
        let message: [u32; 16] = [
            0x02215F10, 0x0221600C, 0x0221600C, 0x02216058,
            0x02216058, 0x00980054, 0x78563412, 0x06000000,
            0x23010100, 0x00000006, 0x00000000, 0x00000000,
            0x00000000, 0x80000000, 0x00000000, 0x000001A0,
        ];

        let hash = calculate_pokemon_sha1(&message);
        
        // LCG Seed と MT Seed が有効な値であること
        let lcg_seed = hash.to_lcg_seed();
        let mt_seed = hash.to_mt_seed();
        
        assert_ne!(lcg_seed.value(), 0);
        assert!(mt_seed.value() <= u32::MAX);
    }

    #[test]
    fn test_byte_swap() {
        assert_eq!(swap_bytes_32(0x12345678), 0x78563412);
        assert_eq!(swap_bytes_32(0xAABBCCDD), 0xDDCCBBAA);
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn test_simd_matches_scalar() {
        let base_message: [u32; 16] = [
            0x02215F10, 0x0221600C, 0x0221600C, 0x02216058,
            0x02216058, 0x00980054, 0x78563412, 0x06000000,
            0x00000000, 0x00000000, 0x00000000, 0x00000000,
            0x00000000, 0x80000000, 0x00000000, 0x000001A0,
        ];
        
        let date_codes = [0x23010100, 0x23010101, 0x23010102, 0x23010103];
        let time_codes = [0x00000006, 0x00000106, 0x00000206, 0x00000306];
        
        let simd_results = calculate_pokemon_sha1_simd(
            date_codes,
            time_codes,
            &base_message,
        );
        
        for i in 0..4 {
            let mut msg = base_message;
            msg[8] = date_codes[i];
            msg[9] = time_codes[i];
            let scalar_result = calculate_pokemon_sha1(&msg);
            
            assert_eq!(simd_results[i].h0, scalar_result.h0);
            assert_eq!(simd_results[i].h1, scalar_result.h1);
        }
    }
}
```

## 10. 関連ドキュメント

- [lcg.md](./lcg.md) - 64bit LCG (Seed 進行)
- [mt.md](./mt.md) - MT19937 (IV 生成)
- [base.md](../datetime-search/base.md) - 起動時刻検索共通基盤
- [gpu-kernel.md](../datetime-search/gpu-kernel.md) - GPU カーネル設計
- [types.md](../common/types.md) - 共通型定義 (Hardware, RomVersion 等)
