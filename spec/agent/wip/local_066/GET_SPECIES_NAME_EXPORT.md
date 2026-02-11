# get_species_name WASM Export 仕様書

## 1. 概要

### 1.1 目的

Rust 内部関数 `data::names::get_species_name(species_id, locale)` を `#[wasm_bindgen]` で JS にエクスポートし、
TS 側から種族 ID → 種族名の変換を可能にする。

ポケモンリスト生成 (local_064) の種族フィルタ UI で、エンカウントスロット内のポケモン名を表示するために必要。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| species_id | 全国図鑑番号 (1–649)。Gen5 の全ポケモンに対応 |
| get_species_name | `(species_id: u16, locale: &str) -> &'static str` を返す Rust 内部関数。`data::names` モジュールに定義済み |

### 1.3 背景・問題

- `get_species_name` は `data::names` モジュールに定義済みで、`resolve_pokemon_data` / `resolve_egg_data` の内部で使用されている
- TS 側からは `resolve_pokemon_data_batch` / `resolve_egg_data_batch` 経由でのみ種族名を取得でき、species_id 単体から名前を引く手段がない
- ポケモンリスト生成 (local_064) のフィルタ UI でエンカウントスロット内のポケモン名を表示するために、独立した名前解決関数が必要

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| TS からの直接呼び出し | species_id → 種族名の O(1) 変換 |
| 既存資産の活用 | 内部テーブル (`SPECIES_NAMES_JA/EN`) を再利用し、重複データを持たない |

### 1.5 着手条件

- 特になし (既存コードの export 追加のみ)

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/lib.rs` | 変更 | `get_species_name` の wasm_bindgen export 関数を追加 |
| `src/wasm/wasm_pkg.d.ts` | 自動生成 | `wasm-pack build` で型定義が自動追加される |
| `src/test/integration/species-name.test.ts` | 新規 | 統合テスト |

---

## 3. 設計方針

### 3.1 API 設計

```typescript
// 生成される TypeScript 型定義
export function get_species_name(species_id: number, locale: string): string;
```

- 既存の `data::names::get_species_name` をそのままラップ
- 範囲外 (0 または 650 以上) は `"???"` を返す (既存動作を維持)

### 3.2 実行場所

メインスレッド。UI 表示用の軽量同期呼び出しであり、Worker に委譲する必要はない。

---

## 4. 実装仕様

### 4.1 lib.rs への追加

```rust
/// 種族名を取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
/// * `locale` - ロケール (`"ja"` または `"en"`)
///
/// # Returns
/// 種族名。範囲外の場合は `"???"` を返す。
#[wasm_bindgen]
pub fn get_species_name(species_id: u16, locale: &str) -> String {
    data::get_species_name(species_id, locale).to_string()
}
```

- 内部関数は `&'static str` を返すが、wasm_bindgen は `&str` の返却をサポートしないため `String` に変換する
- 関数名は内部関数と同名 (`get_species_name`) で統一する。`lib.rs` に同名の `pub use` は存在しないため名前衝突は発生しない

### 4.2 名前衝突について

`lib.rs` に `get_species_name` の `pub use` は存在しない。
`data/mod.rs` の `pub use names::{get_nature_name, get_species_name}` により `crate::data::get_species_name` としてアクセス可能だが、`lib.rs` のトップレベル名前空間には影響しない。

よって `#[wasm_bindgen]` ラッパー関数を `lib.rs` に定義するだけでよく、名前衝突の回避策は不要。

---

## 5. テスト方針

### 5.1 Rust ユニットテスト

既存テスト (`data::names::tests`) でカバー済み:

- `test_get_species_name_bulbasaur`: ID 1 → "フシギダネ" (ja) / "Bulbasaur" (en)
- `test_get_species_name_pikachu`: ID 25 → "ピカチュウ" (ja) / "Pikachu" (en)
- `test_get_species_name_out_of_range`: ID 0 / 650 → "???"

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| WASM export 呼び出し | `get_species_name(25, 'ja')` → `'ピカチュウ'` |
| 英語ロケール | `get_species_name(25, 'en')` → `'Pikachu'` |
| 範囲外 | `get_species_name(0, 'ja')` → `'???'` |

---

## 6. 実装チェックリスト

- [x] `wasm-pkg/src/lib.rs` — `#[wasm_bindgen] pub fn get_species_name` 追加
- [x] `pnpm build:wasm` で型定義の自動生成を確認
- [x] `cargo test` — 既存テスト通過確認
- [x] `cargo clippy --all-targets -- -D warnings` — lint 通過確認
- [x] `src/test/integration/species-name.test.ts` — 統合テスト
