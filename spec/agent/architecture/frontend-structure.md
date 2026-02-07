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
├── App.tsx                 # ルートコンポーネント
├── index.css               # グローバルスタイル
│
├── components/             # 共通UIコンポーネント (Radix UI ベース)
│   ├── ui/                 # 汎用部品 (Button, Input, Select など)
│   ├── layout/             # レイアウト部品 (Header, Footer, Container)
│   ├── forms/              # フォーム入力部品 (IvInput, DateRangePicker など)
│   └── data-display/       # データ表示部品 (ResultTable, ResultCard など)
│
├── features/               # 機能単位モジュール
│   ├── datetime-search/    # 起動時刻検索
│   ├── pokemon-list/       # 個体生成リスト
│   ├── egg-search/         # 孵化検索
│   ├── needle-search/      # 針検索
│   ├── mtseed-search/      # 初期Seed検索
│   ├── trainer-search/     # トレーナーID検索
│   └── settings/           # DS設定・共通設定
│
├── workers/                # Web Worker エントリポイント
│   ├── search.worker.ts    # CPU 検索用 Worker
│   ├── gpu.worker.ts       # GPU 検索用 Worker
│   └── types.ts            # Worker メッセージ型定義
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
├── hooks/                  # カスタムフック
│   ├── use-search.ts       # 検索実行 (WorkerPool ラッパー)
│   ├── use-ds-config.ts    # DS設定フック
│   ├── use-trainer.ts      # トレーナー情報フック
│   ├── use-ui-settings.ts  # UI設定フック
│   ├── use-search-results.ts # 検索結果フック
│   └── use-local-storage.ts
│
├── io/                     # 入出力処理
│   ├── export-csv.ts       # CSV エクスポート
│   ├── export-json.ts      # JSON エクスポート
│   └── clipboard.ts        # クリップボード操作
│
├── i18n/                   # 国際化
│   ├── index.ts            # i18n 設定
│   ├── ja.ts               # 日本語リソース
│   └── en.ts               # 英語リソース
│
├── validation/             # バリデーション (必要に応じて)
│   └── index.ts            # 共通バリデーションルール
│
└── assets/                 # 静的リソース
    └── ...
```

## モジュール責務

| モジュール | 責務 |
|-----------|------|
| `components/` | 再利用可能な UI コンポーネント (Radix UI ベース)。ビジネスロジックを持たない |
| `components/ui/` | 最小単位の汎用部品 (Button, Input, Select, Checkbox など) |
| `components/layout/` | ページレイアウト部品 (Header, Sidebar, Container など) |
| `components/forms/` | フォーム入力に特化した部品 (IvRangeInput, DateRangePicker など) |
| `components/data-display/` | データ表示に特化した部品 (ResultTable, ResultCard, ProgressBar など) |
| `features/` | 機能単位のまとまり。機能固有の UI + ロジックを内包 |
| `workers/` | Web Worker エントリポイント。WASM 呼び出しを担当 (CPU/GPU 別) |
| `services/` | 機能横断のインフラサービス (Worker 管理、進捗管理、タスク生成など) |
| `stores/` | 状態管理。永続化対象の設定を含む |
| `hooks/` | React カスタムフック |
| `io/` | 入出力処理 (エクスポート、クリップボード操作) |
| `i18n/` | 国際化リソースと設定 |
| `validation/` | 共通バリデーションルール (必要に応じて) |

### features/ と services/ の役割分担

| 観点 | features/ | services/ |
|-----|-----------|-----------|
| スコープ | 機能固有 | 機能横断 |
| 含むもの | UI + ロジック + 型 | インフラ的処理 |
| 例 | `datetime-search/` の検索フォーム・結果表示 | `WorkerPool` による Worker 管理 |
| 依存方向 | services を利用する | features に依存しない |

## features/ 内部構成

各機能ディレクトリは以下の構成を持つ：

```
features/{feature-name}/
├── index.ts                # 公開 API (re-export)
├── components/             # 機能固有コンポーネント
│   ├── {Feature}Page.tsx   # ページコンポーネント
│   └── {Feature}Form.tsx   # 入力フォーム
├── hooks/                  # 機能固有フック
└── types.ts                # 機能固有型定義
```

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
  ├── io/
  │
  ├── validation/
  │
  ├── components/
  │     ↑
  │     └── features/
  │           ↑
  │           └── App.tsx
  │
  └── i18n/
```

- WASM 型は `@wasm` から直接インポート (re-export 層は設けない)
- `services/` は `features/` に依存しない (逆方向のみ許可)
- `components/` は `stores/`, `hooks/` に依存可能
- `features/` は全モジュールを利用可能

## 命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ディレクトリ | kebab-case | `datetime-search/` |
| コンポーネントファイル | PascalCase | `DatetimeSearchPage.tsx` |
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

Phase 2 (共通コンポーネント) 開始前に以下を決定：

- i18n ライブラリ選定 (react-i18next, lingui など)
- リソースファイル形式 (JSON, TypeScript)
- 翻訳キー命名規則

## 関連ドキュメント

- [Rust ディレクトリ構成](./rust-structure.md)
- [状態管理方針](./state-management.md)
- [Worker 設計](./worker-design.md)
- [レスポンシブ対応](./responsive-design.md)
- [デザインシステム](./design-system.md)
- [i18n 設計](./i18n-design.md)
