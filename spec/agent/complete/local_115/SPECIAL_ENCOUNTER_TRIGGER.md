# 特殊エンカウント発生表示・絞り込み仕様書

## 1. 概要

### 1.1 目的

ポケモンリストで、特殊エンカウントが発生する消費位置を一覧から確認し、発生する行だけに絞り込めるようにする。

対象は `ShakingGrass`、`DustCloud`、`SurfingBubble`、`FishingBubble`、`PokemonShadow` とする。既存の乱数判定 `special_encounter_trigger()` と、生成済みの `SpecialEncounterInfo.triggered` を再利用し、発生判定ロジックは追加・変更しない。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 特殊エンカウント | `ShakingGrass`、`DustCloud`、`SurfingBubble`、`FishingBubble`、`PokemonShadow` の5種のエンカウント種別 |
| 発生判定 | `GeneratedPokemonData.special_encounter` に含まれる `SpecialEncounterInfo.triggered`。`true` は発生、`false` は非発生を表す |
| 発生列 | 結果テーブルで発生判定を既存実装と同じ `〇` / `×` として表示する条件付き列 |
| 発生のみ | `PokemonFilter.special_encounter_triggered == Some(true)` を指定し、発生判定が `true` の結果だけを残す検索条件 |
| 結果コンテキスト | 表示中の結果を生成したときの `EncounterType`。フォームの現在値から独立して保持する非永続化状態 |

### 1.3 背景・問題

事実:

- `wasm-pkg/src/generation/algorithm/encounter.rs` は `special_encounter_trigger()` を実装済みである。
- `GeneratedPokemonData.special_encounter` は特殊エンカウント時の発生判定を保持し、`resolve_pokemon_data_batch()` は UI 用の `special_encounter_triggered` を `〇` / `×` として解決済みである。
- 現在の発生判定は結果詳細ダイアログでのみ確認でき、結果テーブルの列と検索条件には存在しない。
- `PokemonFilter` は種族、レベル、持ち物、エンカウント結果を条件にできるが、特殊エンカウントの発生判定を条件にできない。
- `PokemonListPage` の列構成はフォームの `encounterType` を使っていない。一方、非永続化の検索結果ストアには生成時のエンカウント種別が残らないため、特殊結果を検出できても列見出しを種別ごとに確定できない。

決定:

- `DustCloud` の日本語表示は既存の `getEncounterMethodName('DustCloud', 'ja')` が返す「土煙」を使う。名称を「砂煙」へ変更する作業は対象外とする。
- 結果の列構成はフォームの現在選択ではなく結果コンテキストで決める。検索後にフォームを変更しても、既存の結果の列構成は変えない。

未検証:

- 実機上で特殊エンカウント発生列を使った操作確認は、この仕様書作成時点では行っていない。今回の変更は既存の生成判定とテストデータを対象にする。

### 1.4 期待効果

| 項目 | 期待効果 |
|------|----------|
| 可視性 | 特殊エンカウント結果では、各消費位置の発生可否を結果詳細を開かずに確認できる |
| 絞り込み | 発生する消費位置だけを WASM 検索結果として返せる |
| 表示整合性 | フォーム変更後も、表示済み結果の列見出しと結果の種別が食い違わない |
| 既存動作 | 通常・固定エンカウントの列構成、詳細ダイアログ、既存フィルターの動作を変えない |

### 1.5 着手条件

- [Issue #154](https://github.com/niart120/5genSearch-web/issues/154) を要求の一次情報とする。
- `special_encounter_trigger()` と `SpecialEncounterInfo.triggered` の既存の意味を変えない。
- TypeScript 側の WASM 型変更後は `pnpm build:wasm:dev` で `src/wasm/` の生成物を更新する。
- ハードウェア、外部通信、データ取得を必要としない。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/filter.rs` | 更新・テスト追加 | `PokemonFilter.special_encounter_triggered: Option<bool>` と一致判定を追加する |
| `src/features/pokemon-list/components/encounter-constants.ts` | 更新 | 5種の特殊エンカウントを一元定義し、フォームと結果列で共有する判定ヘルパーを追加する |
| `src/features/pokemon-list/components/pokemon-filter-form.tsx` | 更新 | 特殊エンカウント時だけ「発生のみ」チェックボックスを表示し、非表示時は親の検索条件から除外する |
| `src/features/pokemon-list/store.ts` | 更新・テスト追加 | 結果コンテキストとして生成時の `EncounterType` を非永続化状態に保持する |
| `src/features/pokemon-list/hooks/use-pokemon-list.ts` | 更新 | 検索開始時に結果コンテキストを記録し、ページへ返す |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 更新 | 結果コンテキストを列生成へ渡し、`PokemonFilter` 統合時に発生条件を WASM へ渡す |
| `src/features/pokemon-list/components/pokemon-result-columns.tsx` | 更新 | 結果コンテキストが特殊エンカウントの場合に、針の直後へ発生列を挿入する |
| `src/i18n/locales/*/messages.po` / `messages.ts` | 更新・生成 | 「発生のみ」チェックボックスの表示文言を追加し、Lingui カタログを更新する |
| `src/test/components/features/pokemon-filter-form.test.tsx` | 更新 | 条件付きチェックボックスの表示、値の伝播、種別変更時の条件除外を検証する |
| `src/test/components/features/pokemon-result-columns.test.tsx` | 新規 | 発生列の有無、位置、見出し、`〇` / `×` 表示を検証する |
| `src/test/unit/features/pokemon-list-store.test.ts` | 更新 | 結果コンテキストが非永続化で、フォーム種別の更新・リセット後も保持されることを検証する |
| `src/wasm/wasm_pkg.d.ts` ほか WASM 生成物 | 再生成 | Rust の `PokemonFilter` 型変更を TypeScript 型へ反映する |

## 3. 設計方針

### 3.1 判定の責務

発生有無の真偽値は Rust の `GeneratedPokemonData.special_encounter` を唯一の情報源とする。UI 用の `UiPokemonData.special_encounter_triggered` は表示用の `String` であり、検索条件の判定には使わない。

`PokemonFilter.special_encounter_triggered` は `Option<bool>` とする。

| 条件値 | `special_encounter` | `triggered` | 一致結果 |
|--------|---------------------|-------------|----------|
| `None` | 任意 | 任意 | 通過 |
| `Some(true)` | `Some` | `true` | 通過 |
| `Some(true)` | `Some` | `false` | 不通過 |
| `Some(true)` | `None` | 該当なし | 不通過 |
| `Some(false)` | `Some` | `false` | 通過 |

初回 UI は `Some(true)` だけを設定する。「非発生のみ」が必要になった場合は同じ型で `Some(false)` を利用できる。

### 3.2 特殊エンカウント種別の一元化

5種の判定をフォームと結果列へ個別に重複させない。`encounter-constants.ts` に TypeScript 側の専用ヘルパーを置き、次の用途で共有する。

- フォームで「発生のみ」を表示するか判定する。
- 生成時の結果コンテキストから発生列を表示するか判定する。

列見出しは新しい名前表を作らず、`getEncounterMethodName(encounterType, locale)` を使う。日本語の `DustCloud` は「土煙」、英語は `Dust Cloud` となる。

Rust 側には同じ5種を判定する `is_special_encounter_type()` がすでに存在する。WASM 境界を越えて Rust の述語を UI ごとに呼ぶと、フォーム描画のためだけに非同期 API を増やすことになるため、今回の UI では TypeScript 側の共有ヘルパーを持つ。将来 `EncounterType` を追加する場合は、Rust と TypeScript の両方の特殊種別定義を同じ変更単位で更新する。

### 3.3 結果コンテキスト

`usePokemonList()` が検索を開始する時点の `params.encounter_type` をストアへ記録する。ストア上の結果と同じく非永続化とし、Zustand の `partialize` には含めない。

結果テーブルはこの値で列構成を決める。フォームの `encounterParams.encounterType` は検索前の入力とフィルター UI の表示だけに使い、既存結果の列構成には使わない。

新しい検索の開始時は、古い結果を消去すると同時に結果コンテキストを今回の種別へ置き換える。これらは個別の setter 呼び出しではなく、単一 action で同時に更新する。フォームのリセットは既存仕様どおり結果を保持するため、結果コンテキストも保持する。

### 3.4 フィルターの表示と伝播

`PokemonFilterForm` は現在選択中の種別が特殊エンカウントのときだけ「発生のみ」を表示する。チェック時は `special_encounter_triggered: true`、解除時は `undefined` を内部フィルターへ設定する。

種別変更でチェックボックスを非表示にする場合、既存の持ち物・エンカウント結果フィルターと同じ effect で、親へ渡す値から `special_encounter_triggered` を `undefined` にする。内部状態は保持してよいが、通常・固定エンカウントの検索リクエストに条件を残してはならない。

`hasAnyFilter()` と `PokemonListPage` の `mergedFilter` は、このフィールドを含める。フィルター全体が無効な場合は従来どおり `undefined` を渡す。

### 3.5 結果列

`createPokemonResultColumns()` の引数に結果コンテキストを追加する。特殊エンカウントである場合だけ、`advance`、`needle` の直後に次の列を挿入する。

| 属性 | 仕様 |
|------|------|
| 列 ID | `special_encounter_triggered` |
| 見出し | 結果コンテキストの既存表示名。例: `DustCloud` は「土煙」 |
| 値 | `UiPokemonData.special_encounter_triggered` の `〇` / `×`。値が `undefined` の場合は空文字列とする |
| 対象外 | 通常、固定、卵など、特殊エンカウント以外では列を生成しない |
| 非対象情報 | `special_encounter_direction` は一覧列・絞り込み条件に追加しない |

列の有無は UI 行の個別値ではなく結果コンテキストで決める。検索結果が空でも、特殊エンカウントとして実行した結果領域の列定義は同じ規則になる。

## 4. 実装仕様

### 4.1 Rust フィルター

`PokemonFilter` に serde/tsify 対象の省略可能フィールドを追加する。

```rust
#[serde(default)]
pub special_encounter_triggered: Option<bool>,
```

`PokemonFilter::any()` では `None` に初期化する。`PokemonFilter::matches()` は既存の共通条件、種族、レベル、持ち物、エンカウント結果の判定を維持した上で、指定時だけ `data.special_encounter` の存在と `triggered` の一致を確認する。

### 4.2 フロントエンドの型と状態

`DEFAULT_FILTER`、`hasAnyFilter()`、`mergedFilter` に `special_encounter_triggered` を加える。型は WASM 生成型を使用し、`any`、型アサーション、`null` を追加しない。

結果ストアには `resultEncounterType: EncounterType | undefined` と、検索開始時にこれを設定する action を追加する。永続化済みのフォーム状態の形は変更しないため、persist の migration、`name`、`version` は変更しない。

### 4.3 UI 操作

1. 利用者が特殊エンカウント種別を選ぶと、フィルター展開部に Lingui 管理下の「発生のみ」チェックボックスを表示する。
2. チェックすると親へ渡す `PokemonFilter` に `special_encounter_triggered: true` を含める。
3. 検索実行時、WASM は発生した行だけを返す。
4. 利用者が通常・固定種別へ変更するとチェックボックスを隠し、次回検索へ渡す条件から発生条件を除外する。
5. 検索後に利用者がフォーム種別を変更しても、結果テーブルは検索時の種別で決めた列を維持する。

### 4.4 対象外

- 発生方向の一覧表示・絞り込み
- 64-bit Seed、判定乱数値、上位32-bit値の一覧表示
- `special_encounter_trigger()` を含む新しい乱数判定
- 土煙内のポケモン・アイテム内容を表す追加列
- エンカウント種別名称の変更。「土煙」は既存名称を使う

## 5. テスト方針

### 5.1 TDD テスト一覧

| 順序 | 分類 | 対象 | 検証内容 |
|------|------|------|----------|
| 1 | Rust ユニット | `PokemonFilter::matches()` | `None` では特殊情報の有無を問わず通過する |
| 2 | Rust ユニット | `PokemonFilter::matches()` | `Some(true)` は `triggered == true` の特殊結果だけを通す |
| 3 | Rust ユニット | `PokemonFilter::matches()` | `Some(true)` は非特殊結果と `triggered == false` を通さない |
| 4 | Rust ユニット | `PokemonFilter::matches()` | 将来利用する `Some(false)` が非発生の特殊結果だけを通す |
| 5 | コンポーネント | `PokemonFilterForm` | 5種では「発生のみ」を表示し、通常・固定では表示しない |
| 6 | コンポーネント | `PokemonFilterForm` | チェックと解除がそれぞれ `true` と `undefined` を親へ伝播する |
| 7 | コンポーネント | `PokemonFilterForm` | 特殊種別から通常種別へ変更すると、親へ渡す発生条件が `undefined` になる |
| 8 | コンポーネント | `createPokemonResultColumns()` | `DustCloud` のとき針の直後に「土煙」列を生成し、`〇` / `×` を表示する |
| 9 | コンポーネント | `createPokemonResultColumns()` | 他の4種でも既存のローカライズ名を列見出しにする |
| 10 | コンポーネント | `createPokemonResultColumns()` | 通常・固定種別では発生列を生成しない |
| 11 | ユニット | ポケモンリストストア | 結果コンテキストは検索結果とともに管理され、`partialize` の出力に含まれない |
| 12 | ユニット | ポケモンリストストア | 検索後にフォーム種別を変更・リセットしても、記録済み結果コンテキストを保持する |
| 13 | 国際化 | Lingui カタログ | 「発生のみ」表示文言を抽出・コンパイルし、日本語・英語カタログに残す |

### 5.2 実行コマンド

実装後は変更範囲に応じて次を実行する。

```powershell
cargo test --package wasm-pkg
pnpm build:wasm:dev
pnpm test:run --project unit
pnpm exec tsc -b --noEmit
pnpm lingui:extract
pnpm lingui:compile
pnpm format:check
pnpm lint
cargo fmt --check
git diff --check
```

## 6. 実装チェックリスト

- [x] Issue #154、既存の発生判定、表示用データ、フォーム・結果ストアの現状を確認する
- [x] `DustCloud` の日本語表示を「土煙」として固定し、名称変更を対象外にする
- [x] 仕様書を作成し、検証後に `spec/agent/complete/local_115/` へ移動する
- [x] 現行の生成、表示、ストア、エクスポート実装と突合し、`〇` 表記、国際化、結果コンテキスト更新の要件を反映する
- [x] 特殊エンカウント種別の共有ヘルパーを追加する
- [x] `PokemonFilter.special_encounter_triggered` と Rust の一致判定を実装する
- [x] 結果コンテキストを非永続化ストアへ追加する
- [x] 「発生のみ」チェックボックスと種別変更時の条件除外を実装する
- [x] 結果コンテキストに基づく発生列を実装する
- [x] Rust、ストア、フォーム、結果列のテストを追加する
- [x] WASM 生成物と型を更新する
- [x] 検証結果をこの仕様書へ反映する

## 7. 検証結果

2026-07-26 に次を実行した。

| コマンド | 結果 |
|----------|------|
| `cargo test --package wasm-pkg` | 成功。331 件のユニットテストと 7 件の統合テストが通過した |
| `pnpm build:wasm:dev` | 成功。`src/wasm/` の型定義を再生成した |
| `wasm-pack build wasm-pkg --target bundler --out-dir ../src/wasm --release -- --features gpu`、`node scripts/optimize-wasm.js`、`tsc -b`、`vite build` | 成功。リリース相当の WASM と Web アプリケーションをビルドした |
| `pnpm exec tsc -b --noEmit` | 成功 |
| `pnpm test:run --project unit src/test/components/features/pokemon-filter-form.test.tsx src/test/components/features/pokemon-result-columns.test.tsx src/test/unit/features/pokemon-list-store.test.ts` | 成功。30 件が通過した |
| `node_modules\\@lingui\\cli\\dist\\lingui.js extract` / `compile --typescript` | 成功。日本語訳「発生のみ」を抽出・コンパイルした |
| `node_modules\\.bin\\oxfmt.cmd --check` / `cargo fmt --check` | 成功 |
| `node_modules\\.bin\\oxlint.cmd` / `cargo clippy -p wasm-pkg --all-targets -- -D warnings` | 成功 |

`pnpm test:run` 全体では 1,436 件が通過し、4 件が既定でスキップされた。一方、今回の変更対象外である `src/test/integration/services/worker-pool.test.ts` の `should cancel ongoing search` は、365 日分の CPU ワーカー検索が 5 秒以内に進捗通知を 3 回出さず、`progressCount = 0` となって失敗した。対象テスト単独でも再現したため、この仕様の変更とは切り分けて扱う。

`pnpm lingui:extract` と `pnpm lingui:compile` は pnpm 11.9.0 のレジストリ署名検証に失敗した。依存関係やロックファイルは変更せず、同じローカル Lingui 実行ファイルを直接起動してカタログを更新した。
