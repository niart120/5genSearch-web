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
│   └── timer0-vcount-defaults.ts  # Timer0/VCount デフォルト値
│
├── services/               # 機能横断インフラサービス
│   ├── worker-pool.ts      # Worker プール管理
│   ├── progress.ts         # 進捗管理
│   └── search-tasks.ts     # 検索タスク生成 (WASM タスク分割関数のラッパー)
│
├── stores/                 # 状態管理
│   ├── settings/
│   │   ├── ds-config.ts    # DS設定 (永続化)
│   │   ├── trainer.ts      # トレーナー情報 (永続化)
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

Phase 3 で `features/` を追加予定。追加時の構成は以下を基準とする：

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

WASM バイナリ (`wasm_pkg_bg.wasm`) は `public/wasm/` から配信され、Worker 内で絶対パス `/wasm/wasm_pkg_bg.wasm` で参照する。

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
