# WASM API 仕様書: 起動時刻検索 共通基盤

起動時刻から LCG Seed を計算する共通コンポーネント群。

## 1. 概要

### 1.1 モジュール構成

本ドキュメントは起動時刻検索の共通基盤を定義する。各検索モジュールはこの基盤を利用して独自の照合ロジックを実装する。

```
┌─────────────────────────────────────────────────────────┐
│ base.md (本ドキュメント)                              │
│                                                          │
│  共通基盤:                                               │
│   - DsConfig → Nazo/Frame 解決                          │
│   - TimeRangeParams + SearchRangeParams                 │
│   - RangedTimeCodeTable (time_code 前計算)              │
│   - HashValuesEnumerator (SHA-1 → LCG Seed 列挙)        │
└───────────────────────────────────┬─────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────┐
        ↓                           ↓                       ↓
┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────┐
│ mtseed.md             │  │ egg.md                   │  │ (将来の拡張)   │
│                       │  │                        │  │                │
│ MT Seed 照合          │  │ 孵化個体フィルタ照合    │  │                │
└───────────────────────┘  └────────────────────────┘  └────────────────┘
```

### 1.2 計算原理

Gen5の初期seedは以下の要素から決定論的に計算される:

```
初期seed = f(MAC, Nazo[5], 日時, Timer0, VCount, KeyCode, Frame)
```

- **Nazo値**: ROM バージョン・リージョン毎に固定の5つの32bit値。WASM側で内部テーブルから解決
- **Frame値**: Hardware 種別により決定 (DS=8, DS_LITE/3DS=6)。WASM側で自動解決

計算アルゴリズムの詳細は [sha1-message-format.md](../common/sha1-message-format.md) を参照。

### 1.3 探索空間

| パラメータ | 範囲 | 備考 |
|-----------|------|------|
| 年 | 2000-2099 | DS設定可能範囲 |
| 月日 | 1/1 - 12/31 | 閏年考慮 |
| 時分秒 | 00:00:00 - 23:59:59 | |
| Timer0 | 0x000 - 0xFFF | ROM/リージョン毎に典型範囲あり |
| VCount | 0x00 - 0xFF | ROM/リージョン毎に典型値あり |
| KeyCode | mask から列挙 | フロント側で有効値を全列挙 |

## 2. 入力型

### 2.1 DsConfig

```rust
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DsConfig {
    /// MACアドレス
    pub mac: [u8; 6],
    /// ハードウェア種別
    pub hardware: Hardware,
    /// ROMバージョン
    pub version: RomVersion,
    /// リージョン
    pub region: RomRegion,
}
```

**Nazo値・Frame値の解決**: WASM 側で `(version, region)` から Nazo[5] を、`hardware` から Frame 値を内部テーブルより自動解決する。フロント側での指定は不要。

### 2.3 TimeRangeParams

1日内の検索対象時刻範囲。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TimeRangeParams {
    pub hour_start: u8,
    pub hour_end: u8,
    pub minute_start: u8,
    pub minute_end: u8,
    pub second_start: u8,
    pub second_end: u8,
}
```

**バリデーション**:
- `hour`: 0-23
- `minute`: 0-59
- `second`: 0-59
- `*_start <= *_end`

### 2.4 SearchRangeParams

検索開始日時と範囲秒数。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchRangeParams {
    /// 開始年
    pub start_year: u16,
    /// 開始月
    pub start_month: u8,
    /// 開始日
    pub start_day: u8,
    /// 開始日内のオフセット秒 (0-86399)
    pub start_second_offset: u32,
    /// 検索範囲秒数
    pub range_seconds: u32,
}
```

**設計意図**:
- `TimeRangeParams`: 1日の中で探索する時刻範囲 (例: 10:00-12:00)
- `SearchRangeParams`: 探索開始日からの範囲 (例: 2024/1/1 から 1年分)
- 両者の組み合わせで「指定期間内の毎日 10:00-12:00」のような探索が可能

### 2.5 SearchSegment

探索の最小単位。Timer0, VCount, KeyCode の固定された組み合わせ。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchSegment {
    /// Timer0値
    pub timer0: u16,
    /// VCount値
    pub vcount: u8,
    /// キーコード
    pub key_code: u32,
}
```

### 2.6 RangedTimeCodeTable (内部型)

`time_code` の前計算テーブル。WASM 側で内部的に使用。

```rust
/// 86,400要素の配列。各インデックスが1日の秒数 (0-86399) に対応
/// Some(time_code) なら検索対象、None なら対象外
pub type RangedTimeCodeTable = Box<[Option<u32>; 86400]>;

/// TimeRangeParams から RangedTimeCodeTable を構築
fn build_ranged_time_code_table(
    range: &TimeRangeParams,
    hardware: Hardware,
) -> RangedTimeCodeTable {
    let mut table: RangedTimeCodeTable = Box::new([None; 86400]);
    let frame = hardware.frame();
    
    for hour in range.hour_start..=range.hour_end {
        for minute in range.minute_start..=range.minute_end {
            for second in range.second_start..=range.second_end {
                let second_of_day = hour as u32 * 3600 + minute as u32 * 60 + second as u32;
                let time_code = calculate_time_code(hour, minute, second, frame);
                table[second_of_day as usize] = Some(time_code);
            }
        }
    }
    table
}
```

**設計意図**:
- 検索時に BCD エンコードを毎回計算するのではなく、事前計算で O(1) アクセス
- 検索対象外の秒は `None` でスキップ
- メモリ: 約 346KB (86400 × 4 bytes)

### 2.7 VCountTimer0Range

ROM parameters から取得する典型的な Timer0/VCount 範囲。WASM 側で提供。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct VCountTimer0Range {
    pub vcount: u8,
    pub timer0_min: u16,
    pub timer0_max: u16,
}

/// ROM parameters から VCount/Timer0 範囲を取得
#[wasm_bindgen]
pub fn get_vcount_timer0_ranges(
    version: RomVersion,
    region: RomRegion,
) -> Vec<VCountTimer0Range> {
    // 内部テーブルから取得
    // 一部 ROM (B2/W2 の ITA, GER) では複数セグメントを返す
    todo!()
}
```

## 3. 共通基盤コンポーネント

起動時刻検索の共通部分。他の検索モジュール (egg-search 等) から再利用される。

### 3.1 HashValuesEnumerator

起動時刻を列挙し、SHA-1 ハッシュ (= LCG Seed) を計算するイテレータ。

```rust
pub struct HashValuesEnumerator {
    base_message: BaseMessageBuilder,
    datetime_enumerator: DateTimeCodeEnumerator,
    segment: SearchSegment,
    processed_seconds: u64,
}

impl HashValuesEnumerator {
    pub fn new(
        ds: DsConfig,
        time_range: TimeRangeParams,
        search_range: SearchRangeParams,
        segment: SearchSegment,
    ) -> Result<Self, String> {
        // Nazo/Frame 解決
        let nazo = resolve_nazo(ds.version, ds.region);
        let frame = ds.hardware.frame();
        
        // BaseMessageBuilder 構築
        let base_message = BaseMessageBuilder::new(
            nazo,
            ds.mac,
            segment.vcount,
            segment.timer0,
            segment.key_code,
            frame,
        );
        
        // RangedTimeCodeTable 構築
        let time_code_table = build_ranged_time_code_table(&time_range, ds.hardware);
        
        // DateTimeCodeEnumerator 構築
        let datetime_enumerator = DateTimeCodeEnumerator::new(
            time_code_table,
            search_range.start_seconds_since_2000(),
            search_range.range_seconds,
        );
        
        Ok(Self {
            base_message,
            datetime_enumerator,
            segment,
            processed_seconds: 0,
        })
    }
    
    /// 4件ずつ SHA-1 計算 (SIMD)
    pub fn next_quad(&mut self) -> ([HashEntry; 4], u8) {
        let (entries, len) = self.datetime_enumerator.next_quad();
        if len == 0 {
            return (Default::default(), 0);
        }
        
        // date_code/time_code 抽出
        let mut date_codes = [0u32; 4];
        let mut time_codes = [0u32; 4];
        for i in 0..len as usize {
            date_codes[i] = entries[i].date_code;
            time_codes[i] = entries[i].time_code;
        }
        
        // SIMD で 4件同時に SHA-1 計算
        let hashes = calculate_sha1_simd_x4(date_codes, time_codes, &self.base_message);
        
        // HashEntry 構築
        let mut results: [HashEntry; 4] = Default::default();
        for i in 0..len as usize {
            results[i] = HashEntry {
                year: entries[i].year,
                month: entries[i].month,
                day: entries[i].day,
                hour: entries[i].hour,
                minute: entries[i].minute,
                second: entries[i].second,
                date_code: entries[i].date_code,
                time_code: entries[i].time_code,
                hash: hashes[i],
            };
        }
        
        self.processed_seconds += len as u64;
        (results, len)
    }
    
    pub fn is_exhausted(&self) -> bool {
        self.datetime_enumerator.is_exhausted()
    }
    
    pub fn processed_seconds(&self) -> u64 {
        self.processed_seconds
    }
    
    pub fn segment(&self) -> &SearchSegment {
        &self.segment
    }
}
```

### 3.2 HashEntry

SHA-1 計算結果と日時情報。

```rust
#[derive(Clone, Default)]
pub struct HashEntry {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub date_code: u32,
    pub time_code: u32,
    pub hash: Sha1Hash,
}
```

### 3.3 Sha1Hash

```rust
#[derive(Clone, Default)]
pub struct Sha1Hash([u32; 5]);

impl Sha1Hash {
    /// LCG Seed (64-bit) を取得
    pub fn to_lcg_seed(&self) -> u64 {
        // SHA-1 結果から LCG Seed を計算
        // 詳細は sha1-message-format.md 参照
        todo!()
    }
    
    /// MT Seed (32-bit) を取得
    pub fn to_mt_seed(&self) -> u32 {
        (self.to_lcg_seed() >> 32) as u32
    }
}
```

## 4. 関連ドキュメント

本共通基盤を利用するモジュール:

| ドキュメント | 内容 |
|-------------|------|
| [mtseed.md](./mtseed.md) | MT Seed 照合検索 |
| [egg.md](./egg.md) | 孵化起動時刻検索 |

関連ドキュメント:

| ドキュメント | 内容 |
|-------------|------|
| [overview.md](../overview.md) | 概要、設計原則 |
| [types.md](../common/types.md) | DsConfig, Hardware 等の共通型 |
| [sha1-message-format.md](../common/sha1-message-format.md) | SHA-1 メッセージ構造・BCD エンコーディング |
| [api.md](../gpu/api.md) | GPU 最適化 |
