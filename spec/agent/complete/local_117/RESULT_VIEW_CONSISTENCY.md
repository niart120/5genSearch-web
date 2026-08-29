# 生成個体 ResultView 一貫化仕様書

## 1. 概要

### 1.1 目的

ポケモンリスト、タマゴリスト、孵化検索の生成個体結果を、計算用の生データと表示用の解決済みデータを一対一で保持する `ResultView` に統一する。表示、詳細、エクスポートが `UiPokemonData` / `UiEggData` を参照する境界を明示し、孵化検索で不明な親個体値の内部値 `32` が利用者へ露出する不具合を修正する。

同時に、表示データを生データから再現できない既存の二重正本を解消する。タマゴは各行の `GeneratedEggData.core.species_id`、ポケモンは生成時に保存した ROM バージョンを表示解決のコンテキストとして使用する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 生データ | Worker / WASM が返す `GeneratedPokemonData`、`GeneratedEggData`、`EggDatetimeSearchResult`。計算、数値ソート、Seed 転記の正本 |
| 表示データ | WASM resolver が生データを名称・記号・不明値表記へ変換した `UiPokemonData` / `UiEggData` |
| `ResultView<TRaw, TUi>` | 同じ結果を表す `raw: TRaw` と `ui: TUi` の一対一の組 |
| 解決コンテキスト | 表示データを決めるロケールと、ポケモンの生成時 ROM バージョン |
| 不明個体値 | 生データでは `IV_VALUE_UNKNOWN = 32`、表示データでは `"?"` と表す値 |
| 結果コンテキスト | 結果生成時に Feature Store へ保存する非永続化メタデータ。本仕様ではポケモンのエンカウント種別と ROM バージョンを含む |

### 1.3 背景・問題

事実:

- ポケモンリストとタマゴリストの Store は生データを保持するが、各フックは `rawResults` と `uiResults` を別配列として返す。
- 孵化検索の Store、フック、表、詳細、エクスポートは `EggDatetimeSearchResult[]` の生データだけを使用する。
- 不明な親個体値が遺伝した `GeneratedEggData.core.ivs` には `32` が保持される。Rust の Egg resolver はこの値を `"?"` に変換するが、孵化検索は resolver を通らないため `32` を表示する。
- `GeneratedEggData::from_raw()` は、ニドラン♀から生まれた♂をニドラン♂、イルミーゼから生まれた♂をバルビートへ変換し、行ごとの確定種族を `core.species_id` へ保存する。実ステータスも同じ確定種族で計算する。
- 現行 Egg resolver は別引数の `species_id` で種族名と特性名を解決するため、`core.species_id`、実ステータス、名称の正本が分かれている。タマゴリストは現在のフォーム値をこの引数へ渡すため、生成後のフォーム変更でも既存結果の名称だけが変わる。
- Pokemon resolver の `version` 引数はバージョン別の持ち物解決に必要だが、現在は結果生成時ではなく現在の DS 設定を渡している。
- `local_029` は Egg resolver が `core.species_id` を基準に解決する構造を定めているが、`local_067` の外部 `species_id` 引数方式と現行実装はこの方針と矛盾する。本仕様は Egg resolver の正本について `local_067` を上書きする。

推察:

- 表示列を個別機能ごとに追加した際、生データを保持する理由と表示データを使う理由が型で表現されず、同じ配列を両用途に使える箇所だけ直接参照が残った。
- 表の列構成を統一した変更は列数・見出しを対象としており、内部 sentinel の表示変換まで検証する回帰テストがなかった。

### 1.4 期待効果

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 不明個体値 | 孵化検索の表・詳細・出力で `32` | すべて `"?"` |
| 結果型 | feature ごとに raw のみ、または raw/ui の並列配列 | 3 feature とも `ResultView[]` |
| 生データ利用 | コンポーネントごとに暗黙 | 計算、数値ソート、Seed 転記に限定 |
| 表示データ利用 | 孵化検索だけ未使用 | 個体の表示、詳細、表示形式の出力に使用 |
| Egg 種族解決 | フォームの単一 ID を全行へ適用 | 各行の確定済み `core.species_id` を使用 |
| Pokemon 持ち物解決 | 現在の DS バージョンに追従 | 結果生成時の ROM バージョンを使用 |
| 追加バッチの表示解決 | raw 配列全体を毎回再解決 | 同じ解決コンテキストでは未解決の raw オブジェクトだけを解決 |
| 言語切替 | UI 配列を全件再生成 | ResultView の raw を維持し、ui を全件再生成 |

### 1.5 着手条件

- Feature Store は検索結果の生データだけを保持し、`ResultView` と表示データは永続化しない。
- `ResultView` は TypeScript の表示境界として実装し、Rust/WASM の公開結果型へ追加しない。
- `resolve_pokemon_data_batch()` の `version` 引数は持ち物解決に必要なため維持する。
- Egg resolver の API 変更後は `pnpm build:wasm:dev` で `src/wasm/` の生成物を更新する。
- 起動時刻検索、MT Seed 検索、レポート針検索、ID 調整は `GeneratedPokemonData` / `GeneratedEggData` と対応する `Ui*Data` の組を持たないため対象外とする。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/lib/result-view.ts` | 新規 | `ResultView` と feature 別の型別名を定義 |
| `src/hooks/use-result-views.ts` | 新規 | 解決コンテキスト単位で表示データを差分解決する共通フック |
| `src/features/pokemon-list/store.ts` | 修正 | 生成時 ROM バージョンを非永続化の結果コンテキストへ追加 |
| `src/features/*/hooks/use-*.ts` | 修正 | 3 feature の戻り値を `ResultView[]` に統一し、WASM resolver を接続 |
| `src/features/*/components/*-page.tsx` | 修正 | 表、選択、詳細、出力の入力を `ResultView[]` へ変更 |
| `src/features/*/components/*-result-columns.tsx` | 修正 | 数値 accessor は raw、表示 cell は ui を参照 |
| `src/features/*/components/result-detail-dialog.tsx` | 修正 | `ResultView` を受け取り、個体表示は ui、Seed 転記は raw を使用 |
| `src/services/export-columns.ts` | 修正 | ポケモン、タマゴ、孵化検索の出力列を `ResultView` 対応へ変更 |
| `wasm-pkg/src/resolve/egg.rs` | 修正・テスト追加 | 外部種族 ID を廃止し、行ごとの `core.species_id` と不明 IV 表示を検証 |
| `wasm-pkg/src/lib.rs` | 修正 | `resolve_egg_data_batch(data, locale)` の2引数 API へ変更 |
| `wasm-pkg/src/types/generation.rs` | 修正 | Egg の `core.species_id` に関する古いコメントを現行生成仕様へ修正 |
| `wasm-pkg/tests/resolve_integration.rs` | 修正 | 行ごとの異種族、未指定種族、バッチ順序を新 API で検証 |
| `src/wasm/*` | 再生成 | Rust/WASM API の TypeScript バインディングを更新 |
| `src/test/unit/hooks/use-result-views.test.tsx` | 新規 | 一対一対応、差分解決、コンテキスト失効、順序、長さ不一致を検証 |
| `src/test/unit/features/pokemon-list-store.test.ts` | 修正 | 生成時 ROM バージョンの保存・非永続化・フォーム変更からの独立を検証 |
| `src/test/components/features/*result*.test.tsx` | 新規・修正 | raw `32` / ui `"?"`、数値 accessor、詳細表示、Seed 転記を検証 |
| `src/test/unit/export.test.ts` | 修正 | 3 feature の ResultView 出力と孵化検索の `"?"` を検証 |
| `src/test/integration/egg-list-worker.test.ts` | 修正 | 生成結果自身の種族 ID を resolver が使用することを検証 |

## 3. 設計方針

### 3.1 データ所有境界

| 層 | 所有する値 | 使用目的 |
|----|------------|----------|
| Worker / WASM | 生データ | 生成・検索の結果 |
| Feature Store | 生データ配列、結果コンテキスト | タブ切替後の保持、追加バッチの蓄積 |
| feature hook | `ResultView[]` | Store の raw と resolver の ui を一対一に結合 |
| 結果表 | `ResultView` | raw で数値ソートし、ui を cell に表示 |
| 詳細 | `ResultView` | ui を表示し、必要な操作だけ raw を参照 |
| エクスポート | `ResultView` | 表示形式の列は ui、検索由来の構造値だけ raw を参照 |

Store に `Ui*Data[]` や `ResultView[]` を保存しない。ロケール変更時に Store を更新せず、hook の導出値だけを再生成する。

### 3.2 共通型

```typescript
interface ResultView<TRaw, TUi> {
  readonly raw: TRaw;
  readonly ui: TUi;
}

type PokemonListResultView = ResultView<GeneratedPokemonData, UiPokemonData>;
type EggListResultView = ResultView<GeneratedEggData, UiEggData>;
type EggSearchResultView = ResultView<EggDatetimeSearchResult, UiEggData>;
```

型別名は feature から独立した `src/lib/result-view.ts` に置く。`src/services/` から `src/features/` への逆依存を作らない。

### 3.3 表示解決の不変条件

各 `ResultView` は次を満たす。

1. `raw` と `ui` は同じ配列位置の同じ生成結果を表す。
2. resolver は入力件数と同じ件数を同じ順序で返す。
3. `ui` の名称、個体値、ステータス、PID、記号は同じ `raw` から導出する。
4. ロケール変更は `ui` だけを全件再解決し、`raw` の参照と順序を変えない。
5. Pokemon の ROM バージョンは生成時の結果コンテキストを使う。現在のフォームや DS 設定で既存結果を再解釈しない。
6. Egg の種族は各 `GeneratedEggData.core.species_id` を使う。フォーム値を resolver へ渡さない。

resolver が入力と異なる件数を返した場合は、対応関係を推測せず例外にする。

### 3.4 差分解決

`useResultViews()` は解決コンテキストごとに `WeakMap<TRaw, TUi>` を保持する。同じ raw オブジェクト参照は再解決せず、Store へ追加された未解決オブジェクトだけを1回の batch resolver 呼び出しへまとめる。

| 変化 | 動作 |
|------|------|
| raw 配列へ追加 | 新しいオブジェクトだけを解決 |
| raw 配列の並べ替え・部分集合化 | キャッシュ済み ui を再利用し、入力順に ResultView を再構成 |
| raw 配列の全置換 | 新しいオブジェクトだけを解決 |
| ロケール変更 | キャッシュを破棄して全件再解決 |
| Pokemon の生成時バージョン変更 | キャッシュを破棄して全件再解決 |
| 結果クリア | 空配列を返す。旧 raw は `WeakMap` の弱参照だけとなる |

解決処理は current props / Store からの導出であり、別の React state と effect に複製しない。resolver callback は `useCallback` で安定化し、解決コンテキストを表すキーへ resolver の全入力を含める。

### 3.5 Egg resolver の正本

`resolve_egg_data()` と `resolve_egg_data_batch()` から外部 `species_id` 引数を削除する。

| `core.species_id` | 種族名 | 特性名 | ステータス |
|-------------------|--------|--------|------------|
| `0` | `undefined` | ロケール別の特性スロット名 | `core.stats` の `undefined` を `"?"` に変換 |
| `1..=649` | 行ごとの種族名 | 行ごとの種族と特性スロットから解決 | 同じ行で生成済みの `core.stats` を表示 |

resolver 内でステータスを再計算しない。ニドラン、イルミーゼの例外変換は生成時の `GeneratedEggData::from_raw()` だけが担当する。

### 3.6 Pokemon の結果コンテキスト

`PokemonListResultState` に `resultVersion: RomVersion | undefined` を追加する。検索開始 action は `resultEncounterType` と `GenerationConfig.version` を同時に記録し、結果を空にする。

フォームの変更と `resetForm()` は既存結果、`resultEncounterType`、`resultVersion` を保持する。`clearResults()` は3つを消去する。persist の `partialize` には結果コンテキストを含めない。

### 3.7 表・詳細・選択

表の列 accessor と cell の責務を分ける。

```typescript
columnHelper.accessor((result) => result.raw.egg.core.ivs.hp, {
  id: 'iv_0',
  cell: (info) => info.row.original.ui.ivs[0],
});
```

これにより不明個体値は数値 `32` として一貫してソートされ、利用者には `"?"` と表示される。名称など表示文字列で並べる列は ui を accessor に使ってよい。

選択状態には `ResultView` の ui を複製せず raw オブジェクト参照を保持する。現在の `ResultView[]` から選択中の view を導出するため、ダイアログを開いたまま言語を切り替えても表示が更新される。新しい検索で raw が消えた場合は選択結果も `undefined` になる。

孵化検索の Seed 入力への転記は `result.raw.egg.source` を使用する。

### 3.8 エクスポート

既存の CSV / TSV / JSON は列定義に基づく表示形式の出力であり、生データの構造保存ではない。個体値、性格、特性、性別、色違い、PID などは ui を使用し、不明個体値を `"?"` として出力する。

孵化検索の日時表記など、検索結果固有で既存形式の維持が必要な項目は raw の `SeedOrigin` を参照できる。Seed の構造をそのまま保存する新しい raw JSON 形式は本仕様の対象外とする。

### 3.9 対象外

- `UiPokemonData` / `UiEggData` のフィールド構成変更
- Pokemon resolver からの `version` 引数削除
- Feature Store の検索結果永続化
- raw JSON エクスポート形式の追加
- 起動時刻検索、MT Seed 検索、レポート針検索、ID 調整への形式的な `ResultView` 導入

## 4. 実装仕様

### 4.1 TDD の順序

1. Egg resolver の行ごとの種族、不明 IV、2引数 batch API のテストを失敗させる。
2. `useResultViews()` の一対一対応、差分解決、解決キー変更、長さ不一致のテストを失敗させる。
3. 各結果列、詳細、エクスポートで raw `32` が `"?"` になるテストを失敗させる。
4. Pokemon Store の生成時 ROM バージョン保持テストを失敗させる。
5. 最小限の実装で順に成功させ、3 feature を共通契約へ移行する。

### 4.2 Rust/WASM

`resolve_egg_data(data, locale)` は `data.core.species_id` を退避してから `data` の他フィールドを表示用へ変換する。ID が0より大きい場合だけ種族名と確定特性名を解決する。

`resolve_egg_data_batch(data, locale)` は入力順の `map` だけを行い、項目を除外・追加しない。WASM の公開シグネチャと生成 TypeScript 定義から `species_id` を削除する。

### 4.3 共通 hook

`useResultViews<TRaw extends object, TUi extends object>()` は次を受け取る。

```typescript
interface UseResultViewsOptions<TRaw extends object, TUi extends object> {
  rawResults: readonly TRaw[];
  resolutionKey: string;
  resolveBatch: (rawResults: TRaw[]) => TUi[];
}
```

未解決 raw は `Set` で重複除去してから batch resolver へ渡す。戻り値の件数を検査した後にだけキャッシュへ登録し、入力順に新しい `ResultView[]` を構成する。

### 4.4 feature hooks

| hook | raw | resolver 入力 | 解決キー |
|------|-----|---------------|----------|
| `usePokemonList` | `GeneratedPokemonData[]` | raw、生成時 ROM バージョン、現在ロケール | `${resultVersion}:${locale}` |
| `useEggList` | `GeneratedEggData[]` | raw、現在ロケール | locale |
| `useEggSearch` | `EggDatetimeSearchResult[]` | `raw.map((result) => result.egg)`、現在ロケール | locale |

戻り値は `results: *ResultView[]` に統一し、`rawResults` / `uiResults` の並列公開を廃止する。Store への追加バッチ同期は現行の raw データ経路を維持する。

### 4.5 コンポーネント

- 3つの Page、結果列、詳細ダイアログ、エクスポート列のジェネリック型を対応する `*ResultView` へ変更する。
- 件数は `results.length` を使用する。
- 個体値と実ステータス列は raw の数値または `undefined` を accessor にし、cell は ui の文字列を表示する。
- 孵化検索の個体表示は Egg resolver の ui を使用する。既存の起動条件表示形式は維持する。
- 選択 raw の参照検索は `useMemo` で導出し、effect で別 state へ同期しない。

### 4.6 後方互換性

検索結果と結果コンテキストは非永続化状態のため、localStorage migration は不要である。Egg resolver はリポジトリ内専用の WASM API であり、全呼び出し箇所と生成物を同一 Work Unit で更新する。

## 5. テスト方針

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| Rust ユニット | Egg resolver | `core.species_id` による種族・特性、不明時、`32 -> "?"`、めざパ不明表示 |
| Rust 統合 | resolver batch | 行ごとに異なる種族を同順・同件数で解決し、ニドラン／イルミーゼ例外後の ID を尊重する |
| TypeScript hook | `useResultViews` | raw/ui の組、追加分だけの resolver 呼び出し、ロケール/バージョン変更時の全件再解決、並べ替え、重複、長さ不一致 |
| Store ユニット | Pokemon List | 検索開始時の ROM バージョン保存、clear、reset、非永続化 |
| コンポーネント | 3種の結果列 | raw 数値 accessor と ui 表示 cell、`32` を `"?"` と表示 |
| コンポーネント | 孵化検索詳細 | IV が `"?"`、Seed 転記は raw の `SeedOrigin` |
| エクスポート | 3種の列定義 | ResultView を受け取り、孵化検索の IV を CSV / TSV / JSON で `"?"` と出力 |
| 統合 | Egg List Worker + resolver | 生成パラメータの種族が raw に保存され、その raw だけから名称・特性・stats を解決 |
| 回帰 | 全テスト | 生成、検索、言語切替、詳細、エクスポート、特殊エンカウント列を壊さない |

実装後は次を実行する。

```powershell
cargo test --package wasm-pkg
pnpm build:wasm:dev
pnpm test:run
pnpm exec tsc -b --noEmit
pnpm lint
pnpm format:check
cargo clippy --package wasm-pkg --all-targets -- -D warnings
cargo fmt --check
git diff --check
```

## 6. 実装チェックリスト

- [x] 現行の Store、hook、resolver、表、詳細、エクスポートのデータ経路を確認する
- [x] Egg の行ごとの確定種族と Pokemon の生成時 ROM バージョンを解決コンテキストへ含める方針を確定する
- [ ] TDD Red のテストを追加し、意図した理由で失敗することを確認する
- [ ] Egg resolver を raw の `core.species_id` 正本へ変更する
- [ ] `ResultView` 型と差分解決 hook を実装する
- [ ] Pokemon List、Egg List、Egg Search の hook を `ResultView[]` へ統一する
- [ ] 3 feature の表、詳細、選択、エクスポートを移行する
- [ ] WASM 生成物を更新する
- [ ] 対象テストと全体検証を実行する
- [ ] 実装差分と検証結果を仕様書へ反映する
- [ ] 仕様書を `spec/agent/complete/local_117/` へ移動する

## 7. 検証結果

未実行（仕様書作成後、実装前）。
