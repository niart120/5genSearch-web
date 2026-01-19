# SHA-1 メッセージフォーマット仕様

Gen5 初期 Seed 計算における SHA-1 メッセージの構造と BCD エンコーディングの詳細。

## 1. 概要

初期 Seed は 16 ワード (64 バイト) の SHA-1 メッセージから計算される。

```
SHA-1 Hash → LCG Seed (64-bit) → MT Seed (32-bit)
```

## 2. メッセージ構造

16 ワード (各 32 ビット、ビッグエンディアン) で構成:

| Index | 内容 | 説明 |
|-------|------|------|
| 0 | `nazo[0]` | ROM 固有値 |
| 1 | `nazo[1]` | ROM 固有値 |
| 2 | `nazo[2]` | ROM 固有値 |
| 3 | `nazo[3]` | ROM 固有値 |
| 4 | `nazo[4]` | ROM 固有値 |
| 5 | `(vcount << 16) \| timer0` | ハードウェアパラメータ |
| 6 | `mac_lower` | MAC アドレス下位4バイト (リトルエンディアン) |
| 7 | `mac_upper ^ gx_stat ^ frame` | MAC 上位2バイト XOR 固定値 |
| 8 | `date_code` | 日付 (BCD形式) |
| 9 | `time_code` | 時刻 (BCD形式 + frame) |
| 10 | `0x00000000` | 未使用 |
| 11 | `0x00000000` | 未使用 |
| 12 | `key_code` | キー入力値 |
| 13 | `0x80000000` | SHA-1 パディング開始 |
| 14 | `0x00000000` | パディング |
| 15 | `0x000001A0` | メッセージ長 (416 ビット) |

## 3. 各フィールドの詳細

### 3.1 Nazo 値

ROM バージョン・リージョン毎に固定された 5 つの 32 ビット値。

```rust
// 例: Black (JPN)
nazo: [0x02215F10, 0x0221600C, 0x0221600C, 0x02216058, 0x02216058]
```

### 3.2 MAC アドレス

```rust
// MAC: [0x00, 0x1A, 0x2B, 0x3C, 0x4D, 0x5E]
mac_lower = 0x3C2B1A00;  // bytes[3..0] リトルエンディアン
mac_upper = 0x00005E4D;  // bytes[5..4]
```

### 3.3 gx_stat と frame

```rust
const GX_STAT: u32 = 0x06000000;

let frame = match hardware {
    Hardware::DS => 8,
    Hardware::DS_LITE | Hardware::_3DS => 6,
};

message[7] = mac_upper ^ GX_STAT ^ frame;
```

## 4. BCD エンコーディング

日時は BCD (Binary Coded Decimal) 形式でエンコードする。

### 4.1 BCD 変換

```rust
fn to_bcd(value: u8) -> u8 {
    ((value / 10) << 4) | (value % 10)
}

// 例: 23 → 0x23, 59 → 0x59
```

### 4.2 date_code

```rust
// フォーマット: 0xYYMMDDWW
// WW = 曜日 (0=日曜, 1=月曜, ..., 6=土曜)
let date_code = (to_bcd(year - 2000) as u32) << 24
              | (to_bcd(month) as u32) << 16
              | (to_bcd(day) as u32) << 8
              | weekday as u32;

// 例: 2023年12月25日(月) → 0x23122501
```

### 4.3 time_code

```rust
// フォーマット: 0xHHMMSSFF
// FF = frame 値 (Hardware 依存)
// 12時以降は hour に 0x40 を加算 (PM フラグ)
let hour_bcd = if hour >= 12 {
    to_bcd(hour) | 0x40
} else {
    to_bcd(hour)
};

let time_code = (hour_bcd as u32) << 24
              | (to_bcd(minute) as u32) << 16
              | (to_bcd(second) as u32) << 8
              | frame as u32;

// 例: 15:30:45, frame=6 → 0x55304506
//     (15時 → 0x15 | 0x40 = 0x55)
```

## 5. Seed 計算

### 5.1 SHA-1 ハッシュ

```rust
let hash = sha1(message);  // HashValues { h0, h1, h2, h3, h4 }
```

### 5.2 LCG Seed (64-bit)

```rust
fn to_lcg_seed(hash: &HashValues) -> u64 {
    let h0_swapped = hash.h0.swap_bytes();
    let h1_swapped = hash.h1.swap_bytes();
    (h1_swapped as u64) << 32 | h0_swapped as u64
}
```

### 5.3 MT Seed (32-bit)

```rust
const LCG_MULT: u64 = 0x5D588B656C078965;
const LCG_ADD: u64 = 0x269EC3;

fn to_mt_seed(lcg_seed: u64) -> u32 {
    let next = lcg_seed.wrapping_mul(LCG_MULT).wrapping_add(LCG_ADD);
    (next >> 32) as u32
}
```

## 6. SIMD 並列化

SHA-1 計算は SIMD (SIMD128) を使用して 4 エントリ同時に処理する。

### 6.1 設計方針

- WASM SIMD128 (`v128` 型) を使用
- 4 つの異なる日時に対する SHA-1 ハッシュを並列計算
- `DateTimeCodeEnumerator::next_quad()` が 4 件ずつ返すことで SIMD と連携

### 6.2 SIMD SHA-1 インターフェース

```rust
use core::arch::wasm32::*;

/// 4つのメッセージを並列にSHA-1ハッシュ計算
/// 
/// # Arguments
/// - `messages`: 4つの16ワードメッセージ (date_code/time_code のみ異なる)
/// - `base_message`: 共通部分 (nazo, mac, timer0, vcount, key_code)
/// 
/// # Returns
/// - 4つの HashValues
pub fn calculate_sha1_simd_x4(
    date_codes: [u32; 4],
    time_codes: [u32; 4],
    base_message: &BaseMessageBuilder,
) -> [HashValues; 4] {
    // SIMD レジスタに4つの date_code/time_code をロード
    // SHA-1 の各ステップを SIMD で並列実行
    todo!()
}
```

### 6.3 バッチ処理フロー

```rust
impl DatetimeSearcher {
    pub fn next_batch(&mut self, max_results: u32) -> DatetimeSearchBatch {
        let mut results = Vec::new();
        
        while results.len() < max_results as usize {
            // 4件ずつ取得
            let (entries, len) = self.datetime_enumerator.next_quad();
            if len == 0 {
                break; // 終了
            }
            
            // date_code/time_code を抽出
            let mut date_codes = [0u32; 4];
            let mut time_codes = [0u32; 4];
            for i in 0..len as usize {
                date_codes[i] = entries[i].date_code;
                time_codes[i] = entries[i].time_code;
            }
            
            // SIMD で 4 件同時に SHA-1 計算
            let hashes = calculate_sha1_simd_x4(
                date_codes,
                time_codes,
                &self.base_message,
            );
            
            // MT Seed を計算し、target_seeds と照合
            for i in 0..len as usize {
                let mt_seed = hashes[i].to_mt_seed();
                if self.target_seeds.contains(&mt_seed) {
                    results.push(self.create_result(mt_seed, &entries[i]));
                }
            }
        }
        
        DatetimeSearchBatch { results, /* ... */ }
    }
}
```

## 7. 実装例

```rust
pub struct BaseMessageBuilder {
    buffer: [u32; 16],
}

impl BaseMessageBuilder {
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
        let mac_lower = u32::from_le_bytes([mac[0], mac[1], mac[2], mac[3]]);
        let mac_upper = (mac[5] as u32) << 8 | (mac[4] as u32);
        buffer[6] = mac_lower;
        buffer[7] = mac_upper ^ 0x06000000 ^ (frame as u32);
        
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
    
    pub fn set_datetime(&mut self, date_code: u32, time_code: u32) {
        self.buffer[8] = date_code;
        self.buffer[9] = time_code;
    }
    
    pub fn message(&self) -> &[u32; 16] {
        &self.buffer
    }
}
```

## 8. 関連ドキュメント

- [base.md](../datetime-search/base.md) - 起動時刻検索共通基盤
- [types.md](./types.md) - 共通型定義
