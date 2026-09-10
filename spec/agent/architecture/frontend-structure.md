# TypeScript (Frontend) ディレクトリ構成

フロントエンド `src/` のディレクトリ構成を定義する。

## 技術スタック

| カテゴリ | ライブラリ |
|---------|-----------|
| UI コンポーネント | Radix UI |
| スタイリング | Tailwind CSS |
| 状態管理 | Zustand |
| ビルド | Vite |
| テスト | Vitest + Playwright |

## ディレクトリ構成

```
src/
├── main.tsx                # エントリポイント
├── app.tsx                 # ルートコンポーネント
├── index.css               # グローバルスタイル
│
├── components/             # 共通UIコンポーネント (Radix UI ベース)
│   ├── ui/                 # 汎用部品 (Button, Input, Select など)
│   ├── layout/             # レイアウト部品 (Header, Footer, Container)
│   ├── forms/              # フォーム入力部品 (IvInput, DateRangePicker など)
│   ├── data-display/       # データ表示部品 (DataTable, ResultCardList など)
│
├── workers/                # Web Worker エントリポイント
│   ├── search.worker.ts    # CPU 検索用 Worker
│   ├── gpu.worker.ts       # GPU 検索用 Worker
│   └── types.ts            # Worker メッセージ型定義
│
├── data/                   # 静的データ・データアクセス層
│   ├── encounters/         # エンカウントデータ
│   │   ├── schema.ts       # JSON スキーマ型定義
│   │   ├── loader.ts       # レジストリ初期化・検索 API
│   │   ├── converter.ts    # JSON → WASM 型変換
│   │   ├── helpers.ts      # UI 向けヘルパー (ロケーション一覧・種族集約)
│   │   └── generated/      # スクレイピング生成 JSON (v1/)
│   ├── wondercards/         # 配達員の同梱カード定義と公開入力への変換
│   │   ├── schema.ts       # JSON 境界・正規化後のカード型
│   │   ├── loader.ts       # 言語別遅延読み込み、メタデータ検証、ID・言語・ROM での選択
│   │   ├── converter.ts    # カードと受取人 → WonderCardParams
│   │   ├── display.ts      # 種族名と原文タイトル、重複候補の補助情報
│   │   ├── README.md       # 出典、値の対応、画面接続契約
│   │   └── generated/v1/   # 言語別の生成 JSON、1ファイル1定義
│   └── timer0-vcount-defaults.ts  # Timer0/VCount デフォルト値
│
├── services/               # 機能横断インフラサービス
│   ├── worker-pool.ts      # Worker プール管理
│   ├── progress.ts         # 進捗管理
│   ├── search-tasks.ts     # 検索タスク生成 (WASM タスク分割関数のラッパー)
│   └── batch-utils.ts      # 既知の結果 Union の集約・型判別
│
├── stores/                 # 状態管理
│   ├── settings/
│   │   ├── ds-config.ts    # DS設定 (永続化)
│   │   ├── trainer.ts      # トレーナー情報 (永続化)
│   │   ├── profile.ts      # プロファイル (永続化)
│   │   ├── ui.ts           # UI設定 (永続化)
│   │   └── index.ts        # re-export
│   ├── search/
│   │   ├── results.ts      # 検索結果 (非永続化)
│   │   └── index.ts        # re-export
│   ├── sync.ts             # Store 間同期
│   └── index.ts            # re-export
│
├── lib/                    # ユーティリティ
│   ├── navigation.ts       # カテゴリ / 機能定義、マッピングユーティリティ
│   └── utils.ts            # cn() (clsx + tailwind-merge)
│
├── hooks/                  # カスタムフック
│   ├── use-search.ts       # 検索実行 (WorkerPool ラッパー)
│   ├── use-ds-config.ts    # DS設定フック
│   ├── use-profile.ts      # プロファイル管理フック
│   ├── use-trainer.ts      # トレーナー情報フック
│   ├── use-ui-settings.ts  # UI設定フック
│   ├── use-search-results.ts # 検索結果フック
│   └── use-media-query.ts  # メディアクエリ
│
├── i18n/                   # 国際化
│   ├── index.ts            # i18n 設定
│   └── locales/            # Lingui カタログ
│       ├── ja/             # 日本語
│       │   ├── messages.po
│       │   └── messages.ts
│       └── en/             # 英語
│           ├── messages.po
│           └── messages.ts
│
├── test/                   # テスト
│   ├── unit/
│   ├── integration/
│   └── components/
│
├── wasm/                   # WASM バインディング
└── workers/                # Web Worker エントリポイント
```

## モジュール責務

| モジュール | 責務 |
|-----------|------|
| `components/` | 再利用可能な UI コンポーネント (Radix UI ベース)。ビジネスロジックを持たない |
| `components/ui/` | 最小単位の汎用部品 (Button, Input, Select, Checkbox など) |
| `components/layout/` | ページレイアウト部品 (Header, Sidebar, Container, FeaturePageLayout など) |
| `components/forms/` | フォーム入力に特化した部品 (IvRangeInput, DateRangePicker など) |
| `components/data-display/` | データ表示に特化した部品 (DataTable, ResultCardList, SearchProgress など) |
| `workers/` | Web Worker エントリポイント。WASM 呼び出しを担当 (CPU/GPU 別) |
| `data/` | 静的データとそのアクセス層。JSON スキーマ定義、レジストリ初期化、WASM 型変換、UI 向け集約 API を含む |
| `services/` | 機能横断のインフラサービス (Worker 管理、進捗管理、タスク生成など) |
| `stores/` | 状態管理。永続化対象の設定を含む |
| `hooks/` | React カスタムフック |
| `lib/` | ユーティリティ関数 (`cn()` など) |
| `i18n/` | 国際化リソースと設定 |
| `test/` | テスト (unit / integration / components) |
| `wasm/` | WASM バインディング |

### features/ と services/ の役割分担

| 観点 | features/ | services/ |
|-----|-----------|-----------|
| スコープ | 機能固有 | 機能横断 |
| 含むもの | UI + ロジック + 型 | インフラ的処理 |
| 例 | `datetime-search/` の検索フォーム・結果表示 | `WorkerPool` による Worker 管理 |
| 依存方向 | services を利用する | features に依存しない |

## features/ 内部構成

各 feature は以下の構成を基準とする：

```
features/{feature-name}/
├── index.ts                # 公開 API (re-export)
├── store.ts                # Feature Store (フォーム入力永続化 + 検索結果非永続化)
├── components/             # 機能固有コンポーネント
│   ├── {Feature}Page.tsx   # ページコンポーネント (FeaturePageLayout 使用)
│   └── {Feature}Form.tsx   # 入力フォーム
├── hooks/                  # 機能固有フック
└── types.ts                # 機能固有型定義
```

各 feature のページコンポーネントは `FeaturePageLayout` (Compound Component) を使用し、Controls / Results の 2 スロットにコンテンツを配置する。検索ボタン・SearchProgress はデュアルレンダーパターン (PC: Controls 内 `hidden lg:flex`、モバイル: `fixed bottom-14 lg:hidden`) で 2 箇所に描画する。詳細は [デザインシステム](./design-system.md) セクション 5.5.1 および [レスポンシブ対応](./responsive-design.md) セクション 5.2 を参照。

## 依存関係

```
stores/
  ↑
  ├── hooks/
  │     ↑
  │     └── services/
  │           ↑
  │           └── workers/
  │
  ├── data/
  │
  ├── components/
  │     ↑
  │     └── features/
  │           ↑
  │           └── app.tsx
  │
  └── i18n/
```

- WASM 型は `@wasm` から直接インポート (re-export 層は設けない)
- `data/` は静的データの保持と検索・変換 API を提供する。`services/` や `features/` から利用される
- `services/` は `features/` に依存しない (逆方向のみ許可)
- `components/` は `stores/`, `hooks/` に依存可能
- `features/` は全モジュールを利用可能

## 命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ディレクトリ | kebab-case | `datetime-search/` |
| コンポーネントファイル | kebab-case | `header.tsx`, `theme-toggle.tsx` |
| フック/ユーティリティ | kebab-case | `use-search.ts` |
| 型定義ファイル | kebab-case | `types.ts`, `index.ts` |
| コンポーネント名 | PascalCase | `DatetimeSearchPage` |
| 関数名 | camelCase | `startSearch` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_WORKER_COUNT` |

## WASM 型のインポート

WASM パッケージの型は `src/wasm/wasm_pkg.js` から直接インポートする:

```typescript
// OK: 直接インポート
import type { DsConfig, IvFilter } from '../wasm/wasm_pkg.js';

// NG: re-export 層を経由しない
import type { DsConfig } from '../types';
```

WASM バイナリとバインディングは `wasm-pack --target bundler` で `src/wasm/` へ生成する。メインスレッド・Worker は `wasm_pkg.js` をインポートし、`vite-plugin-wasm` が配信パスと初期化を処理する。

## 配達員のデータ経路

`data/wondercards/generated/v1/<language>/<id>.json` は `scripts/collect-wondercards.js` が固定した上流コミットから生成する。1ファイル1定義とし、取得元はスクリプト側で管理する。製品カタログに PokeFinder のテスト定義は含めず、`test/fixtures/wondercards/` に分離する。

`data/wondercards/loader.ts` は `import.meta.glob` で言語ごとに同梱 JSON を遅延読み込み・キャッシュし、複製を返す。カード ID・原文タイトル・単一エントリー・言語フォルダ・対象 ROM・配布区分と ID 指定を検証する。`getWonderCardLanguage()` は ROM リージョンを受取対象言語へ対応させ、表示言語でカタログを切り替えない。JSON の未指定値はこの境界で `undefined` に統一する。`converter.ts` は通常配布の配布元 ID、配布タマゴの受取人 ID を選び、H/A/B/C/D/S 順の六要素の固定個体値とともに `WonderCardParams` へ変換する。

`display.ts` の `getWonderCardDisplays()` は選択候補と表示言語から「種族名（cardTitle）」を返す。通常配布の同名候補には5桁の TID、同じ TID でも区別できない候補と重複タマゴには内部 ID も返す。カード定義と受取人の状態を変更せず、画面の選択候補に補助情報を表示する。選択中の表示は一行で省略する。

`createWonderCardListTasks()` と `createWonderCardDatetimeSearchTasks()` はそれぞれ `wondercard-list` / `wondercard-datetime` タスクを返す。CPU Worker が状態を持つ WASM オブジェクトを構築し、共通の `runSearchLoop` で実行・中断・解放する。両者のレスポンスは `resultType: 'wondercard-list'`、結果は `GeneratedWonderCardData[]`。配列のみを受け取る集約処理では配達員用型ガードで通常個体・育て屋タマゴを除外する。

配達員の画面は [local_126](../complete/local_126/WONDER_CARD_UI.md) で実装した。検索カテゴリの `wondercard-search` と個体生成カテゴリの `wondercard-list` を分け、どちらも三番目のタブに配置する。検索側は個体生成側のカード入力、Filter、個体詳細、共通型と実行処理を使用する。

| 配置 | 責務 |
|------|------|
| `features/wondercard-list/types.ts`・`request.ts` | 編集入力・カード解決条件・実行時設定の型と検証。WASM の種族情報を参照する要求構築は `request.ts` に分離 |
| `features/wondercard-list/store.ts`・`features/wondercard-search/store.ts` | 各画面の編集入力だけを `feature:wondercard-list`・`feature:wondercard-search` に保存。結果と実行要求はメモリに保持 |
| `features/wondercard-list/hooks/use-wondercard-selection.ts`・`use-wondercard-form.ts` | ROM に対応するカタログと選択 ID の解決、旧応答の破棄、受取人と Filter の検証 |
| `features/wondercard-list/hooks/use-wondercard-execution.ts` | `useSearch(useSearchConfig(false))`、バッチ追記、タスク構築エラー、`resolve_wondercard_data_batch()`・`useResultViews` による表示解決 |
| 各 feature のページ・結果列・実行フック | Seed 入力または日時範囲、タスク生成、候補数の確認、数値ソート、詳細と出力の接続 |
| `lib/navigate.ts` | 検索開始時の設定を複製し、DS 設定を一度で反映。選択した `source` 一件を個体生成のインポート入力へ転記 |

表示は `WonderCardResultView` と現在の表示言語から導出する。開始時のカード・変換済み条件・DS 設定・起動設定・消費範囲・Filter を複製し、確認ダイアログ、Worker 要求、結果、出力、転記で同じ値を参照する。転記されたカードはカード ID・ROM・受取人との対応を検証し、受取人の編集時は保存された定義から変換し直す。

## 国際化 (i18n)

多言語対応の方針は別途 [i18n 設計](./i18n-design.md) で定義する。

Lingui 5 を採用。詳細は [i18n 設計](./i18n-design.md) を参照。

- `<Trans>` マクロによる自然文ベースの翻訳
- コンパイル済み TypeScript カタログ (`i18n/locales/{locale}/messages.ts`)
- `vite-plugin-lingui` による自動コンパイル

## 関連ドキュメント

- [Rust ディレクトリ構成](./rust-structure.md)
- [状態管理方針](./state-management.md)
- [Worker 設計](./worker-design.md)
- [レスポンシブ対応](./responsive-design.md)
- [デザインシステム](./design-system.md)
- [i18n 設計](./i18n-design.md)
