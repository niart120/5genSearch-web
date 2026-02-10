# WASMバインディング検証 仕様書

## 1. 概要

### 1.1 目的

TypeScript から呼び出し可能な WASM API の網羅性を確認し、フロントエンド実装に必要な API が揃っているかを検証する。不足があれば `wasm_bindgen` 属性の付与漏れを修正する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| wasm_bindgen | Rust と JavaScript/TypeScript 間のバインディングを生成するライブラリ |
| tsify | Rust 構造体から TypeScript 型定義を自動生成するライブラリ |
| d.ts | TypeScript 型定義ファイル (`packages/wasm/wasm_pkg.d.ts`) |
| Searcher | 逐次バッチ処理を行う検索器クラス |
| Generator | 個体リストを一括生成する関数 |
| GPU API | WebGPU による並列計算 API (`gpu` feature flag で有効化) |

### 1.3 背景・問題

ロードマップ Phase 1「WASMバインディング検証」タスクにおいて、以下の確認が必要:

1. **d.ts と実装の差異確認**: TypeScript から呼び出し可能な API の網羅性
2. **bindgen 付与漏れ修正**: `generate_pokemon_list` 等のフロントエンド必須 API
3. **GPU API 確認**: feature flag によるビルド分岐と API 公開状態
4. **ヘルスチェック**: `health_check()` の動作確認

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| API 網羅性 | フロントエンドに必要な全 API が TypeScript から利用可能 |
| 型安全性 | tsify による正確な TypeScript 型定義 |
| GPU 対応方針決定 | GPU 有無での動的切り替え設計の確立 |

### 1.5 着手条件

- WASM ビルドが正常に動作すること (`pnpm build:wasm`)
- `packages/wasm/wasm_pkg.d.ts` が最新状態であること

## 2. 現状分析

### 2.1 公開済み API 一覧 (d.ts 確認結果)

#### 2.1.1 検索器クラス (Searcher)

| クラス名 | 説明 | 状態 |
|----------|------|------|
| `EggDatetimeSearcher` | 孵化起動時刻検索器 | 公開済み |
| `MtseedDatetimeSearcher` | MT Seed 起動時刻検索器 | 公開済み |
| `MtseedSearcher` | MT Seed 検索器 (IV→Seed) | 公開済み |
| `TrainerInfoSearcher` | TID/SID 起動時刻検索器 | 公開済み |

#### 2.1.2 タスク生成関数

| 関数名 | 説明 | 状態 |
|--------|------|------|
| `generate_egg_search_tasks` | 孵化検索タスク生成 | 公開済み |
| `generate_mtseed_search_tasks` | MT Seed 検索タスク生成 | 公開済み |
| `generate_trainer_info_search_tasks` | TID/SID 検索タスク生成 | 公開済み |

#### 2.1.3 ユーティリティ関数

| 関数名 | 説明 | 状態 |
|--------|------|------|
| `health_check` | WASM 読み込み確認 | 公開済み |
| `init` | WASM 初期化 (`start` 属性) | 公開済み |
| `get_key_combination_count` | キー組み合わせ総数取得 | 公開済み |
| `get_needle_pattern_at` | 針パターン取得 | 公開済み |
| `resolve_seeds` | Seed 解決 | 公開済み |
| `search_needle_pattern` | 針パターン検索 | 公開済み |
| `split_search_range` | 検索範囲分割 | 公開済み |

#### 2.1.4 解決 (Resolve) 関数

| 関数名 | 説明 | 状態 |
|--------|------|------|
| `resolve_pokemon_data_batch` | ポケモンデータ解決 | 公開済み |
| `resolve_egg_data_batch` | 卵データ解決 | 公開済み |

### 2.2 未公開 API (bindgen 付与漏れ)

以下の API は Rust 側で `pub fn` として定義されているが、`wasm_bindgen` 属性がないため TypeScript から呼び出せない:

| 関数名 | ファイル | 説明 | 必要性 |
|--------|----------|------|--------|
| `generate_pokemon_list` | `generation/flows/generator/mod.rs` | ポケモン一括生成 | 高 (ポケモンリスト機能) |
| `generate_egg_list` | `generation/flows/generator/mod.rs` | タマゴ一括生成 | 高 (孵化個体リスト機能) |

### 2.3 GPU API 状態

GPU API は `gpu` feature flag で有効化される条件付きコンパイル:

| クラス/関数 | 説明 | 状態 |
|-------------|------|------|
| `GpuDatetimeSearchIterator` | GPU 起動時刻検索 | `#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]` で条件付き公開 |
| `GpuSearchBatch` | GPU 検索バッチ結果 | tsify で型のみ公開 |
| `GpuDeviceContext` | GPU デバイスコンテキスト | 内部使用のみ (未公開) |
| `GpuProfile` | GPU プロファイル | 内部使用のみ (未公開) |
| `SearchJobLimits` | 検索ジョブ制限 | 内部使用のみ (未公開) |

## 3. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/generation/flows/generator/mod.rs` | 変更 | 値渡しに変更し `wasm_bindgen` 属性追加 |
| `src/test/wasm-binding.test.ts` | 新規 | API 動作確認テスト |

## 4. 設計方針

### 4.1 API 公開方針

1. **Generator 関数の公開**: `generate_pokemon_list` と `generate_egg_list` に `wasm_bindgen` 属性を付与
2. **型変換**: `Vec<SeedOrigin>` は `serde-wasm-bindgen` により JavaScript 配列として受け渡し
3. **エラーハンドリング**: `Result<Vec<T>, String>` は JavaScript 例外として伝播

### 4.2 GPU API 方針

1. **標準ビルド**: `gpu` feature なしでビルド (GPU API は含まれない)
2. **GPU ビルド**: 別途 `--features gpu` でビルドし、GPU 対応版として提供
3. **動的検出**: フロントエンドで `navigator.gpu` の有無を確認し、適切なモジュールをロード

### 4.3 API シグネチャ設計

```rust
// generate_pokemon_list のシグネチャ (値渡しに変更して直接 wasm_bindgen 付与)
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_pokemon_list(
    origins: Vec<SeedOrigin>,
    params: PokemonGenerationParams,
    config: GenerationConfig,
    filter: Option<PokemonFilter>,
) -> Result<Vec<GeneratedPokemonData>, JsValue>;

// generate_egg_list のシグネチャ (値渡しに変更して直接 wasm_bindgen 付与)
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_egg_list(
    origins: Vec<SeedOrigin>,
    params: EggGenerationParams,
    config: GenerationConfig,
    filter: Option<EggFilter>,
) -> Result<Vec<GeneratedEggData>, JsValue>;
```

## 5. 実装仕様

### 5.1 wasm_bindgen 属性付与

`wasm-pkg/src/generation/flows/generator/mod.rs` の関数を値渡しに変更し、直接 `wasm_bindgen` を付与:

```rust
use wasm_bindgen::prelude::*;

/// ポケモン一括生成 (公開 API)
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_pokemon_list(
    origins: Vec<SeedOrigin>,
    params: PokemonGenerationParams,
    config: GenerationConfig,
    filter: Option<PokemonFilter>,
) -> Result<Vec<GeneratedPokemonData>, JsValue> {
    // 内部処理では参照として使用
    // ...
}

/// タマゴ一括生成 (公開 API)
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_egg_list(
    origins: Vec<SeedOrigin>,
    params: EggGenerationParams,
    config: GenerationConfig,
    filter: Option<EggFilter>,
) -> Result<Vec<GeneratedEggData>, JsValue> {
    // 内部処理では参照として使用
    // ...
}
```

### 5.2 テストコード

`src/test/wasm-binding.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import init, {
  health_check,
  resolve_seeds,
  generate_pokemon_list,
  generate_egg_list,
  resolve_pokemon_data_batch,
  resolve_egg_data_batch,
} from '@5gen-search/wasm';

describe('WASM Binding Verification', () => {
  beforeAll(async () => {
    await init();
  });

  describe('health_check', () => {
    it('should return ready message', () => {
      const result = health_check();
      expect(result).toBe('wasm-pkg is ready');
    });
  });

  describe('resolve_seeds', () => {
    it('should resolve seed from direct specification', () => {
      const spec = {
        type: 'Seeds' as const,
        seeds: [0x123456789ABCDEFn],
      };
      const origins = resolve_seeds(spec);
      expect(origins.length).toBe(1);
      expect(origins[0].Seed).toBeDefined();
    });
  });

  describe('generate_pokemon_list', () => {
    it('should be callable', () => {
      expect(typeof generate_pokemon_list).toBe('function');
    });
  });

  describe('generate_egg_list', () => {
    it('should be callable', () => {
      expect(typeof generate_egg_list).toBe('function');
    });
  });
});
```

## 6. テスト方針

### 6.1 ユニットテスト

| テスト対象 | 検証内容 |
|------------|----------|
| `health_check` | `"wasm-pkg is ready"` が返却されること |
| `resolve_seeds` | `Seeds` / `Startup` 両方の形式で正常動作 |
| `generate_pokemon_list` | 関数が存在し呼び出し可能であること |
| `generate_egg_list` | 関数が存在し呼び出し可能であること |
| `resolve_pokemon_data_batch` | 解決結果が正しい形式であること |
| `resolve_egg_data_batch` | 解決結果が正しい形式であること |

### 6.2 統合テスト

| テスト対象 | 検証内容 |
|------------|----------|
| 個体生成フロー | `resolve_seeds` → `generate_pokemon_list` → `resolve_pokemon_data_batch` |
| 孵化生成フロー | `resolve_seeds` → `generate_egg_list` → `resolve_egg_data_batch` |

### 6.3 d.ts 検証

| 検証項目 | 方法 |
|----------|------|
| 型定義の網羅性 | ビルド後に `wasm_pkg.d.ts` を確認 |
| 新規 API の追加 | `generate_pokemon_list` / `generate_egg_list` が型定義に含まれること |

## 7. 実装チェックリスト

### 7.1 API 網羅性確認

- [x] d.ts と Rust 実装の差異確認
- [x] 未公開 API のリストアップ

### 7.2 bindgen 付与修正

- [x] `generate_pokemon_list` に wasm_bindgen 付与（値渡しに変更）
- [x] `generate_egg_list` に wasm_bindgen 付与（値渡しに変更）
- [x] WASM ビルド確認 (`pnpm build:wasm`)
- [x] d.ts に新規 API が含まれることを確認

### 7.3 GPU API 確認

- [x] `gpu` feature flag によるビルド分岐確認
- [x] `GpuDatetimeSearchIterator` の公開状態確認
- [x] GPU 有効時の d.ts 差分確認

### 7.4 ヘルスチェック

- [x] `health_check()` テスト作成
- [x] Vitest による動作確認

### 7.5 テスト

- [x] `src/test/wasm-binding.test.ts` 作成
- [x] 全テストパス確認

### 7.6 bigint 変換問題

- [x] `SeedSpec` に `large_number_types_as_bigints` 追加
- [x] `SeedOrigin` に `large_number_types_as_bigints` 追加
- [x] `resolve_seeds` テストがパスすることを確認

## 8. 備考

### 8.1 命名規則

- Rust 関数: `generate_pokemon_list` (スネークケース)
- wasm_bindgen 公開関数: 同名（値渡しに変更して直接公開）
- TypeScript 型: 自動生成 (tsify による PascalCase)

### 8.2 型変換の注意点

| Rust 型 | TypeScript 型 | 備考 |
|---------|---------------|------|
| `u64` / `LcgSeed` | `bigint` | `large_number_types_as_bigints` で変換 |
| `u32` / `MtSeed` | `number` | safe integer 範囲内 |
| `Vec<T>` | `T[]` | serde-wasm-bindgen で配列変換 |
| `Option<T>` | `T \| undefined` | tsify で nullable 変換 |
| `Result<T, E>` | 例外スロー | エラー時は JavaScript 例外 |

### 8.3 GPU ビルド方法

```bash
# 標準ビルド (GPU なし)
pnpm build:wasm

# GPU 有効ビルド
cd wasm-pkg
wasm-pack build --target web --release --features gpu
```
