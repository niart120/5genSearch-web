# レイアウト部品 仕様書

## 1. 概要

### 1.1 目的

Phase 2 共通コンポーネントのうち、レイアウト部品 (Sidebar, ResponsiveContainer, LanguageToggle) を実装し、Phase 3 の機能実装で利用可能なアプリケーションシェルを完成させる。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Sidebar | DS 設定 (MAC アドレス、Timer0 等) を配置するサイドパネル。PC では常設、モバイルではドロワーで表示する |
| Sheet | Radix UI Dialog をベースにした、画面端からスライドインするパネル。モバイル版 Sidebar の実装に使用する |
| ResponsiveContainer | Sidebar + メインコンテンツ領域を PC/モバイルで切り替えるレイアウトコンテナ |
| LanguageToggle | ヘッダーに配置する言語切替ボタン (ja/en) |
| アプリシェル | Header + Sidebar + メインコンテンツ領域で構成されるアプリケーション全体のレイアウト骨格 |

### 1.3 背景・問題

Phase 1 で構築済みの基盤:

- Header + ThemeToggle (`components/layout/`)
- `h-dvh` 1 画面レイアウト (`App.tsx`)
- 状態管理 (Zustand) + i18n 基盤 (Lingui)
- デザイントークン (`index.css`)

Phase 3 の機能実装 (DS 設定、起動時刻検索等) に着手するには、Sidebar を含むレイアウト骨格が必要である。現在の `App.tsx` はメインコンテンツ領域のみで、Sidebar やレスポンシブ切り替えの仕組みがない。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| Phase 3 着手準備 | DS 設定フォームの配置先 (Sidebar) が確定する |
| レスポンシブ対応 | PC/モバイルの 2 つのレイアウトパターンが動作する |
| ナビゲーション完成 | テーマ切替 + 言語切替 + Sidebar 開閉がヘッダーに集約される |

### 1.5 着手条件

| 条件 | 状態 |
|------|------|
| Phase 1 基盤整備完了 | 充足 |
| Phase 2 UI 部品の実装 | 充足 (Button, Input, Select, Checkbox, Tabs, Dialog, Label 実装済み) |
| デザインシステム定義 | 充足 (`design-system.md`, `responsive-design.md`) |

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|----------|---------|
| `src/components/ui/sheet.tsx` | 新規 | Sheet (スライドインパネル) UI 部品 |
| `src/components/layout/sidebar.tsx` | 新規 | Sidebar コンポーネント |
| `src/components/layout/responsive-container.tsx` | 新規 | PC/モバイル レスポンシブレイアウト |
| `src/components/layout/language-toggle.tsx` | 新規 | 言語切替ボタン |
| `src/components/layout/header.tsx` | 変更 | LanguageToggle 追加、モバイル用ハンバーガーメニュー追加 |
| `src/App.tsx` | 変更 | ResponsiveContainer を適用 |
| `src/hooks/use-media-query.ts` | 新規 | メディアクエリフック |
| `src/test/components/layout/` | 新規 | レイアウト部品のコンポーネントテスト |

## 3. 設計方針

### 3.1 レイアウト構造

PC 版 (`lg+`) とモバイル版 (`< lg`) で異なるレイアウトを採用する。

**PC 版** — Sidebar 常設、1 画面 (`h-dvh`) に収める:

```
┌─ Header ────────────[Lang][Theme]─┐  ─┐
├──────────┬────────────────────────┤   │
│          │                        │   │
│ Sidebar  │   Main Content         │   │
│ (w-64)   │   (flex-1)             │   │ 100dvh
│          │                        │   │
│          │                        │   │
├──────────┴────────────────────────┤   │
│ (Footer - optional)              │  ─┘
└───────────────────────────────────┘
```

**モバイル版** — Sidebar は Sheet (左スライドイン)、縦スクロール:

```
┌─ Header ──────[☰][Lang][Theme]──┐
├─────────────────────────────────┤
│                                  │
│   Main Content                   │
│   (vertical scroll)              │
│                                  │
└──────────────────────────────────┘

  ← Sheet (Sidebar) がオーバーレイで出現
```

### 3.2 Sidebar の設計

| 項目 | PC (`lg+`) | モバイル (`< lg`) |
|------|-----------|------------------|
| 表示形態 | 固定 `aside` (常設) | Sheet (左スライドイン) |
| 幅 | `w-64` (16rem) | 画面幅の 80% (`w-4/5`), 最大 `max-w-xs` (20rem) |
| 開閉トリガー | なし (常設) | ヘッダーのハンバーガーボタン |
| 内容 | DS 設定フォーム (Phase 3 で実装) | 同左 |
| スクロール | 内部スクロール (`overflow-y-auto`) | 同左 |
| 背景オーバーレイ | なし | Sheet 標準のオーバーレイ |

Sidebar コンテンツ (DS 設定フォーム) は Phase 3 で実装するため、本 Phase ではレイアウトシェルのみ提供する。
`children` を受け取り、Phase 3 で中身を差し込む設計とする。

### 3.3 Sheet コンポーネントの設計

shadcn/ui の Sheet パターンに倣い、`@radix-ui/react-dialog` をベースに構築する。
`side` プロパティで出現方向を制御する。本 Phase では `left` のみ使用するが、汎用性のため 4 方向に対応する。

### 3.4 LanguageToggle の設計

ThemeToggle と同様のサイクルトグル方式を採用する。

| 項目 | 内容 |
|------|------|
| 配置 | Header 右端、ThemeToggle の左隣 |
| 動作 | クリックで `ja` → `en` → `ja` を切り替え |
| 表示 | 現在の言語コード (`JA` / `EN`) をテキスト表示 |
| 永続化 | `useUiStore.setLanguage()` 経由 (既存実装に依存) |

### 3.5 Header の変更方針

既存の Header に以下を追加する:

1. **モバイル用ハンバーガーボタン** — `lg` 未満で表示。Sidebar (Sheet) の開閉を制御する
2. **LanguageToggle** — ThemeToggle の左隣に配置

```
PC:    [タイトル]                    [Lang] [Theme]
Mobile:[☰] [タイトル]               [Lang] [Theme]
```

### 3.6 Sidebar 開閉状態の管理

| 項目 | 方針 |
|------|------|
| 状態管理場所 | `App.tsx` のローカル `useState` |
| 永続化 | しない (ページリロード時はデフォルト閉じ) |
| Store 化 | 不要。Sidebar 開閉を参照するのは Header のハンバーガーボタンと ResponsiveContainer のみであり、props 経由で十分 |

### 3.7 useMediaQuery フック

CSS メディアクエリの状態を React state として提供する。

`responsive-design.md` Section 2.3 の判断基準に従い、以下のケースで使用する:

- DOM 構造が大きく異なり、両方レンダリングがコストになる場合 (検索結果のテーブル/カード切替)
- JS レベルの挙動分岐が必要な場合 (モバイルでの自動 Sheet 閉じ等)

単純なスタイル差異や軽量要素の表示/非表示は Tailwind ブレークポイントを使用し、`useMediaQuery` は使わない。

### 3.8 フォーカス管理

#### PC 版 (固定 Sidebar)

PC 版では Sidebar とメインコンテンツが同一ページ内に常設されるため、Tab キーによる自然なフォーカス移動で遷移する。

| フォーカス遷移 | 挙動 |
|-------------|------|
| Sidebar 内の最後の入力 → Tab | メインコンテンツの最初のフォーカス可能要素へ移動 |
| メインコンテンツの最初の要素 → Shift+Tab | Sidebar 内の最後のフォーカス可能要素へ戻る |

フォーカストラップは**設定しない**。Sidebar は常設パネルであり、モーダルではないため、自然な Tab 順序 (DOM 順) に従う。

#### モバイル版 (Sheet)

Radix UI Dialog のフォーカストラップに従う。

| フォーカス遷移 | 挙動 |
|-------------|------|
| Sheet 開 | Sheet 内の最初のフォーカス可能要素にフォーカス移動 (Radix 標準) |
| Sheet 内で Tab 循環 | Sheet 内でフォーカスがトラップされる (Radix 標準) |
| Sheet 閉 | トリガー要素 (ハンバーガーボタン) にフォーカス復帰 (Radix 標準) |

### 3.9 Sheet 閉じ時のフォーム状態

モバイル Sheet の閉操作は blur と同等に扱う。`design-system.md` Section 10.4 で定義されたフォーム入力の blur ハンドラが適用され、空欄はデフォルト値に復元、範囲外の値はクランプされる。

Sheet 閉じ時に追加のリセット処理は行わない。ローカル state + blur 同期パターン (`useState` で表示用テキスト保持、blur 時に Store 反映) が Sheet 閉じでも動作することを Phase 3 のフォーム実装時に検証する。

### 3.10 Sidebar 幅の決定方針

初期値は `w-64` (16rem) で仮置きする。Phase 3 で DS 設定フォームを実装した後、以下の観点で開発サーバ上の実機表示を評価し、必要に応じて調整する。

| 評価観点 | 確認内容 |
|---------|---------|
| フォーム配置 | DS 設定の入力項目が `w-64` に収まるか。ラベルの折り返しが許容範囲か |
| メインコンテンツとのバランス | HD (1366px) でメインコンテンツが窮屈にならないか |
| 視覚的バランス | Sidebar の情報密度とメインコンテンツの余白のバランス |

幅変更時の影響範囲:

- `responsive-container.tsx` の `w-64` クラス
- `max-w-screen-xl` (1280px) 内に Sidebar + メインコンテンツが収まるか

## 4. 実装仕様

### 4.1 Sheet (`src/components/ui/sheet.tsx`)

`@radix-ui/react-dialog` をベースに、4 方向スライドインを実装する。

```tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 bg-background shadow-lg transition-transform duration-300 ease-in-out data-[state=closed]:duration-200',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=open]:slide-in-from-top-2 data-[state=closed]:-translate-y-full',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:translate-y-full',
        left: 'inset-y-0 left-0 h-full border-r data-[state=open]:slide-in-from-left-2 data-[state=closed]:-translate-x-full',
        right:
          'inset-y-0 right-0 h-full border-l data-[state=open]:slide-in-from-right-2 data-[state=closed]:translate-x-full',
      },
    },
    defaultVariants: {
      side: 'left',
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'left', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-4 text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-medium text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
```

### 4.2 Sidebar (`src/components/layout/sidebar.tsx`)

Sidebar のレイアウトシェル。中身 (DS 設定フォーム) は Phase 3 で `children` として注入する。

```tsx
import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { cn } from '@/lib/utils';

interface SidebarProps {
  children?: ReactNode;
  className?: string;
}

function Sidebar({ children, className }: SidebarProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-medium">
          <Trans>Settings</Trans>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

export { Sidebar };
export type { SidebarProps };
```

### 4.3 ResponsiveContainer (`src/components/layout/responsive-container.tsx`)

PC では Sidebar を固定表示、モバイルでは Sheet で表示するコンテナ。

```tsx
import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

interface ResponsiveContainerProps {
  sidebarContent?: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function ResponsiveContainer({
  sidebarContent,
  sidebarOpen,
  onSidebarOpenChange,
  children,
}: ResponsiveContainerProps) {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-1 overflow-hidden">
      {/* PC: 固定 Sidebar */}
      {sidebarContent && (
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <Sidebar>{sidebarContent}</Sidebar>
        </aside>
      )}

      {/* モバイル: Sheet Sidebar */}
      {sidebarContent && (
        <Sheet open={sidebarOpen} onOpenChange={onSidebarOpenChange}>
          <SheetContent side="left" className="w-4/5 max-w-xs p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>
                <Trans>Settings</Trans>
              </SheetTitle>
            </SheetHeader>
            <Sidebar>{sidebarContent}</Sidebar>
          </SheetContent>
        </Sheet>
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 lg:px-6">{children}</div>
      </main>
    </div>
  );
}

export { ResponsiveContainer };
export type { ResponsiveContainerProps };
```

### 4.4 LanguageToggle (`src/components/layout/language-toggle.tsx`)

```tsx
import { useUiSettings } from '@/hooks/use-ui-settings';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';
import { cn } from '@/lib/utils';

function LanguageToggle() {
  const { language, setLanguage } = useUiSettings();

  const handleClick = () => {
    const currentIndex = SUPPORTED_LOCALES.indexOf(language);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LOCALES.length;
    setLanguage(SUPPORTED_LOCALES[nextIndex] as SupportedLocale);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-sm px-2',
        'text-xs font-medium text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
      )}
      aria-label={`Switch language to ${language === 'ja' ? 'English' : '日本語'}`}
    >
      {language.toUpperCase()}
    </button>
  );
}

export { LanguageToggle };
```

### 4.5 Header 変更 (`src/components/layout/header.tsx`)

LanguageToggle の追加と、モバイル用ハンバーガーボタンの追加。

```tsx
import { Trans } from '@lingui/react/macro';
import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';

interface HeaderProps {
  onMenuClick?: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
        )}
        <h1 className="text-sm font-medium">
          <Trans>5genSearch</Trans>
        </h1>
      </div>
      <div className="flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

export { Header };
export type { HeaderProps };
```

### 4.6 App.tsx 変更

```tsx
import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { ResponsiveContainer } from '@/components/layout/responsive-container';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <ResponsiveContainer
        sidebarContent={<p className="text-sm text-muted-foreground">DS settings (Phase 3)</p>}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
        {/* Phase 3: feature pages */}
      </ResponsiveContainer>
    </div>
  );
}

export default App;
```

### 4.7 useMediaQuery (`src/hooks/use-media-query.ts`)

CSS メディアクエリの変更を監視し、React state として返すフック。

`useSyncExternalStore` を使用する。`useState` + `useEffect` パターンでは effect 内の `setState` が `react-hooks/set-state-in-effect` ルールに抵触するため、外部ストア購読 API を採用した。

```tsx
import { useCallback, useSyncExternalStore } from 'react';

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export { useMediaQuery };
```

本 Phase の ResponsiveContainer は Tailwind ブレークポイントで Sidebar の表示/非表示を分岐する。`useMediaQuery` は Phase 3 以降で DOM 構造が大きく異なるケース (検索結果テーブル ↔ カード切替) や JS レベルの挙動分岐 (モバイルでの Sheet 自動閉じ等) で使用するため、この時点で整備する。

## 5. テスト方針

### 5.1 テスト分類

| テストファイル | 分類 | 実行環境 | 検証内容 |
|--------------|------|----------|---------|
| `src/test/components/layout/sidebar.test.tsx` | コンポーネント | jsdom | Sidebar の描画、children の表示 |
| `src/test/components/layout/language-toggle.test.tsx` | コンポーネント | jsdom | 言語サイクル切替、Store 連携 |
| `src/test/components/layout/header.test.tsx` | コンポーネント | jsdom | ハンバーガーボタンの表示/非表示、onMenuClick コールバック |
| `src/test/unit/hooks/use-media-query.test.ts` | ユニット | jsdom | matchMedia モック検証 |

### 5.2 テスト方針の補足

- Sheet, ResponsiveContainer は DOM 構造だけでなく Radix UI のダイアログ開閉を含むため、integration テストとしてもカバーが望ましいが、Phase 2 では外観・基本動作のコンポーネントテストを優先する
- Header のレスポンシブ分岐 (`lg:hidden`) は CSS ベースのため、jsdom では検証困難。resize 検証は Playwright による E2E テスト (Phase 4) に委ねる

## 6. 実装チェックリスト

- [x] `src/components/ui/sheet.tsx` の実装
- [x] `src/components/layout/sidebar.tsx` の実装
- [x] `src/components/layout/responsive-container.tsx` の実装
- [x] `src/components/layout/language-toggle.tsx` の実装
- [x] `src/components/layout/header.tsx` の変更 (LanguageToggle + ハンバーガーボタン)
- [x] `src/App.tsx` の変更 (ResponsiveContainer 適用)
- [x] `src/hooks/use-media-query.ts` の実装
- [x] Sidebar コンポーネントテスト
- [x] LanguageToggle コンポーネントテスト
- [x] Header コンポーネントテスト
- [x] useMediaQuery ユニットテスト
- [x] lint / format / 型チェック 通過
