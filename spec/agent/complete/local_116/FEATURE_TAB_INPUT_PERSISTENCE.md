# 機能タブ入力状態保持 仕様書

## 1. 概要

### 1.1 目的

機能タブを切り替えて元の機能へ戻ったときに、ポケモンリストとタマゴリストの Seed 入力、およびポケモンリストのロケーション・固定ポケモン選択を復元する。既存の Feature Store 方針に従い、ユーザが直接指定した入力値はブラウザ再読み込み後も保持し、`SeedOrigin[]` やエンカウント候補は入力値から再導出する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 機能タブ | `FeatureTabs` が切り替えるポケモンリスト、タマゴリストなどの機能画面 |
| Seed 入力ソース | 起動日時とキー入力、直接指定した LCG Seed 文字列、またはインポートした JSON 文字列 |
| active origins | 現在選択中の Seed 入力モードから得られた `SeedOrigin[]` |
| Feature Store | 機能単位の Zustand Store。入力を永続化し、結果と導出状態をメモリ上に保持する |
| エンカウント入力ソース | ロケーションキーまたは固定エンカウントの項目 ID |

### 1.3 背景・問題

`local_088` では、Feature のフォーム入力を Feature Store に永続化し、機能切替によるアンマウント後も保持する方針を定めている。

ポケモンリストとタマゴリストは `seedInputMode` だけを Feature Store に保存している。Seed 入力ソースと active origins は `SeedInputSection` または Page の `useState` に残っているため、別の機能タブへ移動すると破棄される。戻ったときには選択中の入力モードだけが復元され、そのモードの内容は初期値へ戻る。

ポケモンリストのロケーションキーと固定エンカウントの項目 ID も `PokemonParamsForm` の `useState` にある。機能タブから戻ると選択表示が消えるだけでなく、空のロケーションを基にした effect が Store の `slots` と `availableSpecies` を消去する。

### 1.4 期待効果

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 機能タブ往復後の Seed 入力 | 入力モード以外は消失 | 起動日時、キー入力、LCG Seed、インポート内容を保持 |
| ブラウザ再読み込み後の Seed 入力 | 入力モード以外は消失 | 入力ソースを `localStorage` から復元 |
| `SeedOrigin[]` の永続化 | 非永続化 | 非永続化を維持し、入力ソースから再導出 |
| 初期表示時の追加処理 | 選択モードの既定値を解決 | 保存済み入力を解決 |
| ロケーション・固定ポケモン | タブ復帰時に選択と派生スロットが消失 | 選択 ID を復元し、候補とスロットを再取得 |

### 1.5 着手条件

- `local_088` の Feature Store が導入済みであること
- `local_092` のタブ別 origins 独立管理が導入済みであること
- `local_095` の Seed 入力テーブル化は未着手であり、本 Work Unit では実装しないこと

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/forms/seed-input-state.ts` | 新規 | JSON シリアライズ可能な Seed 入力ソース型と既定値 |
| `src/components/forms/seed-input-section.tsx` | 修正 | Seed 入力ソースを Props で受け取る制御コンポーネントへ変更 |
| `src/features/pokemon-list/store.ts` | 修正 | Seed 入力ソースを永続化し、active origins を非永続化状態に追加 |
| `src/features/egg-list/store.ts` | 修正 | ポケモンリストと同じ状態境界を追加 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 修正 | Page のローカル origins を Feature Store 参照へ変更 |
| `src/features/egg-list/components/egg-list-page.tsx` | 修正 | Page のローカル origins を Feature Store 参照へ変更 |
| `src/features/pokemon-list/types.ts` | 修正 | エンカウント入力ソースをフォーム状態へ追加 |
| `src/features/pokemon-list/components/pokemon-params-form.tsx` | 修正 | ロケーションと固定エンカウント選択を制御入力へ変更 |
| `src/test/unit/features/pokemon-list-store.test.ts` | 修正 | Seed 入力の更新、リセット、永続化境界を検証 |
| `src/test/unit/features/egg-list-store.test.ts` | 修正 | Seed 入力の更新、リセット、永続化境界を検証 |
| `src/test/components/seed-input-section.test.tsx` | 修正 | アンマウント後の保存値復元と再導出を検証 |

## 3. 設計方針

### 3.1 状態の分類

| 状態 | 保存先 | 永続化 | 理由 |
|------|--------|--------|------|
| `seedInputMode` | Feature Store | する | ユーザ選択 |
| 起動日時、キー入力 | Feature Store | する | ユーザ入力 |
| LCG Seed 文字列 | Feature Store | する | ユーザ入力 |
| インポート JSON 文字列 | Feature Store | する | `SeedOrigin[]` を復元できる入力ソース |
| active origins | Feature Store | しない | 入力ソースから再導出可能で `bigint` を含む |
| タブ別 origins | `SeedInputSection` | しない | 表示中に再利用する導出値 |
| エラー表示 | `SeedInputSection` | しない | 現在の操作にだけ必要な UI 状態 |
| ロケーションキー、固定項目 ID | ポケモンリスト Feature Store | する | ユーザが選択した入力ソース |

### 3.2 `SeedInputSection` の責務

`SeedInputSection` は入力値を内部で所有せず、`input` と `onInputChange` を介して親の Feature Store を更新する。タブ別 origins は入力値から初期化し、入力変更時に更新する。

```typescript
interface SeedInputState {
  datetime: Datetime;
  keyInput: KeyInput;
  seedText: string;
  importText: string;
}

interface SeedInputSectionProps {
  input: SeedInputState;
  onInputChange: (action: SeedInputStateAction) => void;
}
```

### 3.3 インポート状態

`SeedOrigin[]` は `bigint` を含むため、そのまま Zustand `persist` の対象にしない。ファイルから読み込んだ JSON 文字列を `importText` として保存する。テーブル上で行を削除した場合は、残った origins を既存の `serializeSeedOrigin()` で正規化して `importText` を更新する。

外部転記で受け取った `SeedOrigin[]` も同じ正規化済み JSON 文字列へ変換し、機能タブ往復とブラウザ再読み込みの両方で復元できるようにする。

### 3.4 リセット

`resetForm()` は Seed 入力ソース、入力モード、active origins を既定値へ戻す。検索結果は既存仕様どおり保持する。

### 3.5 `local_095` との境界

本 Work Unit は textarea を入力テーブルへ置換しない。`local_095` は、永続化済みの `seedText` を新しい入力表へ接続する形で後続実装できる。Seed の解決規則と外部転記規則は変更しない。

### 3.6 エンカウント入力

`EncounterParamsOutput` に `locationKey` と `staticEntryId` を追加する。`slots` と `availableSpecies` は派生値として現行構造を維持するが、機能の再マウント時には保存済み入力ソースを使って再取得する。エンカウント種別を変更した場合だけ、両方の入力ソースを空へ戻す。

## 4. 実装仕様

### 4.1 共通入力型

`seed-input-state.ts` に `SeedInputMode`、`SeedInputState`、`SeedInputStateAction`、`DEFAULT_SEED_INPUT_STATE` を定義する。既定値オブジェクトを Store 間で共有して変更しないよう、Store の初期化とリセットでは新しいオブジェクトを生成する。

### 4.2 Feature Store

ポケモンリストとタマゴリストの Store に以下を追加する。

```typescript
seedInput: SeedInputState;
seedOrigins: SeedOrigin[];
setSeedInput: (action: SeedInputStateAction) => void;
setSeedOrigins: (seedOrigins: SeedOrigin[]) => void;
```

`partialize` は `seedInput` を含め、`seedOrigins` を除外する。

### 4.3 初期化と再導出

`SeedInputSection` の初回マウントでは、次の各入力からタブ別 origins を作る。

- `datetime` と `keyInput` から startup origins
- `seedText` から seeds origins
- `importText` から import origins

現在の `mode` に対応する origins を `onOriginsChange` で親へ通知する。

### 4.4 外部転記

`pendingDetailOrigins` を消費した場合は、対応する `datetime`、`keyInput`、`seedText` を Feature Store へ反映する。`pendingSeedOrigins` を消費した場合は、正規化済み JSON を `importText` へ反映する。

### 4.5 エンカウント入力の復元

`PokemonParamsForm` は `locationKey` と `staticEntryId` を Props の `value` から表示する。初回マウントではこれらを空へ戻さない。ロケーションベースの種別では `locationKey` からスロットと候補を再取得し、固定エンカウントでは `staticEntryId` からスロットを再取得する。

## 5. テスト方針

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| ユニット | ポケモンリスト Store | Seed 入力を更新でき、`partialize` に入力ソースだけを含む |
| ユニット | タマゴリスト Store | Seed 入力を更新でき、リセット時に既定値へ戻る |
| コンポーネント | `SeedInputSection` | 保存済み LCG Seed を初期表示して origins を再導出する |
| コンポーネント | `SeedInputSection` | 保存済み起動日時とキー入力を初期表示して origins を再導出する |
| コンポーネント | `SeedInputSection` | 保存済みインポート JSON を再パースする |
| コンポーネント | `SeedInputSection` | 外部転記した値を `onInputChange` へ通知する |
| コンポーネント | `PokemonParamsForm` | 保存済みロケーションまたは固定項目 ID を初期表示に使用する |
| 回帰 | 既存テスト | タブ別 origins、外部転記、検索リクエスト生成を壊さない |

## 6. 実装チェックリスト

- [x] 既存の状態管理仕様と `local_095` の境界を確認する
- [x] 失敗する Store・コンポーネントテストを追加する
- [x] 共通 Seed 入力状態を定義する
- [x] ポケモンリストとタマゴリストの Store を変更する
- [x] `SeedInputSection` を制御コンポーネントへ変更する
- [x] Page のローカル Seed 状態を Store へ移す
- [x] エンカウント入力ソースを Store へ移す
- [x] 関連テストを実行する
- [x] 型チェック、Lint、フォーマット検査を実行する
- [x] 検証結果を仕様書へ反映する

## 7. 検証結果

| 検証 | 結果 |
|------|------|
| TDD Red | Store テスト 4 件が `setSeedInput` と `seedInput` の未実装により失敗することを確認 |
| `pnpm test:run` | 成功。116 ファイル成功、1 ファイルスキップ、1446 件成功、4 件スキップ |
| `.\node_modules\.bin\tsc.cmd -b --noEmit` | 成功 |
| `.\node_modules\.bin\oxlint.cmd` | 成功。警告・エラーなし |
| `.\node_modules\.bin\oxfmt.cmd --check` | 成功 |
| `.\node_modules\.bin\tsc.cmd -b` | 成功 |
| `.\node_modules\.bin\vite.cmd build` | 成功。既存の 500 kB 超チャンク警告あり |
| `git diff --check` | 成功 |
| 手動画面確認 | 未実施。実行環境でバックグラウンド開発サーバが終了するため、常駐させられなかった |

`pnpm build` は WASM 再ビルドを含むコマンドが実行環境内で出力を返さず完了確認できなかった。Rust/WASM の変更はないため、既存 WASM 成果物を使った TypeScript ビルドと Vite 本番ビルドを個別に実行した。
