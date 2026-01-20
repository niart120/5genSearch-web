# 個体生成: 型定義

Pokemon/Egg 生成で使用する入出力型定義。

## 1. 共通型 (参照)

以下の共通型は [common/types.md](../common/types.md) で定義済み。本モジュールはこれらを参照する。

| 型 | 用途 |
|----|------|
| `GameMode` | ゲーム起動条件。Game Offset 計算に使用 |
| `EncounterType` | エンカウント種別。乱数消費パターンを決定 |
| `Nature` | 性格 (0-24) |
| `Gender` | 性別 |
| `GenderRatio` | 性別比 |
| `AbilitySlot` | 特性スロット |
| `ShinyType` | 色違い種別 |
| `IvSet` | 個体値セット [HP, Atk, Def, SpA, SpD, Spe] |
| `NeedleDirection` | レポート針方向 (0-7) |
| `RomVersion` | ゲームバージョン |
| `DsConfig` | DS 本体設定 |

```rust
// common/types.rs からの re-export
pub use crate::common::types::{
    GameMode, EncounterType, Nature, Gender, GenderRatio,
    AbilitySlot, ShinyType, IvSet, NeedleDirection, RomVersion, DsConfig,
};
```

## 2. Pokemon 生成

### 2.1 LeadAbilityEffect

先頭ポケモンの特性効果。先頭ポケモンは1特性のみなので、各バリアントは排他的。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum LeadAbilityEffect {
    /// 特性効果なし
    None,
    /// シンクロ: 50% で性格一致
    Synchronize(Nature),
    /// ふくがん: 持ち物確率上昇
    CompoundEyes,
    // 今後の拡張例:
    // CuteCharm(Gender),  // メロメロボディ: 異性出現率上昇
}
```

```typescript
export type LeadAbilityEffect =
  | { type: 'None' }
  | { type: 'Synchronize'; nature: Nature }
  | { type: 'CompoundEyes' };
```

### 2.2 PokemonGenerationConfig

Pokemon 生成設定。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonGenerationConfig {
    /// ゲームバージョン
    pub version: RomVersion,
    /// エンカウント種別
    pub encounter_type: EncounterType,
    /// トレーナーID
    pub tid: u16,
    /// 裏ID
    pub sid: u16,
    /// 色違いロック
    pub shiny_locked: bool,
    /// ひかるおまもり所持
    pub shiny_charm: bool,
    /// 先頭ポケモンの特性効果
    pub lead_ability: LeadAbilityEffect,
    /// エンカウント解決設定 (スロット→種族ID/レベル解決用)
    pub encounter_resolution: EncounterResolutionConfig,
}
```

### 2.3 EncounterResolutionConfig

エンカウント解決設定。TS 側で構築し、WASM に渡す。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EncounterResolutionConfig {
    /// エンカウントスロット設定 (最大12スロット)
    pub slots: Vec<EncounterSlotConfig>,
}

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
    /// 持ち物判定有無 (50%/5%/1% いずれかの持ち物を持つ可能性がある場合 true)
    pub has_held_item: bool,
}
```

```typescript
export type EncounterResolutionConfig = {
  slots: EncounterSlotConfig[];
};

export type EncounterSlotConfig = {
  species_id: number;
  level_min: number;
  level_max: number;
  gender_threshold: number;
  has_held_item: boolean;
};
```

**設計意図**:
- エンカウントテーブルは TS 側で JSON として管理
- リクエスト時に必要な分だけ `EncounterResolutionConfig` として渡す
- `gender_threshold` / `has_held_item` は種族データから導出
- WASM バイナリの肥大化を防ぐ

**スロット設定の導出ロジック (TS 側)**:

```typescript
function buildSlotConfig(
  slot: EncounterSlot,
  species: GeneratedSpecies
): EncounterSlotConfig {
  return {
    species_id: slot.speciesId,
    level_min: slot.levelRange.min,
    level_max: slot.levelRange.max,
    gender_threshold: species.gender.femaleThreshold,
    has_held_item: hasHeldItem(species),
  };
}

function hasHeldItem(species: GeneratedSpecies): boolean {
  // 50%, 5%, 1% いずれかの持ち物が設定されていれば true
  return (
    species.heldItems?.common != null ||
    species.heldItems?.rare != null ||
    species.heldItems?.veryRare != null
  );
}
```

### 2.4 EncounterResult

エンカウント処理の結果種別。砂煙・橋の影では Pokemon 以外の結果もありうる。

```rust
/// エンカウント結果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterResult {
    /// ポケモン生成に進む
    Pokemon,
    /// アイテム取得 (砂煙・橋の影)
    Item(ItemContent),
    /// 失敗 (釣り失敗等)
    Failed,
}

/// アイテム内容
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ItemContent {
    /// 進化の石 (DustCloud)
    EvolutionStone,
    /// ジュエル (DustCloud)
    Jewel,
    /// かわらずの石 (DustCloud)
    Everstone,
    /// 羽根 (PokemonShadow)
    Feather,
}
```

```typescript
export type EncounterResult =
  | { type: 'Pokemon' }
  | { type: 'Item'; content: ItemContent }
  | { type: 'Failed' };

export type ItemContent =
  | 'EvolutionStone'
  | 'Jewel'
  | 'Everstone'
  | 'Feather';
```

**エンカウント種別ごとの結果パターン**:

| EncounterType | 結果パターン |
|--------------|-------------|
| Normal/ShakingGrass | 常に Pokemon |
| Surfing/SurfingBubble | 常に Pokemon |
| Fishing/FishingBubble | Pokemon or Failed |
| DustCloud | Pokemon (70%) or Item (30%) |
| PokemonShadow | Pokemon (30%) or Item (70%) |
| Static* | 常に Pokemon |

詳細なアルゴリズムは [algorithm/encounter.md](algorithm/encounter.md) §5 を参照。

### 2.5 EncounterMethod

エンカウント発生方法。歩行時はエンカウント判定が入る。

```rust
/// エンカウント発生方法
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterMethod {
    /// あまいかおり使用 (確定エンカウント、判定スキップ)
    SweetScent,
    /// 歩行移動 (エンカウント判定あり)
    Walking,
}
```

```typescript
export type EncounterMethod = 'SweetScent' | 'Walking';
```

### 2.6 WalkingEncounterLikelihood

歩行エンカウント判定結果。BW2 では歩数に応じた段階的な確率となる。

```rust
/// 歩行エンカウント判定結果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum WalkingEncounterLikelihood {
    /// 歩数にかかわらず確定エンカウント (最低閾値も通過)
    Guaranteed,
    /// エンカウントの可能性あり (最高閾値のみ通過、BW2のみ)
    Possible,
    /// エンカウント無し (最高閾値も不通過)
    NoEncounter,
}
```

```typescript
export type WalkingEncounterLikelihood = 'Guaranteed' | 'Possible' | 'NoEncounter';
```

| 結果 | BW | BW2 | 意味 |
|-----|-----|-----|------|
| Guaranteed | ○ | ○ | 歩数にかかわらず確定 |
| Possible | - | ○ | 歩数次第でエンカウント |
| NoEncounter | ○ | ○ | エンカウント無し |

詳細なアルゴリズムは [algorithm/encounter.md](algorithm/encounter.md) §8 を参照。

### 2.7 HeldItemSlot

持ち物判定結果。実際のアイテムは TS 側で種族データから解決する。

```rust
/// 持ち物スロット (確率カテゴリ)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum HeldItemSlot {
    /// 50% アイテム (タマゲタケのちいさなきのこ等)
    Common,
    /// 5% アイテム (タマゲタケのおおきなきのこ等)
    Rare,
    /// 1% アイテム (濃い草むら・泡のみ、タマゲタケのかおるきのこ等)
    VeryRare,
    /// 持ち物なし
    None,
}
```

```typescript
export type HeldItemSlot = 'Common' | 'Rare' | 'VeryRare' | 'None';
```

| スロット | 確率 (通常) | 確率 (ふくがん) | 備考 |
|---------|-----------|---------------|------|
| Common | 50% | 60% | - |
| Rare | 5% | 20% | - |
| VeryRare | 1% | 5% | 濃い草むら・泡のみ |
| None | 44%/45% | 15%/20% | - |

詳細なアルゴリズムは [algorithm/encounter.md](algorithm/encounter.md) §9 を参照。

### 2.8 ResolvedPokemonData

解決済み Pokemon 個体データ。WASM 内で species_id/level/gender/ivs まで解決済み。

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
    /// 特性スロット (0-1、野生では夢特性なし)
    pub ability_slot: u8,
    /// 性別 (gender_threshold から解決済み)
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

**実装指針**:
- `species_id`: `encounter_slot_value` と `EncounterResolutionConfig.slots` から解決
- `level`: slot の `level_min`/`level_max` と `level_rand_value` から計算
- `gender`: `gender_value` と `gender_threshold` を比較して決定
- `held_item_slot`: エンカウント種別とふくがん有無で判定 (§9 参照)
- `ivs`: LCG Seed → MT Seed → MT19937 で計算 (version/encounter_type に応じた offset 適用)

### 2.9 GenerationSource

生成結果のソース情報。各エントリがどの条件から生成されたかを示す。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GenerationSource {
    /// 固定 Seed から生成
    Fixed,
    /// 複数 Seed 指定から生成
    Multiple {
        /// 入力 seeds 配列のインデックス
        seed_index: u32,
    },
    /// 日時検索から生成
    Datetime {
        /// 起動日時 (SeedSource::FromDatetime.datetime と同値)
        datetime: DatetimeParams,
        /// Timer0 値
        timer0: u16,
        /// VCount 値
        vcount: u8,
        /// キー入力コード
        key_code: u32,
    },
}
```

**補足**: `seed` は `ResolvedPokemonData.seed` で既に保持しているため、`GenerationSource::Datetime` には含めない。

```typescript
export type GenerationSource =
  | { type: 'Fixed' }
  | { type: 'Multiple'; seed_index: number }
  | { type: 'Datetime'; datetime: DatetimeParams; timer0: number; vcount: number; key_code: number };
```

### 2.10 EnumeratedPokemonData

Advance 情報付き Pokemon データ。

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

**needle_direction の計算タイミング**:
- 入力: 当該 advance 到達時点の LCG Seed
- 計算: `NeedleDirection::from_seed(seed)` ([common/types.md](../common/types.md#212-needledirection) 参照)

## 3. Egg 生成

### 3.1 EggGenerationConfig

Egg 生成設定。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggGenerationConfig {
    /// トレーナーID
    pub tid: u16,
    /// 裏ID
    pub sid: u16,
    /// 性別比
    pub gender_ratio: GenderRatio,
    /// かわらずのいし効果
    pub everstone: EverstoneEffect,
    /// ニドラン♀フラグ
    pub nidoran_flag: bool,
    /// メタモン使用
    pub uses_ditto: bool,
    /// ♀親が夢特性か
    pub female_has_hidden: bool,
    /// PID 再抽選回数 (国際孵化: 5 or 6, 通常: 0)
    pub pid_reroll_count: u8,
}
```

### 3.2 EverstoneEffect

かわらずのいし効果。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EverstoneEffect {
    None,
    Fixed(Nature),
}
```

### 3.3 ParentsIvs

親個体値。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct ParentsIvs {
    pub male: IvSet,
    pub female: IvSet,
}
```

### 3.4 RawEggData

生成された Egg 個体 (未解決データ)。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct RawEggData {
    /// LCG Seed
    pub lcg_seed: u64,
    /// MT Seed (IV 生成用)
    pub mt_seed: u32,
    /// 個体値 (遺伝適用後)
    pub ivs: IvSet,
    /// 性格
    pub nature: Nature,
    /// 性別
    pub gender: Gender,
    /// 特性スロット
    pub ability: AbilitySlot,
    /// 色違い種別
    pub shiny: ShinyType,
    /// PID
    pub pid: u32,
    /// 遺伝情報
    pub inheritance: InheritanceSlots,
}
```

### 3.5 EnumeratedEggData

Advance 情報付き Egg データ。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EnumeratedEggData {
    /// 消費数
    pub advance: u64,
    /// レポート針方向 (0-7)
    pub needle_direction: u8,
    /// 個体データ
    pub data: RawEggData,
}
```

**needle_direction の計算タイミング**:
- 入力: 当該 advance 到達時点の LCG Seed (`data.lcg_seed` と同一)
- 計算: `NeedleDirection::from_seed(lcg_seed)` ([common/types.md](../common/types.md#212-needledirection) 参照)

### 3.6 InheritanceSlots

遺伝スロット情報。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct InheritanceSlot {
    /// 遺伝先ステータス (0-5: HP/Atk/Def/SpA/SpD/Spe)
    pub stat: u8,
    /// 遺伝元親
    pub parent: ParentRole,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ParentRole {
    Male,
    Female,
}

/// 遺伝スロット (3箇所)
pub type InheritanceSlots = [InheritanceSlot; 3];
```

## 4. 共通リクエスト型

### 4.1 SeedSource

LCG Seed の導出元。複数のユースケースに対応。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SeedSource {
    /// 固定 Seed を直接指定
    Fixed(u64),
    
    /// 複数候補 Seed を直接指定 (datetime-search 結果の流用等)
    Multiple(Vec<u64>),
    
    /// 起動条件からWASM内でSHA-1計算して候補群を生成
    FromDatetime {
        /// DS 設定
        ds_config: DsConfig,
        /// 起動日時
        datetime: DatetimeParams,
        /// Timer0/VCount/KeyCode の組み合わせ
        segments: Vec<SearchSegment>,
    },
}
```

```typescript
export type SeedSource =
  | { type: "Fixed"; value: bigint }
  | { type: "Multiple"; values: bigint[] }
  | { type: "FromDatetime"; ds_config: DsConfig; datetime: DatetimeParams; segments: SearchSegment[] };
```

**設計意図**:

| パターン | ユースケース | SHA-1 計算 | 個体生成 |
|---------|------------|-----------|----------|
| `Fixed` | UIでSeed直接指定 | - | WASM |
| `Multiple` | datetime-search結果を流用 | TSで事前計算済み | WASM |
| `FromDatetime` | 起動条件指定で一括生成 | WASM | WASM |

**参照型**:
- `DsConfig`: [common/types.md](../common/types.md#31-dsconfig)
- `DatetimeParams`, `SearchSegment`: [datetime-search/base.md](../datetime-search/base.md)

### 4.2 DatetimeParams

起動日時パラメータ。`SeedSource::FromDatetime` で使用。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeParams {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}
```

### 4.3 GenerationRequest

生成リクエスト (Pokemon/Egg 共通構造)。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GenerationRequest<C> {
    /// LCG Seed の導出元
    pub seed_source: SeedSource,
    /// ゲームモード (Game Offset 計算用)
    pub game_mode: GameMode,
    /// ユーザー指定オフセット
    pub user_offset: u64,
    /// 消費数範囲
    pub advance_range: AdvanceRange,
    /// 生成設定 (Pokemon or Egg)
    pub config: C,
}
```

```typescript
export type GenerationRequest<C> = {
  seed_source: SeedSource;
  game_mode: GameMode;
  user_offset: bigint;
  advance_range: AdvanceRange;
  config: C;
};
```

### 4.4 AdvanceRange

消費数範囲。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct AdvanceRange {
    pub min: u64,
    pub max: u64,
}
```

### 4.5 GenerationResult

生成結果。`SeedSource` の種別に応じて形式が変化。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GenerationResult<T> {
    /// 元の Seed (単一 Seed の場合)
    pub source_seed: Option<u64>,
    /// 元の起動条件 (FromDatetime の場合)
    pub source_datetime: Option<DatetimeParams>,
    /// 生成された個体リスト
    pub entries: Vec<T>,
}
```

## 5. 型の対応関係

### Pokemon vs Egg

| 項目 | Pokemon | Egg |
|-----|---------|-----|
| 設定型 | `PokemonGenerationConfig` | `EggGenerationConfig` |
| 解決済みデータ型 | `ResolvedPokemonData` | `RawEggData` |
| 列挙型 | `EnumeratedPokemonData` | `EnumeratedEggData` |
| IV 含有 | あり (WASM内で計算) | あり (遺伝適用済み) |
| 特性スロット | 0-1 | 0-2 (夢特性あり) |
| 遺伝情報 | なし | `InheritanceSlots` |
| species_id 解決 | WASM内 (Configベース) | N/A (孚化なので固定) |

### 現行実装との対応

| 新設計 | 現行実装 | 変更点 |
|-------|---------|--------|
| `PokemonGenerationConfig` | `BWGenerationConfig` | `encounter_resolution` 追加 |
| `ResolvedPokemonData` | `RawPokemonData` + `ResolvedPokemonData` | 統合、IV含む |
| `EnumeratedPokemonData` | - (新規) | - |
| `RawEggData` | `ResolvedEgg` (部分的) | - |
| `EnumeratedEggData` | `EnumeratedEggData` | - |
| `EncounterResolutionConfig` | - (新規) | TS→WASMに渡す |

## 6. 解決層設計

WASM/Worker/Main 間の責務分担と UI 表示用データの詳細は [resolution.md](./resolution.md) を参照。

## 関連ドキュメント

- [README.md](./README.md) - 概要
- [resolution.md](./resolution.md) - 解決層設計 (WASM/Worker/Main 責務分担)
- [共通型定義](../common/types.md) - `RomVersion`, `Hardware` 等
