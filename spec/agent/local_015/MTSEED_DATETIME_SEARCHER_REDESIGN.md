# MtseedDatetimeSearcher 再設計 仕様書

## 1. 概要

### 1.1 目的

`MtseedDatetimeSearcher` の設計を見直し、Worker 並列化に最適化された構造と、過去のリファクタリング (local_009 ~ local_014) で整理された型体系との整合性を確保する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `MtseedDatetimeSearcher` | MT Seed から起動時刻を逆算する検索器。単一の `StartupCondition` に対応 |
| `DatetimeSearchContext` | 起動時刻検索の共通設定 (DS設定、時刻範囲、Timer0/VCount範囲、キー入力仕様) |
| `SeedOrigin` | 生成結果のソース情報。`Seed` / `Startup` の2種 |
| `StartupCondition` | 起動条件 (Timer0 / VCount / KeyCode) |
| タスク分割 | `generate_mtseed_search_tasks()` で日時範囲×組み合わせをタスクに分割 |

### 1.3 背景・問題

| 問題 | 詳細 |
|------|------|
| 結果型の重複 | `MtseedDatetimeResult` が `Datetime` + `StartupCondition` + `MtSeed` を独自に持ち、`SeedOrigin` と重複 |
| 組み合わせ展開の配置 | Rust 側で全組み合わせを展開するため、並列化の柔軟性が低い |
| 進捗単位の不整合 | フィールド名は `processed_seconds` だが、実際は組み合わせ × 秒数を計算 |
| `SeedOrigin` に `MtSeed` がない | 検索結果から Generator に渡す際、`MtSeed` を別途保持する必要がある |
| 型の配置 | `TimeRangeParams` / `SearchRangeParams` が `datetime_search/types.rs` にあり、共通型としてアクセスしづらい |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 結果型の統合 | `SeedOrigin::Startup` に `MtSeed` を追加し、検索結果をそのまま Generator に渡せる |
| Searcher の単純化 | 単一 `StartupCondition` のみを処理し、組み合わせ展開は `generate_mtseed_search_tasks()` に分離 |
| 並列化の柔軟性 | 日時範囲×組み合わせ の両軸で任意に分割可能 |
| 進捗単位の明確化 | `processed_count` / `total_count` で処理件数ベースに統一 |
| 型の共通化 | `TimeRangeParams` / `SearchRangeParams` を `types/` に移動 |

### 1.5 着手条件

- local_009 ~ local_014 のリファクタリングが完了していること
- 既存テストが全て通過すること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/generation.rs` | 変更 | `SeedOrigin` に `mt_seed` フィールド追加 |
| `types/config.rs` | 変更 | `DatetimeSearchContext`, `TimeRangeParams`, `SearchRangeParams` 追加 |
| `types/mod.rs` | 変更 | re-export 追加 |
| `datetime_search/types.rs` | 変更 | `TimeRangeParams`, `SearchRangeParams` を `types/` に移動、内部型のみ残す |
| `datetime_search/mtseed.rs` | 変更 | `MtseedDatetimeSearcher` 再設計、`generate_mtseed_search_tasks()` 追加 |
| `datetime_search/base.rs` | 変更 | `HashValuesEnumerator` のインターフェース調整 |
| `lib.rs` | 変更 | re-export 調整 |

## 3. 設計方針

### 3.1 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│  TS 側 (Worker 管理層)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. generate_mtseed_search_tasks() でタスク生成      │   │
│  │ 2. Worker にタスクを分散                            │   │
│  │ 3. 結果を集約                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Worker (Rust/WASM)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MtseedDatetimeSearcher                              │   │
│  │ - 単一の StartupCondition を処理                    │   │
│  │ - next_batch() で段階的に検索                       │   │
│  │ - 進捗報告 (processed_count / total_count)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 型の階層構造

```
┌─────────────────────────────────────────────────────────────┐
│                    共通型 (types/)                          │
│  LcgSeed, MtSeed, Datetime, StartupCondition, SeedOrigin   │
│  DsConfig, Timer0VCountRange, KeySpec, KeyCode             │
│  TimeRangeParams, SearchRangeParams                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            DatetimeSearchContext (types/config.rs)          │
│  - ds: DsConfig                                             │
│  - time_range: TimeRangeParams                              │
│  - ranges: Vec<Timer0VCountRange>                           │
│  - key_spec: KeySpec                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│       MtseedDatetimeSearchParams (datetime_search/)         │
│  - target_seeds: Vec<MtSeed>                                │
│  - ds: DsConfig                                             │
│  - time_range: TimeRangeParams                              │
│  - search_range: SearchRangeParams                          │
│  - condition: StartupCondition  ← 単一                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 SeedOrigin への MtSeed 追加

#### 現状

```rust
pub enum SeedOrigin {
    Seed { base_seed: LcgSeed },
    Startup { base_seed: LcgSeed, datetime: Datetime, condition: StartupCondition },
}
```

#### 変更後

```rust
pub enum SeedOrigin {
    Seed {
        base_seed: LcgSeed,
        mt_seed: MtSeed,
    },
    Startup {
        base_seed: LcgSeed,
        mt_seed: MtSeed,
        datetime: Datetime,
        condition: StartupCondition,
    },
}

impl SeedOrigin {
    /// Seed ソースを作成 (MtSeed は LcgSeed から導出)
    pub fn seed(base_seed: LcgSeed) -> Self {
        Self::Seed {
            base_seed,
            mt_seed: base_seed.derive_mt_seed(),
        }
    }

    /// Startup ソースを作成 (MtSeed は LcgSeed から導出)
    pub fn startup(
        base_seed: LcgSeed,
        datetime: Datetime,
        condition: StartupCondition,
    ) -> Self {
        Self::Startup {
            base_seed,
            mt_seed: base_seed.derive_mt_seed(),
            datetime,
            condition,
        }
    }

    /// BaseSeed を取得
    pub const fn base_seed(&self) -> LcgSeed {
        match self {
            Self::Seed { base_seed, .. } | Self::Startup { base_seed, .. } => *base_seed,
        }
    }

    /// MtSeed を取得
    pub const fn mt_seed(&self) -> MtSeed {
        match self {
            Self::Seed { mt_seed, .. } | Self::Startup { mt_seed, .. } => *mt_seed,
        }
    }
}
```

### 3.4 型の移動: TimeRangeParams / SearchRangeParams

`datetime_search/types.rs` から `types/config.rs` に移動。

```rust
// types/config.rs

/// 1日内の時刻範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
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

    /// 有効な秒数をカウント
    pub fn count_valid_seconds(&self) -> u32 {
        let start = u32::from(self.hour_start) * 3600
            + u32::from(self.minute_start) * 60
            + u32::from(self.second_start);
        let end = u32::from(self.hour_end) * 3600
            + u32::from(self.minute_end) * 60
            + u32::from(self.second_end);
        end - start + 1
    }
}

/// 検索範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
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
```

### 3.5 DatetimeSearchContext

タスク生成用の共通コンテキスト。

```rust
// types/config.rs

/// 起動時刻検索の共通コンテキスト
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeSearchContext {
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// Timer0/VCount 範囲 (複数指定可能)
    pub ranges: Vec<Timer0VCountRange>,
    /// キー入力仕様 (全組み合わせを探索)
    pub key_spec: KeySpec,
}
```

### 3.6 MtseedDatetimeSearchParams の再設計

単一の `StartupCondition` を受け取る設計に変更。

```rust
/// MT Seed 検索パラメータ (単一組み合わせ)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    /// 検索対象の MT Seed リスト
    pub target_seeds: Vec<MtSeed>,
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一)
    pub condition: StartupCondition,
}
```

### 3.7 MtseedDatetimeResult の再設計

`SeedOrigin` をラップする構造体。

```rust
/// 検索結果 (単一ヒット)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeResult {
    /// 生成元情報 (Startup 形式)
    pub origin: SeedOrigin,
}

impl MtseedDatetimeResult {
    /// 新規作成
    pub fn new(lcg_seed: LcgSeed, datetime: Datetime, condition: StartupCondition) -> Self {
        Self {
            origin: SeedOrigin::startup(lcg_seed, datetime, condition),
        }
    }

    /// MtSeed を取得
    pub fn mt_seed(&self) -> MtSeed {
        self.origin.mt_seed()
    }
}
```

### 3.8 MtseedDatetimeSearchBatch の再設計

```rust
/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchBatch {
    /// 見つかった結果
    pub results: Vec<MtseedDatetimeResult>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}
```

### 3.9 タスク生成関数

組み合わせ展開と日時範囲分割を行い、Worker に渡すタスクを生成する。

```rust
/// タスク生成関数
///
/// `DatetimeSearchContext` から組み合わせを展開し、
/// `search_range` を `worker_count` で分割して、
/// 各 Worker に渡すパラメータを生成する。
#[wasm_bindgen]
pub fn generate_mtseed_search_tasks(
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
    search_range: SearchRangeParams,
    worker_count: u32,
) -> Vec<MtseedDatetimeSearchParams> {
    // 1. 組み合わせ展開
    let combinations = expand_combinations(&context);

    // 2. 日時範囲分割
    let range_chunks = split_search_range(&search_range, worker_count);

    // 3. タスク生成 (組み合わせ × 日時範囲)
    let mut tasks = Vec::new();
    for range in &range_chunks {
        for condition in &combinations {
            tasks.push(MtseedDatetimeSearchParams {
                target_seeds: target_seeds.clone(),
                ds: context.ds.clone(),
                time_range: context.time_range.clone(),
                search_range: range.clone(),
                condition: *condition,
            });
        }
    }
    tasks
}

/// 組み合わせ展開 (内部関数)
fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    let key_codes = context.key_spec.combinations();
    let mut combinations = Vec::new();

    for range in &context.ranges {
        for timer0 in range.timer0_min..=range.timer0_max {
            for vcount in range.vcount_min..=range.vcount_max {
                for &key_code in &key_codes {
                    combinations.push(StartupCondition::new(timer0, vcount, key_code));
                }
            }
        }
    }
    combinations
}

/// 日時範囲分割 (内部関数)
fn split_search_range(range: &SearchRangeParams, n: u32) -> Vec<SearchRangeParams> {
    if n <= 1 {
        return vec![range.clone()];
    }

    let total_seconds = range.range_seconds;
    let chunk_seconds = (total_seconds + n - 1) / n; // 切り上げ

    let mut chunks = Vec::new();
    let mut remaining = total_seconds;

    // 開始日時を経過秒数として計算
    let base_seconds = datetime_to_seconds(
        range.start_year,
        range.start_month,
        range.start_day,
        0, 0, 0,
    ) + u64::from(range.start_second_offset);

    for _ in 0..n {
        if remaining == 0 {
            break;
        }

        let chunk_size = remaining.min(chunk_seconds);
        let chunk_start_seconds = base_seconds + u64::from(range.range_seconds - remaining);

        let (year, month, day, hour, minute, second) = seconds_to_datetime(chunk_start_seconds);
        let second_offset = u32::from(hour) * 3600 + u32::from(minute) * 60 + u32::from(second);

        chunks.push(SearchRangeParams {
            start_year: year,
            start_month: month,
            start_day: day,
            start_second_offset: second_offset,
            range_seconds: chunk_size,
        });

        remaining -= chunk_size;
    }

    chunks
}
```

## 4. 実装仕様

### 4.1 MtseedDatetimeSearcher

単一の `StartupCondition` を処理する簡素化された設計。

```rust
/// MT Seed 起動時刻検索器
#[wasm_bindgen]
pub struct MtseedDatetimeSearcher {
    target_seeds: BTreeSet<u32>,
    enumerator: HashValuesEnumerator,
    condition: StartupCondition,
    // 進捗管理
    total_count: u64,
    processed_count: u64,
}

#[wasm_bindgen]
impl MtseedDatetimeSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<MtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let enumerator = HashValuesEnumerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.condition.timer0,
            params.condition.vcount,
            params.condition.key_code,
        )?;

        // 進捗計算: 有効秒数 (time_range 内の秒数 × 日数相当)
        let valid_seconds_per_day = params.time_range.count_valid_seconds();
        let days = (params.search_range.range_seconds + 86399) / 86400;
        let total_count = u64::from(valid_seconds_per_day) * u64::from(days);

        Ok(Self {
            target_seeds: params.target_seeds.into_iter().map(MtSeed::value).collect(),
            enumerator,
            condition: params.condition,
            total_count,
            processed_count: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.enumerator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total_count == 0 {
            return 1.0;
        }
        self.processed_count as f64 / self.total_count as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining = u64::from(chunk_count);

        while remaining > 0 && !self.enumerator.is_exhausted() {
            let (entries, len) = self.enumerator.next_quad();
            if len == 0 {
                break;
            }

            let processed = u64::from(len);
            self.processed_count += processed;
            remaining = remaining.saturating_sub(processed);

            for entry in entries.iter().take(len as usize) {
                if self.target_seeds.contains(&entry.mt_seed) {
                    let datetime = Datetime::new(
                        entry.year,
                        entry.month,
                        entry.day,
                        entry.hour,
                        entry.minute,
                        entry.second,
                    );
                    results.push(MtseedDatetimeResult::new(
                        LcgSeed::new(entry.lcg_seed),
                        datetime,
                        self.condition,
                    ));
                }
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}
```

### 4.2 datetime_search/types.rs

`TimeRangeParams` / `SearchRangeParams` を `types/` に移動後、内部型のみ残す。

```rust
//! 起動時刻検索用内部型定義

/// ハッシュエントリ (日時 + ハッシュ結果) - 内部実装用
#[derive(Clone, Default, Debug)]
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

### 4.3 datetime_search/mod.rs

```rust
//! 起動時刻検索

pub mod base;
pub mod mtseed;
mod types;

pub use mtseed::{
    generate_mtseed_search_tasks,
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher,
};

// 内部使用
pub(crate) use types::HashEntry;
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `SeedOrigin::seed()` | MtSeed が正しく導出されること |
| `SeedOrigin::startup()` | MtSeed が正しく導出されること |
| `TimeRangeParams::count_valid_seconds()` | 有効秒数の計算が正しいこと |
| `expand_combinations()` | 組み合わせ展開が正しいこと |
| `split_search_range()` | 日時範囲分割が正しいこと |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| 既知 Seed の検索 | 期待する日時・条件で発見できること |
| 進捗計算 | `processed_count` / `total_count` が整合すること |
| タスク生成 | `generate_mtseed_search_tasks()` の出力が正しいこと |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test
cargo clippy --all-targets -- -D warnings
```

## 6. 実装チェックリスト

- [ ] `types/generation.rs`
  - [ ] `SeedOrigin` に `mt_seed` フィールド追加
  - [ ] `SeedOrigin::seed()` / `startup()` で MtSeed を導出
  - [ ] `SeedOrigin::mt_seed()` メソッド追加
  - [ ] 既存の `SeedOrigin` 使用箇所の修正
- [ ] `types/config.rs`
  - [ ] `TimeRangeParams` 移動
  - [ ] `SearchRangeParams` 移動
  - [ ] `DatetimeSearchContext` 追加
- [ ] `types/mod.rs`
  - [ ] re-export 追加
- [ ] `datetime_search/types.rs`
  - [ ] `TimeRangeParams`, `SearchRangeParams` 削除
  - [ ] `HashEntry` のみ残す
- [ ] `datetime_search/mtseed.rs`
  - [ ] `MtseedDatetimeSearchParams` 再設計 (単一 condition)
  - [ ] `MtseedDatetimeResult` 再設計 (SeedOrigin ラップ)
  - [ ] `MtseedDatetimeSearchBatch` フィールド名変更
  - [ ] `MtseedDatetimeSearcher` 簡素化
  - [ ] `generate_mtseed_search_tasks()` 追加
  - [ ] `expand_combinations()` 追加
  - [ ] `split_search_range()` 追加
- [ ] `datetime_search/base.rs`
  - [ ] import 調整
- [ ] `datetime_search/mod.rs`
  - [ ] re-export 調整
- [ ] `lib.rs`
  - [ ] re-export 調整
- [ ] テスト
  - [ ] 既存テストの修正
  - [ ] 新規テスト追加
- [ ] `cargo test` パス確認
- [ ] `cargo clippy` パス確認
