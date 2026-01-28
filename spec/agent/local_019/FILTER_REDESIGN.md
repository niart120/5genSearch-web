# フィルター設計 仕様書

## 1. 概要

### 1.1 目的

Generator / Searcher 共通で利用可能なフィルター型体系を整備する。既存の `IvFilter` を拡張し、性格・性別・特性・色違い等の条件をサポートする。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `IvFilter` | IV 条件フィルター (既存、変更なし) |
| `ResultFilter` | 生成結果の共通フィルター条件 (IV + 性格 + 性別 + 特性 + 色違い) |
| `PokemonFilter` | 野生/固定ポケモン用フィルター (`ResultFilter` + 種族・レベル条件) |
| `EggFilter` | 孵化用フィルター (`ResultFilter` + 猶予フレーム条件) |
| `ShinyFilter` | 色違い条件 (`Any` / `Star` / `Square`) |

### 1.3 背景・問題

| 問題 | 詳細 |
|------|------|
| `IvFilter` のみ | 現行の Generator API は IV フィルタのみ対応 |
| 孵化検索で不足 | 性格・性別・特性・色違い・猶予フレームのフィルタが必要 |
| 野生検索で不足 | 種族・レベル範囲のフィルタが必要 |
| 重複ロジック | Pokemon / Egg で共通の判定ロジックが分散する懸念 |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 共通化 | `ResultFilter` で共通条件を集約、ロジック重複を排除 |
| 拡張性 | `PokemonFilter` / `EggFilter` で用途別の追加条件をサポート |
| API 統一 | Generator / Searcher で同じフィルター型を利用 |
| 後方互換 | 既存の `IvFilter` はそのまま維持 |

### 1.5 着手条件

- local_016 (Generator 再設計) 実装済み
- local_017 (`generate_egg` 修正) 実装済み
- local_018 (WILD_GENERATION_REDESIGN) 実装済み (野生生成の種族・レベル情報が必要)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/filter.rs` | 新規 | `ShinyFilter`, `ResultFilter`, `PokemonFilter`, `EggFilter` 追加 |
| `wasm-pkg/src/types/mod.rs` | 変更 | `filter` モジュール追加、re-export 追加 |
| `wasm-pkg/src/generation/flows/generator/mod.rs` | 変更 | `IvFilter` → `PokemonFilter` / `EggFilter` に変更 |
| `wasm-pkg/src/lib.rs` | 変更 | re-export 追加 |

## 3. 設計方針

### 3.1 型階層

```
IvFilter (既存、変更なし)
    │
    ▼
ResultFilter (新規: 共通条件)
    ├─ iv: Option<IvFilter>
    ├─ nature: Option<Nature>
    ├─ gender: Option<Gender>
    ├─ ability_slot: Option<u8>
    └─ shiny: Option<ShinyFilter>
    │
    ├──────────────────┬────────────────────┐
    ▼                  ▼                    ▼
PokemonFilter      EggFilter           (将来拡張)
├─ base            ├─ base
├─ species_id      └─ min_margin_frames
└─ level_range
```

### 3.2 命名規則

| 型名 | 役割 |
|------|------|
| `IvFilter` | IV 条件のみ (既存) |
| `ResultFilter` | 生成「結果」の共通属性をフィルタ |
| `PokemonFilter` | `GeneratedPokemonData` をフィルタ |
| `EggFilter` | `GeneratedEggData` をフィルタ |

`ResultFilter` は `GeneratedXxxData` という「Result」に対するフィルタという意味で命名。`IndividualFilter` は IV (Individual Value) との混同を避けるため不採用。

### 3.3 フィルター条件の評価

各条件は `Option` 型とし、`None` の場合は「条件なし (全件通過)」として扱う。

```rust
impl ResultFilter {
    pub fn matches_pokemon(&self, data: &GeneratedPokemonData) -> bool {
        self.matches_core(&data.ivs, data.nature, data.gender, data.ability_slot, data.shiny_type)
    }

    pub fn matches_egg(&self, data: &GeneratedEggData) -> bool {
        self.matches_core(&data.ivs, data.nature, data.gender, data.ability_slot, data.shiny_type)
    }

    fn matches_core(
        &self,
        ivs: &Ivs,
        nature: Nature,
        gender: Gender,
        ability_slot: u8,
        shiny_type: ShinyType,
    ) -> bool {
        // 各条件を評価 (None は通過)
    }
}
```

## 4. 実装仕様

### 4.1 型定義

#### 4.1.1 `ShinyFilter`

```rust
// types/filter.rs

/// 色違いフィルター
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyFilter {
    /// 色違いのみ (Star or Square)
    Any,
    /// 星型のみ
    Star,
    /// ひし形のみ
    Square,
}

impl ShinyFilter {
    /// 色違い条件に一致するか判定
    pub fn matches(&self, shiny_type: ShinyType) -> bool {
        match self {
            Self::Any => shiny_type != ShinyType::None,
            Self::Star => shiny_type == ShinyType::Star,
            Self::Square => shiny_type == ShinyType::Square,
        }
    }
}
```

#### 4.1.2 `ResultFilter`

```rust
// types/filter.rs

/// 生成結果の共通フィルター条件
///
/// Pokemon / Egg 共通の属性をフィルタリング。
/// 各フィールドが `None` の場合は条件なし (全件通過)。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct ResultFilter {
    /// IV フィルター
    pub iv: Option<IvFilter>,
    /// 性格
    pub nature: Option<Nature>,
    /// 性別
    pub gender: Option<Gender>,
    /// 特性スロット (0, 1, 2)
    pub ability_slot: Option<u8>,
    /// 色違い
    pub shiny: Option<ShinyFilter>,
}

impl ResultFilter {
    /// 条件なしフィルター (全件通過)
    pub const fn any() -> Self {
        Self {
            iv: None,
            nature: None,
            gender: None,
            ability_slot: None,
            shiny: None,
        }
    }

    /// `GeneratedPokemonData` が条件に一致するか判定
    pub fn matches_pokemon(&self, data: &GeneratedPokemonData) -> bool {
        self.matches_core(
            &data.ivs,
            data.nature,
            data.gender,
            data.ability_slot,
            data.shiny_type,
        )
    }

    /// `GeneratedEggData` が条件に一致するか判定
    pub fn matches_egg(&self, data: &GeneratedEggData) -> bool {
        self.matches_core(
            &data.ivs,
            data.nature,
            data.gender,
            data.ability_slot,
            data.shiny_type,
        )
    }

    /// 共通の判定ロジック
    fn matches_core(
        &self,
        ivs: &Ivs,
        nature: Nature,
        gender: Gender,
        ability_slot: u8,
        shiny_type: ShinyType,
    ) -> bool {
        // IV フィルター
        if let Some(ref iv_filter) = self.iv {
            if !iv_filter.matches(ivs) {
                return false;
            }
        }

        // 性格
        if let Some(required_nature) = self.nature {
            if nature != required_nature {
                return false;
            }
        }

        // 性別
        if let Some(required_gender) = self.gender {
            if gender != required_gender {
                return false;
            }
        }

        // 特性スロット
        if let Some(required_slot) = self.ability_slot {
            if ability_slot != required_slot {
                return false;
            }
        }

        // 色違い
        if let Some(ref shiny_filter) = self.shiny {
            if !shiny_filter.matches(shiny_type) {
                return false;
            }
        }

        true
    }
}
```

#### 4.1.3 `PokemonFilter`

```rust
// types/filter.rs

/// ポケモンフィルター (野生/固定用)
///
/// `ResultFilter` に加え、種族・レベル条件をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonFilter {
    /// 共通条件
    #[serde(flatten)]
    pub base: ResultFilter,
    /// 種族 ID (複数指定可、いずれかに一致)
    pub species_ids: Option<Vec<u16>>,
    /// レベル範囲 (min, max)
    pub level_range: Option<(u8, u8)>,
}

impl PokemonFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            base: ResultFilter::any(),
            species_ids: None,
            level_range: None,
        }
    }

    /// `GeneratedPokemonData` が条件に一致するか判定
    pub fn matches(&self, data: &GeneratedPokemonData) -> bool {
        // 共通条件
        if !self.base.matches_pokemon(data) {
            return false;
        }

        // 種族 ID
        if let Some(ref ids) = self.species_ids {
            if !ids.is_empty() && !ids.contains(&data.species_id) {
                return false;
            }
        }

        // レベル範囲
        if let Some((min, max)) = self.level_range {
            if data.level < min || data.level > max {
                return false;
            }
        }

        true
    }
}
```

#### 4.1.4 `EggFilter`

```rust
// types/filter.rs

/// 孵化フィルター
///
/// `ResultFilter` に加え、猶予フレーム条件をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggFilter {
    /// 共通条件
    #[serde(flatten)]
    pub base: ResultFilter,
    /// 猶予フレーム最小値 (NPC消費考慮時)
    pub min_margin_frames: Option<u32>,
}

impl EggFilter {
    /// 条件なしフィルター
    pub const fn any() -> Self {
        Self {
            base: ResultFilter::any(),
            min_margin_frames: None,
        }
    }

    /// `GeneratedEggData` が条件に一致するか判定
    pub fn matches(&self, data: &GeneratedEggData) -> bool {
        // 共通条件
        if !self.base.matches_egg(data) {
            return false;
        }

        // 猶予フレーム
        if let Some(min_margin) = self.min_margin_frames {
            match data.margin_frames {
                Some(margin) if margin >= min_margin => {}
                _ => return false,
            }
        }

        true
    }
}
```

### 4.2 Generator API の変更

```rust
// generation/flows/generator/mod.rs

/// ポケモン一括生成 (公開 API)
pub fn generate_pokemon_list(
    origins: Vec<SeedOrigin>,
    params: &PokemonGenerationParams,
    config: &GenerationConfig,
    filter: Option<&PokemonFilter>,  // IvFilter → PokemonFilter
) -> Result<Vec<GeneratedPokemonData>, String>;

/// タマゴ一括生成 (公開 API)
pub fn generate_egg_list(
    origins: Vec<SeedOrigin>,
    params: &EggGenerationParams,
    config: &GenerationConfig,
    filter: Option<&EggFilter>,  // IvFilter → EggFilter
) -> Result<Vec<GeneratedEggData>, String>;

// 内部関数も変更
fn apply_pokemon_filter(
    pokemons: Vec<GeneratedPokemonData>,
    filter: Option<&PokemonFilter>,
) -> Vec<GeneratedPokemonData> {
    match filter {
        Some(f) => pokemons.into_iter().filter(|p| f.matches(p)).collect(),
        None => pokemons,
    }
}

fn apply_egg_filter(
    eggs: Vec<GeneratedEggData>,
    filter: Option<&EggFilter>,
) -> Vec<GeneratedEggData> {
    match filter {
        Some(f) => eggs.into_iter().filter(|e| f.matches(e)).collect(),
        None => eggs,
    }
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_shiny_filter_any` | `ShinyFilter::Any` が Star/Square を通過すること |
| `test_shiny_filter_star` | `ShinyFilter::Star` が Star のみ通過すること |
| `test_shiny_filter_square` | `ShinyFilter::Square` が Square のみ通過すること |
| `test_result_filter_iv` | IV 条件が正しく評価されること |
| `test_result_filter_nature` | 性格条件が正しく評価されること |
| `test_result_filter_gender` | 性別条件が正しく評価されること |
| `test_result_filter_ability` | 特性スロット条件が正しく評価されること |
| `test_result_filter_combined` | 複合条件が AND 評価されること |
| `test_pokemon_filter_species` | 種族 ID 条件が正しく評価されること |
| `test_pokemon_filter_level` | レベル範囲条件が正しく評価されること |
| `test_egg_filter_margin` | 猶予フレーム条件が正しく評価されること |

### 5.2 統合テスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_generate_pokemon_list_with_filter` | Generator でフィルタが適用されること |
| `test_generate_egg_list_with_filter` | Generator でフィルタが適用されること |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test types::pokemon::tests::test_shiny_filter
cargo test types::pokemon::tests::test_result_filter
cargo test generation::flows::generator
```

## 6. 実装チェックリスト

- [x] `types/filter.rs` 新規作成
- [x] `types/filter.rs` に `ShinyFilter` 追加
- [x] `types/filter.rs` に `ResultFilter` 追加
- [x] `types/filter.rs` に `PokemonFilter` 追加
- [x] `types/filter.rs` に `EggFilter` 追加
- [x] `types/mod.rs` に `filter` モジュール追加・re-export 追加
- [x] `generation/flows/generator/mod.rs` の API を `PokemonFilter` / `EggFilter` に変更
- [x] `lib.rs` に re-export 追加
- [x] ユニットテスト追加
- [x] `cargo test` パス確認
- [x] `cargo clippy` 警告なし
- [x] `wasm-pack build --target web` 成功確認

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [local_016](../local_016/GENERATOR_REDESIGN.md) | Generator 再設計 |
| [local_017](../local_017/EGG_GENERATION_REDESIGN.md) | タマゴ生成ロジック再設計 |
| [local_018](../local_018/WILD_GENERATION_REDESIGN.md) | 野生生成再設計 |
| [local_020](../local_020/EGG_DATETIME_SEARCH.md) | 孵化起動時刻検索 (本仕様書のフィルターを利用) |
