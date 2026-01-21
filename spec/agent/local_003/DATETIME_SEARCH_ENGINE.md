# 起動時刻検索エンジン 仕様書

## 1. 概要

### 1.1 目的

起動時刻から LCG Seed / MT Seed を計算し、目標シードを生成する起動条件を逆算する機能を実装する。mig_002 仕様書の Phase 3 (検索機能層) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| HashValuesEnumerator | 起動時刻を列挙し SHA-1 ハッシュを計算するイテレータ |
| SearchSegment | Timer0 × VCount × KeyCode の組み合わせ |
| TimeRangeParams | 1日内の検索対象時刻範囲 |
| SearchRangeParams | 検索開始日時と範囲秒数 |
| RangedTimeCodeTable | time_code の前計算テーブル (86,400 要素) |
| VCountTimer0Range | ROM固有の Timer0/VCount 典型範囲 |

### 1.3 背景・問題

- local_001, local_002 で型定義と SHA-1 が実装済み
- 起動時刻検索は datetime_search/ モジュールとして独立実装
- CPU 並列化はセグメント単位で Worker 分割

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 起動条件逆算 | 目標 MT Seed を生成する起動日時を特定 |
| 並列化 | Worker 分割によるマルチコア活用 |
| SIMD 活用 | 4系統同時 SHA-1 計算 |

### 1.5 着手条件

- local_001 (types/, core/bcd, core/lcg, core/mt) が完了
- local_002 (core/sha1/) が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/mod.rs` | 変更 | DsConfig, SearchSegment, VCountTimer0Range 追加 |
| `wasm-pkg/src/lib.rs` | 変更 | datetime_search モジュール追加 |
| `wasm-pkg/src/datetime_search/mod.rs` | 新規 | モジュール宣言 + エクスポート |
| `wasm-pkg/src/datetime_search/types.rs` | 新規 | 検索固有の型定義 (TimeRangeParams, SearchRangeParams, HashEntry) |
| `wasm-pkg/src/datetime_search/base.rs` | 新規 | HashValuesEnumerator, 共通基盤 |
| `wasm-pkg/src/datetime_search/mtseed.rs` | 新規 | MT Seed 起動時刻検索 |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── types/
│   └── mod.rs              # DsConfig, SearchSegment, VCountTimer0Range 追加
├── lib.rs                  # datetime_search モジュール追加
└── datetime_search/
    ├── mod.rs              # モジュール宣言 + re-export
    ├── types.rs            # 検索固有の型定義 (TimeRangeParams 等)
    ├── base.rs             # 共通基盤
    └── mtseed.rs           # MT Seed 検索
```

### 3.2 依存関係

```
types/ (DsConfig, SearchSegment, VCountTimer0Range)
  +
core/sha1/ + core/lcg/
           ↓
datetime_search/types.rs (TimeRangeParams, SearchRangeParams, HashEntry)
           ↓
datetime_search/base.rs (HashValuesEnumerator)
           ↓
datetime_search/mtseed.rs (MtseedDatetimeSearcher)
```

### 3.3 型の配置方針

| 型 | 配置先 | 理由 |
|----|--------|------|
| DsConfig | types/mod.rs | generation, seed-search 等でも使用 |
| SearchSegment | types/mod.rs | generation, seed-search 等でも使用 |
| VCountTimer0Range | types/mod.rs | フロント側でも使用 |
| TimeRangeParams | datetime_search/types.rs | 起動時刻検索固有 |
| SearchRangeParams | datetime_search/types.rs | 起動時刻検索固有 |
| HashEntry | datetime_search/types.rs | 内部実装用 (pub(crate)) |

### 3.4 検索フロー

```
1. MtseedDatetimeSearcher.new(params) でイテレータ初期化
2. Worker ループで next_batch(chunk_seconds) を呼び出し
3. 内部で HashValuesEnumerator が日時を列挙
4. SIMD で 4件同時 SHA-1 計算
5. MT Seed を導出し、target_seeds と照合
6. マッチした結果を返却
```

## 4. 実装仕様

### 4.0 types/mod.rs への追加

参照: [mig_002/common/types.md](../mig_002/common/types.md), [mig_002/datetime-search/base.md](../mig_002/datetime-search/base.md)

```rust
// ===== 共通型 (datetime_search, generation, seed_search 等で使用) =====

/// DS 本体設定
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DsConfig {
    pub mac: [u8; 6],
    pub hardware: Hardware,
    pub version: RomVersion,
    pub region: RomRegion,
}

/// 探索セグメント (Timer0 × VCount × KeyCode)
///
/// key_code フォーマット:
/// - `key_mask XOR 0x2FFF` で計算
/// - key_mask: 押下キーのビットマスク (bit0=A, bit1=B, ... bit11=Y)
/// - キー入力なし時は 0x2FFF
/// - 詳細は mig_002/core/sha1.md 2.5 参照
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchSegment {
    pub timer0: u16,
    pub vcount: u8,
    /// キー入力値: `key_mask XOR 0x2FFF` (入力なし = 0x2FFF)
    pub key_code: u32,
}

/// VCount/Timer0 範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct VCountTimer0Range {
    pub vcount: u8,
    pub timer0_min: u16,
    pub timer0_max: u16,
}
```

### 4.1 datetime_search/types.rs

起動時刻検索固有の型定義。

```rust
//! 起動時刻検索用型定義

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// 1日内の時刻範囲
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

impl TimeRangeParams {
    /// バリデーション
    pub fn validate(&self) -> Result<(), String> {
        if self.hour_end > 23 || self.hour_start > self.hour_end {
            return Err("Invalid hour range".into());
        }
        if self.minute_end > 59 || self.minute_start > self.minute_end {
            return Err("Invalid minute range".into());
        }
        if self.second_end > 59 || self.second_start > self.second_end {
            return Err("Invalid second range".into());
        }
        Ok(())
    }
}

/// 検索範囲
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchRangeParams {
    pub start_year: u16,
    pub start_month: u8,
    pub start_day: u8,
    /// 開始日内のオフセット秒 (0-86399)
    pub start_second_offset: u32,
    /// 検索範囲秒数
    pub range_seconds: u32,
}

/// ハッシュエントリ (日時 + ハッシュ結果) - 内部実装用
#[derive(Clone, Default)]
pub(crate) struct HashEntry {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub date_code: u32,
    pub time_code: u32,
    pub lcg_seed: u64,
    pub mt_seed: u32,
}
```

### 4.2 datetime_search/base.rs

```rust
//! 起動時刻検索 共通基盤

use crate::core::sha1::{
    build_date_code, build_time_code, calculate_pokemon_sha1_simd, get_frame, get_nazo_values,
    BaseMessageBuilder,
};
use crate::types::{DsConfig, Hardware, SearchSegment};

use super::types::{HashEntry, SearchRangeParams, TimeRangeParams};

/// 86,400 秒分の time_code テーブル
type RangedTimeCodeTable = Box<[Option<u32>; 86400]>;

/// time_code テーブルを構築
fn build_ranged_time_code_table(range: &TimeRangeParams, hardware: Hardware) -> RangedTimeCodeTable {
    let mut table: RangedTimeCodeTable = Box::new([None; 86400]);
    let frame = get_frame(hardware);

    for hour in range.hour_start..=range.hour_end {
        let min_start = if hour == range.hour_start {
            range.minute_start
        } else {
            0
        };
        let min_end = if hour == range.hour_end {
            range.minute_end
        } else {
            59
        };

        for minute in min_start..=min_end {
            let sec_start = if hour == range.hour_start && minute == range.minute_start {
                range.second_start
            } else {
                0
            };
            let sec_end = if hour == range.hour_end && minute == range.minute_end {
                range.second_end
            } else {
                59
            };

            for second in sec_start..=sec_end {
                let idx = (hour as usize) * 3600 + (minute as usize) * 60 + (second as usize);
                table[idx] = Some(build_time_code(hour, minute, second, frame));
            }
        }
    }
    table
}

/// 日時コード列挙器
pub struct DateTimeCodeEnumerator {
    time_code_table: RangedTimeCodeTable,
    /// 2000年1月1日からの経過秒数
    current_seconds: u64,
    /// 検索終了秒数
    end_seconds: u64,
}

impl DateTimeCodeEnumerator {
    pub fn new(
        time_code_table: RangedTimeCodeTable,
        start_seconds: u64,
        range_seconds: u32,
    ) -> Self {
        Self {
            time_code_table,
            current_seconds: start_seconds,
            end_seconds: start_seconds + range_seconds as u64,
        }
    }

    /// 次の有効な日時エントリを取得
    pub fn next(&mut self) -> Option<(u16, u8, u8, u8, u8, u8, u32, u32)> {
        while self.current_seconds < self.end_seconds {
            let (year, month, day, hour, minute, second) =
                seconds_to_datetime(self.current_seconds);
            let second_of_day =
                (hour as usize) * 3600 + (minute as usize) * 60 + (second as usize);

            self.current_seconds += 1;

            if let Some(time_code) = self.time_code_table[second_of_day] {
                let date_code = build_date_code(year, month, day);
                return Some((year, month, day, hour, minute, second, date_code, time_code));
            }
        }
        None
    }

    /// 4件まとめて取得
    pub fn next_quad(&mut self) -> ([(u16, u8, u8, u8, u8, u8, u32, u32); 4], u8) {
        let mut entries = [(0u16, 0u8, 0u8, 0u8, 0u8, 0u8, 0u32, 0u32); 4];
        let mut count = 0u8;

        for i in 0..4 {
            if let Some(entry) = self.next() {
                entries[i] = entry;
                count += 1;
            } else {
                break;
            }
        }

        (entries, count)
    }

    pub fn is_exhausted(&self) -> bool {
        self.current_seconds >= self.end_seconds
    }

    pub fn current_seconds(&self) -> u64 {
        self.current_seconds
    }
}

/// 2000年1月1日からの経過秒数を日時に変換
fn seconds_to_datetime(total_seconds: u64) -> (u16, u8, u8, u8, u8, u8) {
    let days = (total_seconds / 86400) as u32;
    let secs = (total_seconds % 86400) as u32;

    let hour = (secs / 3600) as u8;
    let minute = ((secs % 3600) / 60) as u8;
    let second = (secs % 60) as u8;

    let (year, month, day) = days_to_date(days);

    (year, month, day, hour, minute, second)
}

/// 2000年1月1日からの日数を年月日に変換
fn days_to_date(mut days: u32) -> (u16, u8, u8) {
    let mut year = 2000u16;

    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    let leap = is_leap_year(year);
    let month_days: [u32; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1u8;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }

    (year, month, (days + 1) as u8)
}

fn is_leap_year(year: u16) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

/// 年月日をを 2000年1月1日からの経過秒数に変換
pub fn datetime_to_seconds(year: u16, month: u8, day: u8, hour: u8, minute: u8, second: u8) -> u64 {
    let mut days = 0u32;

    for y in 2000..year {
        days += if is_leap_year(y) { 366 } else { 365 };
    }

    let leap = is_leap_year(year);
    let month_days: [u32; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    for m in 0..(month - 1) as usize {
        days += month_days[m];
    }
    days += (day - 1) as u32;

    days as u64 * 86400 + hour as u64 * 3600 + minute as u64 * 60 + second as u64
}

/// ハッシュ値列挙器
pub struct HashValuesEnumerator {
    base_message: [u32; 16],
    datetime_enumerator: DateTimeCodeEnumerator,
    segment: SearchSegment,
    start_seconds: u64,
}

impl HashValuesEnumerator {
    pub fn new(
        ds: &DsConfig,
        time_range: &TimeRangeParams,
        search_range: &SearchRangeParams,
        segment: SearchSegment,
    ) -> Result<Self, String> {
        time_range.validate()?;

        let nazo = get_nazo_values(ds.version, ds.region);
        let frame = get_frame(ds.hardware);

        let builder = BaseMessageBuilder::new(
            &nazo,
            ds.mac,
            segment.vcount,
            segment.timer0,
            segment.key_code,
            frame,
        );

        let time_code_table = build_ranged_time_code_table(time_range, ds.hardware);

        let start_seconds = datetime_to_seconds(
            search_range.start_year,
            search_range.start_month,
            search_range.start_day,
            0,
            0,
            0,
        ) + search_range.start_second_offset as u64;

        let datetime_enumerator =
            DateTimeCodeEnumerator::new(time_code_table, start_seconds, search_range.range_seconds);

        Ok(Self {
            base_message: builder.to_message(),
            datetime_enumerator,
            segment,
            start_seconds,
        })
    }

    /// 4件ずつ SHA-1 計算 (SIMD)
    pub fn next_quad(&mut self) -> ([HashEntry; 4], u8) {
        let (entries, len) = self.datetime_enumerator.next_quad();
        if len == 0 {
            return (Default::default(), 0);
        }

        let mut date_codes = [0u32; 4];
        let mut time_codes = [0u32; 4];
        for i in 0..len as usize {
            date_codes[i] = entries[i].6;
            time_codes[i] = entries[i].7;
        }

        let hashes = calculate_pokemon_sha1_simd(date_codes, time_codes, &self.base_message);

        let mut results: [HashEntry; 4] = Default::default();
        for i in 0..len as usize {
            let lcg_seed = hashes[i].to_lcg_seed().value();
            let mt_seed = hashes[i].to_mt_seed().value();
            results[i] = HashEntry {
                year: entries[i].0,
                month: entries[i].1,
                day: entries[i].2,
                hour: entries[i].3,
                minute: entries[i].4,
                second: entries[i].5,
                date_code: entries[i].6,
                time_code: entries[i].7,
                lcg_seed,
                mt_seed,
            };
        }

        (results, len)
    }

    pub fn is_exhausted(&self) -> bool {
        self.datetime_enumerator.is_exhausted()
    }

    pub fn processed_seconds(&self) -> u64 {
        self.datetime_enumerator
            .current_seconds()
            .saturating_sub(self.start_seconds)
    }

    pub fn segment(&self) -> &SearchSegment {
        &self.segment
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seconds_to_datetime() {
        // 2000/1/1 00:00:00 = 0 seconds
        assert_eq!(seconds_to_datetime(0), (2000, 1, 1, 0, 0, 0));
        // 2000/1/1 00:00:01
        assert_eq!(seconds_to_datetime(1), (2000, 1, 1, 0, 0, 1));
        // 2000/1/2 00:00:00
        assert_eq!(seconds_to_datetime(86400), (2000, 1, 2, 0, 0, 0));
    }

    #[test]
    fn test_datetime_to_seconds_roundtrip() {
        let secs = datetime_to_seconds(2023, 12, 25, 15, 30, 45);
        let (y, m, d, h, mi, s) = seconds_to_datetime(secs);
        assert_eq!((y, m, d, h, mi, s), (2023, 12, 25, 15, 30, 45));
    }

    #[test]
    fn test_leap_year() {
        assert!(is_leap_year(2000));
        assert!(!is_leap_year(2001));
        assert!(is_leap_year(2004));
        assert!(!is_leap_year(2100));
    }
}
```

### 4.3 datetime_search/mtseed.rs

参照: [mig_002/datetime-search/mtseed.md](../mig_002/datetime-search/mtseed.md)

```rust
//! MT Seed 起動時刻検索

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use super::base::HashValuesEnumerator;
use super::types::{DsConfig, SearchRangeParams, SearchSegment, TimeRangeParams};

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    pub target_seeds: Vec<u32>,
    pub ds: DsConfig,
    pub time_range: TimeRangeParams,
    pub search_range: SearchRangeParams,
    pub segment: SearchSegment,
}

/// 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeResult {
    pub seed: u32,
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,
}

/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchBatch {
    pub results: Vec<MtseedDatetimeResult>,
    pub processed_seconds: u64,
    pub total_seconds: u64,
}

/// MT Seed 起動時刻検索器
#[wasm_bindgen]
pub struct MtseedDatetimeSearcher {
    target_seeds: BTreeSet<u32>,
    hash_enumerator: HashValuesEnumerator,
    total_seconds: u64,
    segment: SearchSegment,
}

#[wasm_bindgen]
impl MtseedDatetimeSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<MtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let hash_enumerator = HashValuesEnumerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.segment,
        )?;

        Ok(Self {
            target_seeds: params.target_seeds.into_iter().collect(),
            hash_enumerator,
            total_seconds: params.search_range.range_seconds as u64,
            segment: params.segment,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.hash_enumerator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total_seconds == 0 {
            return 1.0;
        }
        self.hash_enumerator.processed_seconds() as f64 / self.total_seconds as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_seconds: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let start_processed = self.hash_enumerator.processed_seconds();

        while self.hash_enumerator.processed_seconds() - start_processed < chunk_seconds as u64 {
            let (entries, len) = self.hash_enumerator.next_quad();
            if len == 0 {
                break;
            }

            for i in 0..len as usize {
                if self.target_seeds.contains(&entries[i].mt_seed) {
                    results.push(MtseedDatetimeResult {
                        seed: entries[i].mt_seed,
                        year: entries[i].year,
                        month: entries[i].month,
                        day: entries[i].day,
                        hour: entries[i].hour,
                        minute: entries[i].minute,
                        second: entries[i].second,
                        timer0: self.segment.timer0,
                        vcount: self.segment.vcount,
                        key_code: self.segment.key_code,
                    });
                }
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_seconds: self.hash_enumerator.processed_seconds(),
            total_seconds: self.total_seconds,
        }
    }
}
```

### 4.4 datetime_search/mod.rs

```rust
//! 起動時刻検索

pub mod base;
pub mod mtseed;
pub mod types;

pub use mtseed::{
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher,
};
pub use types::{SearchRangeParams, TimeRangeParams};
```

### 4.5 lib.rs の更新

```rust
// 既存のモジュール宣言に追加
pub mod datetime_search;

// re-export (datetime_search 固有の型)
pub use datetime_search::{
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher, SearchRangeParams, TimeRangeParams,
};

// 注: DsConfig, SearchSegment, VCountTimer0Range は types/ で定義済み
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `base.rs` | 日時変換の往復テスト、閏年判定 |
| `base.rs` | DateTimeCodeEnumerator の列挙動作 |
| `mtseed.rs` | 既知の Seed に対する検索結果検証 |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| HashValuesEnumerator | SHA-1 計算結果の妥当性 |
| MtseedDatetimeSearcher | バッチ処理の進捗計算 |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/types/mod.rs` 更新
  - [ ] DsConfig
  - [ ] SearchSegment
  - [ ] VCountTimer0Range
- [ ] `wasm-pkg/src/datetime_search/mod.rs` 作成
- [ ] `wasm-pkg/src/datetime_search/types.rs` 作成
  - [ ] TimeRangeParams
  - [ ] SearchRangeParams
  - [ ] HashEntry (pub(crate))
- [ ] `wasm-pkg/src/datetime_search/base.rs` 作成
  - [ ] RangedTimeCodeTable 構築
  - [ ] DateTimeCodeEnumerator
  - [ ] 日時変換関数
  - [ ] HashValuesEnumerator
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/datetime_search/mtseed.rs` 作成
  - [ ] MtseedDatetimeSearchParams
  - [ ] MtseedDatetimeResult, MtseedDatetimeSearchBatch
  - [ ] MtseedDatetimeSearcher
- [ ] `wasm-pkg/src/lib.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認
