# NeedleGenerator リファクタリング仕様書

## 1. 概要

### 1.1 目的

`NeedleGenerator` の責務整理と API 統一を行い、`PokemonGenerator` / `EggGenerator` と一貫した設計にする。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| NeedleGenerator | レポート針パターンの一致位置を検索する Generator |
| レポート針 | レポート中に表示される8方向の針。LCG Seed から決定される |
| NeedlePattern | 観測した針方向の列 (例: ↑→↓) |
| advance | LCG の消費位置 |
| SeedContext | Seed 解決 + オフセット計算 + 検索範囲指定の共通設定 (旧 GeneratorConfig) |

### 1.3 背景・問題

現在の `NeedleGenerator` には以下の問題がある:

| 問題 | 詳細 |
|------|------|
| 型配置の不統一 | `NeedleGeneratorParams` 等がモジュール内定義。`PokemonGeneratorParams` は `types/generation.rs` に配置 |
| Seed 解決ロジックの重複 | `seed_resolver.rs` と独自実装 (`StartupState`, `compute_lcg_seed_for_startup`) が並存 |
| `GeneratorConfig` 未使用 | `SeedInput` を直接受け取っており、`version` / `game_start` / `user_offset` が未考慮 |
| StartupState の肥大化 | 17フィールドの巨大構造体。SHA-1 計算・日時コード生成・イテレーション状態が混在 |
| オフセット未対応 | Pokemon/Egg Generator と異なり、ゲーム起動時のオフセット計算が未適用 |

また、`PokemonGenerator` / `EggGenerator` にも以下のバグがある:

| 問題 | 詳細 |
|------|------|
| `advance` 起点の誤り | 現状 `current_advance=0` から開始。正しくは `current_advance=user_offset` から開始すべき |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| API 一貫性 | `GeneratorConfig` を共通利用し、3種の Generator で統一された入力形式 |
| 型配置の統一 | 公開型を `types/generation.rs` に集約 |
| 保守性向上 | Seed 解決ロジックを `seed_resolver` に一本化 |

### 1.5 着手条件

- [x] local-013 Generator API redesign のマージ完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/generation/flows/generator.rs` | 変更 | `advance` 起点のバグ修正 (`current_advance=user_offset` で初期化) |
| `wasm-pkg/src/types/needle.rs` | 変更 | `NeedleSearchParams` / `NeedleSearchResult` 型を追加 |
| `wasm-pkg/src/types/mod.rs` | 変更 | 新規型の re-export 追加 |
| `wasm-pkg/src/misc/needle_generator.rs` | **削除** | 旧 `NeedleGenerator` クラスを完全削除 |
| `wasm-pkg/src/misc/needle_search.rs` | **新規** | `search_needle_pattern` 関数を配置 |
| `wasm-pkg/src/misc/mod.rs` | 変更 | モジュール宣言の変更 (`needle_generator` → `needle_search`) |
| `wasm-pkg/src/generation/seed_resolver.rs` | 変更 | Iterator 版 Seed 解決関数を追加 (オプション) |
| `wasm-pkg/src/lib.rs` | 変更 | re-export の調整 |

### 2.1 ファイル名変更の理由

`needle_generator.rs` → `needle_search.rs` へのリネーム理由:

1. **命名の一貫性**: `NeedleGenerator` クラスを廃止し `search_needle_pattern` 関数に変更するため、ファイル名も「検索」を示す名称に統一
2. **責務の明確化**: "Generator" はイテレータ的な生成器を連想させるが、実際は検索処理
3. **既存コードへの影響**: `needle_generator.rs` を使用する外部モジュールは `lib.rs` 経由の re-export のみであり、影響は限定的

## 3. 設計方針

### 3.1 責務の明確化

```
+-------------------+     +-------------------+     +-------------------+
| NeedleGenerator   |     | PokemonGenerator  |     | EggGenerator      |
+-------------------+     +-------------------+     +-------------------+
| - pattern 照合    |     | - PID/性格/性別  |     | - 遺伝処理        |
| - advance 特定    |     | - IV 生成         |     | - IV 継承         |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         v                         v                         v
+-----------------------------------------------------------------------+
|                         GeneratorConfig                               |
|  - Seed 解決 (SeedInput → LcgSeed)                                   |
|  - オフセット計算 (game_start → game_offset)                         |
+-----------------------------------------------------------------------+
```

### 3.2 `advance` の定義

**`advance` は `game_offset` 消費後の位置からの相対値**

```
LCG 初期化
    ↓
game_offset 分消費 (起動条件により自動計算)
    ↓
advance=0 ← ここが起点
    ↓
user_offset 分消費 (ユーザ指定)
    ↓
advance=user_offset ← 生成開始位置
```

| 項目 | 値 |
|------|-----|
| LCG ジャンプ量 | `game_offset + user_offset` |
| `advance=0` の起点 | `game_offset` 消費後の位置 |
| 生成開始位置 | `advance = user_offset` |
| 出力される `advance` | `game_offset` からの相対位置 |

**例: `user_offset=10` の場合**
- 最初に生成される個体の `advance` は `10`
- 以降 `11`, `12`, `13`... と増加

### 3.3 検索範囲パラメータの統一

現状の `advance_min` / `advance_max` は `user_offset` / `max_advance` で置き換え可能:

| 現状 | 変更後 | 意味 |
|------|--------|------|
| `advance_min` | `user_offset` | 検索開始位置 (`GeneratorConfig` に既存) |
| `advance_max` | `max_advance` | 検索終了位置 (新規追加) |

**全 Generator 共通の検索範囲パラメータ**:

```rust
pub struct SeedContext {  // 旧 GeneratorConfig
    pub input: SeedInput,
    pub version: RomVersion,
    pub game_start: GameStartConfig,
    pub user_offset: u32,   // 検索開始位置 (= advance の初期値)
    pub max_advance: u32,   // 検索終了位置 (新規)
}
```

#### GeneratorConfig 名称変更

責務: **Seed 解決 + オフセット計算 + 検索範囲指定**

| 名称案 | ニュアンス |
|--------|------------|
| `SearchConfig` | 検索設定（汎用的） |
| `SeedSearchConfig` | Seed 検索設定（Seed 解決を強調） |
| `GenerationScope` | 生成範囲（スコープを強調） |
| `SeedContext` | Seed コンテキスト（文脈情報） |

**採用: `SeedContext`** - Seed 解決とその周辺情報（オフセット・検索範囲）を包含する文脈として適切

#### PokemonGenerator / EggGenerator における max_advance の扱い

現状は `count` 引数で「生成する個体数」を指定。`max_advance` との関係:

| アプローチ | 説明 | 評価 |
|------------|------|------|
| A: count 維持 | `max_advance` は Needle 専用、Pokemon/Egg は `count` 維持 | △ パラメータ不統一 |
| B: max_advance 統一 | `count` を廃止、`max_advance` で統一 | ○ API 統一、破壊的変更 |
| C: 両方サポート | `max_advance` 優先、未指定時は `count` 使用 | △ 複雑化 |

**採用: B (max_advance 統一)**

- `generate_pokemon_list(params, count, filter)` → `generate_pokemon_list(params, filter)`
- 生成範囲は `params.context.user_offset` ～ `params.context.max_advance`
- フィルタ結果が `max_advance - user_offset` 件を超えることはない

### 3.4 Needle 検索の目的再定義

**目的**: SeedInput から生成される各 LcgSeed の乱数系列において、指定した NeedlePattern が出現する `advance` と `SeedOrigin` を返す

#### 返却する advance の定義

**パターン末尾の位置を返す** (ユーザーが最後に観測した針の位置)

```
パターン: ↑→↓ (長さ 3)

advance=10 で開始した場合:
  10: ↑ (1番目)
  11: → (2番目)  
  12: ↓ (3番目) ← 返却する advance = 12
```

| 方式 | 説明 | 採用 |
|------|------|------|
| 開始位置を返す | パターンが始まる advance | × 直感に反する |
| 末尾位置を返す | パターンが終わる advance (= 開始 + 長さ - 1) | ○ ユーザー体験に合致 |

**理由**: ユーザーは「最後に見た針」を基準に操作を開始するため、その位置を返す方が自然

#### 現状の問題

- `NeedleGeneratorBatch` はインクリメンタル処理用だが、実際のユースケースでは全件取得で十分
- Startup モードの timer0×vcount 組み合わせ爆発を懸念していたが、通常は数件程度

#### 変更案

```rust
/// レポート針パターン検索 (公開 API)
///
/// SeedInput の各 LcgSeed について、NeedlePattern が出現する位置を検索。
pub fn search_needle_pattern(
    params: &NeedleSearchParams,
) -> Result<Vec<NeedleSearchResult>, String>
```

| 項目 | 説明 |
|------|------|
| 入力 | `NeedleSearchParams` (config + pattern) |
| 出力 | 一致した全件の `Vec<NeedleSearchResult>` |
| 処理 | 各 LcgSeed で `user_offset` ～ `max_advance` を走査 |

**`NeedleGeneratorBatch` は廃止**:
- インクリメンタル処理が必要な場合は、将来的に別途検討
- 現状は同期的に全件返却で十分

### 3.5 構造の簡素化

`NeedleGeneratorBatch` 廃止に伴い、`StartupState` も不要になる可能性が高い。

`resolve_all_seeds()` を使用すれば:
- Startup モードでも全 (timer0, vcount) 組み合わせを事前解決
- 各 LcgSeed に対して単純なループで検索可能
- 複雑な状態管理が不要に

```rust
// 簡素化後のイメージ
pub fn search_needle_pattern(params: &NeedleSearchParams) -> Result<Vec<NeedleSearchResult>, String> {
    let seeds = resolve_all_seeds(&params.config.input)?;
    let game_offset = calculate_game_offset(...)?;
    
    let mut results = Vec::new();
    for (seed, origin) in seeds {
        // user_offset ～ max_advance を走査
        let matches = find_pattern_matches(seed, game_offset, &params.config, &params.pattern);
        results.extend(matches.into_iter().map(|advance| NeedleSearchResult { advance, source: origin.clone() }));
    }
    Ok(results)
}
```

## 4. 実装仕様

### 4.1 SeedContext の定義 (旧 GeneratorConfig)

```rust
/// Seed 解決 + オフセット計算 + 検索範囲設定
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SeedContext {
    /// Seed 入力
    pub input: SeedInput,
    /// ROM バージョン
    pub version: RomVersion,
    /// 起動設定
    pub game_start: GameStartConfig,
    /// 検索開始位置 (= advance の初期値)
    pub user_offset: u32,
    /// 検索終了位置 (新規追加)
    pub max_advance: u32,
}
```

### 4.2 NeedleSearchParams / NeedleSearchResult

```rust
/// レポート針パターン検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchParams {
    /// Seed 解決 + 検索範囲設定
    pub context: SeedContext,
    /// 観測したレポート針パターン
    pub pattern: NeedlePattern,
}

/// レポート針パターン検索結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// パターン開始消費位置 (game_offset からの相対)
    pub advance: u32,
    /// 生成元情報
    pub source: SeedOrigin,
}
```

**廃止する型**:
- `NeedleGeneratorParams` → `NeedleSearchParams` に置換
- `NeedleGeneratorResult` → `NeedleSearchResult` に置換
- `NeedleGeneratorBatch` → 廃止

### 4.3 公開 API

```rust
/// レポート針パターン検索 (公開 API)
///
/// SeedInput の各 LcgSeed について、NeedlePattern が出現する位置を検索。
///
/// # Arguments
/// * `params` - 検索パラメータ (context + pattern)
///
/// # Returns
/// パターンが一致した全件の結果リスト
#[wasm_bindgen]
pub fn search_needle_pattern(
    params: NeedleSearchParams,
) -> Result<Vec<NeedleSearchResult>, String> {
    // 1. 全 Seed を解決
    let seeds = resolve_all_seeds(&params.context.input)?;
    
    let mut results = Vec::new();
    
    for (seed, origin) in seeds {
        // 2. game_offset 計算
        let game_offset = calculate_game_offset(seed, params.context.version, &params.context.game_start)?;
        
        // 3. 検索範囲: user_offset ～ max_advance
        let start = params.context.user_offset;
        let end = params.context.max_advance;
        
        // 4. LCG を初期化してジャンプ
        let mut lcg = Lcg64::new(seed);
        lcg.jump(u64::from(game_offset + start));
        
        // 5. パターン検索
        for advance in start..end {
            if matches_pattern_at_seed(lcg.current_seed(), &params.pattern) {
                results.push(NeedleSearchResult {
                    advance,
                    source: origin.clone(),
                });
            }
            lcg.advance(1);
        }
    }
    
    Ok(results)
}
```

### 4.4 NeedleGenerator クラスの扱い

**採用: 廃止**

- 現状のユースケースでは関数 API (`search_needle_pattern`) で十分
- インクリメンタル処理が必要になった場合は将来的に別途検討

## 5. テスト方針

| テスト種別 | 内容 |
|------------|------|
| ユニットテスト | `search_needle_pattern` でパターン一致位置が正しく検出されること |
| ユニットテスト | `game_offset` 計算が正しく適用されること |
| ユニットテスト | `user_offset` ～ `max_advance` の範囲で検索されること |
| 統合テスト | Seeds 入力で一致位置が正しく検出されること |
| 統合テスト | Startup 入力で一致位置が正しく検出されること |
| 既存テスト | `PokemonGenerator` / `EggGenerator` の advance 起点修正後もテストが pass すること |

## 6. 実装チェックリスト

### Phase 0: 既存 Generator の advance バグ修正

- [x] `PokemonGenerator::new()` で `current_advance: cfg.user_offset` に変更
- [x] `EggGenerator::new()` で `current_advance: cfg.user_offset` に変更
- [x] 既存テストの期待値を確認・修正

### Phase 1: GeneratorConfig → SeedContext リネーム + max_advance 追加

- [x] `GeneratorConfig` を `SeedContext` にリネーム
- [x] `SeedContext` に `max_advance: u32` フィールドを追加
- [x] 既存の `PokemonGeneratorParams` / `EggGeneratorParams` のフィールド名を `config` → `context` に変更
- [x] `generate_pokemon_list` / `generate_egg_list` の `count` 引数を廃止

### Phase 2: Needle 検索 API 実装

- [x] `NeedleSearchParams` 型を `types/needle.rs` に追加
- [x] `NeedleSearchResult` 型を `types/needle.rs` に追加
- [x] `needle_search.rs` ファイルを新規作成
- [x] `search_needle_pattern` 関数を実装
- [x] `misc/mod.rs` でモジュール宣言を追加
- [x] WASM 公開設定

### Phase 3: 旧 API 廃止

- [x] `needle_generator.rs` を削除
- [x] `misc/mod.rs` から旧モジュール宣言を削除
- [x] `lib.rs` の re-export 調整 (`search_needle_pattern` を公開)

### Phase 4: 検証

- [x] `cargo test` 全件 pass
- [x] `cargo clippy --all-targets -- -D warnings` 警告なし
- [x] `cargo fmt --check` 差分なし
