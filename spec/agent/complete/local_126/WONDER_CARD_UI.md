# 配達員の検索・個体生成画面 仕様書

## 1. 概要

### 1.1 目的

「検索」「個体生成」の各カテゴリに「配達員」タブを追加し、カード選択から CPU Worker の実行、結果表示・出力までを接続する。入力の保存・復元と、日時検索の結果を同じ生成条件で個体生成へ転記する操作を実装する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 配達員検索 | 起動日時・起動条件・消費範囲から、選択カードと Filter に一致する個体を探す画面 |
| 配達員個体生成 | 入力済みの `SeedOrigin[]` と消費範囲から個体を生成する画面 |
| 編集入力 | カード選択、消費範囲、Filter など、利用者が変更するフォームの値 |
| 実行時設定 | 実行開始時に複製したカード定義、生成条件、起動設定、編集入力などの値 |
| 生成元 | 結果の `source` に保持される `SeedOrigin`。初期 Seed と、存在する場合は日時・起動条件を含む |
| 消費数 | 起動時消費を除いた受取開始位置。`GeneratedWonderCardData.advance` に対応する |

### 1.3 背景・問題

[local_124](../../complete/local_124/WONDER_CARD_INTEGRATION.md) で、カードから `WonderCardParams` への変換、一覧・日時検索の CPU Worker、`WonderCardResultView` までを実装した。[local_125](../../complete/local_125/WONDER_CARD_COLLECTION.md) では、同梱カードの収集、ROM に適合する候補の読み込み、選択候補の表示材料を実装した。

現在のナビゲーションには、配達員の画面が登録されていない。通常配布・配布タマゴはいずれも配達員の生成処理を使用するため、一つのカード選択から両方を扱う。

既存のポケモン検索から個体生成への転記は、転記先の消費範囲・Filter・共通設定を保持する。配達員では検索開始時の条件と選択した `SeedOrigin` を組にして転記する必要がある。

### 1.4 期待効果

| 項目 | 期待効果 |
|------|----------|
| 画面からの実行 | 対象 ROM に適合するカードを選び、日時検索・個体生成を実行できる |
| 入力の復元 | タブ移動・再読み込み後に各画面の入力を復元できる |
| 結果の再現 | 日時検索で選んだ個体を、同じ生成元・カード・生成条件で個体生成から再現できる |

### 1.5 着手条件

`local_124`・`local_125` の実装済み API と生成データを使用する。画面配置は [frontend-structure.md](../../architecture/frontend-structure.md)、Filter の入力保持・正規化は [local_122](../../complete/local_122/CONTEXTUAL_SEARCH_FILTERS.md) に従う。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/lib/navigation.ts` | 変更 | 検索・個体生成カテゴリへの配達員 feature 登録 |
| `src/components/layout/navigation-labels.tsx` | 変更 | 配達員タブの表示名 |
| `src/components/layout/feature-content.tsx` | 変更 | 配達員ページの描画 |
| `src/features/wondercard-list/index.ts`、`types.ts`、`store.ts` | 新規 | 公開入口、共通入力・実行時設定、個体生成要求、入力保存・結果保持 |
| `src/features/wondercard-list/request.ts` | 新規 | WASM の種族情報を使う Filter 正規化、検証後の実行要求の複製 |
| `src/features/wondercard-list/components/wondercard-list-page.tsx` | 新規 | Seed 入力、生成操作、結果表示の接続 |
| `src/features/wondercard-list/components/wondercard-params-form.tsx` | 新規 | カード選択、配布タマゴの受取人入力、消費範囲 |
| `src/features/wondercard-list/components/wondercard-filter-form.tsx` | 新規 | 両画面で共用する Filter |
| `src/features/wondercard-list/components/wondercard-result-columns.tsx`、`result-detail-dialog.tsx` | 新規 | 個体生成の列定義、共通の個体詳細 |
| `src/features/wondercard-list/hooks/use-wondercard-selection.ts` | 新規 | カード読み込み、選択 ID・ROM と解決済みカードの対応管理 |
| `src/features/wondercard-list/hooks/use-wondercard-form.ts`、`use-wondercard-execution.ts` | 新規 | 両画面で共用する入力検証・エラー文言、CPU Worker の実行・バッチ同期・表示解決 |
| `src/features/wondercard-list/hooks/use-wondercard-list.ts` | 新規 | 個体生成タスク、結果蓄積、表示変換 |
| `src/features/wondercard-search/index.ts`、`types.ts`、`store.ts` | 新規 | 検索の公開入口、日時検索要求、入力保存・結果保持 |
| `src/features/wondercard-search/components/wondercard-search-page.tsx`、`wondercard-search-columns.tsx` | 新規 | 日時範囲、検索操作、検索結果の列と転記操作 |
| `src/features/wondercard-search/hooks/use-wondercard-search.ts` | 新規 | 日時検索タスク、結果蓄積、表示変換 |
| `src/lib/search-filter-context.ts` | 変更 | 配達員の Filter 入力型、表示条件、正規化 |
| `src/lib/navigate.ts` | 変更 | 配達員検索から個体生成への転記処理 |
| `src/stores/search/results.ts` | 変更 | `SeedInputSection` が扱う配達員個体生成の転記先型 |
| `src/services/search-estimation.ts` | 変更 | 配達員の候補件数と実行前確認への接続 |
| `src/services/export-columns.ts` | 変更 | 配達員の検索・個体生成の出力列 |
| `src/i18n/locales/{ja,en}/messages.po`、`messages.ts` | 変更 | 配達員の画面文言・検証エラーの翻訳とコンパイル |
| `src/test/unit/` | 追加・変更 | 要求構築、Store、Filter、転記、出力列、ナビゲーションの検証 |
| `src/test/components/` | 追加・変更 | カード選択、入力検証、表・詳細、画面間操作の検証 |
| `src/test/integration/wondercard-worker.test.ts` | 変更 | 画面用要求による両経路の一致、バッチ・中断の検証 |
| `spec/agent/architecture/frontend-structure.md` | 変更 | 実装時に配達員の feature 配置を反映 |

## 3. 設計方針

### 3.1 画面と共通部品

ページと Store は `wondercard-list`・`wondercard-search` に分ける。検索側は `wondercard-list` のカード入力、Filter、個体詳細、共通型を使用する。配置と依存方向は既存の `pokemon-list`・`pokemon-search` に揃える。

両ページで `FeaturePageLayout`、`SearchControls`、`SearchConfirmationDialog`、`DataTable`、`ExportToolbar` を使用する。個体生成の入力元は `SeedInputSection`、日時検索の検索範囲は `SearchContextForm` を使用する。

### 3.2 入力・実行・表示の接続

編集入力から一回の実行に使う値を確定し、実行時設定として保持する。入力検証後の件数確認と Worker 実行は、同じ要求を参照する。結果は生データと実行時設定を組にして Store に保持し、`resolve_wondercard_data_batch()` と `useResultViews` で表示へ変換する。

表示言語は表示変換時に参照する。生成条件・生成元・計算済みの個体情報は実行時の値を使用する。

## 4. 実装仕様

### 4.1 ナビゲーション

| カテゴリ | 内側のタブ順 | 配達員の `FeatureId` | ページ |
|----------|--------------|---------------------|--------|
| 検索 | ポケモン → タマゴ → 配達員 | `wondercard-search` | 配達員日時検索 |
| 個体生成 | ポケモン → タマゴ → 配達員 | `wondercard-list` | 配達員個体生成 |

配達員タブの英語表示は `Deliveryman` とする。カテゴリの初期選択は既存のポケモンタブとし、カテゴリ内の選択履歴は `useUiStore` で保持する。

両ページは BW・BW2 で使用できる。受取可能なカードは、選択した ROM のリージョン・バージョンで絞り込む。

### 4.2 入力項目

| 項目 | 個体生成 | 日時検索 | 入力・値の取得元 |
|------|----------|----------|-----------------|
| DS・ROM・起動設定 | 共通設定を使用 | 共通設定を使用 | `useDsConfigStore` |
| Seed | 起動条件入力・LCG Seed 直接入力・インポート | 日時検索から生成 | `SeedInputSection` |
| 日付・時刻・キー範囲 | Seed 入力に従う | 検索範囲を入力 | `SearchContextForm` |
| カード | 一枚を選択 | 一枚を選択 | 同梱カードカタログ |
| 受取人 TID・SID | 配布タマゴ選択時に入力 | 配布タマゴ選択時に入力 | `useTrainerStore` |
| 消費範囲 | 下限・上限を入力 | 下限・上限を入力 | `GenerationConfig.user_offset`・`max_advance` |
| Filter | 個体条件を入力 | 個体条件を入力 | 4.4 の共通フォーム |

初期値はカード未選択、消費範囲 `0..30`、Filter 条件未指定、能力値表示は実数値とする。個体生成の初期 Seed 入力モードは `manual-startup` とする。日時範囲・キー範囲の初期値は既存の日時検索に揃える。

消費範囲は上下限を含み、位置数は `max_advance - user_offset + 1` とする。`validateGenConfig()` と WASM の値域検証に従う。

### 4.3 カード選択と受取人

`getWonderCardLanguage(config.region)` でカード言語を決定し、`loadWonderCards(language, config.version)` で候補を得る。候補は検索可能な選択欄に表示する。`getWonderCardDisplays()` が返す基本表示・TID・識別用 ID を使用し、選択中の表示は一行で省略表示する。

カードの選択キーは `cardId`。読み込み結果には、カード言語・ROM バージョン・選択 ID の対応を保持する。ROM または選択 ID が変わったときは、その組に対応するカードを解決する。読み込み中は実行を無効にし、後から到着した旧条件の読み込み結果は破棄する。

保存済み ID が見つからない場合や対象 ROM に適合しない場合は、選択 ID を保持したまま入力エラーを表示し、再選択を待つ。読み込み失敗はフォーム内にエラーを表示する。

| カード種別 | `WonderCardParams.trainer` | 受取人入力 |
|------------|---------------------------|------------|
| `pokemon` | カード内の `trainer` | カードの値を生成条件として使用 |
| `egg` | `useTrainerStore` の現在の TID・SID | カード選択欄の下に TID・SID 入力を表示 |

受取人入力の値域は両方とも整数の `0..65535`。空欄は `undefined` とし、配布タマゴでは両方の入力を実行条件とする。`0` は有効な入力として扱う。画面内の入力は `useTrainerStore` に接続し、共通設定のトレーナー入力と同期する。入力要素の ID は画面内で一意にする。

通常の実行要求は、解決済みカードと必要な受取人情報を `toWonderCardParams()` へ渡して構築する。

### 4.4 Filter

`CoreDataFilter` に対応する共通フォームを両ページで使用する。

| 項目 | 入力と適用条件 |
|------|----------------|
| 個体値 | H・A・B・C・D・S の範囲と各能力の有効状態。個体値モードで適用 |
| 実数値 | H・A・B・C・D・S の実数値条件。実数値モードで適用 |
| めざめるパワー | タイプ・最低威力。個体値モードの IV Filter として適用 |
| 性格 | 複数選択。カードの固定性格が未指定の場合に編集・適用 |
| 性別 | カードと種族の条件から可変となる場合に編集・適用 |
| 特性 | カードの固定特性スロットが未指定の場合に編集・適用 |
| 色違い | カードの `shinyPolicy` が `Random` の場合に編集・適用 |

Filter の開閉、有効切り替え、アイコンによるリセット、個体値／実数値切り替えは既存の個体生成に揃える。カード変更で編集対象から外れた値や無効にした範囲は、編集入力に保持する。

`normalizeWonderCardFilter()` はカード条件と表示モードを受け取り、適用する `CoreDataFilter` を返す。Filter 全体が無効な場合、または全条件が未指定の場合は `undefined` を返す。編集対象外の性格・性別・特性・色違い条件も `undefined` とする。個体値の有効状態と範囲は既存の `normalizeIvFilter()` で正規化する。

入力検証・実行前確認・Worker 要求は同じ正規化済み条件を使用する。

### 4.5 Store と実行要求

| 状態 | 個体生成 | 日時検索 | 永続化 |
|------|----------|----------|--------|
| 共通の編集入力 | `inputs` 内の `cardId`、消費範囲、Filter 入力、実数値 Filter、表示モード | 同左 | 各 feature Store |
| 入力元 | `SeedInputMode`、`SeedInputState` | 日付範囲、時刻範囲、キー範囲 | 各 feature Store |
| 解決済みカード・生成条件 | カード定義、変換済み条件、選択条件・受取人との対応 | 同左 | メモリ |
| 解決済み Seed | `SeedOrigin[]` | 検索処理が生成 | メモリ |
| 実行結果 | 生データと個体生成要求 | 生データと日時検索要求 | メモリ |
| 進捗・エラー | `useSearch` が管理 | 同左 | メモリ |

保存キーは `feature:wondercard-list`・`feature:wondercard-search`、初期 `version` は `1` とする。`partialize` で編集入力だけを保存する。DS・起動設定・受取人は既存 Store の保存に従う。設定リセットは既存の `feature:` キーを対象にする処理で扱う。

保存からの復元時には、現在の ROM に対するカードの適合を確認する。`SeedInputState.importText` は既存の `serializeSeedOrigin()` による形式を使い、再読み込み時に `SeedOrigin[]` へ戻す。

共通の実行時設定は次の値を持つ。以下の型は `wondercard-list/types.ts` に置き、検索側から参照する。

```typescript
interface WonderCardRunSettings {
  card: WonderCardEntry;
  params: WonderCardParams;
  genConfig: GenerationConfig;
  filter: CoreDataFilter | undefined;
  inputs: WonderCardFormState;
  ds: DsConfig;
  ranges: Timer0VCountRange[];
  timer0Auto: boolean;
}

interface WonderCardListRequest {
  settings: WonderCardRunSettings;
  origins: SeedOrigin[];
}

interface WonderCardSearchRequest {
  settings: WonderCardRunSettings;
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
}
```

`WonderCardFormState` は上表の共通の編集入力に対応する。`inputs` は画面間転記に使用し、`filter` は Worker に適用する正規化済み条件を保持する。`genConfig` は開始時の ROM バージョン・起動設定・消費範囲を含む。

開始操作で編集中の入力を確定し、Store の値フィールドから要求を `structuredClone()` する。確認ダイアログを表示した場合は、その要求を保持して確定後に実行する。タスク構築が成功した後に、`startResults(request)` で実行時設定の更新と結果の初期化を同時に行い、以後のバッチを同じ結果へ追記する。

カード変更やフォームリセットは編集入力を更新する。既存結果は対応する実行要求とともに保持し、次の実行開始で置き換える。

### 4.6 CPU Worker と実行操作

| 画面 | タスク生成 | Worker の `kind` |
|------|------------|-----------------|
| 個体生成 | `createWonderCardListTasks()` | `wondercard-list` |
| 日時検索 | `createWonderCardDatetimeSearchTasks()` | `wondercard-datetime` |

両フックは `useSearch(useSearchConfig(false))` を使用する。日時検索の `DatetimeSearchContext` は、要求の `settings.ds`・`settings.ranges` と日付・時刻・キー範囲から構築する。

実行可能条件は Worker 初期化済み、カード解決済み、受取人・消費範囲・Filter・入力元の検証成功とする。個体生成は一件以上の `SeedOrigin`、日時検索は有効な日時範囲を要求する。

実行前の件数確認には既存の `SearchConfirmationDialog` と `DEFAULT_RESULT_WARNING_THRESHOLD` を使用する。確認用の件数は次の総候補数を結果件数の上限として扱う。

| 画面 | 総候補数 |
|------|----------|
| 個体生成 | 入力 `SeedOrigin` 数 × 消費位置数 |
| 日時検索 | 日時・Timer0・VCount・キーの起動候補数 × 消費位置数 |

カードの固定条件によって全候補が Filter を通過する場合も、この上限で扱う。起動候補数は既存の日時検索範囲の計数処理を使用する。

実行中はフォームを無効にし、`SearchControls` に進捗・中断操作・エラーを渡す。進捗は Worker の処理済み候補数・総候補数を使用する。結果の判別は `resultType: 'wondercard-list'` と配達員用の型ガードに従う。

中断・失敗時は取得済み結果を保持する。タスク構築時のエラーも検索操作のエラー表示へ接続する。タブ移動によるアンマウント時は既存の `useSearch` が Worker を破棄し、再表示時は Store の入力と結果を表示する。新しい実行への旧バッチの混入は、既存 WorkerPool のセッション判定で防ぐ。

### 4.7 結果テーブル

一行は `GeneratedWonderCardData` 一件に対応し、生成元と消費位置の組で識別する。通常配布・配布タマゴは同じ列定義を使用する。

| 順序 | 個体生成 | 日時検索 |
|------|----------|----------|
| 1 | 詳細ボタン | 詳細ボタン |
| 2 | 消費数 | 起動日時 |
| 3 | 針方向 | 消費数 |
| 4 | 種族 | 種族 |
| 5 | 性格 | 性格 |
| 6 | 特性 | 色違い |
| 7 | 性別 | 性別 |
| 8 | 色違い | 特性 |
| 9 | H・A・B・C・D・S の6列 | Lv |
| 10 | めざめるパワーのタイプ | H・A・B・C・D・S の6列 |
| 11 | Lv | Timer0 |
| 12 | PID | VCount |
| 13 | — | キー入力 |

結果領域は既存の結果件数、個体値／実数値の切り替え、出力操作、テーブルで構成する。能力値は現在の表示モードに合わせ、並べ替えは表示文字列ではなく生データの数値を使用する。日時は日時値で並べ替える。

個体生成の初期ソートは消費数の昇順、日時検索は起動日時・消費数の昇順とする。同じ Seed を持つ別の日時・起動条件は、それぞれの生成元として保持する。

針方向は受取開始位置でレポートを書いた場合の方向を、既存の矢印表示で示す。消費数と針方向には既存の説明コンポーネントを使用する。

### 4.8 結果詳細と出力

詳細ボタンで共通の `result-detail-dialog.tsx` を開く。表示項目は次のとおり。

| 領域 | 項目 |
|------|------|
| 生成元 | LCG Seed。`Startup` の場合は起動日時、Timer0、VCount、キー入力 |
| 個体情報 | 針方向、種族、性格、特性、性別、色違い、6個体値、6実数値、めざめるパワーのタイプ・威力、PID、Lv、消費数 |
| 日時検索の操作 | 選択した結果を個体生成へ転記するボタン |

表示には選択した行の `WonderCardResultView` を使用する。言語変更時には同じ生データから詳細の表示を更新する。

CSV・JSON のダウンロードと TSV コピーは `useExport`・`ExportToolbar` に接続する。通常の出力列は各テーブルのデータ列順に対応する。「詳細を含む」を有効にした場合は、表に含まれない詳細項目と反対モードの6能力値を追加する。

JSON は既存の `{ meta, results }` 形式とし、CSV のヘッダー・JSON の項目キーは既存の出力列定義に揃える。表示名の値は現在の表示言語で解決する。`contextOverride`・`gameStartOverride`・`versionOverride` に実行時設定を渡し、出力時の ROM・起動設定・ファイル名を結果に対応させる。

### 4.9 日時検索から個体生成への転記

`navigateToWonderCardListFromSearch(origin, request)` を `src/lib/navigate.ts` に追加する。引数には選択行の `raw.source` と、その結果を生成した `WonderCardSearchRequest` を渡す。

| 転記する値 | 転記先 |
|------------|--------|
| 選択結果の `SeedOrigin` 一件 | 配達員個体生成のインポート入力 |
| カード ID・カード定義・変換済み `WonderCardParams` | 個体生成の選択状態と解決済み生成条件 |
| 消費範囲・Filter 入力・実数値 Filter・表示モード | 個体生成の編集入力 |
| DS 設定・Timer0/VCount 範囲・自動設定状態・起動設定 | `useDsConfigStore` |
| 配布タマゴで使用した TID・SID | `useTrainerStore` |

転記処理は値を複製し、共通設定と個体生成の入力を反映してから `wondercard-list` へ遷移する。DS 設定・範囲・起動設定は一度の Store 更新で反映し、Timer0 自動設定による途中の範囲再計算を避ける。更新対象は現在の設定 Store とし、保存済みプロフィールはプロフィールの保存操作で管理する。

生成元は `pendingSeedOrigins['wondercard-list']` へ一件の配列として渡し、`SeedInputSection` のインポート経路で一度だけ消費する。既存の `serializeSeedOrigin()` によってインポート入力にも保存し、`Startup` の日時・Timer0・VCount・キー入力と初期 Seed を保つ。

転記されたカードと変換済み条件は、そのカード ID・ROM・配布タマゴの受取人に対応する解決済み状態として使用する。カードの読み込みフックもこの対応を確認して使用する。消費範囲や Filter の編集はその条件を使用し、カード・ROM・配布タマゴの受取人を変更した場合に該当する条件を再構築する。通常配布の生成にはカード内の TID・SID を使用する。

遷移後は入力済みの個体生成画面を表示する。利用者が生成を実行すると、転記された一件の `SeedOrigin` と開始時の生成条件・消費範囲・適用 Filter から結果を生成する。

### 4.10 日本語・英語表示

タブ、入力ラベル、検証エラー、検索操作、結果列、詳細、転記操作は Lingui の日本語・英語カタログで管理する。種族・性格・特性・めざめるパワーなどの値は既存の名前解決を使用する。

アプリ表示言語の変更ではカード候補の表示名と結果表示を更新する。カードの対象言語は ROM リージョンから決定し、カードタイトルは原文を使用する。

## 5. テスト方針

### 5.1 自動テスト

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| ユニット | ナビゲーション | 両カテゴリのタブ順、feature からカテゴリへの対応、選択履歴の復元 |
| ユニット・コンポーネント | カード解決 | 対象 ROM による候補、未選択・不適合・読み込み失敗、ROM 変更中の旧応答破棄 |
| ユニット・コンポーネント | 受取人 | 通常配布はカード内 ID、配布タマゴは現在の入力値、空欄・0・65535 の扱い |
| ユニット | Filter | 有効状態、モード切り替え、固定条件による編集対象、保持値と適用条件の分離 |
| ユニット | 要求構築 | 確認ダイアログ前の入力確定、要求の複製、開始後のカード・ROM・受取人変更からの独立 |
| ユニット | Store・保存 | 各画面の入力復元、結果・実行要求のメモリ保持、インポートした `SeedOrigin` の復元、設定リセット |
| ユニット | 件数確認 | 消費範囲の上限を含む件数、一覧・日時の候補数、全件一致するカードの確認表示 |
| ユニット・コンポーネント | 表・詳細・出力 | 4.7・4.8 の列と項目、数値ソート、モード切り替え、日本語・英語、出力設定と結果の対応 |
| ユニット・コンポーネント | 転記 | 実行時設定の反映、`Startup` 一件の保持、転記の一度だけの消費、転記後に入力を編集できること |
| 統合 | 両経路 | 通常配布・配布タマゴについて、日時検索の選択結果を同じ `source`・生成条件・Filter で個体生成から再現 |
| 統合・コンポーネント | 実行操作 | バッチ追記、進捗、中断、エラー、直後の再実行、タブ移動後の取得済み結果保持 |

### 5.2 画面確認

PC・モバイル幅で、両カテゴリからカード選択・検索または生成・詳細・出力へ進む。配布タマゴは受取人を入力して実行する。検索結果の取得後に ROM・受取人を変更し、既存結果から転記して同じ個体を再現する。タブ移動・再読み込みによる入力復元と、日本語・英語切り替え時の選択・結果の保持を確認する。

### 5.3 検証結果

2026-09-11 に実施。

| 検証 | 結果 |
|------|------|
| `pnpm exec vitest run --project unit` | 123 ファイル・1504 テスト成功。入力保存・要求複製・Filter・カード読み込み競合・画面操作・結果・転記・実行の検証を含む |
| `pnpm exec vitest run --project integration src/test/integration/wondercard-worker.test.ts` | 21 テスト成功。通常配布と配布タマゴの画面用要求から実 Worker で検索し、ROM・受取人変更後の転記と再生成が一致。同梱700カード、バッチ・中断・再実行も検証 |
| `pnpm exec tsc -b --noEmit` | 成功 |
| `pnpm lint` | oxlint・Clippy 成功 |
| `pnpm format:check` | oxfmt・rustfmt 成功 |
| `pnpm lingui:extract` / `pnpm lingui:compile` | 成功。日本語カタログの未翻訳0件 |
| `pnpm build` | WASM・TypeScript・Vite の本番ビルド成功 |
| 本番ビルドの画面確認 | Chromium、1440×1000・390×1000。通常配布と配布タマゴの検索、詳細、転記、再生成、CSV・JSON ダウンロード、TSV コピー、日本語・英語切替、再読み込み後の復元が成功 |
| 生成元と出力の再現 | 検索後に ROM・MAC・受取人を変更してから転記し、詳細が一致。JSON の ROM・MAC と再生成4個体を確認。重複した入力 ID・ページ全体の横はみ出し・ブラウザ例外なし |
| BW2 の入力経路 | ブラック2の起動条件入力と LCG Seed 直接入力で生成成功。390×844 で個体値 Filter を表示し、再読み込み後の Seed 入力復元を確認 |

初回のブラウザ統合テストは Vite の依存事前処理による再読み込みで失敗したが、再実行で成功した。ビルドはツールキャッシュ・一時ディレクトリへの権限制限を解消して同じコマンドを再実行した。ビルド時の `wgpu` の将来互換性と Vite の500 kB超チャンクの警告は残る。

## 6. 実装チェックリスト

- [x] 配達員の検索・個体生成タブを登録する
- [x] 共通入力型・実行要求と各画面の Store を実装する
- [x] カード選択、ROM 適合確認、配布タマゴの受取人入力を実装する
- [x] 消費範囲・Filter と正規化を実装する
- [x] 個体生成画面を CPU Worker に接続する
- [x] 日時検索画面を CPU Worker に接続する
- [x] 結果列・詳細・出力を実装する
- [x] 日時検索から個体生成への転記を実装する
- [x] 日本語・英語の翻訳カタログを更新する
- [x] 自動テスト・画面確認を実行し、検証結果を記録する
- [x] フロントエンド構成資料を更新し、仕様書を `complete` へ移動する
