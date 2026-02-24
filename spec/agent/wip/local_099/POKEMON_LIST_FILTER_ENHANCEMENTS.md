# ポケモンリスト フィルタ強化 仕様書

## 1. 概要

### 1.1 目的

pokemon-list のフィルタ機能に不足している以下の項目を追加し、ユーザがリスト結果を効率的に絞り込めるようにする。

1. **レベル範囲フィルタ UI** --- WASM 側 (`PokemonFilter.level_range`) は実装済みだが、フロントエンドの入力 UI が未実装
2. **持ち物フィルタ** --- `HeldItemSlot` による持ち物スロット条件 (エンカウント種別に応じた条件付き表示)
3. **エンカウント結果フィルタ** --- `EncounterResult` による結果種別条件 (`DustCloud` / `PokemonShadow` 時のみ表示)

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| `PokemonFilter` | WASM 側フィルタ型。`CoreDataFilter` + `species_ids` + `level_range` |
| `HeldItemSlot` | 持ち物スロット。`"Common"` / `"Rare"` / `"VeryRare"` / `"None"` |
| `EncounterResult` | エンカウント結果。`{ type: "Pokemon" }` / `{ type: "Item", item: ItemContent }` / `{ type: "FishingFailed" }` |
| `ItemContent` | アイテム内容。`"EvolutionStone"` / `"Jewel"` / `"Everstone"` / `"Feather"` |
| 条件付き表示 | 選択中のエンカウントタイプに応じてフィルタ UI の表示/非表示を切り替える動作 |

### 1.3 背景・問題

- `PokemonFilter.level_range` は Rust / WASM 側で判定ロジックが実装済みだが、フロントエンドに入力フォームがないためユーザが利用できない
- 砂煙 (`DustCloud`) や影 (`PokemonShadow`) ではエンカウント結果がアイテムになる場合がある。結果一覧にポケモンとアイテムが混在するため、ポケモンだけ/アイテムだけに絞り込みたい需要がある
- 持ち物が付くエンカウント種別 (`Surfing`, `SurfingBubble`, `Fishing`, `FishingBubble`, `ShakingGrass`) では持ち物で絞り込みたい需要がある
- 上記 2 点はすべてのエンカウントで有効なわけではないため、対象外のエンカウントタイプ選択時には非表示にして UI の複雑化を防ぐ

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| レベル範囲フィルタ | 野生エンカウントでレベルを指定でき、結果の絞り込み精度が向上する |
| 持ち物フィルタ | 特定の持ち物を持つ個体のみ表示でき、道具集め目的のリスト生成が実用的になる |
| エンカウント結果フィルタ | `DustCloud` / `PokemonShadow` でポケモンのみ・アイテムのみを表示できる |

### 1.5 着手条件

- pokemon-list のフィルタフォーム (`pokemon-filter-form.tsx`) が動作していること
- WASM ビルドが成功すること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/filter.rs` | 変更 | `PokemonFilter` に `held_item_slots` / `encounter_result_filter` フィールド追加、`matches` ロジック追加 |
| `src/wasm/wasm_pkg.d.ts` | 変更 | 自動生成。`PokemonFilter` の TS 型に新フィールド反映 |
| `src/features/pokemon-list/components/pokemon-filter-form.tsx` | 変更 | レベル範囲入力 / 持ち物フィルタ / エンカウント結果フィルタの UI 追加 |
| `src/features/pokemon-list/types.ts` | 変更 | `EncounterParamsOutput` の参照、表示条件判定ヘルパー追加 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更 | `encounterType` を `PokemonFilterForm` に props として渡す |
| `src/components/forms/level-range-input.tsx` | 新規 | レベル範囲入力コンポーネント |
| `src/components/forms/held-item-slot-select.tsx` | 新規 | 持ち物スロット選択コンポーネント |
| `src/components/forms/encounter-result-select.tsx` | 新規 | エンカウント結果選択コンポーネント |
| `src/test/components/features/pokemon-filter-form.test.tsx` | 変更 | 新規フィルタ項目のテスト追加 |
| `wasm-pkg/src/types/filter.rs` (テスト部分) | 変更 | 新フィールドの `matches` テスト追加 |

## 3. 設計方針

### 3.1 フィルタ対象の分類

3 つの追加フィルタはすべて `PokemonFilter` (WASM 側) に集約し、生成時点でフィルタリングする。フロントエンド側の post-filter は行わない。

### 3.2 条件付き表示ロジック

フィルタ UI の表示条件はエンカウントタイプに基づく。判定は `pokemon-filter-form.tsx` の props で受け取った `encounterType` を参照して行う。

| フィルタ項目 | 表示条件 |
|-------------|---------|
| レベル範囲 | **常時表示** (全エンカウントタイプで有効) |
| 持ち物スロット | `encounterType` が `Surfing` / `SurfingBubble` / `Fishing` / `FishingBubble` / `ShakingGrass` のいずれか |
| エンカウント結果 | `encounterType` が `DustCloud` / `PokemonShadow` のいずれか |

条件を満たさない場合、対応する UI は非表示にし、フィルタ値を `undefined` として送出する。

### 3.3 WASM 側拡張

`PokemonFilter` に以下を追加する:

```rust
pub struct PokemonFilter {
    #[serde(flatten)]
    pub base: CoreDataFilter,
    pub species_ids: Option<Vec<u16>>,
    pub level_range: Option<(u8, u8)>,
    // --- 追加 ---
    /// 持ち物スロットフィルタ (いずれかに一致)
    pub held_item_slots: Option<Vec<HeldItemSlot>>,
    /// エンカウント結果フィルタ
    pub encounter_result_filter: Option<EncounterResultFilter>,
}
```

`EncounterResultFilter` は新規の enum:

```rust
/// エンカウント結果フィルタ
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterResultFilter {
    /// ポケモンのみ通過
    PokemonOnly,
    /// アイテムのみ通過
    ItemOnly,
}
```

### 3.4 レイヤー構成

```
pokemon-filter-form.tsx (UI)
  ├── LevelRangeInput        (常時表示)
  ├── HeldItemSlotSelect     (条件付き表示)
  └── EncounterResultSelect  (条件付き表示)
          ↓ onChange
      PokemonFilter (TS 型)
          ↓ WASM 呼び出し
      PokemonFilter (Rust 型) → matches() でフィルタ判定
```

## 4. 実装仕様

### 4.1 Rust 側: `EncounterResultFilter`

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterResultFilter {
    PokemonOnly,
    ItemOnly,
}
```

### 4.2 Rust 側: `PokemonFilter.matches` 拡張

```rust
pub fn matches(&self, data: &GeneratedPokemonData) -> bool {
    // ... 既存の base / species_ids / level_range チェック ...

    // 持ち物スロットフィルタ
    if let Some(ref slots) = self.held_item_slots
        && !slots.is_empty()
        && !slots.contains(&data.held_item_slot)
    {
        return false;
    }

    // エンカウント結果フィルタ
    if let Some(ref result_filter) = self.encounter_result_filter {
        match result_filter {
            EncounterResultFilter::PokemonOnly => {
                if !matches!(data.encounter_result, EncounterResult::Pokemon) {
                    return false;
                }
            }
            EncounterResultFilter::ItemOnly => {
                if !matches!(data.encounter_result, EncounterResult::Item { .. }) {
                    return false;
                }
            }
        }
    }

    true
}
```

### 4.3 TS 側: `PokemonFilter` 型 (自動生成後の期待形)

```typescript
export interface PokemonFilter extends CoreDataFilter {
    species_ids: number[] | undefined;
    level_range: [number, number] | undefined;
    held_item_slots: HeldItemSlot[] | undefined;
    encounter_result_filter: EncounterResultFilter | undefined;
}

export type EncounterResultFilter = "PokemonOnly" | "ItemOnly";
```

### 4.4 `LevelRangeInput` コンポーネント

```tsx
interface LevelRangeInputProps {
  value: [number, number] | undefined;
  onChange: (range: [number, number] | undefined) => void;
  disabled?: boolean;
}
```

- min / max の 2 つの数値入力
- 範囲: 1--100
- 両方空の場合 `undefined` を返す
- `blur` 時に clamp

### 4.5 `HeldItemSlotSelect` コンポーネント

```tsx
interface HeldItemSlotSelectProps {
  value: HeldItemSlot[];
  onChange: (slots: HeldItemSlot[]) => void;
  disabled?: boolean;
}
```

- チェックボックス形式 (複数選択)
- 選択肢: `Common` / `Rare` / `VeryRare` / `None`
- ローカライズ対応 (表示名は i18n)

### 4.6 `EncounterResultSelect` コンポーネント

```tsx
interface EncounterResultSelectProps {
  value: EncounterResultFilter | undefined;
  onChange: (filter: EncounterResultFilter | undefined) => void;
  disabled?: boolean;
}
```

- セレクト形式 (単一選択 + 未指定)
- 選択肢: 未指定 / `PokemonOnly` / `ItemOnly`
- ローカライズ対応

### 4.7 `PokemonFilterForm` の変更

`PokemonFilterFormProps` に `encounterType` を追加:

```tsx
interface PokemonFilterFormProps {
  // ... 既存 props ...
  encounterType: EncounterType;
}
```

表示条件の判定ヘルパー:

```typescript
const HELD_ITEM_ENCOUNTER_TYPES: Set<EncounterType> = new Set([
  'Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble', 'ShakingGrass',
]);

const ENCOUNTER_RESULT_ENCOUNTER_TYPES: Set<EncounterType> = new Set([
  'DustCloud', 'PokemonShadow',
]);
```

フォーム内レイアウト (既存フィルタの下に追加):

```
[既存フィルタ: IV/Stats, 性格, 性別, 特性, 色違い, 種族]
---
[レベル範囲]           ← 常時表示
[持ち物スロット]       ← 条件付き表示
[エンカウント結果]     ← 条件付き表示
```

### 4.8 `pokemon-list-page.tsx` の変更

`PokemonFilterForm` に `encounterType` を渡す:

```tsx
<PokemonFilterForm
  value={filter}
  onChange={setFilter}
  statsFilter={statsFilter}
  onStatsFilterChange={setStatsFilter}
  statMode={statMode}
  availableSpecies={encounterParams.availableSpecies}
  encounterType={encounterParams.encounterType}  // 追加
  disabled={isLoading}
/>
```

### 4.9 `mergedFilter` 構築の変更

`pokemon-list-page.tsx` の `mergedFilter` に新フィールドを反映:

```typescript
const mergedFilter = useMemo((): PokemonFilter | undefined => {
  if (!filter && !statsFilter) return;
  return {
    iv: filter?.iv,
    natures: filter?.natures,
    gender: filter?.gender,
    ability_slot: filter?.ability_slot,
    shiny: filter?.shiny,
    species_ids: filter?.species_ids,
    level_range: filter?.level_range,
    held_item_slots: filter?.held_item_slots,               // 追加
    encounter_result_filter: filter?.encounter_result_filter, // 追加
    stats: statsFilter,
  };
}, [filter, statsFilter]);
```

### 4.10 条件付き表示時のフィルタ値クリア

`encounterType` が変更され、条件付きフィルタの表示条件を満たさなくなった場合:

- 非表示になるフィルタのフィールドを `undefined` にリセットする
- 内部状態 (`internalFilter`) は保持し、再び条件を満たした場合に復元する
- ただし `onChange` で親に伝播する値は `undefined` にする

## 5. テスト方針

### 5.1 Rust ユニットテスト (`wasm-pkg/src/types/filter.rs`)

| テスト | 検証内容 |
|--------|----------|
| `test_held_item_slots_filter_matches` | `held_item_slots` 指定時に該当スロットの個体のみ通過する |
| `test_held_item_slots_filter_none_passes_all` | `held_item_slots` が `None` なら全件通過する |
| `test_encounter_result_filter_pokemon_only` | `PokemonOnly` 時に `EncounterResult::Pokemon` のみ通過する |
| `test_encounter_result_filter_item_only` | `ItemOnly` 時に `EncounterResult::Item` のみ通過する |
| `test_encounter_result_filter_none_passes_all` | `encounter_result_filter` が `None` なら全件通過する |
| `test_level_range_existing` | 既存テストの確認 (level_range フィルタの動作) |

### 5.2 フロントエンド コンポーネントテスト

| テスト | 検証内容 |
|--------|----------|
| レベル範囲入力の表示 | フィルタ展開時にレベル範囲入力が表示される |
| レベル範囲の値変更 | min/max 入力で `onChange` が `[min, max]` を返す |
| 持ち物フィルタの条件付き表示 | `encounterType=Surfing` で表示、`encounterType=Normal` で非表示 |
| エンカウント結果フィルタの条件付き表示 | `encounterType=DustCloud` で表示、`encounterType=Normal` で非表示 |
| 条件外切替時のフィルタクリア | `encounterType` 変更で非表示になったフィルタが `undefined` で伝播される |

## 6. 実装チェックリスト

- [ ] Rust: `EncounterResultFilter` enum 追加
- [ ] Rust: `PokemonFilter` に `held_item_slots` / `encounter_result_filter` 追加
- [ ] Rust: `PokemonFilter::matches` に新フィールドの判定ロジック追加
- [ ] Rust: ユニットテスト追加
- [ ] WASM ビルド・型生成確認
- [ ] TS: `LevelRangeInput` コンポーネント作成
- [ ] TS: `HeldItemSlotSelect` コンポーネント作成
- [ ] TS: `EncounterResultSelect` コンポーネント作成
- [ ] TS: `PokemonFilterForm` に `encounterType` props 追加、条件付き表示ロジック実装
- [ ] TS: `PokemonFilterForm` にレベル範囲 / 持ち物 / エンカウント結果フィルタ UI 追加
- [ ] TS: `pokemon-list-page.tsx` から `encounterType` を渡す
- [ ] TS: `mergedFilter` に新フィールド反映
- [ ] TS: コンポーネントテスト追加
- [ ] i18n: フィルタ項目のラベル翻訳追加
- [ ] `cargo clippy` / `pnpm lint` 通過確認
- [ ] `cargo test` / `pnpm test:run` 通過確認
