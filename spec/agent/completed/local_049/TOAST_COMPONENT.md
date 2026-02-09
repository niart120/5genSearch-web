# Toast コンポーネント 仕様書

## 1. 概要

### 1.1 目的

ユーザー操作の結果を非ブロッキングで通知する Toast コンポーネントを実装する。
Phase 2 の UI 部品として `src/components/ui/toast.tsx` に配置し、Phase 3 以降の機能実装で利用する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Toast | 画面端に一時表示される非モーダルな通知 UI |
| Toaster | Toast の表示領域を管理するコンテナコンポーネント |
| Variant | Toast の重大度に応じた視覚的バリエーション (success / error / warning / info) |
| Duration | Toast が表示されてから自動消滅するまでの時間 |

### 1.3 背景・問題

- Phase 2 の UI 部品一覧に Toast が含まれていたが、仕様未確定で未実装だった
- 旧版 (pokemon-gen5-initseed) では `sonner` を使用し、プロファイル操作やコピー操作の通知に利用していた
- 本プロジェクトでは Radix UI ベースの方針を採っており、Toast も Radix UI Primitives で統一する

### 1.4 期待効果

| 効果 | 説明 |
|------|------|
| 操作結果の即時フィードバック | コピー成否やエラー発生を見逃さない |
| ワークフロー中断の回避 | ダイアログと異なり操作を中断しない |
| UI 部品の網羅性 | Phase 3 の機能実装で汎用的に利用可能 |

### 1.5 着手条件

- [x] Phase 2 UI 部品 (Button, Input, Dialog 等) が実装済み
- [x] design-system.md のステータスカラーが定義済み
- [x] `useMediaQuery` フックが実装済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/components/ui/toast.tsx` | 新規作成 | Toast / Toaster / toast() の実装 |
| `src/app.tsx` | 変更 | `<Toaster />` の配置 |
| `src/test/components/toast.test.tsx` | 新規作成 | コンポーネントテスト |

## 3. 設計方針

### 3.1 ライブラリ選定

**Radix UI Toast** (`@radix-ui/react-toast`) を採用する。

| 基準 | sonner | Radix UI Toast | 判定 |
|------|--------|----------------|------|
| 既存方針との一貫性 | Radix 非依存 | Radix Primitives ベース | Radix |
| スタイリング | 独自テーマ or CSS 上書き | cva + Tailwind で完全制御 | Radix |
| アクセシビリティ | 独自実装 | ARIA live region 標準対応 | Radix |
| API 設計 | `toast()` 関数呼び出し | Provider + state 管理が必要 | sonner |
| バンドルサイズ | ~5 kB | ~3 kB (他 Radix と共有) | Radix |

Radix UI Toast は Provider パターンのため、命令的な `toast()` 関数を自前で実装する必要がある。
Zustand の一時 Store または React 外 state で Toast キューを管理し、`toast()` 関数を公開する。

### 3.2 表示仕様

| 項目 | 仕様 |
|------|------|
| 表示位置 (PC: `lg+`) | 右下 (`bottom-right`) |
| 表示位置 (モバイル: `< lg`) | 下中央 (`bottom-center`) |
| 同時表示数 | 1 件。新しい Toast が既存を置換する |
| 自動消滅 (default) | 3 秒 |
| 自動消滅 (error) | 自動消滅しない。手動閉じのみ (×ボタン) |
| アニメーション | スライドイン (下から) + フェードアウト |
| スワイプ dismissal | Radix UI 標準動作に準拠 (右スワイプで消去) |

### 3.3 バリアント

design-system.md Section 3.3 のステータスカラーと対応づける。

| Variant | 用途 | アイコン | ボーダー色 | Duration |
|---------|------|---------|-----------|----------|
| `info` (default) | 汎用通知 | `Info` | `hsl(var(--ring))` | 3 秒 |
| `success` | 操作成功 | `CheckCircle` | 成功色 | 3 秒 |
| `warning` | 注意喚起 | `AlertTriangle` | 警告色 | 3 秒 |
| `error` | エラー通知 | `XCircle` | destructive 色 | 手動閉じ |

### 3.4 対象イベント

Phase 3-4 で利用が想定されるイベントの一覧。

| カテゴリ | イベント | Variant | メッセージ例 (en / ja) |
|---------|---------|---------|----------------------|
| クリップボード | コピー成功 | `success` | Copied to clipboard / クリップボードにコピーしました |
| クリップボード | コピー失敗 | `error` | Failed to copy / コピーに失敗しました |
| エクスポート | CSV/JSON 成功 | `success` | Exported as CSV / CSV をエクスポートしました |
| エクスポート | エクスポート失敗 | `error` | Export failed / エクスポートに失敗しました |
| プロファイル | 保存成功 | `success` | Profile saved / プロファイルを保存しました |
| プロファイル | 削除成功 | `success` | Profile deleted / プロファイルを削除しました |
| プロファイル | インポート成功 | `success` | Settings imported / 設定を取り込みました |
| システム | GPU 非対応 | `warning` | GPU unavailable, using CPU / GPU 非対応のため CPU で実行します |
| システム | Worker 初期化失敗 | `error` | Worker initialization failed / Worker の初期化に失敗しました |
| システム | WASM 初期化失敗 | `error` | WASM initialization failed / WASM の初期化に失敗しました |

### 3.5 レスポンシブ切り替え

`useMediaQuery` を使用して Toaster の `position` を切り替える。

```tsx
function Toaster() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const position = isDesktop ? 'bottom-right' : 'bottom-center';
  // ...
}
```

Tailwind ブレークポイントではなく `useMediaQuery` を使う理由:
Radix Toast Provider の `swipeDirection` や viewport のポジショニングクラスを JS レベルで切り替える必要があるため。

## 4. 実装仕様

### 4.1 Toast Store (状態管理)

React ツリー外から `toast()` を呼び出すために、モジュールスコープの state を使用する。
Store ではなく、コンポーネントローカルの `useSyncExternalStore` パターンで実装する。

```typescript
// src/components/ui/toast.tsx (state 部分)

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number; // ms。Infinity で手動閉じ
}

type ToastListener = () => void;

let currentToast: ToastData | null = null;
let listeners: ToastListener[] = [];

function subscribe(listener: ToastListener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): ToastData | null {
  return currentToast;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** duration の解決: error は Infinity (手動閉じ)、他は 3000ms */
const DEFAULT_DURATION_MS = 3000;

function resolveDuration(variant: ToastVariant, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  return variant === 'error' ? Infinity : DEFAULT_DURATION_MS;
}
```

### 4.2 toast() 関数

```typescript
interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

function toast(options: ToastOptions): void {
  const variant = options.variant ?? 'info';
  currentToast = {
    id: crypto.randomUUID(),
    title: options.title,
    description: options.description,
    variant,
    duration: resolveDuration(variant, options.duration),
  };
  emitChange();
}

/** ショートハンド */
toast.success = (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
  toast({ ...options, title, variant: 'success' });

toast.error = (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
  toast({ ...options, title, variant: 'error' });

toast.warning = (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
  toast({ ...options, title, variant: 'warning' });

function dismissToast(): void {
  currentToast = null;
  emitChange();
}
```

### 4.3 Toast UI コンポーネント

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-sm border p-3 shadow-md transition-all',
  {
    variants: {
      variant: {
        info: 'border-ring bg-background text-foreground',
        success: 'border-success bg-background text-foreground',
        warning: 'border-warning bg-background text-foreground',
        error: 'border-destructive bg-background text-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const VARIANT_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
} as const;

function Toaster() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const data = useSyncExternalStore(subscribe, getSnapshot, () => null);

  return (
    <ToastPrimitive.Provider
      swipeDirection={isDesktop ? 'right' : 'down'}
      duration={data?.duration === Infinity ? Number.MAX_SAFE_INTEGER : (data?.duration ?? DEFAULT_DURATION_MS)}
    >
      {data && (
        <ToastPrimitive.Root
          key={data.id}
          className={cn(toastVariants({ variant: data.variant }))}
          onOpenChange={(open) => { if (!open) dismissToast(); }}
        >
          <Icon className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1 space-y-1">
            <ToastPrimitive.Title className="text-sm font-medium">
              {data.title}
            </ToastPrimitive.Title>
            {data.description && (
              <ToastPrimitive.Description className="text-xs text-muted-foreground">
                {data.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="shrink-0 rounded-sm opacity-70 hover:opacity-100">
            <X className="size-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      )}
      <ToastPrimitive.Viewport
        className={cn(
          'fixed z-50 flex max-w-sm flex-col',
          isDesktop
            ? 'bottom-4 right-4'
            : 'bottom-4 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2'
        )}
      />
    </ToastPrimitive.Provider>
  );
}
```

### 4.4 app.tsx への組み込み

```tsx
// src/app.tsx
import { Toaster } from '@/components/ui/toast';

function App() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <ResponsiveContainer ...>
        {/* ... */}
      </ResponsiveContainer>
      <Toaster />
    </div>
  );
}
```

### 4.5 利用例 (Phase 3 以降)

```tsx
import { toast } from '@/components/ui/toast';

// コピー操作
async function handleCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t`Copied to clipboard`);
  } catch {
    toast.error(t`Failed to copy`);
  }
}

// Worker/WASM エラー
function handleWorkerError(err: Error) {
  toast.error(t`Worker initialization failed`, {
    description: err.message,
  });
}
```

### 4.6 エクスポート一覧

```typescript
// src/components/ui/toast.tsx
export { Toaster, toast, dismissToast };
export type { ToastData, ToastOptions, ToastVariant };
```

## 5. テスト方針

### 5.1 コンポーネントテスト (`src/test/components/toast.test.tsx`)

| # | テスト | 検証内容 |
|---|--------|---------|
| 1 | toast() で Toast が表示される | `toast({ title: '...' })` 呼び出し後に DOM にタイトルが出現 |
| 2 | variant ごとのスタイル適用 | success / error / warning / info で対応するクラスが付与される |
| 3 | 自動消滅 (info/success/warning) | 3 秒後に DOM から消える (vi.advanceTimersByTime) |
| 4 | 手動閉じ (error) | error variant は 3 秒後も残り、×ボタンクリックで消える |
| 5 | 単一表示 (置換) | 連続で toast() を呼ぶと前の Toast が消え、新しい Toast のみ表示 |
| 6 | ショートハンド | `toast.success()`, `toast.error()` 等が正しい variant で表示 |
| 7 | description 表示 | description オプション指定時に副テキストが表示される |

### 5.2 テスト環境

- 実行環境: jsdom (コンポーネントテスト)
- Radix UI Toast の animation は `prefers-reduced-motion: reduce` をモックして即時遷移
- タイマー: `vi.useFakeTimers()` で duration 検証

## 6. 実装チェックリスト

- [x] `@radix-ui/react-toast` パッケージの追加
- [x] `src/components/ui/toast.tsx` の実装 (Toast Store + UI + toast 関数)
- [x] ステータスカラー用の CSS カスタムプロパティ追加 (`--success`, `--warning` ボーダー色)
- [x] `src/app.tsx` に `<Toaster />` 配置
- [x] コンポーネントテスト作成・通過
- [x] i18n 対応 (Toast メッセージは呼び出し側で `t` マクロを使用)
- [x] `implementation-roadmap.md` の Toast 行を ✅ に更新
