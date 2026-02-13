# 実ステータスフィルタ統合 仕様書

## 1. 概要

### 1.1 目的

実ステータス (stats) のフィルタリングを Rust (WASM) 側に統合し、Generator 内で一括適用可能にする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| stats | 種族値 + 個体値 + 性格 + レベルから算出される実数値 (HP/Atk/Def/SpA/SpD/Spe) |
| `CorePokemonData` | ポケモン/卵の共通個体情報を持つ構造体 |
| `CoreDataFilter` | `CorePokemonData` に対応するフィルター構造体 |
| `Stats` | `data::stats` モジュールの計算済みステータス構造体 |
| `BaseStats` | 種族固有の基本ステータス (種族値) |
| resolve | `GeneratedPokemonData` → `UiPokemonData` への表示用データ変換処理 |
| post-filter | WASM 返却後に TS 側で行うフィルタリング |

### 1.3 背景・問題

フィルタリングが 2 層に分散している:

1. **Rust 側 (`PokemonFilter` / `EggFilter`)**: Generator 内で IV/性格/性別/特性/色違いをフィルタ
2. **TS 側 (`filterByStats`)**: resolve 後の `UiPokemonData.stats` (文字列配列) を `Number()` でパースして post-filter

この分散により以下の問題がある:

- フィルタ不一致の個体も全て resolve される (不要な計算コスト)
- フィルタロジックが Rust/TS に分散し、テスト・保守コストが増大
- `UiPokemonData.stats` の文字列→数値パースは型安全性に欠ける
- stats フィルタの有無で Generator の返却件数が変わらないため、大量の不要データが WASM 境界を越える

### 1.4 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| stats フィルタ適用箇所 | TS post-filter (Generator 外) | Rust Generator 内 |
| resolve 対象件数 | フィルタ前の全件 | stats フィルタ通過後の件数のみ |
| フィルタ型の実装箇所 | Rust + TS に分散 | Rust に統合 |
| WASM 境界を越えるデータ量 | フィルタ前の全件 | フィルタ通過後のみ |

### 1.5 着手条件

- なし (既存機能のリファクタリング)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/data/stats.rs` | 変更 | `Stats` に `Tsify`/`Serialize`/`Deserialize` を追加、`Copy` 維持 |
| `wasm-pkg/src/types/generation.rs` | 変更 | `CorePokemonData` に `stats: Stats` フィールド追加 + 全 Data 系構造体のフィールド並び順リファクタ |
| `wasm-pkg/src/types/filter.rs` | 変更 | `StatsFilter` 新設、`CoreDataFilter` に `stats` フィールド追加 |
| `wasm-pkg/src/types/mod.rs` | 変更 | `Stats`/`StatsFilter` の再エクスポート追加 |
| `wasm-pkg/src/generation/flows/types.rs` | 変更 | `from_raw` で stats 算出ロジック追加 |
| `wasm-pkg/src/resolve/pokemon.rs` | 変更 | `calculate_stats` 呼び出しを削除、`CorePokemonData.stats` を使用 |
| `wasm-pkg/src/resolve/egg.rs` | 変更 | 同上 |
| `wasm-pkg/src/lib.rs` | 変更 | `StatsFilter` のエクスポート追加 |
| `wasm-pkg/tests/resolve_integration.rs` | 変更 | `CorePokemonData` 構築時に `stats` フィールド追加 |
| `src/lib/stats-filter.ts` | 削除 | TS 側 post-filter は不要になる |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更 | `filterByStats` 呼び出しを削除、`filteredResults` → `uiResults` に統一 |
| `src/features/pokemon-list/components/pokemon-filter-form.tsx` | 変更 | `StatsFixedValues` → WASM 型 `StatsFilter` に置き換え |
| `src/features/egg-list/components/egg-list-page.tsx` | 変更 | `filterByStats` 呼び出しを削除 |
| `src/components/forms/egg-filter-form.tsx` | 変更 | `StatsFixedValues` → WASM 型 `StatsFilter` に置き換え |
| `src/features/egg-list/types.ts` | 変更 | `statsFilter` の型を更新 |

## 3. 設計方針

### 3.1 `CorePokemonData` への stats 統合

`CorePokemonData` に `stats: Stats` フィールドを追加する。 `Stats` は `data::stats` モジュールの既存構造体を WASM 対応に拡張して使用する。

```rust
// data/stats.rs (変更)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Stats {
    pub hp: Option<u16>,
    pub attack: Option<u16>,
    pub defense: Option<u16>,
    pub special_attack: Option<u16>,
    pub special_defense: Option<u16>,
    pub speed: Option<u16>,
}
```

`Option<u16>` で表現することにより、IV が不明 (`IV_VALUE_UNKNOWN`) の場合の `None` を自然に扱える。

### 3.2 stats 算出タイミング

`GeneratedPokemonData::from_raw` / `GeneratedEggData::from_raw` 内で、`CorePokemonData` 構築と同時に `calculate_stats()` を呼び出す。 `species_id` が 0 (未指定) の場合は `Stats::UNKNOWN` を設定する。

```rust
// generation/flows/types.rs (変更)
impl GeneratedPokemonData {
    pub fn from_raw(
        raw: &RawPokemonData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        source: SeedOrigin,
        moving_encounter: Option<MovingEncounterInfo>,
        special_encounter: Option<SpecialEncounterInfo>,
    ) -> Self {
        let stats = if raw.species_id > 0 {
            let entry = get_species_entry(raw.species_id);
            calculate_stats(entry.base_stats, ivs, raw.nature, raw.level)
        } else {
            Stats::UNKNOWN
        };

        Self {
            advance,
            needle_direction,
            source,
            core: CorePokemonData {
                pid: raw.pid,
                nature: raw.nature,
                ability_slot: raw.ability_slot,
                gender: raw.gender,
                shiny_type: raw.shiny_type,
                ivs,
                species_id: raw.species_id,
                level: raw.level,
                stats,
            },
            // ...
        }
    }
}
```

### 3.3 `StatsFilter` の設計

固定値マッチ (exact match) を基本とする。各フィールドは `Option<u16>` で、`None` は「条件なし」を意味する。

```rust
// types/filter.rs (追加)

/// 実ステータスフィルター
///
/// 各フィールドが `Some(v)` の場合、stats の対応する値が `Some(v)` に一致する場合のみ通過。
/// stats 側が `None` (IV 不明等) の場合、フィルタ条件の有無にかかわらず通過する。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct StatsFilter {
    pub hp: Option<u16>,
    pub atk: Option<u16>,
    pub def: Option<u16>,
    pub spa: Option<u16>,
    pub spd: Option<u16>,
    pub spe: Option<u16>,
}
```

#### マッチングルール

| フィルタ値 | stats 値 | 結果 |
|-----------|---------|------|
| `None` (条件なし) | 任意 | 通過 |
| `Some(v)` | `None` (不明) | **通過** (不明値は条件を満たすとみなす) |
| `Some(v)` | `Some(v)` (一致) | 通過 |
| `Some(v)` | `Some(w)` (不一致) | 不通過 |

```rust
impl StatsFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            hp: None, atk: None, def: None,
            spa: None, spd: None, spe: None,
        }
    }

    /// 指定した Stats が条件に一致するか判定
    pub fn matches(&self, stats: &Stats) -> bool {
        Self::check(self.hp, stats.hp)
            && Self::check(self.atk, stats.attack)
            && Self::check(self.def, stats.defense)
            && Self::check(self.spa, stats.special_attack)
            && Self::check(self.spd, stats.special_defense)
            && Self::check(self.spe, stats.speed)
    }

    /// 単一ステータスのマッチング
    ///
    /// - フィルタ `None`: 無条件通過
    /// - stats `None` (不明): フィルタ値に依らず通過
    /// - 両方 `Some`: 値の一致判定
    #[inline]
    fn check(filter: Option<u16>, actual: Option<u16>) -> bool {
        match (filter, actual) {
            (None, _) => true,           // フィルタ条件なし
            (Some(_), None) => true,     // 実値不明 → 通過
            (Some(f), Some(a)) => f == a, // 両方確定 → 一致判定
        }
    }
}
```

### 3.4 `CoreDataFilter` への統合

`CoreDataFilter` に `stats: Option<StatsFilter>` フィールドを追加する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CoreDataFilter {
    pub iv: Option<IvFilter>,
    pub natures: Option<Vec<Nature>>,
    pub gender: Option<Gender>,
    pub ability_slot: Option<AbilitySlot>,
    pub shiny: Option<ShinyFilter>,
    /// 実ステータスフィルター
    pub stats: Option<StatsFilter>,
}

impl CoreDataFilter {
    pub fn matches(&self, core: &CorePokemonData) -> bool {
        // ... 既存のチェック ...

        // 実ステータスフィルター
        if let Some(ref stats_filter) = self.stats
            && !stats_filter.matches(&core.stats)
        {
            return false;
        }

        true
    }
}
```

`PokemonFilter` / `EggFilter` は `CoreDataFilter` を `#[serde(flatten)]` で含むため、自動的に stats フィルタに対応する。

### 3.5 resolve 側の変更

`resolve_pokemon_data` / `resolve_egg_data` から `calculate_stats()` 呼び出しを削除し、`CorePokemonData.stats` を直接文字列変換する。

```rust
// resolve/pokemon.rs (変更前)
let stats_result = calculate_stats(
    species_entry.base_stats,
    data.core.ivs,
    data.core.nature,
    data.core.level,
);
let stats_arr = stats_result.to_array();
let stats: [String; 6] =
    std::array::from_fn(|i| stats_arr[i].map_or("?".to_string(), |v| v.to_string()));

// resolve/pokemon.rs (変更後)
let stats_arr = data.core.stats.to_array();
let stats: [String; 6] =
    std::array::from_fn(|i| stats_arr[i].map_or("?".to_string(), |v| v.to_string()));
```

### 3.6 TS 側 post-filter の削除

`src/lib/stats-filter.ts` (`filterByStats`) を削除し、以下のファイルから呼び出しを除去する:

- `src/features/pokemon-list/components/pokemon-list-page.tsx`
- `src/features/egg-list/components/egg-list-page.tsx`

フォーム側は `StatsFixedValues` (TS ローカル型) を WASM 生成の `StatsFilter` 型に置き換える。

### 3.7 Data 系構造体のフィールド並び順

意味的グループ順で統一する。基準:

1. **列挙コンテキスト**: `advance`, `needle_direction`
2. **生成元情報**: `source`
3. **個体基本情報 (core)**: `pid` → `nature` → `ability_slot` → `gender` → `shiny_type` → `ivs` → `stats` → `species_id` → `level`
4. **固有付加情報**: 各構造体固有のフィールド

対象構造体と現状の並び順の差分:

#### `CorePokemonData`

```rust
// 変更後
pub struct CorePokemonData {
    // 個体基本
    pub pid: Pid,
    pub nature: Nature,
    pub ability_slot: AbilitySlot,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub ivs: Ivs,
    pub stats: Stats,
    // 種族・レベル
    pub species_id: u16,
    pub level: u8,
}
```

現状の `CorePokemonData` は `pid` → `nature` → `ability_slot` → `gender` → `shiny_type` → `ivs` → `species_id` → `level` の順で、既にほぼ意味的グループ順になっている。 `stats` を `ivs` の後に挿入するのみ。

#### `GeneratedPokemonData`

```rust
// 変更後
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    // 生成元情報
    pub source: SeedOrigin,
    // 共通個体情報
    pub core: CorePokemonData,
    // ポケモン固有
    pub sync_applied: bool,
    pub held_item_slot: HeldItemSlot,
    // エンカウント付加情報
    pub moving_encounter: Option<MovingEncounterInfo>,
    pub special_encounter: Option<SpecialEncounterInfo>,
    pub encounter_result: EncounterResult,
}
```

現状の並び順と一致するため、変更なし。

#### `GeneratedEggData`

```rust
// 変更後
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    // 生成元情報
    pub source: SeedOrigin,
    // 共通個体情報
    pub core: CorePokemonData,
    // 卵固有
    pub inheritance: [InheritanceSlot; 3],
    pub margin_frames: Option<u32>,
}
```

現状の並び順と一致するため、変更なし。

## 4. 実装仕様

### 4.1 `Stats` 型の WASM 対応拡張

`data::stats::Stats` に derive マクロを追加する。 `types::mod.rs` から再エクスポートし、`CorePokemonData` で使用可能にする。

```rust
// data/stats.rs
use serde::{Deserialize, Serialize};
use tsify::Tsify;

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Stats {
    pub hp: Option<u16>,
    pub attack: Option<u16>,
    pub defense: Option<u16>,
    pub special_attack: Option<u16>,
    pub special_defense: Option<u16>,
    pub speed: Option<u16>,
}
```

### 4.2 `CorePokemonData` の `Copy` trait 維持

`Stats` は `Copy` を derive 済みであり、`Stats` の全フィールドが `Option<u16>` (`Copy`) のため、`CorePokemonData` の `Copy` trait は維持される。

### 4.3 `from_raw` ヘルパーへの `base_stats` 参照追加

`from_raw` ヘルパー内で `get_species_entry()` を呼び出して `base_stats` を取得する。 ポケモンの場合、`species_id` は必ず有効値 (> 0) が設定されるため、常に stats が算出される。 卵の場合、`species_id` が 0 (未指定) の可能性があるため、0 の場合は `Stats::UNKNOWN` を設定する。

### 4.4 TS 側の型変更

`StatsFixedValues` (TS ローカル定義) は廃止し、WASM が生成する `StatsFilter` 型を使用する。

```typescript
// 変更前 (TS ローカル定義)
interface StatsFixedValues {
  hp: number | undefined;
  atk: number | undefined;
  def: number | undefined;
  spa: number | undefined;
  spd: number | undefined;
  spe: number | undefined;
}

// 変更後 (WASM 生成型を import)
import type { StatsFilter } from '@/wasm/wasm_pkg';
```

`StatsFixedValues` と `StatsFilter` はフィールド名・型がほぼ一致するため、移行は直接的。ただし `StatsFilter` の値は `number | undefined` ではなく `number | null | undefined` になる可能性があるため (Tsify の `Option<u16>` マッピング)、境界での正規化が必要。

## 5. テスト方針

### 5.1 ユニットテスト (Rust)

| テスト | 検証内容 | ファイル |
|--------|----------|----------|
| `StatsFilter::matches` 基本動作 | 条件なし / 一致 / 不一致 | `wasm-pkg/src/types/filter.rs` |
| `StatsFilter` × Unknown stats | `Some(v)` × `None` → 通過 | 同上 |
| `CoreDataFilter` + stats 統合 | stats フィルタ有無でのマッチング | 同上 |
| `PokemonFilter` + stats | 種族・レベル + stats の組み合わせ | 同上 |
| `EggFilter` + stats | margin_frames + stats の組み合わせ | 同上 |
| `from_raw` での stats 算出 | species_id 有効時に正しい stats が設定される | `wasm-pkg/src/generation/flows/types.rs` |
| `from_raw` での stats Unknown | species_id = 0 時に `Stats::UNKNOWN` | 同上 |

### 5.2 統合テスト (Rust)

| テスト | 検証内容 | ファイル |
|--------|----------|----------|
| `generate_pokemon_list` + stats フィルタ | stats フィルタで件数が絞り込まれる | `wasm-pkg/src/generation/flows/generator/mod.rs` |
| resolve で stats が正しく文字列化 | `CorePokemonData.stats` → `UiPokemonData.stats` | `wasm-pkg/tests/resolve_integration.rs` |

### 5.3 TS 側テスト

| テスト | 検証内容 | ファイル |
|--------|----------|----------|
| `filterByStats` 削除の影響確認 | 既存テストが `filterByStats` を参照していないこと | `src/test/unit/` |
| `StatsFixedValues` → `StatsFilter` 移行確認 | 型エラーがないこと (`tsc -b --noEmit`) | - |

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/data/stats.rs` — `Stats` に `Tsify`/`Serialize`/`Deserialize` derive 追加
- [ ] `wasm-pkg/src/data/mod.rs` — `Stats` の再エクスポート確認
- [ ] `wasm-pkg/src/types/generation.rs` — `CorePokemonData` に `stats: Stats` 追加
- [ ] `wasm-pkg/src/types/filter.rs` — `StatsFilter` 新設 + `CoreDataFilter` に `stats` 追加
- [ ] `wasm-pkg/src/types/filter.rs` — `CoreDataFilter::matches` に stats チェック追加
- [ ] `wasm-pkg/src/types/filter.rs` — `StatsFilter` ユニットテスト追加
- [ ] `wasm-pkg/src/types/mod.rs` — `Stats`/`StatsFilter` 再エクスポート
- [ ] `wasm-pkg/src/generation/flows/types.rs` — `from_raw` で stats 算出
- [ ] `wasm-pkg/src/generation/flows/types.rs` — `from_raw` テスト追加
- [ ] `wasm-pkg/src/resolve/pokemon.rs` — `calculate_stats` 呼び出し削除、`core.stats` 使用
- [ ] `wasm-pkg/src/resolve/egg.rs` — 同上
- [ ] `wasm-pkg/src/lib.rs` — `StatsFilter` エクスポート追加
- [ ] `wasm-pkg/tests/resolve_integration.rs` — `CorePokemonData` に `stats` フィールド追加
- [ ] `cargo test` — 全 Rust テスト通過
- [ ] `cargo clippy --all-targets -- -D warnings` — 警告なし
- [ ] WASM ビルド (`pnpm build:wasm`) — 成功
- [ ] `src/lib/stats-filter.ts` — 削除
- [ ] `src/features/pokemon-list/components/pokemon-list-page.tsx` — `filterByStats` 削除
- [ ] `src/features/egg-list/components/egg-list-page.tsx` — `filterByStats` 削除
- [ ] `src/features/pokemon-list/components/pokemon-filter-form.tsx` — `StatsFilter` 型に移行
- [ ] `src/components/forms/egg-filter-form.tsx` — `StatsFilter` 型に移行
- [ ] `src/features/egg-list/types.ts` — `statsFilter` 型更新
- [ ] `pnpm exec tsc -b --noEmit` — 型チェック通過
- [ ] `pnpm test:run` — 全 TS テスト通過
