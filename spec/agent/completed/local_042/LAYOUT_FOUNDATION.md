# レイアウト基盤構築 仕様書

## 1. 概要

### 1.1 目的

Vite テンプレートの残骸を撤去し、デザインシステムに準拠したアプリケーションレイアウトの下地を構築する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 1 画面レイアウト | PC 版でページ全体が縦スクロールなしにビューポート内に収まるレイアウト |
| シェル | Header + メインコンテンツ領域で構成されるアプリケーションの外殻コンポーネント |
| テーマトグル | ダーク/ライトモードを切り替える UI 要素 |

### 1.3 背景・問題

- `src/App.tsx`, `src/App.css` が Vite テンプレートのまま残っている
- `src/assets/react.svg` が不要
- Phase 2 のコンポーネント実装に先立ち、配置先となるレイアウト構造が未整備

### 1.4 期待効果

| 指標 | 現状 | 目標 |
|------|------|------|
| テンプレート残骸 | 3 ファイル (App.css, App.tsx テンプレ, react.svg) | 0 |
| レイアウト構造 | なし | Header + メインコンテンツの 1 画面シェル |
| テーマ切替 | Store のみ (UI 未接続) | Header のトグルボタンで動作 |

### 1.5 着手条件

- [x] Tailwind CSS v4 + デザイントークン設定済み (design-system.md)
- [x] Zustand UI Store (`useUiStore`) にテーマ状態管理が存在
- [x] `cn()` ユーティリティが `src/lib/utils.ts` に定義済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/App.css` | 削除 | Vite テンプレート CSS の撤去 |
| `src/App.tsx` | 修正 | レイアウトシェルに置換 |
| `src/assets/react.svg` | 削除 | 不要な静的リソース撤去 |
| `src/main.tsx` | 修正 | テーマ初期化処理の追加 |
| `src/components/layout/header.tsx` | 新規 | Header コンポーネント |
| `src/components/layout/theme-toggle.tsx` | 新規 | テーマ切替ボタン |

## 3. 設計方針

### 3.1 レイアウト構造

design-system.md Section 5.5「PC 版 1 画面レイアウト」に従う。

```
┌─ Header ─────────────────────────────┐  ─┐
├──────────────────────────────────────┤   │
│                                      │   │
│         Main Content                 │   │ 100dvh
│         (flex-1, overflow-y-auto)    │   │
│                                      │   │
└──────────────────────────────────────┘  ─┘
```

- PC 版 (`lg+`): `h-dvh overflow-hidden` で 1 画面に収める
- モバイル: 1 画面制約なし (後続タスクで対応)
- サイドバーは後続タスクで追加するため、この時点では含めない

### 3.2 テーマ切替

| 項目 | 方針 |
|------|------|
| 状態管理 | `useUiStore` の `theme` フィールド (`'light' \| 'dark' \| 'system'`) |
| DOM 反映 | `<html>` 要素の `.dark` クラスを付与/除去 |
| 初期化 | `main.tsx` でアプリ起動時に適用。`system` の場合は `prefers-color-scheme` に従う |
| トグル動作 | light → dark → system → light のサイクル |
| 永続化 | `useUiStore` が `persist` middleware で localStorage に保存済み |

### 3.3 コンテンツ幅制約

メインコンテンツ領域に `max-w-screen-xl mx-auto` を適用し、超広幅ディスプレイでの過度な引き伸ばしを防ぐ。

## 4. 実装仕様

### 4.1 App.tsx

```tsx
import { Header } from './components/layout/header';

function App() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:h-dvh">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-screen-xl px-4 py-4 lg:px-6">
          {/* Phase 3 で機能ページを配置 */}
        </div>
      </main>
    </div>
  );
}

export default App;
```

### 4.2 Header

```tsx
// src/components/layout/header.tsx
import { Trans } from '@lingui/react/macro';
import { ThemeToggle } from './theme-toggle';

function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      <h1 className="text-sm font-medium">
        <Trans>5genSearch</Trans>
      </h1>
      <ThemeToggle />
    </header>
  );
}

export { Header };
```

### 4.3 ThemeToggle

```tsx
// src/components/layout/theme-toggle.tsx
import { Sun, Moon, Monitor } from 'lucide-react';
import { useUiSettings } from '@/hooks/use-ui-settings';

const THEME_CYCLE = ['light', 'dark', 'system'] as const;

function ThemeToggle() {
  const { theme, setTheme } = useUiSettings();

  const handleClick = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      <Icon className="size-4" />
    </button>
  );
}

export { ThemeToggle };
```

### 4.4 テーマ初期化 (main.tsx への追加)

```tsx
// main.tsx のbootstrap() 内、createRoot() より前に呼び出す
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}
```

Store の `theme` 変更を `subscribe` で監視し、DOM に反映する。

## 5. テスト方針

| 分類 | テスト | 検証内容 |
|------|--------|----------|
| ユニットテスト | テーマサイクル | light → dark → system → light の遷移 |
| コンポーネントテスト | Header 描画 | タイトルとテーマトグルが表示される |
| コンポーネントテスト | ThemeToggle | クリックでテーマが切り替わる |
| 手動確認 | 1 画面レイアウト | PC 幅でページスクロールが発生しない |
| 手動確認 | テーマ切替 | ダーク/ライトの配色が正しく反映される |

## 6. 実装チェックリスト

- [x] `src/App.css` を削除
- [x] `src/assets/react.svg` を削除
- [x] `src/App.tsx` をレイアウトシェルに置換
- [x] `src/components/layout/header.tsx` を作成
- [x] `src/components/layout/theme-toggle.tsx` を作成
- [x] `src/main.tsx` にテーマ初期化と subscribe を追加
- [x] `pnpm dev` で動作確認
- [x] `pnpm lint` / `pnpm format` を通過
