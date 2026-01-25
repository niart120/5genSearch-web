# Generator 複数 Seed 対応設計

## 1. 概要

### 1.1 目的

`GeneratorSource` が複数の `LcgSeed` を生成しうる場合の Generator 設計方針を検討する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `GeneratorSource` | Generator 入力型。`Seed` / `Seeds` / `Startup` の3種 |
| `SeedOrigin` | 生成結果のメタデータ。結果がどの条件から生成されたかを記録 |
| `LcgSeed` | 64bit LCG 初期シード |

### 1.3 背景・問題

現状の各 Generator (`WildPokemonGenerator`, `StaticPokemonGenerator`, `EggGenerator`) は以下の特性を持つ:

- **単一 Seed 専用**: 内部で単一の `SeedOrigin` を保持
- `from_params()` は `resolve_single_seed()` を使用 → 最初の1つしか扱わない

```
GeneratorSource (入力)          現状の from_params()         期待される動作
─────────────────────────────────────────────────────────────────────────────
Seed { seed }                   → 1つの Generator ✅         1つで十分
Seeds { [s1, s2, s3] }          → 1つの Generator (s1のみ) ❌  3つの Generator?
Startup { ranges: [...] }       → 1つの Generator (最初のみ) ❌ N個の Generator?
```

Worker から呼び出す際、複数 Seed を一括処理したいユースケースがある。

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| API 一貫性 | `GeneratorSource` の全バリアントを適切に処理 |
| Worker 効率 | 複数 Seed の一括処理を簡潔に記述可能 |
| 責務明確化 | Generator と Seed 解決の責務を明確に分離 |

### 1.5 着手条件

- `local_012` (API 入力再設計) 完了後

## 2. 設計方針の選択肢

### 案 A: 現状維持 (呼び出し側で解決)

```rust
// 呼び出し側 (Worker / WASM API) で resolve_all_seeds を使用
let seeds = resolve_all_seeds(&source)?;
let results: Vec<_> = seeds.iter()
    .flat_map(|(seed, origin)| {
        WildPokemonGenerator::new(seed, ..., origin, ...)
            .take(count)
    })
    .collect();
```

| 観点 | 評価 |
|------|------|
| Generator の責務 | 単一 Seed 専用のまま (シンプル) |
| 呼び出し側の負担 | 大 (ループ処理が必要) |
| 型安全性 | 高 (Generator は常に単一 Seed) |
| 変更規模 | 小 (現状維持) |

### 案 B: MultiGenerator (束ねる構造体)

```rust
pub struct MultiWildPokemonGenerator {
    generators: Vec<WildPokemonGenerator>,
}

impl MultiWildPokemonGenerator {
    pub fn from_params(params: WildPokemonGeneratorParams) -> Result<Self, String> {
        let seeds = resolve_all_seeds(&params.source)?;
        let generators = seeds.iter()
            .map(|(seed, origin)| WildPokemonGenerator::new(seed, ..., origin, ...))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self { generators })
    }

    pub fn generate_all(&mut self, count: u32) -> Vec<GeneratedPokemonData> {
        self.generators.iter_mut()
            .flat_map(|g| g.take(count))
            .collect()
    }
}
```

| 観点 | 評価 |
|------|------|
| Generator の責務 | 単一 Seed 専用のまま |
| 呼び出し側の負担 | 小 (Multi* を使うだけ) |
| 型安全性 | 高 |
| 変更規模 | 中 (新規構造体追加) |

### 案 C: Generator 拡張 (内部で複数 Seed 管理)

```rust
pub struct WildPokemonGenerator {
    seeds: Vec<(LcgSeed, SeedOrigin)>,
    current_index: usize,
    // ... 他のフィールド
}

impl WildPokemonGenerator {
    pub fn from_params(params: WildPokemonGeneratorParams) -> Result<Self, String> {
        let seeds = resolve_all_seeds(&params.source)?;
        // 内部で複数 Seed を管理
        // ...
    }
}
```

| 観点 | 評価 |
|------|------|
| Generator の責務 | 増大 (複数 Seed 管理) |
| 呼び出し側の負担 | 小 |
| 型安全性 | 中 (内部状態が複雑化) |
| 変更規模 | 大 (Generator の再設計) |

### 案 D: WASM API 層で束ねる (責務分離)

```rust
// lib.rs (WASM API 層)
#[wasm_bindgen]
pub fn generate_wild_pokemon(params: WildPokemonGeneratorParams, count: u32) -> Result<JsValue, String> {
    let seeds = resolve_all_seeds(&params.source)?;
    let results: Vec<_> = seeds.iter()
        .flat_map(|(seed, origin)| {
            let gen = WildPokemonGenerator::new(seed, ..., origin, ...)?;
            Ok(gen.take(count))
        })
        .flatten()
        .collect();
    Ok(serde_wasm_bindgen::to_value(&results)?)
}
```

| 観点 | 評価 |
|------|------|
| Generator の責務 | 単一 Seed 専用のまま (シンプル) |
| 呼び出し側の負担 | 小 (WASM API が吸収) |
| 型安全性 | 高 |
| 変更規模 | 中 (WASM API 層の変更) |

## 3. 評価まとめ

| 案 | Generator 責務 | 呼び出し側負担 | 変更規模 | 推奨度 |
|----|----------------|----------------|----------|--------|
| A. 現状維持 | ◎ | △ | ◎ | 短期的には有効 |
| B. MultiGenerator | ◎ | ◎ | ○ | 検討価値あり |
| C. Generator 拡張 | △ | ◎ | △ | 非推奨 |
| D. WASM API 層 | ◎ | ◎ | ○ | 検討価値あり |

## 4. 未決定事項

- [ ] 最終的にどの案を採用するか
- [ ] Worker 側の呼び出しパターンを先に設計すべきか
- [ ] `NeedleGenerator` は既に複数 Seed 対応しているか確認

## 5. 関連仕様書

- [local_012/API_INPUT_REDESIGN.md](../local_012/API_INPUT_REDESIGN.md): API 入力再設計
