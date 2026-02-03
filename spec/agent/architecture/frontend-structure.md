# TypeScript (Frontend) ディレクトリ構成

フロントエンド `src/` のディレクトリ構成を定義する。

## ディレクトリ構成

```
src/
├── main.tsx                # エントリポイント
├── App.tsx                 # ルートコンポーネント
├── index.css               # グローバルスタイル
│
├── components/             # 共通UIコンポーネント
│   ├── ui/                 # 汎用部品 (Button, Input, Select など)
│   ├── layout/             # レイアウト部品 (Header, Footer, Container)
│   └── forms/              # フォーム部品 (IvInput, DateRangePicker など)
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
│   ├── search.worker.ts    # 検索用 Worker
│   └── types.ts            # Worker メッセージ型定義
│
├── services/               # サービス層
│   ├── worker-pool.ts      # Worker プール管理
│   └── progress.ts         # 進捗管理
│
├── stores/                 # 状態管理
│   ├── settings.ts         # DS設定・アプリ設定
│   └── search.ts           # 検索状態
│
├── hooks/                  # カスタムフック
│   ├── use-worker-search.ts
│   └── use-local-storage.ts
│
├── utils/                  # ユーティリティ
│   ├── export.ts           # エクスポート機能
│   └── validation.ts       # バリデーション
│
├── types/                  # TypeScript 型定義
│   └── index.ts            # アプリ固有型 (WASM 型の re-export 含む)
│
└── assets/                 # 静的リソース
    └── ...
```

## モジュール責務

| モジュール | 責務 |
|-----------|------|
| `components/` | 再利用可能な UI コンポーネント。ビジネスロジックを持たない |
| `features/` | 機能単位のまとまり。各機能のコンポーネント・ロジックを内包 |
| `workers/` | Web Worker エントリポイント。WASM 呼び出しを担当 |
| `services/` | Worker 管理・進捗管理等のアプリケーションサービス |
| `stores/` | 状態管理 (Jotai / Zustand)。永続化対象の設定を含む |
| `hooks/` | React カスタムフック |
| `utils/` | 純粋関数ユーティリティ |
| `types/` | 型定義。WASM 型の re-export を含む |

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
types/
  ↑
  ├── utils/
  │     ↑
  │     ├── hooks/
  │     ├── stores/
  │     └── services/
  │           ↑
  │           └── workers/
  │
  ├── components/
  │     ↑
  │     └── features/
  │           ↑
  │           └── App.tsx
```

- `types/` は他モジュールに依存しない
- `utils/` は `types/` のみに依存
- `components/` は `types/`, `utils/` に依存
- `features/` は全モジュールを利用可能

## 命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ディレクトリ | kebab-case | `datetime-search/` |
| コンポーネントファイル | PascalCase | `DatetimeSearchPage.tsx` |
| フック/ユーティリティ | kebab-case | `use-worker-search.ts` |
| 型定義ファイル | kebab-case | `types.ts`, `index.ts` |
| コンポーネント名 | PascalCase | `DatetimeSearchPage` |
| 関数名 | camelCase | `startSearch` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_WORKER_COUNT` |

## 関連ドキュメント

- [Rust ディレクトリ構成](./rust-structure.md)
- [状態管理方針](./state-management.md)
- [Worker 設計](./worker-design.md)
- [レスポンシブ対応](./responsive-design.md)
