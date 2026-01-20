# 個体生成: 解決層設計

WASM/Worker/Main 間の責務分担と、UI 表示用データの階層設計。

## 1. 責務分担

### 1.1 概要

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WASM (Rust)                                   │
│  - 乱数生成 (LCG/MT19937)                                               │
│  - PID/性格/色違い/特性スロット 計算                                      │
│  - Slot → SpeciesId/Level 解決 (Config ベース)                          │
│  - Gender 判定 (threshold ベース)                                        │
│  - IV 計算 (MT19937)                                                    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ ResolvedPokemonData
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Worker                                        │
│  - WASM インスタンス管理                                                 │
│  - リクエスト/レスポンス中継                                              │
│  - バッチ処理・ストリーミング制御                                         │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ ResolvedPokemonData[]
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Main (TypeScript)                             │
│  - State 管理 (Zustand)                                                 │
│  - i18n: 名称付与 (speciesName, natureName, abilityName)                │
│  - Stats 計算 (baseStats + IV + Level + Nature)                         │
│  - Hex フォーマット                                                      │
│  - UI レンダリング                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 責務詳細

| 処理 | 担当 | 入力 | 出力 |
|-----|------|------|------|
| 乱数生成 | WASM | LCG Seed | PID, 性格値, etc. |
| Encounter 結果判定 | WASM | `slot_value`, `EncounterType` | `EncounterResult` |
| Slot → Species/Level | WASM | `EncounterSlotConfig[]` | `species_id`, `level` |
| Gender 判定 | WASM | `gender_value`, `gender_threshold` | `Gender` |
| 持ち物スロット判定 | WASM | `rand_value`, `EncounterType`, `has_compound_eyes` | `HeldItemSlot` |
| IV 計算 | WASM | LCG Seed, Version, EncounterType | `IvSet` |
| 持ち物 → アイテム名 | Main (TS) | `HeldItemSlot`, `species_id`, `locale` | 表示用文字列 |
| Stats 計算 | Main (TS) | `baseStats`, `IvSet`, `level`, `nature` | `CalculatedStats` |
| i18n (名称) | Main (TS) | `species_id`, `nature`, `ability_slot`, `locale` | 表示用文字列 |
| Hex フォーマット | Main (TS) | `seed`, `pid` | `seedHex`, `pidHex` |

**注意**: DustCloud/PokemonShadow では `EncounterResult::Item` が返る可能性がある。  
その場合、Pokemon 生成は行われず `species_id` 等は無効値となる。  
詳細は [algorithm/encounter.md](algorithm/encounter.md) §5 を参照。

**持ち物について**: `HeldItemSlot` は確率カテゴリ (Common/Rare/VeryRare/None) のみ。
実際のアイテムは種族データ (JSON) から TS 側で解決する。
詳細は [algorithm/encounter.md](algorithm/encounter.md) §9 を参照。

### 1.3 設計意図

1. **WASM で計算を完結させる**
   - 乱数計算 + ID 解決 + IV 計算を WASM 内で行う
   - Worker からは「解決済みデータ」が返る
   - Main スレッドの負荷を最小化

2. **i18n/Stats は TS に残す**
   - 種族データ (JSON) は TS 側で管理
   - ロケール切替は UI 層の関心事
   - Stats 計算は軽量 (単純な四則演算)

3. **エンカウントテーブルは TS → WASM に渡す**
   - 静的データは TS 側で管理
   - リクエスト時に必要な分だけ `EncounterSlotConfig[]` として渡す
   - WASM バイナリの肥大化を防ぐ

## 2. エンカウント解決設定

### 2.1 EncounterSlotConfig

WASM に渡すエンカウントスロット設定。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EncounterSlotConfig {
    /// 種族ID
    pub species_id: u16,
    /// レベル下限
    pub level_min: u8,
    /// レベル上限
    pub level_max: u8,
    /// 性別判定閾値 (0: 固定♂, 254: 固定♀, 255: 性別不明)
    pub gender_threshold: u8,
    /// 持ち物判定有無
    pub has_held_item: bool,
}
```

```typescript
export type EncounterSlotConfig = {
  species_id: number;
  level_min: number;
  level_max: number;
  gender_threshold: number;
  has_held_item: boolean;
};
```

### 2.2 EncounterResolutionConfig

エンカウント解決設定 (PokemonGenerationConfig に含める)。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EncounterResolutionConfig {
    /// エンカウントスロット設定 (最大12スロット)
    pub slots: Vec<EncounterSlotConfig>,
}
```

**使用例 (TS 側)**:

```typescript
// エンカウントテーブルから EncounterResolutionConfig を構築
function buildResolutionConfig(
  encounterTable: EncounterTable,
  speciesData: Map<number, GeneratedSpecies>
): EncounterResolutionConfig {
  return {
    slots: encounterTable.slots.map(s => {
      const species = speciesData.get(s.speciesId);
      return {
        species_id: s.speciesId,
        level_min: s.levelRange.min,
        level_max: s.levelRange.max,
        gender_threshold: species?.gender.femaleThreshold ?? 127,
        has_held_item: hasHeldItem(species),
      };
    }),
  };
}

function hasHeldItem(species: GeneratedSpecies | undefined): boolean {
  if (!species?.heldItems) return false;
  return (
    species.heldItems.common != null ||
    species.heldItems.rare != null ||
    species.heldItems.veryRare != null
  );
}
```

## 3. 解決済みデータ型

### 3.1 ResolvedPokemonData

WASM から返される解決済み Pokemon データ。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct ResolvedPokemonData {
    // === 基本情報 ===
    /// 生成時の LCG Seed
    pub seed: u64,
    /// PID
    pub pid: u32,
    
    // === 解決済み情報 ===
    /// 種族ID (EncounterSlotConfig から解決)
    pub species_id: u16,
    /// レベル (slot の level_min/max と乱数から解決)
    pub level: u8,
    /// 性格 (0-24)
    pub nature: u8,
    /// シンクロ適用
    pub sync_applied: bool,
    /// 特性スロット (0-1)
    pub ability_slot: u8,
    /// 性別 (gender_threshold から解決)
    pub gender: Gender,
    /// 色違い種別
    pub shiny_type: ShinyType,
    /// 持ち物スロット (確率カテゴリ)
    pub held_item_slot: HeldItemSlot,
    
    // === IV ===
    /// 個体値 [HP, Atk, Def, SpA, SpD, Spe]
    pub ivs: IvSet,
}
```

```typescript
export type ResolvedPokemonData = {
  seed: bigint;
  pid: number;
  species_id: number;
  level: number;
  nature: number;
  sync_applied: boolean;
  ability_slot: number;
  gender: Gender;
  shiny_type: ShinyType;
  held_item_slot: HeldItemSlot;
  ivs: IvSet;
};
```

### 3.2 EnumeratedPokemonData

Advance 情報 + ソース情報付き解決済みデータ。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EnumeratedPokemonData {
    /// 消費数
    pub advance: u64,
    /// レポート針方向 (0-7)
    pub needle_direction: u8,
    /// 解決済み個体データ
    pub data: ResolvedPokemonData,
    /// 生成ソース情報
    pub source: GenerationSource,
}
```

`GenerationSource` の詳細は [data-structures.md](./data-structures.md#24-generationsource) を参照。

## 4. UI 表示用データ

### 4.1 設計方針

- **シンプルな単一型**: 表示モード切替などの複雑な仕組みは導入しない
- **必要十分な情報**: ユーザーが判断に使う情報のみを含める
- **内部値は含めない**: デバッグ用情報は別途開発者ツールで確認する想定

### 4.2 UiPokemonData

UI 表示用 Pokemon データ。

```typescript
export type UiPokemonData = {
  // === 識別・位置 ===
  advance: number;
  needleDirection: number;       // 0-7
  
  // === 生成ソース ===
  source: GenerationSource;      // Fixed / Multiple / Datetime
  
  // === 種族・レベル ===
  speciesId: number;
  speciesName: string;           // i18n
  level: number;
  
  // === 性格・特性・性別 ===
  nature: number;                // 0-24
  natureName: string;            // i18n
  abilitySlot: 0 | 1 | 2;
  abilityName: string;           // i18n
  gender: 'M' | 'F' | 'N';
  
  // === 色違い ===
  shinyType: 0 | 1 | 2;          // 0=通常, 1=◇, 2=☆
  
  // === 個体値・ステータス ===
  ivs: IvSet;                    // [HP, Atk, Def, SpA, SpD, Spe]
  stats: CalculatedStats;        // 実数値
};
```

**UI 表示時のパース**:

`source` フィールドの UI 表示方法 (グループ化・フィルタリング等) は実装時に別途検討する。

```typescript
// 例: source に応じたラベル取得 (実装時に詳細設計)
function getSourceLabel(source: GenerationSource): string {
  switch (source.type) {
    case 'Fixed': return '';
    case 'Multiple': return `Seed #${source.seed_index + 1}`;
    case 'Datetime': return `${source.datetime.hour}:${source.datetime.minute}:${source.datetime.second} T0:${source.timer0}`;
  }
}
```

### 4.3 現行 UiReadyPokemonData との比較

| フィールド | 新設計 | 現行 | 判断理由 |
|-----------|-------|------|---------|
| `advance` | ○ | ○ | 消費数は必須 |
| `needleDirection` | ○ | ○ | レポート針確認用 |
| `speciesId` | ○ | ○ | フィルタ/ソート用 |
| `speciesName` | ○ | ○ | 表示用 |
| `level` | ○ | ○ | 表示用 |
| `nature` / `natureName` | ○ | ○ | 表示用 |
| `abilitySlot` / `abilityName` | ○ | ○ | 表示用 |
| `gender` | ○ | ○ | 表示用 |
| `shinyType` | ○ | ○ | 表示・フィルタ用 |
| `ivs` | ○ | ○ | 個体値表示 |
| `stats` | ○ | ○ | 実数値表示 |
| `source` | ○ | — | 新規。Fixed/Multiple/Datetime を統一的に保持 |
| `seed` / `seedHex` | **×** | ○ | 内部値。必要時のみ参照 |
| `pid` / `pidHex` | **×** | ○ | 内部値。必要時のみ参照 |
| `syncApplied` | **×** | ○ | 内部情報 |
| `genderCode` / `genderLabel` | **×** | ○ | `gender` で十分 |
| `shinyStatus` | **×** | ○ | `shinyType` で十分 |
| `encounterType` | **×** | ○ | リクエスト時に既知 |
| `seedSourceMode` | **×** | ○ | `source.type` で代替 |
| `timer0` / `vcount` | **×** | ○ | `source` (Datetime) に含まれる |
| `bootTimestampIso` | **×** | ○ | `source.seed` から逆算可能 |
| `keyInputDisplay` / `keyInputNames` | **×** | ○ | `source.key_code` から導出可能 |

### 4.4 除外フィールドへのアクセス

除外したフィールドが必要な場合:

1. **Seed/PID**: `ResolvedPokemonData` を保持しておき、必要時に参照
2. **Boot-Timing 情報**: `source` フィールド (Datetime) から取得

```typescript
// State 管理例
interface GenerationState {
  // UI 表示用 (軽量)
  displayData: UiPokemonData[];
  
  // 元データ (必要時参照用)
  rawData: EnumeratedPokemonData[];
}
```

### 4.5 変換関数

```typescript
function toUiPokemonData(
  data: EnumeratedPokemonData,
  species: GeneratedSpecies,
  locale: SupportedLocale
): UiPokemonData {
  return {
    advance: Number(data.advance),
    needleDirection: data.needle_direction,
    source: data.source,
    speciesId: data.data.species_id,
    speciesName: species.names[locale],
    level: data.data.level,
    nature: data.data.nature,
    natureName: NATURE_NAMES[locale][data.data.nature],
    abilitySlot: data.data.ability_slot,
    abilityName: getAbilityName(species, data.data.ability_slot, locale),
    gender: data.data.gender,
    shinyType: data.data.shiny_type,
    ivs: data.data.ivs,
    stats: calculatePokemonStats({
      species,
      ivs: data.data.ivs,
      level: data.data.level,
      natureId: data.data.nature,
    }),
  };
}
```

## 5. Boot-Timing 拡張

`GenerationSource::Datetime` に必要な情報 (seed, timer0, vcount, key_code) は含まれている。

追加のメタデータが必要な場合 (例: 起動日時) は実装時に検討する。

```typescript
// 起動日時の計算は seed から逆算可能
// 必要に応じて UI 側で導出
function getBootTimestamp(source: GenerationSource): Date | null {
  if (source.type !== 'Datetime') return null;
  // seed から起動日時を逆算 (実装時に詳細設計)
  return calculateBootTimestampFromSeed(source.seed, source.timer0, source.vcount);
}
```

## 関連ドキュメント

- [data-structures.md](./data-structures.md) - 基本型定義
- [common/types.md](../common/types.md) - 共通型
