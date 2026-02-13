# Generator 再設計

## 1. 概要

### 1.1 目的

Generator の設計を見直し、以下を実現する:

- 内部実装 (Iterator) と外部 API (一括取得) の明確な分離
- 複数 Seed 対応
- フィルタリング機能の合成

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `GeneratorSource` | Generator 入力型。`Seed` / `Seeds` / `Startup` の3種 |
| `SeedOrigin` | 生成結果のメタデータ。結果がどの条件から生成されたかを記録 |
| `LcgSeed` | 64bit LCG 初期シード |
| `GameOffset` | ゲーム起動条件から導出される事前消費数 |
| `UserOffset` | API 呼び出し時にユーザが指定する追加オフセット |

### 1.3 実装状況

| フェーズ | 状況 | 内容 |
|---------|------|------|
| Phase 1 | ✅ 完了 | 公開 API 追加 |
| Phase 2 | ✅ 完了 | Generator 内部整理・統合 |
| Phase 3 | ✅ 完了 | Wild/Static Generator 統合 |

## 2. 設計

### 2.1 階層構造

```
┌─────────────────────────────────────────────────┐
│ WASM 境界層 (lib.rs)                            │
│  - JS との境界 (wasm_bindgen, serde)            │
│  - generator.rs の公開関数を re-export          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 公開関数層 (generator.rs)                        │
│  - generate_pokemon_list()                      │
│  - generate_egg_list()                          │
│  - 複数 Seed のループ処理                        │
│  - フィルタ適用                                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 内部実装層 (generator.rs 内部)                   │
│  - PokemonGenerator (Iterator パターン)         │
│  - EggGenerator (Iterator パターン)             │
│  - LCG 状態管理                                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 生成アルゴリズム層                               │
│  - generate_static_pokemon()                    │
│  - generate_wild_pokemon()                      │
│  - generate_egg()                               │
└─────────────────────────────────────────────────┘
```

### 2.2 公開 API

```rust
/// ポケモン一括生成 (公開 API)
pub fn generate_pokemon_list(
    params: &PokemonGeneratorParams,
    count: u32,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedPokemonData>, String>;

/// タマゴ一括生成 (公開 API)
pub fn generate_egg_list(
    params: &EggGeneratorParams,
    count: u32,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedEggData>, String>;
```

### 2.3 Generator 構造体

#### PokemonGenerator

Wild / Static を統合した単一 Generator。`encounter_type` で動作を分岐。

```rust
pub struct PokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: SeedOrigin,
    params: PokemonGeneratorParams,
}

impl PokemonGenerator {
    pub fn new(
        base_seed: LcgSeed,
        offset_config: OffsetConfig,
        source: SeedOrigin,
        params: &PokemonGeneratorParams,
    ) -> Result<Self, String>;

    pub fn generate_next(&mut self) -> Option<GeneratedPokemonData>;
    pub fn take(&mut self, count: u32) -> Vec<GeneratedPokemonData>;
}
```

#### EggGenerator

```rust
pub struct EggGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    source: SeedOrigin,
    params: EggGeneratorParams,
}

impl EggGenerator {
    pub fn new(
        base_seed: LcgSeed,
        offset_config: OffsetConfig,
        source: SeedOrigin,
        params: &EggGeneratorParams,
    ) -> Result<Self, String>;

    pub fn generate_next(&mut self) -> GeneratedEggData;
    pub fn take(&mut self, count: u32) -> Vec<GeneratedEggData>;
}
```

### 2.4 パラメータ型

#### PokemonGeneratorParams

Wild / Static を統合したパラメータ。

```rust
pub struct PokemonGeneratorParams {
    pub source: GeneratorSource,
    pub version: RomVersion,
    pub game_start: GameStartConfig,
    pub user_offset: u32,
    pub encounter_type: EncounterType,
    pub encounter_method: EncounterMethod,
    pub trainer: TrainerInfo,
    pub lead_ability: LeadAbilityEffect,
    pub shiny_charm: bool,
    pub slots: Vec<EncounterSlotConfig>,
}
```

#### EggGeneratorParams

```rust
pub struct EggGeneratorParams {
    pub source: GeneratorSource,
    pub version: RomVersion,
    pub game_start: GameStartConfig,
    pub user_offset: u32,
    pub trainer: TrainerInfo,
    pub everstone: EverstonePlan,
    pub female_has_hidden: bool,
    pub uses_ditto: bool,
    pub gender_ratio: GenderRatio,
    pub nidoran_flag: bool,
    pub masuda_method: bool,
    pub parent_male: Ivs,
    pub parent_female: Ivs,
}
```

#### EncounterSlotConfig

スロット単位の設定。Static の場合は1件、Wild の場合は複数。

```rust
pub struct EncounterSlotConfig {
    pub species_id: u16,
    pub level_min: u8,
    pub level_max: u8,
    pub gender_threshold: u8,
    pub has_held_item: bool,
    pub shiny_locked: bool,
}
```

### 2.5 生成アルゴリズム関数

| 関数 | 用途 |
|------|------|
| `generate_static_pokemon(lcg, params, slot)` | 固定シンボル/イベント/徘徊 |
| `generate_wild_pokemon(lcg, params)` | 野生エンカウント |
| `generate_egg(lcg, params)` | タマゴ生成 |

## 3. 実装完了事項

### 3.1 Phase 1: 公開 API 追加 ✅

- [x] `generate_pokemon_list()` を `generator.rs` に追加
- [x] `generate_egg_list()` を `generator.rs` に追加
- [x] `lib.rs` から re-export

### 3.2 Phase 2: Generator 内部整理 ✅

- [x] `from_params()` を廃止
- [x] `find()` を廃止
- [x] `*GenerationConfig` を廃止 (`*GeneratorParams` を直接使用)

### 3.3 Phase 3: Generator 統合 ✅

- [x] `WildPokemonGenerator` と `StaticPokemonGenerator` を `PokemonGenerator` に統合
- [x] `encounter_type` による Wild / Static 分岐を実装
- [x] 関数シグネチャの簡潔化 (重複引数の削除)

## 4. 設計判断の記録

### 4.1 Wild/Static 統合

**判断**: 統合する

**理由**:
- 両者の差異はエンカウント種別のみ
- `encounter_type` で分岐可能
- 重複コードの削減

### 4.2 *GenerationConfig 廃止

**判断**: 廃止する

**理由**:
- `*GeneratorParams` と `*GenerationConfig` の役割が重複
- `*GeneratorParams` に全情報を集約し、中間型を不要に

### 4.3 関数シグネチャ簡潔化

**判断**: params から値を取得する形に統一

**変更内容**:

| 関数 | 削除した引数 | アクセス方法 |
|------|-------------|--------------|
| `PokemonGenerator::new` | `version`, `game_start`, `slots` | `params.*` |
| `EggGenerator::new` | `version`, `game_start`, `parent_*` | `params.*` |
| `generate_static_pokemon` | 個別フィールド5個 | `slot: &EncounterSlotConfig` |
| `generate_wild_pokemon` | `slots` | `params.slots` |

## 5. 未決定事項

- [ ] `PokemonFilter` / `EggFilter` の具体的なフィールド設計
- [ ] `NeedleGenerator` への適用可否

## 6. 関連仕様書

- [local_012/API_INPUT_REDESIGN.md](../local_012/API_INPUT_REDESIGN.md): API 入力再設計
