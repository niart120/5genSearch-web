# Generator 再設計仕様書

## 1. 概要

### 1.1 目的

Worker から呼び出す WASM API としてのポケモン生成/タマゴ生成処理について、これまでのリファクタリング（local_013, local_014 等）を踏まえ、責務の明確な分離と型設計の最適化を行う。

### 1.2 背景

| リファクタリング | 内容 |
|------------------|------|
| local_013 | Generator API の複数 Seed 対応、フィルタリング機能 |
| local_014 | NeedleGenerator リファクタリング、SeedContext 導入、advance 起点修正 |
| local_015 | MtseedDatetimeSearcher 再設計 |

これらの変更により以下の問題が顕在化:

| 問題 | 詳細 |
|------|------|
| `SeedInput` と `SeedOrigin` の責務混在 | `SeedContext` が未解決の `SeedInput` を持つが、Generator は解決済みの `SeedOrigin` を必要とする |
| `SeedContext` の肥大化 | Seed 解決 + オフセット計算 + 検索範囲を1つの型に集約しすぎ |
| `Generated~Data` の重複フィールド | `lcg_seed: u64` と `source.base_seed()` が重複 |
| `*GeneratorParams` の責務過多 | 生成条件と共通設定が混在 |

### 1.3 期待効果

| 項目 | 効果 |
|------|------|
| 責務の明確化 | Seed 解決と生成処理を明確に分離 |
| 型の簡素化 | 重複フィールドの削除、責務ごとの型分割 |
| API の一貫性 | 3つの引数パターン統一: `origins`, `params`, `config` |
| 保守性向上 | 各型の責務が明確になり変更影響を局所化 |

### 1.4 スコープ

| 項目 | 対象 |
|------|------|
| 対象 | 型設計の見直し、API 引数の整理、重複フィールド削除、ファイル構成の整理 |
| スコープ外 | フィルタ設計（別タスクで検討） |

### 1.5 追加要件

| 要件 | 詳細 |
|------|------|
| `needle_search.rs` への影響対応 | `SeedContext` 廃止に伴う引数変更 |
| `generator.rs` のファイル分割 | `generation/generator/` モジュールに `egg.rs`, `pokemon.rs` を配置 |
| `flows/types.rs` の見直し | 内部型のみ残し、TS 公開型は `types/generation.rs` に移動済みか確認 |
| `SeedOrigin` の配置先見直し | 横断的に使用されるため `types/seeds.rs` に移動を検討 |

## 2. 現状分析

### 2.1 現状の型構成

```
┌─────────────────────────────────────────────────────────────────────┐
│ SeedInput (入力の起点)                                              │
│ ├─ Seeds { seeds: Vec<LcgSeed> }     ← UI から直接 Seed を指定     │
│ └─ Startup { ds, datetime, ranges, key_input }                     │
│                                       ← 起動条件から Seed を計算   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ resolve
┌─────────────────────────────────────────────────────────────────────┐
│ SeedOrigin (解決済み Seed + 出自情報)                              │
│ ├─ Seed { base_seed, mt_seed }       ← 直接指定の場合              │
│ └─ Startup { base_seed, mt_seed, datetime, condition }             │
│                                       ← 起動条件から導出した場合   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ SeedContext (現状: 責務過多)                                       │
│ ├─ input: SeedInput                  ← Seed 解決の入力 (問題)     │
│ ├─ version: RomVersion               ← game_offset 計算用         │
│ ├─ game_start: GameStartConfig       ← game_offset 計算用         │
│ ├─ user_offset: u32                  ← 検索開始位置               │
│ └─ max_advance: u32                  ← 検索終了位置               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ *GeneratorParams (現状: 責務過多)                                  │
│ ├─ context: SeedContext              ← 上記を内包 (問題)          │
│ ├─ trainer: TrainerInfo                                            │
│ └─ ... (生成条件)                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Generated~Data (現状: 重複あり)                                    │
│ ├─ source: SeedOrigin                ← 出自情報                   │
│ ├─ lcg_seed: u64                     ← 重複 (source.base_seed)    │
│ └─ ... (個体情報)                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 現状の公開 API

```rust
pub fn generate_pokemon_list(
    params: &PokemonGeneratorParams,  // SeedContext を内包
    count: u32,                        // 生成件数 (max_advance と重複)
    filter: Option<&IvFilter>,         // フィルタ
) -> Result<Vec<GeneratedPokemonData>, String>;

pub fn generate_egg_list(
    params: &EggGeneratorParams,
    count: u32,
    filter: Option<&IvFilter>,
) -> Result<Vec<GeneratedEggData>, String>;
```

## 3. 設計

### 3.1 処理フロー

```
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 1: Seed 解決 (UI/Worker 側で事前実行)                        │
│                                                                    │
│   SeedInput ──(resolve_seeds)──→ Vec<SeedOrigin>                  │
│                                                                    │
│   WASM API: resolve_seeds(input: SeedInput) -> Vec<SeedOrigin>    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 2: 生成                                                      │
│                                                                    │
│   Vec<SeedOrigin> + *GenerationParams + GenerationConfig           │
│       ──(generate_*_list)──→ Vec<Generated~Data>                  │
│                                                                    │
│   WASM API:                                                        │
│     generate_pokemon_list(origins, params, config)                 │
│     generate_egg_list(origins, params, config)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 型設計

#### 3.2.1 Seed 解決 (変更なし)

```rust
/// Seed 入力 (未解決)
pub enum SeedInput {
    Seeds { seeds: Vec<LcgSeed> },
    Startup { ds: DsConfig, datetime: Datetime, ranges: Vec<Timer0VCountRange>, key_input: KeyInput },
}

/// Seed 出自 (解決済み)
pub enum SeedOrigin {
    Seed { base_seed: LcgSeed, mt_seed: MtSeed },
    Startup { base_seed: LcgSeed, mt_seed: MtSeed, datetime: Datetime, condition: StartupCondition },
}
```

#### 3.2.2 共通設定 (新規)

```rust
/// 生成共通設定
///
/// オフセット計算と検索範囲を定義。
/// SeedInput は含まない (Seed 解決は事前に完了している前提)。
pub struct GenerationConfig {
    /// ROM バージョン (game_offset 計算用)
    pub version: RomVersion,
    /// 起動設定 (game_offset 計算用)
    pub game_start: GameStartConfig,
    /// 検索開始位置 (advance の初期値)
    pub user_offset: u32,
    /// 検索終了位置
    pub max_advance: u32,
}
```

#### 3.2.3 生成パラメータ (分割)

```rust
/// ポケモン生成パラメータ
///
/// GenerationConfig を含まない。生成条件のみを定義。
pub struct PokemonGenerationParams {
    pub trainer: TrainerInfo,
    pub encounter_type: EncounterType,
    pub encounter_method: EncounterMethod,
    pub lead_ability: LeadAbilityEffect,
    pub shiny_charm: bool,
    pub slots: Vec<EncounterSlotConfig>,
}

/// タマゴ生成パラメータ
///
/// GenerationConfig を含まない。生成条件のみを定義。
pub struct EggGenerationParams {
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

#### 3.2.4 生成結果 (重複削除)

```rust
/// ポケモン生成結果
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報 (base_seed, mt_seed を含む)
    pub source: SeedOrigin,
    // ↓ 削除: lcg_seed: u64 (source.base_seed() で取得可能)
    // 個体情報
    pub pid: u32,
    pub species_id: u16,
    pub level: u8,
    pub nature: Nature,
    pub sync_applied: bool,
    pub ability_slot: u8,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub held_item_slot: HeldItemSlot,
    pub ivs: Ivs,
    // エンカウント付加情報
    pub moving_encounter: Option<MovingEncounterInfo>,
    pub special_encounter: Option<SpecialEncounterInfo>,
    pub encounter_result: EncounterResult,
}

/// タマゴ生成結果
pub struct GeneratedEggData {
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    pub source: SeedOrigin,
    // ↓ 削除: lcg_seed: u64
    pub pid: u32,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    pub inheritance_0_stat: usize,
    pub inheritance_0_parent: u8,
    pub inheritance_1_stat: usize,
    pub inheritance_1_parent: u8,
    pub inheritance_2_stat: usize,
    pub inheritance_2_parent: u8,
    pub ivs: Ivs,
}
```

### 3.3 公開 API

```rust
/// Seed 解決
///
/// SeedInput から SeedOrigin のリストを生成。
/// UI/Worker 側で事前に呼び出す。
#[wasm_bindgen]
pub fn resolve_seeds(input: SeedInput) -> Result<Vec<SeedOrigin>, String>;

/// ポケモン一括生成
///
/// - origins: 解決済み Seed リスト
/// - params: 生成条件 (エンカウント種別、スロット等)
/// - config: 共通設定 (バージョン、オフセット、検索範囲)
#[wasm_bindgen]
pub fn generate_pokemon_list(
    origins: Vec<SeedOrigin>,
    params: &PokemonGenerationParams,
    config: &GenerationConfig,
) -> Result<Vec<GeneratedPokemonData>, String>;

/// タマゴ一括生成
#[wasm_bindgen]
pub fn generate_egg_list(
    origins: Vec<SeedOrigin>,
    params: &EggGenerationParams,
    config: &GenerationConfig,
) -> Result<Vec<GeneratedEggData>, String>;

/// レポート針パターン検索
#[wasm_bindgen]
pub fn search_needle_pattern(
    origins: Vec<SeedOrigin>,
    pattern: NeedlePattern,
    config: &GenerationConfig,
) -> Result<Vec<NeedleSearchResult>, String>;
```

### 3.4 NeedleSearchParams の廃止

現状:
```rust
pub struct NeedleSearchParams {
    pub context: SeedContext,  // ← SeedInput + オフセット + 検索範囲
    pub pattern: NeedlePattern,
}
```

変更後: **構造体を廃止し、`NeedlePattern` を直接引数として渡す**

理由:
- `context` は `origins` + `config` に分離される
- 残る `pattern` のみでは構造体にする意味がない
- API の統一性向上 (`origins`, `params/pattern`, `config` の3引数形式)

### 3.4 内部実装方針

| 項目 | 方針 |
|------|------|
| `game_offset` 計算 | Generator 内部で都度計算 (`SeedOrigin` + `GenerationConfig` から) |
| `SeedContext` | 廃止 (`GenerationConfig` に置き換え) |
| `*GeneratorParams` | 廃止 (`*GenerationParams` + `GenerationConfig` に分割) |
| フィルタ | スコープ外 (別タスクで検討) |

## 4. 変更対象ファイル

### 4.1 型定義

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/generation.rs` | 変更 | `GenerationConfig` 新規追加、`SeedContext` 廃止、`*GeneratorParams` → `*GenerationParams` リネーム・分割、`Generated~Data` から `lcg_seed` 削除、`SeedOrigin` を `types/seeds.rs` に移動 |
| `types/seeds.rs` | 変更 | `SeedOrigin` を追加 (Seed 関連型を集約) |
| `types/needle.rs` | 変更 | `NeedleSearchParams` 廃止、`NeedleSearchResult` の調整 |
| `types/mod.rs` | 変更 | re-export 調整 |

### 4.2 生成モジュール (ファイル構成変更)

現状:
```
generation/
├── flows/
│   ├── generator.rs     # PokemonGenerator / EggGenerator / 公開 API (968行)
│   ├── egg.rs
│   ├── pokemon_static.rs
│   ├── pokemon_wild.rs
│   └── types.rs         # 内部型
├── algorithm/
├── seed_resolver.rs
└── mod.rs
```

変更後:
```
generation/
├── flows/
│   ├── generator/       # generator.rs を分割
│   │   ├── mod.rs       # 公開 API (generate_pokemon_list, generate_egg_list)
│   │   ├── pokemon.rs   # PokemonGenerator 構造体
│   │   └── egg.rs       # EggGenerator 構造体
│   ├── pokemon/         # pokemon_static.rs, pokemon_wild.rs を統合
│   │   ├── mod.rs
│   │   ├── static.rs
│   │   └── wild.rs
│   ├── egg.rs           # 変更なし
│   ├── types.rs         # 内部型 (変更なし)
│   └── mod.rs
├── algorithm/           # 変更なし
└── mod.rs

core/
├── seed_resolver.rs     # generation/ から移動
└── ...
```

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `generation/flows/generator/mod.rs` | 新規 | 公開 API (`generate_pokemon_list`, `generate_egg_list`) |
| `generation/flows/generator/pokemon.rs` | 新規 | `PokemonGenerator` 構造体 (旧 `generator.rs` から分割) |
| `generation/flows/generator/egg.rs` | 新規 | `EggGenerator` 構造体 (旧 `generator.rs` から分割) |
| `generation/flows/pokemon/mod.rs` | 新規 | pokemon 生成モジュール |
| `generation/flows/pokemon/static.rs` | 移動 | `pokemon_static.rs` から |
| `generation/flows/pokemon/wild.rs` | 移動 | `pokemon_wild.rs` から |
| `generation/flows/generator.rs` | 削除 | 上記に分割 |
| `generation/flows/pokemon_static.rs` | 削除 | `pokemon/static.rs` に移動 |
| `generation/flows/pokemon_wild.rs` | 削除 | `pokemon/wild.rs` に移動 |
| `core/seed_resolver.rs` | 移動 | `generation/seed_resolver.rs` から移動、公開 API として整備 |
| `generation/seed_resolver.rs` | 削除 | `core/` に移動 |
| `generation/mod.rs` | 変更 | モジュール構成変更に伴う調整 |
| `core/mod.rs` | 変更 | `seed_resolver` モジュール追加 |

### 4.3 その他

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `misc/needle_search.rs` | 変更 | `NeedleSearchParams` 廃止に追従 (`origins` + `pattern` + `config` 形式) |
| `lib.rs` | 変更 | re-export 調整、`resolve_seeds` 追加 |

## 5. 実装計画

### Phase 1: 型定義の変更

1. `SeedOrigin` を `types/seeds.rs` に移動
2. `GenerationConfig` 新規追加
3. `PokemonGenerationParams` / `EggGenerationParams` 定義 (旧 `*GeneratorParams` から分割)
4. `Generated~Data` から `lcg_seed` 削除
5. `SeedContext` 廃止
6. `NeedleSearchParams` の引数分割 (`origins` + `config`)

### Phase 2: ファイル構成変更

1. `generation/flows/generator/` モジュール作成 (`generator.rs` を分割)
2. `generation/flows/pokemon/` モジュール作成 (`pokemon_static.rs`, `pokemon_wild.rs` を統合)
3. `core/seed_resolver.rs` 移動 (`generation/seed_resolver.rs` から)
4. 旧ファイル削除 (`generator.rs`, `pokemon_static.rs`, `pokemon_wild.rs`)
5. `generation/mod.rs`, `core/mod.rs` 調整

### Phase 3: API 変更

1. `resolve_seeds` を公開 API として整備 (`core/seed_resolver.rs`)
2. `generate_pokemon_list` / `generate_egg_list` の引数変更
3. `search_needle_pattern` の引数変更 (`NeedleSearchParams` 廃止)
4. 内部 Generator の初期化処理変更

### Phase 4: テスト・クリーンアップ

1. 既存テストの修正
2. 不要コードの削除
3. `lib.rs` の re-export 調整
4. ドキュメント更新

## 7. 移行戦略

### 7.1 方針

変更が広範囲に及ぶため、**Phase ごとにコミット**し、各段階でビルド確認を行う。

### 7.2 コミット単位

| コミット | 内容 | 検証 |
|----------|------|------|
| 1 | Phase 1: 型定義の変更 | `cargo check` |
| 2 | Phase 2: ファイル構成変更 | `cargo check` |
| 3 | Phase 3: API 変更 | `cargo check` + `cargo test` |
| 4 | Phase 4: テスト・クリーンアップ | `cargo test` + `pnpm build:wasm` |

### 7.3 リスク軽減

- 各 Phase 完了時に動作確認を実施
- 問題発生時は該当 Phase のみ revert 可能
- Phase 1-2 は型・構成変更のみで動作に影響なし

## 8. 補足: `SeedOrigin` の配置先

### 8.1 現状

`SeedOrigin` は `types/generation.rs` に定義されているが、以下のモジュールから参照される:

| モジュール | 用途 |
|------------|------|
| `types/needle.rs` | `NeedleSearchResult.source` |
| `datetime_search/mtseed.rs` | `MtseedDatetimeSearchBatch.results` |
| `core/seed_resolver.rs` | `resolve_seeds` の戻り値 |
| `generation/flows/generator/` | `Generator.source` フィールド |

### 8.2 移動先

**採用: `types/seeds.rs`**

理由:
- `SeedOrigin` は Seed の出自を表す型
- `LcgSeed` / `MtSeed` と同じモジュールに配置するのが自然
- 横断的に使用されるため、特定機能 (`generation`) に依存しない場所が適切

### 8.3 依存関係

移動後の依存:

```
types/seeds.rs
├── LcgSeed
├── MtSeed
└── SeedOrigin  ← 追加
       ├── uses Datetime (from types/config.rs)
       └── uses StartupCondition (from types/config.rs)
```

`SeedOrigin` は `Datetime` と `StartupCondition` に依存するため、`seeds.rs` から `config.rs` への依存が発生する。これは許容範囲。

## 9. 補足: `seed_resolver` の配置先

### 9.1 現状

`seed_resolver.rs` は `generation/` に配置されているが、責務は「`SeedInput` → `Vec<SeedOrigin>` の変換」であり、生成処理の前処理に相当。

### 9.2 移動先

**採用: `core/seed_resolver.rs`**

理由:
- SHA-1 計算 (`core/sha1`) に依存
- 「Seed の解決」は生成処理の前処理であり、`generation` の責務というより基盤処理
- `core` は「LCG, MT, SHA-1, Needle 計算」など基盤処理を集約しており、Seed 解決もここに含めるのが自然

### 9.3 依存関係

```
core/seed_resolver.rs
├── uses core/sha1 (SHA-1 計算)
├── uses types/SeedInput
├── uses types/SeedOrigin
└── uses types/StartupCondition
```

## 関連ドキュメント

- [local_013: Generator 再設計](../local_013/GENERATOR_MULTI_SEED_DESIGN.md)
- [local_014: NeedleGenerator リファクタリング](../local_014/NEEDLE_GENERATOR_REFACTOR.md)
- [local_015: MtseedDatetimeSearcher 再設計](../local_015/MTSEED_DATETIME_SEARCHER_REDESIGN.md)
