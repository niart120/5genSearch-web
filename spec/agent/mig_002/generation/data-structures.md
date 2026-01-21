# 個体生成: 型定義

Pokemon/Egg 生成で使用する入出力型定義。

## 1. 共通型 (参照)

以下の共通型は [common/types.md](../common/types.md) で定義済み。本モジュールはこれらを参照する。

| 型 | 用途 |
|----|------|
| `GameStartConfig` | ゲーム起動設定。Game Offset 計算に使用 |
| `StartMode` | 起動方法 (NewGame / Continue) |
| `SaveState` | セーブ状態 (NoSave / WithSave / WithMemoryLink) |
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
    GameStartConfig, StartMode, SaveState, EncounterType, Nature, Gender, GenderRatio,
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

### 2.8 RawPokemonData

生成フローから返される中間データ。IV を含まない。

`flows/` の生成関数 (`generate_wild_pokemon`, `generate_static_pokemon`) が返す型。
`PokemonGenerator` がこれに IV・列挙コンテキストを付与して `GeneratedPokemonData` を構築する。

```rust
#[derive(Clone)]
pub struct RawPokemonData {
    /// PID
    pub pid: u32,
    /// 種族ID (EncounterSlotConfig から解決)
    pub species_id: u16,
    /// レベル
    pub level: u8,
    /// 性格 (0-24)
    pub nature: u8,
    /// シンクロ適用
    pub sync_applied: bool,
    /// 特性スロット (0-1)
    pub ability_slot: u8,
    /// 性別
    pub gender: Gender,
    /// 色違い種別
    pub shiny_type: ShinyType,
    /// 持ち物スロット (確率カテゴリ)
    pub held_item_slot: HeldItemSlot,
}
```

**注意**: `RawPokemonData` は WASM API としてはエクスポートしない (内部型)。
TypeScript への公開は `GeneratedPokemonData` を使用する。

**設計意図**:
- 生成関数は LCG のみを消費し、IV 計算 (MT19937) は行わない
- IV は `BaseSeed` から導出するため、`PokemonGenerator` が責務を持つ
- 責務分離により、テストや再利用が容易になる

### 2.9 GeneratedPokemonData

Pokemon 個体データ。WASM から返される公開型。
列挙コンテキスト (advance, needle_direction, source) と解決済み個体データをフラットに保持する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData {
    // === 列挙コンテキスト ===
    /// 消費数
    pub advance: u64,
    /// レポート針方向 (0-7)
    pub needle_direction: u8,
    /// 生成ソース情報
    pub source: GenerationSource,
    
    // === 基本情報 ===
    /// 個体生成開始時点の LCG Seed
    pub lcg_seed: u64,
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
export type GeneratedPokemonData = {
  // 列挙コンテキスト
  advance: bigint;
  needle_direction: number;
  source: GenerationSource;
  
  // 基本情報
  lcg_seed: bigint;
  pid: number;
  
  // 解決済み情報
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

**設計意図**:
- 旧 `ResolvedPokemonData` + `EnumeratedPokemonData` を統合
- ネストを排除し `entry.species_id` のようにフラットにアクセス可能
- `lcg_seed` は個体生成開始時点の LCG Seed (`GenerationSource` 内の情報と区別)

### 2.10 build_pokemon_data (内部ヘルパー)

PID から派生値を算出し、`RawPokemonData` を構築するヘルパー関数。

各生成フロー (pokemon-wild.md, pokemon-static.md) から共通で使用される。
`PokemonGenerator` がこれに IV・列挙コンテキストを付与して `GeneratedPokemonData` を構築する。

```rust
fn build_pokemon_data(
    pid: u32,
    nature: u8,
    sync_applied: bool,
    encounter_slot_value: u8,
    level_rand_value: u32,
    config: &PokemonGenerationConfig,
) -> RawPokemonData {
    // PID から派生値を算出
    let ability_slot = ((pid >> 16) & 1) as u8;  // 上位16bitの最下位bit
    let gender_value = (pid & 0xFF) as u8;       // 下位8bit
    
    // 色違い判定
    let shiny_type = ShinyChecker::check_shiny_type(config.tid, config.sid, pid);
    
    // スロットから種族・レベル・性別を解決
    let slot_config = &config.encounter_resolution.slots[encounter_slot_value as usize];
    let species_id = slot_config.species_id;
    let level = resolve_level(level_rand_value, slot_config.level_min, slot_config.level_max);
    let gender = determine_gender(gender_value, slot_config.gender_threshold);
    
    RawPokemonData {
        pid,
        species_id,
        level,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot: HeldItemSlot::None,  // 別途計算
    }
}
```

**PID からの派生値算出ルール**:

| 項目 | 算出方法 | 備考 |
|-----|---------|------|
| `ability_slot` | `(pid >> 16) & 1` | 特性スロット (0 or 1) |
| `gender_value` | `pid & 0xFF` | 性別判定用の値 (0-255) |
| `shiny_type` | `ShinyChecker::check_shiny_type()` | Normal / Square / Star |

**注意**: この関数は乱数を消費しない。純粋に PID と設定から `RawPokemonData` を構築するのみ。

### 2.11 GenerationSource

生成結果のソース情報。各エントリがどの条件から生成されたかを示す。
全バリアントで `base_seed` (SHA-1 から導出された初期 LCG Seed) を保持する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GenerationSource {
    /// 固定 Seed から生成
    Fixed {
        /// BaseSeed (SHA-1 から導出)
        base_seed: u64,
    },
    /// 複数 Seed 指定から生成
    Multiple {
        /// BaseSeed (SHA-1 から導出)
        base_seed: u64,
        /// 入力 seeds 配列のインデックス
        seed_index: u32,
    },
    /// 日時検索から生成
    Datetime {
        /// BaseSeed (SHA-1 から導出)
        base_seed: u64,
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

**Seed の概念整理**:

| 名称 | 説明 | 保持場所 |
|-----|------|---------|
| `base_seed` | SHA-1(HashValues) から導出される初期 LCG Seed | `GenerationSource` 内 |
| MT Seed | `base_seed.derive_mt_seed()` で導出。IV 計算用 | Generator 内部 (非公開) |
| `lcg_seed` | 各個体生成開始時点の LCG Seed | `GeneratedPokemonData` / `GeneratedEggData` |

**補足**: 
- `base_seed` は MT Seed の導出元として固定。起動条件が同じなら同一値
- `lcg_seed` は advance ごとに異なる (LCG を進めた後の状態)
- レポート針 (`needle_direction`) は `lcg_seed` から計算

```typescript
export type GenerationSource =
  | { type: 'Fixed'; base_seed: bigint }
  | { type: 'Multiple'; base_seed: bigint; seed_index: number }
  | { type: 'Datetime'; base_seed: bigint; datetime: DatetimeParams; timer0: number; vcount: number; key_code: number };
```

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

生成フローから返される Egg 個体 (IV なし)。

`flows/egg.md` の `generate_egg()` が返す型。IV は含まない。
`EggGenerator` がこれに IV・列挙コンテキストを付与して `GeneratedEggData` を構築する。

```rust
#[derive(Clone)]
pub struct RawEggData {
    /// PID
    pub pid: u32,
    /// 性格 (0-24)
    pub nature: u8,
    /// 性別
    pub gender: Gender,
    /// 特性スロット (0, 1, 2: 夢特性は 2)
    pub ability_slot: u8,
    /// 色違い種別
    pub shiny_type: ShinyType,
    /// 遺伝情報
    pub inheritance: InheritanceSlots,
}
```

**注意**: `RawEggData` は WASM API としてはエクスポートしない (内部型)。
TypeScript への公開は `GeneratedEggData` を使用する。

**設計意図**:
- 生成関数は LCG のみを消費し、IV 計算 (MT19937 + 遺伝) は行わない
- IV は `BaseSeed` から導出した MT Seed + 親 IV で計算するため、`EggGenerator` が責務を持つ
- 責務分離により、テストや再利用が容易になる

### 3.5 GeneratedEggData

Egg 個体データ。WASM から返される公開型。
列挙コンテキスト (advance, needle_direction, source) と解決済み個体データをフラットに保持する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // === 列挙コンテキスト ===
    /// 消費数
    pub advance: u64,
    /// レポート針方向 (0-7)
    pub needle_direction: u8,
    /// 生成ソース情報
    pub source: GenerationSource,
    
    // === 基本情報 ===
    /// 個体生成開始時点の LCG Seed
    pub lcg_seed: u64,
    /// PID
    pub pid: u32,
    
    // === 個体情報 ===
    /// 性格 (0-24)
    pub nature: u8,
    /// 性別
    pub gender: Gender,
    /// 特性スロット (0, 1, 2: 夢特性は 2)
    pub ability_slot: u8,
    /// 色違い種別
    pub shiny_type: ShinyType,
    /// 遺伝情報
    pub inheritance: InheritanceSlots,
    
    // === IV ===
    /// 個体値 (遺伝適用後) [HP, Atk, Def, SpA, SpD, Spe]
    pub ivs: IvSet,
}
```

```typescript
export type GeneratedEggData = {
  // 列挙コンテキスト
  advance: bigint;
  needle_direction: number;
  source: GenerationSource;
  
  // 基本情報
  lcg_seed: bigint;
  pid: number;
  
  // 個体情報
  nature: number;
  gender: Gender;
  ability_slot: number;
  shiny_type: ShinyType;
  inheritance: InheritanceSlots;
  ivs: IvSet;
};
```

**設計意図**:
- 旧 `ResolvedEggData` + `EnumeratedEggData` を統合
- `GeneratedPokemonData` と命名・フィールド名を統一 (`shiny_type`, `ability_slot`, `lcg_seed`)
- ネストを排除し `entry.nature` のようにフラットにアクセス可能

**needle_direction の計算タイミング**:
- 入力: 当該 advance における個体生成開始時点の LCG Seed
- 計算: `NeedleDirection::from_seed(seed)` ([common/types.md](../common/types.md#216-needledirection) 参照)
- 詳細は [worker-interface.md §2.4](./worker-interface.md#24-needle_direction-の計算) を参照

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
    /// ゲーム起動設定 (Game Offset 計算用)
    pub game_start_config: GameStartConfig,
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
  game_start_config: GameStartConfig;
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
| 内部型 | `RawPokemonData` | `RawEggData` |
| 公開型 | `GeneratedPokemonData` | `GeneratedEggData` |
| IV 含有 | あり (WASM内で計算) | あり (遺伝適用済み) |
| 特性スロット | 0-1 | 0-2 (夢特性あり) |
| 遺伝情報 | なし | `InheritanceSlots` |
| species_id 解決 | WASM内 (Configベース) | N/A (孵化なので固定) |

### フィールド名の統一

| フィールド | Pokemon | Egg | 備考 |
|-----------|---------|-----|------|
| LCG Seed | `lcg_seed` | `lcg_seed` | 個体生成開始時点の Seed |
| 色違い種別 | `shiny_type` | `shiny_type` | 統一済み |
| 特性スロット | `ability_slot` | `ability_slot` | 統一済み (Egg は 0-2) |
| 性格 | `nature: u8` | `nature: u8` | 統一済み |

### 現行実装との対応

| 新設計 | 現行実装 | 変更点 |
|-------|---------|--------|
| `PokemonGenerationConfig` | `BWGenerationConfig` | `encounter_resolution` 追加 |
| `GeneratedPokemonData` | `RawPokemonData` + `ResolvedPokemonData` + `EnumeratedPokemonData` | 統合・フラット化 |
| `GeneratedEggData` | `ResolvedEgg` + `EnumeratedEggData` | 統合・フラット化、フィールド名統一 |
| `EncounterResolutionConfig` | - (新規) | TS→WASMに渡す |

## 6. 解決層設計

WASM/Worker/Main 間の責務分担と UI 表示用データの詳細は [resolution.md](./resolution.md) を参照。

## 関連ドキュメント

- [README.md](./README.md) - 概要
- [resolution.md](./resolution.md) - 解決層設計 (WASM/Worker/Main 責務分担)
- [共通型定義](../common/types.md) - `RomVersion`, `Hardware` 等
