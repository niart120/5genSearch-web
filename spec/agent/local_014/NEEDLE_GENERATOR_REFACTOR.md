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
| GeneratorConfig | Seed 解決 + オフセット計算の共通設定 |

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
| `wasm-pkg/src/types/generation.rs` | 変更 | `NeedleGeneratorParams` / `NeedleGeneratorResult` 型を追加 |
| `wasm-pkg/src/types/mod.rs` | 変更 | 新規型の re-export 追加 |
| `wasm-pkg/src/misc/needle_generator.rs` | 変更 | 型定義削除、`GeneratorConfig` 導入、ロジック簡素化 |
| `wasm-pkg/src/generation/seed_resolver.rs` | 変更 | Iterator 版 Seed 解決関数を追加 (オプション) |
| `wasm-pkg/src/lib.rs` | 変更 | re-export の調整 |

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

### 3.3 NeedleGenerator のオフセット要件

**結論: NeedleGenerator はオフセット計算が必要**

| 項目 | 説明 |
|------|------|
| 理由 | Pokemon/Egg と同じ起動条件で「advance 50 で目的の個体」なら、針も「advance 50 で一致」であるべき |
| 動作 | `advance_min` / `advance_max` は `game_offset` からの相対位置として解釈 |
| LCG ジャンプ | `game_offset + advance_min` 分ジャンプして検索開始 |

### 3.4 構造の簡素化

現状の `StartupState` (17フィールド) を分解:

| 責務 | 現状 | 変更後 |
|------|------|--------|
| SHA-1 パラメータ | `base_message`, `date_code`, `time_code` | `SeedIterator` (新規) に移譲 |
| イテレーション状態 | `current_timer0`, `current_vcount`, etc. | `SeedIterator` に移譲 |
| 進捗管理 | `total_combinations`, `processed_combinations` | Generator 本体に残す |

### 3.5 設計オプション

#### オプション A: seed_resolver に Iterator 版追加

```rust
// seed_resolver.rs
pub struct SeedIterator { ... }

impl Iterator for SeedIterator {
    type Item = (LcgSeed, SeedOrigin);
    fn next(&mut self) -> Option<Self::Item> { ... }
}
```

- メリット: Seed 解決ロジックを完全に一本化
- デメリット: `seed_resolver` に状態管理が入る

#### オプション B: NeedleGenerator 内で簡素化のみ

- `StartupState` のフィールドを整理
- SHA-1 計算は現状維持 (パフォーマンス考慮)
- 型定義のみ `types/` に移動

**推奨: オプション B** (最小限の変更でリスク低減)

## 4. 実装仕様

### 4.1 新規型定義 (types/generation.rs)

```rust
/// レポート針 Generator パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleGeneratorParams {
    /// Seed 解決 + オフセット設定
    pub config: GeneratorConfig,
    /// 観測したレポート針パターン
    pub pattern: NeedlePattern,
    /// 検索開始消費位置 (オフセット適用後)
    pub advance_min: u32,
    /// 検索終了消費位置 (オフセット適用後)
    pub advance_max: u32,
}

/// レポート針生成結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleGeneratorResult {
    /// パターン開始消費位置
    pub advance: u32,
    /// 生成元情報
    pub source: SeedOrigin,
}

/// レポート針生成バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleGeneratorBatch {
    /// 一致した結果
    pub results: Vec<NeedleGeneratorResult>,
    /// 処理済み件数
    pub processed: u64,
    /// 総件数
    pub total: u64,
}
```

### 4.2 NeedleGenerator 変更後

```rust
// misc/needle_generator.rs (概要)

use crate::types::{
    GeneratorConfig, NeedleGeneratorBatch, NeedleGeneratorParams, NeedleGeneratorResult,
    NeedlePattern, SeedInput, SeedOrigin,
};

#[wasm_bindgen]
pub struct NeedleGenerator {
    pattern: NeedlePattern,
    // オフセット適用後の範囲
    effective_advance_min: u32,
    effective_advance_max: u32,
    // 内部状態
    state: GeneratorState,
}

impl NeedleGenerator {
    pub fn new(params: NeedleGeneratorParams) -> Result<Self, String> {
        // 1. GeneratorConfig からオフセット計算
        let game_offset = calculate_game_offset(&params.config)?;
        let total_offset = params.config.user_offset + game_offset;

        // 2. オフセット適用後の範囲
        let effective_min = params.advance_min + total_offset;
        let effective_max = params.advance_max + total_offset;

        // 3. 状態初期化 (現状ロジック維持)
        let state = match &params.config.input {
            SeedInput::Seeds { seeds } => { ... }
            SeedInput::Startup { .. } => { ... }
        };

        Ok(Self { ... })
    }
}
```

### 4.3 オフセット計算の共通化

現在 `generator.rs` にある `calculate_game_offset` を `generation/algorithm/game_offset.rs` からインポートするだけで対応可能 (既に公開済み)。

## 5. テスト方針

| テスト種別 | 内容 |
|------------|------|
| ユニットテスト | `NeedleGeneratorParams` の `GeneratorConfig` からのオフセット計算 |
| ユニットテスト | オフセット適用後の advance 範囲が正しいこと |
| 統合テスト | Seeds 入力 + オフセット適用で一致位置が正しく検出されること |
| 統合テスト | Startup 入力 + オフセット適用で一致位置が正しく検出されること |
| 既存テスト | 既存テストが引き続き pass すること (オフセット=0 で互換性確認) |

## 6. 実装チェックリスト

### Phase 0: 既存 Generator の advance バグ修正

- [ ] `PokemonGenerator::new()` で `current_advance: cfg.user_offset` に変更
- [ ] `EggGenerator::new()` で `current_advance: cfg.user_offset` に変更
- [ ] 既存テストの期待値を確認・修正

### Phase 1: 型の移動

- [ ] `NeedleGeneratorParams` を `types/generation.rs` に移動
- [ ] `NeedleGeneratorResult` を `types/generation.rs` に移動
- [ ] `NeedleGeneratorBatch` を `types/generation.rs` に移動
- [ ] `types/mod.rs` の re-export 更新
- [ ] `misc/needle_generator.rs` から型定義を削除、import 追加
- [ ] `lib.rs` の re-export 調整

### Phase 2: GeneratorConfig 導入

- [ ] `NeedleGeneratorParams.input` を `NeedleGeneratorParams.config: GeneratorConfig` に変更
- [ ] `NeedleGenerator::new()` でオフセット計算を追加
- [ ] オフセット適用後の advance 範囲で動作するよう修正
- [ ] 既存テストの修正 (config 構造に合わせる)

### Phase 3: 内部構造の簡素化 (オプション)

- [ ] `StartupState` のフィールド整理
- [ ] 不要な `#[allow(dead_code)]` 削除
- [ ] 進捗計算ロジックの見直し

### Phase 4: 検証

- [ ] `cargo test` 全件 pass
- [ ] `cargo clippy --all-targets -- -D warnings` 警告なし
- [ ] `cargo fmt --check` 差分なし
