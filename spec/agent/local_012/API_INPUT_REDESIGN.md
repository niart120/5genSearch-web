# API 入力型の再設計 仕様書

## 1. 概要

### 1.1 目的

WASM API の入力型を整理し、Generator / Searcher の役割に応じた構造を設計する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Searcher | 逆算系 API。条件から Seed や起動時刻を探索 |
| Generator | 順算系 API。Seed から個体や針パターンを生成 |
| GeneratorSource | Generator 用の入力ソース型 (Seed 直接/起動条件) |
| KeyInput | Generator 用。固定のボタン組み合わせ → 単一 KeyCode |
| KeySpec | Searcher 用。利用可能ボタン → 複数 KeyCode の組み合わせ探索 |

### 1.3 背景・問題

| 問題 | 詳細 |
|------|------|
| `SeedSource` が Generator/Searcher で異なる用途 | Generator: 固定条件で生成、Searcher: 範囲探索 |
| `KeyInput` の役割混在 | `to_key_code()` は Generator 用、`combinations()` は Searcher 用 |
| `Datetime` が共通扱い | Generator 専用 (固定時刻)。Searcher は `DateRange`/`TimeRange` を使用 |
| `NeedleSearcher` の分類 | 実態は順算系 (LcgSeed → 針パターン) なので Generator に分類すべき |
| `SearchSegment` と `VCountTimer0Range` の重複 | 固定値/範囲で別の型が存在 |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| API 分類の明確化 | 逆算系 (Searcher) / 順算系 (Generator) の境界が明確に |
| 入力型の役割分離 | Generator 用 / Searcher 用で混同しない |
| 命名の一貫性 | 役割に応じた命名規則の適用 |

### 1.5 着手条件

- local_009, local_010 のリファクタリングが完了していること
- 既存テストが全て通過すること

## 2. API 分類

### 2.1 逆算系 (Searcher)

| API | 入力 | 出力 | 処理 |
|-----|------|------|------|
| `MtseedSearcher` | IvFilter, mt_offset | MtSeed[] | IV条件 → MtSeed (32bit全探索) |
| `MtseedDatetimeSearcher` | MtSeed[], DsConfig, TimeRange, DateRange, Timer0VCountRange[], KeySpec | (Datetime, Timer0, VCount, KeyCode)[] | MtSeed → 起動条件 (時刻全探索) |

### 2.2 順算系 (Generator)

| API | 入力 | 出力 | 処理 |
|-----|------|------|------|
| `NeedleGenerator` (旧 NeedleSearcher) | GeneratorSource, NeedlePattern, AdvanceRange | (advance, GenerationSource)[] | LcgSeed → 針パターン位置 |
| `WildPokemonGenerator` | GeneratorSource, GameStartConfig, OffsetConfig, TrainerInfo, WildEncounterConfig, EncounterSlot[] | GeneratedPokemonData[] | LcgSeed → 野生ポケモン |
| `StaticPokemonGenerator` | GeneratorSource, GameStartConfig, OffsetConfig, TrainerInfo, StaticEncounterConfig | GeneratedPokemonData[] | LcgSeed → 固定ポケモン |
| `EggGenerator` | GeneratorSource, GameStartConfig, OffsetConfig, TrainerInfo, EggConfig, ParentIvs | GeneratedEggData[] | LcgSeed → 卵 |

## 3. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/config.rs` | 修正 | `GeneratorSource`, `KeyInput`, `KeySpec`, `Timer0VCountRange` |
| `types/mod.rs` | 修正 | re-export の更新 |
| `misc/needle_search.rs` | 修正 | `NeedleGenerator` にリネーム、`GeneratorSource` 使用 |
| `datetime_search/mtseed.rs` | 修正 | `KeySpec` 使用 |
| `lib.rs` | 修正 | re-export の更新 |

## 4. 設計方針

### 4.1 入力カテゴリの分類

```
┌─────────────────────────────────────────────────────────────┐
│                        共通入力                              │
│  DsConfig, Timer0VCountRange, DsButton, LcgSeed, MtSeed      │
├─────────────────────────────────────────────────────────────┤
│      Searcher 専用入力       │        Generator 専用入力     │
│  IvFilter, TimeRange         │  GeneratorSource, Datetime    │
│  DateRange, KeySpec          │  KeyInput, GameStartConfig    │
│  NeedlePattern, AdvanceRange │  OffsetConfig, TrainerInfo    │
│                              │  WildEncounterConfig, etc.    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 SeedSource → GeneratorSource

`SeedSource` を `GeneratorSource` にリネームし、Generator 専用とする。

```rust
pub enum GeneratorSource {
    /// 単一の LCG Seed を直接指定
    Seed { initial_seed: LcgSeed },

    /// 複数の LCG Seed を指定
    Seeds { seeds: Vec<LcgSeed> },

    /// 起動条件から Seed を導出
    Startup {
        ds: DsConfig,
        datetime: Datetime,
        ranges: Vec<Timer0VCountRange>,
        key_input: KeyInput,
    },
}
```

### 4.3 KeyInput / KeySpec の分離

#### KeyInput (Generator 用)

```rust
/// キー入力 (Generator 用)
///
/// 固定のボタン組み合わせを指定し、単一の KeyCode を生成。
pub struct KeyInput {
    pub buttons: Vec<DsButton>,
}

impl KeyInput {
    /// KeyCode に変換
    pub fn to_key_code(&self) -> KeyCode {
        let mask = self.buttons.iter().fold(0u32, |acc, b| acc | b.bit_mask());
        KeyCode::from_mask(KeyMask::new(mask))
    }
}
```

#### KeySpec (Searcher 用)

```rust
/// キー入力仕様 (Searcher 用)
///
/// 利用可能なボタンを指定し、全組み合わせを探索。
pub struct KeySpec {
    pub available_buttons: Vec<DsButton>,
}

impl KeySpec {
    /// 全組み合わせの KeyCode を生成
    pub fn combinations(&self) -> Vec<KeyCode> {
        let n = self.available_buttons.len();
        let mut result = Vec::with_capacity(1 << n);
        
        for bits in 0..(1u32 << n) {
            let mask = self.available_buttons
                .iter()
                .enumerate()
                .filter(|(i, _)| bits & (1 << i) != 0)
                .fold(0u32, |acc, (_, b)| acc | b.bit_mask());
            result.push(KeyCode::from_mask(KeyMask::new(mask)));
        }
        result
    }
}
```

### 4.4 DsButton

```rust
/// DS ボタン
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum DsButton {
    A, B, X, Y,
    L, R,
    Start, Select,
    Up, Down, Left, Right,
}

impl DsButton {
    pub const fn bit_mask(self) -> u32 {
        match self {
            Self::A => 0x0001,
            Self::B => 0x0002,
            Self::Select => 0x0004,
            Self::Start => 0x0008,
            Self::Right => 0x0010,
            Self::Left => 0x0020,
            Self::Up => 0x0040,
            Self::Down => 0x0080,
            Self::R => 0x0100,
            Self::L => 0x0200,
            Self::X => 0x0400,
            Self::Y => 0x0800,
        }
    }
}
```

### 4.5 Timer0VCountRange (統合)

```rust
/// Timer0 / VCount 範囲
///
/// 固定値指定は min = max で表現。
/// VCount ごとに異なる Timer0 範囲を持つ場合は、複数の Range を配列で持つ。
pub struct Timer0VCountRange {
    pub timer0_min: u16,
    pub timer0_max: u16,
    pub vcount_min: u8,
    pub vcount_max: u8,
}

impl Timer0VCountRange {
    /// 固定値で作成
    pub const fn fixed(timer0: u16, vcount: u8) -> Self {
        Self {
            timer0_min: timer0,
            timer0_max: timer0,
            vcount_min: vcount,
            vcount_max: vcount,
        }
    }

    /// Timer0 範囲で作成 (VCount 固定)
    pub const fn timer0_range(timer0_min: u16, timer0_max: u16, vcount: u8) -> Self {
        Self {
            timer0_min,
            timer0_max,
            vcount_min: vcount,
            vcount_max: vcount,
        }
    }
}
```

### 4.6 Datetime (Generator 専用)

```rust
/// 起動日時 (Generator 専用)
///
/// 固定の起動時刻を指定。Searcher は DateRange/TimeRange を使用。
pub struct Datetime {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}
```

### 4.7 DateRange / TimeRange (Searcher 専用)

```rust
/// 日付範囲 (Searcher 専用)
pub struct DateRange {
    pub start_year: u16,
    pub start_month: u8,
    pub start_day: u8,
    pub start_second_offset: u32,
    pub range_seconds: u32,
}

/// 時刻範囲 (Searcher 専用)
pub struct TimeRange {
    pub hour_min: u8,
    pub hour_max: u8,
    pub minute_min: u8,
    pub minute_max: u8,
    pub second_min: u8,
    pub second_max: u8,
}
```

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|-----------|------|---------|
| ユニットテスト | `DsButton` | ビットマスク値の正確性 |
| ユニットテスト | `KeyInput` | `to_key_code()` の変換 |
| ユニットテスト | `KeySpec` | `combinations()` の全組み合わせ生成 |
| ユニットテスト | `Timer0VCountRange` | 固定値/範囲の生成 |
| 統合テスト | `NeedleGenerator` | `GeneratorSource` での動作 |
| 統合テスト | `MtseedDatetimeSearcher` | `KeySpec` での組み合わせ探索 |

## 6. 実装チェックリスト

- [ ] `DsButton` enum を追加
- [ ] `KeyInput` 型を追加 (Generator 用)
- [ ] `KeySpec` 型を追加 (Searcher 用)
- [ ] `GeneratorSource` を追加 (`SeedSource` からリネーム)
- [ ] `Timer0VCountRange` を新設計に変更
- [ ] `Datetime` を Generator 専用として明確化
- [ ] `DateRange` / `TimeRange` を Searcher 専用として明確化
- [ ] `NeedleSearcher` → `NeedleGenerator` にリネーム
- [ ] `SearchSegment` を削除
- [ ] 旧 `VCountTimer0Range` を削除
- [ ] 既存テストを更新

## 7. 補足

### 7.1 関連仕様書

- [local_009/TYPES_MODULE_RESTRUCTURE.md](../local_009/TYPES_MODULE_RESTRUCTURE.md): types モジュール分割
- [local_010/API_AND_TYPE_NORMALIZATION.md](../local_010/API_AND_TYPE_NORMALIZATION.md): API 公開戦略・型正規化

### 7.2 破壊的変更

| 旧型 | 新型 | 備考 |
|------|------|------|
| `SeedSource` | `GeneratorSource` | リネーム、Generator 専用 |
| `SeedSource::MultipleSeeds` | `GeneratorSource::Seeds` | 短縮 |
| `SeedSource::StartupRange` | 廃止 | `Startup` に統合 |
| `SearchSegment` | `Timer0VCountRange` + `KeyInput` | 分離 |
| `VCountTimer0Range` | `Timer0VCountRange` | 統合・拡張 |
| `DatetimeParams` | `Datetime` | リネーム、Generator 専用 |
| `TimeRangeParams` | `TimeRange` | リネーム、Searcher 専用 |
| `SearchRangeParams` | `DateRange` | リネーム、Searcher 専用 |
| `NeedleSearcher` | `NeedleGenerator` | 分類変更 |

### 7.3 PlantUML 図

- [seed-dataflow.puml](./seed-dataflow.puml): Seed 導出フローと API の位置づけ
- [api-input-redesign.puml](./api-input-redesign.puml): 入力型の分類
