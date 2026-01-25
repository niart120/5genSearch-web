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

### 1.3 背景

現状の設計には以下の課題がある:

1. **責務の混在**: `from_params()` が Seed 解決を内部で実施
2. **複数 Seed 未対応**: `resolve_single_seed()` のみ使用
3. **API 形式の不一致**: 内部は Iterator だが、実際のユースケースは一括取得

### 1.4 設計原則

| 原則 | 説明 |
|------|------|
| Iterator は内部実装 | LCG を進めながら1体ずつ生成する実装として妥当 |
| 外部 API は一括取得 | UI は一括取得してテーブル表示 (再レンダリング抑制) |
| Seed 解決は外部 | Generator は `SeedOrigin` を受け取る |
| フィルタは合成 | パイプライン的に適用 |

### 1.5 着手条件

- `local_012` (API 入力再設計) 完了後

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
│  - PokemonGenerator (Iterator trait 実装)       │
│  - EggGenerator (Iterator trait 実装)           │
│  - LCG 状態管理                                  │
└─────────────────────────────────────────────────┘
```

### 2.2 公開 API 設計

```rust
/// ポケモン一括生成 (公開 API)
///
/// - 複数 Seed 対応: `GeneratorSource` の全バリアントを処理
/// - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
pub fn generate_pokemon_list(
    params: PokemonGeneratorParams,
    count: u32,
    filter: Option<PokemonFilter>,
) -> Result<Vec<GeneratedPokemonData>, String> {
    let seeds = resolve_all_seeds(&params.source)?;
    
    let results: Vec<_> = seeds
        .into_iter()
        .flat_map(|origin| {
            let mut gen = PokemonGenerator::new(origin, &params)?;
            let pokemons = gen.take(count);
            
            match &filter {
                Some(f) => pokemons.into_iter().filter(|p| f.matches(p)).collect(),
                None => pokemons,
            }
        })
        .collect();
    
    Ok(results)
}

/// タマゴ一括生成 (公開 API)
pub fn generate_egg_list(
    params: EggGeneratorParams,
    count: u32,
    filter: Option<EggFilter>,
) -> Result<Vec<GeneratedEggData>, String> {
    // 同様の構造
}
```

### 2.3 Generator 内部実装

```rust
/// ポケモン Generator (内部実装)
///
/// - 単一 Seed 専用
/// - Iterator パターンで連続生成
/// - `new()` は `SeedOrigin` を受け取る
struct PokemonGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    rng_ivs: Ivs,
    origin: SeedOrigin,
    config: PokemonGenerationConfig,
    // エンカウント種別固有のフィールド...
}

impl PokemonGenerator {
    /// Generator を作成
    ///
    /// `SeedOrigin` から `LcgSeed` を取得し、内部状態を初期化。
    /// GameOffset は params から導出。
    fn new(origin: SeedOrigin, params: &PokemonGeneratorParams) -> Result<Self, String> {
        let base_seed = origin.seed();
        let game_offset = calculate_game_offset(base_seed, params.version, &params.game_start)?;
        // ...
    }

    /// 指定数の個体を生成
    fn take(&mut self, count: u32) -> Vec<GeneratedPokemonData> {
        (0..count).filter_map(|_| self.next()).collect()
    }

    /// 次の個体を生成 (Iterator 実装)
    fn next(&mut self) -> Option<GeneratedPokemonData> {
        // 現状の generate_next() と同様
    }
}
```

### 2.4 フィルタ設計

```rust
/// ポケモンフィルタ条件
pub struct PokemonFilter {
    pub iv_filter: Option<IvFilter>,
    pub shiny_only: bool,
    pub nature: Option<Nature>,
    pub ability: Option<u8>,
    // ...
}

impl PokemonFilter {
    /// 条件に合致するか判定
    pub fn matches(&self, pokemon: &GeneratedPokemonData) -> bool {
        // 各条件を AND で評価
    }
}
```

### 2.5 変更対象

| 対象 | 変更内容 |
|------|----------|
| `WildPokemonGenerator` | `PokemonGenerator` に統合検討 (別課題) |
| `StaticPokemonGenerator` | `PokemonGenerator` に統合検討 (別課題) |
| `EggGenerator` | 同様の構造に変更 |
| `from_params()` | 廃止 |
| `find()` | 廃止 (フィルタで代替) |

## 3. 移行計画

### Phase 1: 公開 API 追加

1. `generate_pokemon_list()` を `generator.rs` に追加
2. `generate_egg_list()` を `generator.rs` に追加
3. `lib.rs` から re-export

### Phase 2: Generator 内部整理

1. `from_params()` の呼び出し元を公開 API に移行
2. `from_params()` を廃止
3. `find()` を廃止

### Phase 3: Generator 統合 (別課題)

1. `WildPokemonGenerator` と `StaticPokemonGenerator` の統合検討
2. 統合可能であれば `PokemonGenerator` に一本化

## 4. 未決定事項

- [ ] `PokemonFilter` / `EggFilter` の具体的なフィールド設計
- [ ] Generator 統合の可否判断 (エンカウント種別による差異の吸収方法)
- [ ] `NeedleGenerator` への適用可否

## 5. 関連仕様書

- [local_012/API_INPUT_REDESIGN.md](../local_012/API_INPUT_REDESIGN.md): API 入力再設計
