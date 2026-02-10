# 実装ロードマップ

フロントエンド実装の順序と依存関係を定義する。

## 1. 実装方針

**レイヤーボトムアップ**アプローチを採用：

1. 基盤レイヤーを先に整備
2. UI 実装に集中できる状態を作る
3. デザインの一貫性にリソースを投下

## 2. フェーズ構成

```
Phase 1: 基盤整備
    ├── WASM バインディング検証
    ├── Worker 基盤
    └── 状態管理基盤
            │
            ▼
Phase 2: 共通コンポーネント
    ├── UI 部品 (Radix UI + Tailwind)
    ├── フォーム部品
    └── レイアウト部品
            │
            ▼
Phase 3: 機能実装
    ├── DS 設定
    ├── ナビゲーション基盤
    ├── 起動時刻検索
    ├── ポケモンリスト
    ├── 孵化検索
    └── misc (針/MTSeed/TID)
            │
            ▼
Phase 4: 仕上げ
    ├── エクスポート機能
    ├── レスポンシブ調整
    └── パフォーマンス最適化
```

## 3. Phase 1: 基盤整備

### 3.1 WASM バインディング検証 (完了)

| タスク | 説明 | 成果物 | 状態 |
|-------|------|--------|------|
| API 網羅性確認 | d.ts と実装の差異確認 | 不足 API リスト | ✅ |
| bindgen 付与漏れ修正 | `generate_pokemon_list` 等 | 修正 PR | ✅ |
| GPU API 確認 | ビルドオプション確認 | 対応方針 | ✅ |
| ヘルスチェック | `health_check()` 動作確認 | テストコード | ✅ |

### 3.2 Worker 基盤 (完了)

| タスク | 説明 | 成果物 | 状態 |
|-------|------|--------|------|
| CPU Worker エントリポイント | `search.worker.ts` | 実装 | ✅ |
| GPU Worker エントリポイント | `gpu.worker.ts` | 実装 | ✅ |
| WASM 初期化 | Worker 内での init | 実装 | ✅ |
| メッセージ型定義 | Request/Response 型 | `workers/types.ts` | ✅ |
| WorkerPool 実装 | spawn/dispatch/collect | `services/worker-pool.ts` | ✅ |
| 進捗集約 | AggregatedProgress | `services/progress.ts` | ✅ |
| キャンセル処理 | 中断フロー | 実装 | ✅ |
| 検索タスク生成 | WASM タスク分割関数 | `services/search-tasks.ts` | ✅ |
| 検索実行フック | WorkerPool ラッパー | `hooks/use-search.ts` | ✅ |

### 3.3 状態管理基盤 (完了)

| タスク | 説明 | 成果物 | 状態 |
|-------|------|--------|------|
| ライブラリ選定 | Jotai vs Zustand 机上比較 | 選定結果 | ✅ |
| Store 分割設計 | 永続化/非永続化分類 | `stores/settings/`, `stores/search/` | ✅ |
| 永続化実装 | localStorage 連携 | `persist` middleware 適用 | ✅ |
| カスタムフック | Store 隠蔽フック | `hooks/use-*.ts` | ✅ |
| Store 間同期 | 言語変更 → i18n 同期 | `stores/sync.ts` | ✅ |

### 3.4 i18n 基盤 (完了)

| タスク | 説明 | 成果物 | 状態 |
|-------|------|--------|------|
| ライブラリ選定 | react-i18next / lingui 比較 | Lingui 5 採用 | ✅ |
| リソース形式決定 | JSON vs TypeScript | TypeScript (Lingui compiled catalogs) | ✅ |
| 翻訳キー命名規則 | `<Trans>` マクロによる自然文キー | `i18n-design.md` | ✅ |
| 初期リソース作成 | ja / en カタログ | `i18n/locales/{ja,en}/messages.ts` | ✅ |

### 3.5 デザインシステム基盤 (完了)

| タスク | 説明 | 成果物 | 状態 |
|-------|------|--------|------|
| コンポーネント方針策定 | shadcn/ui スタイル (Radix + cva + Tailwind) | `design-system.md` | ✅ |
| テーマ設計 | BW テーマ (Zekrom/Reshiram) | CSS カスタムプロパティ | ✅ |
| Tailwind v4 設定 | `@tailwindcss/vite` + デザイントークン | `index.css`, `vite.config.ts` | ✅ |
| ユーティリティ | `cn()` (clsx + tailwind-merge) | `lib/utils.ts` | ✅ |
| 依存パッケージ導入 | Radix UI, cva, lucide-react, フォント等 | `package.json` | ✅ |

### 3.6 レイアウト基盤 (完了)

| タスク | 説明 | 成果物 | 状態 |
|-------|------|--------|------|
| Vite テンプレート撤去 | App.css, react.svg 削除 | 削除済み | ✅ |
| アプリシェル | h-dvh 1 画面レイアウト | `App.tsx` | ✅ |
| Header | タイトル + ThemeToggle | `components/layout/header.tsx` | ✅ |
| ThemeToggle | light/dark/system サイクル | `components/layout/theme-toggle.tsx` | ✅ |
| テーマ初期化 | pre-render 適用 + subscribe | `main.tsx` | ✅ |

## 4. Phase 2: 共通コンポーネント

### 4.1 UI 部品

| コンポーネント | ベース | 状態 | 備考 |
|--------------|-------|------|------|
| Button | Radix UI | ✅ | バリアント対応 |
| Input | Radix UI | ✅ | 数値/テキスト |
| Select | Radix UI | ✅ | 単一/複数選択 |
| Checkbox | Radix UI | ✅ | |
| Switch | Radix UI | ✅ | on/off トグル用 |
| Tabs | Radix UI | ✅ | 機能切り替え |
| Dialog | Radix UI | ✅ | モーダル |
| Badge | Radix UI | ✅ | 状態表示 |
| Label | Radix UI | ✅ | フォームラベル |
| Progress | Radix UI | ✅ | 進捗バー |
| Sheet | Radix UI | ✅ | モバイル Sidebar |
| Table | Radix UI | ✅ | テーブルベース |
| Toast | Radix UI | ✅ | 通知 (local_049) |

### 4.2 フォーム部品

| コンポーネント | 説明 | 状態 |
|--------------|------|------|
| IvRangeInput | IV 範囲入力 (6ステータス) | ✅ |
| DateRangePicker | 日付範囲選択 | ✅ |
| TimeRangePicker | 時刻範囲選択 | ✅ |
| MacAddressInput | MAC アドレス入力 | ✅ |
| NatureSelect | 性格選択 (複数可) | ✅ |
| HiddenPowerSelect | めざパタイプ選択 | ✅ |
| Timer0VCountRangeInput | Timer0/VCount 範囲入力 | ✅ |

### 4.3 レイアウト部品

| コンポーネント | 説明 | 状態 |
|--------------|------|------|
| Header | アプリヘッダー | ✅ |
| ThemeToggle | テーマ切替ボタン | ✅ |
| Sidebar | 設定サイドバー (PC) | ✅ |
| ResponsiveContainer | レスポンシブレイアウト | ✅ |

### 4.4 データ表示部品

| コンポーネント | 説明 | 状態 |
|--------------|------|------|
| DataTable | 仮想スクロール付きテーブル表示 | ✅ |
| ResultCardList | モバイル向けカード表示 | ✅ |
| SearchProgress | 進捗バー + 統計表示 | ✅ |

## 5. Phase 3: 機能実装

### 5.1 実装順序

1. **DS 設定** (他機能の前提)
2. **ナビゲーション基盤** (機能切り替え構造。全機能ページの前提)
3. **起動時刻検索** (最も基本的な機能)
4. **ポケモンリスト** (検索結果の活用)
5. **孵化検索** (BW 専用)
6. **misc 機能群** (針/MTSeed/TID)

### 5.2 各機能の構成

```
features/{feature}/
├── components/
│   ├── {Feature}Page.tsx      # ページ
│   ├── {Feature}Form.tsx      # 入力フォーム
│   └── {Feature}Results.tsx   # 結果表示
├── hooks/
│   └── use-{feature}.ts       # 機能ロジック
└── types.ts                   # 機能固有型
```

## 6. Phase 4: 仕上げ

### 6.1 エクスポート機能

| 形式 | 対象 | 優先度 |
|-----|------|-------|
| CSV | 検索結果 | 高 |
| JSON | 検索結果 + 条件 | 中 |
| テキスト | クリップボード | 高 |

### 6.2 レスポンシブ調整

- 各機能のモバイル表示確認
- タッチ操作最適化
- 入力 UI 調整

### 6.3 パフォーマンス最適化

- 結果リストの仮想スクロール
- 不要な再レンダリング削減
- バンドルサイズ確認

## 7. 依存関係グラフ

```
[WASM 検証] ──────────────────────────────┐
      │                                    │
      ▼                                    ▼
[Worker 基盤] ◄──────────────────── [状態管理基盤]
      │                                    │
      └──────────────┬─────────────────────┘
                     ▼
              [共通コンポーネント]
                     │
                     ▼
               [DS 設定]
                     │
                     ▼
           [ナビゲーション基盤]
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
[起動時刻検索]  [個体生成]    [misc 機能群]
      │              │              │
      └──────────────┴──────────────┘
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
  [孵化検索]     [針検索]      [MTSeed/TID]
                     │
                     ▼
              [エクスポート]
```

## 8. 見積もり (目安)

| フェーズ | 規模感 |
|---------|-------|
| Phase 1 | 基盤整備 (Worker + Store) |
| Phase 2 | UI 部品 10-15 種 |
| Phase 3 | 機能 6 種 |
| Phase 4 | 仕上げ |

## 9. 検討事項

- [x] WASM API の不足分洗い出し
- [x] 状態管理ライブラリの選定 (Zustand 採用)
- [x] i18n ライブラリ選定 (Lingui 5 採用)
- [x] デザインシステム方針策定 (design-system.md)
- [ ] 現行アプリからの UI 資産流用可否
