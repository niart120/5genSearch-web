# UI 部品 仕様書

## 1. 概要

### 1.1 目的

Phase 2 共通コンポーネントの基盤となる UI 部品群を、design-system.md に準拠して実装する。
shadcn/ui スタイル (Radix UI Primitives + cva + Tailwind CSS v4) で、プロジェクト専用にカスタマイズされたコンポーネントを `src/components/ui/` に配置する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| UI 部品 | アプリケーション全体で再利用される最小粒度のインターフェース要素 |
| cva | `class-variance-authority`。バリアント (variant / size 等) を宣言的に管理するライブラリ |
| Radix UI Primitives | アクセシビリティ対応済みのヘッドレス UI プリミティブ |
| セマンティックカラー | CSS カスタムプロパティで定義されたテーマ対応色 (design-system.md Section 3) |

### 1.3 背景・問題

- Phase 1 で基盤 (Tailwind v4, デザイントークン, `cn()`, Radix UI 依存パッケージ) は導入済み
- `src/components/ui/` ディレクトリが未作成で、Button・Input 等の共通部品が存在しない
- Phase 3 の機能実装 (DS 設定・起動時刻検索等) に着手するには、フォーム部品やダイアログの土台が必要

### 1.4 期待効果

| 指標 | 現状 | 目標 |
|------|------|------|
| UI 部品数 | 0 | 7 (Button, Input, Label, Select, Checkbox, Tabs, Dialog) |
| バリアント管理 | なし | cva による宣言的バリアント |
| アクセシビリティ | ThemeToggle のみ手動 | Radix UI 標準のキーボード操作・ARIA 対応 |

### 1.5 着手条件

- [x] Tailwind CSS v4 + デザイントークン設定済み (`src/index.css`)
- [x] `cn()` ユーティリティ定義済み (`src/lib/utils.ts`)
- [x] Radix UI パッケージ導入済み (`@radix-ui/react-slot`, `@radix-ui/react-select` 等)
- [x] `class-variance-authority` 導入済み
- [x] `lucide-react` 導入済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/ui/button.tsx` | 新規 | Button コンポーネント |
| `src/components/ui/input.tsx` | 新規 | Input コンポーネント |
| `src/components/ui/label.tsx` | 新規 | Label コンポーネント |
| `src/components/ui/select.tsx` | 新規 | Select コンポーネント |
| `src/components/ui/checkbox.tsx` | 新規 | Checkbox コンポーネント |
| `src/components/ui/tabs.tsx` | 新規 | Tabs コンポーネント |
| `src/components/ui/dialog.tsx` | 新規 | Dialog コンポーネント |
| `src/test/components/ui/button.test.tsx` | 新規 | Button テスト |
| `src/test/components/ui/input.test.tsx` | 新規 | Input テスト |
| `src/test/components/ui/label.test.tsx` | 新規 | Label テスト |
| `src/test/components/ui/select.test.tsx` | 新規 | Select テスト |
| `src/test/components/ui/checkbox.test.tsx` | 新規 | Checkbox テスト |
| `src/test/components/ui/tabs.test.tsx` | 新規 | Tabs テスト |
| `src/test/components/ui/dialog.test.tsx` | 新規 | Dialog テスト |
| `src/index.css` | 修正 | `prefers-reduced-motion` メディアクエリ、アニメーション用 CSS 変数追加 |

## 3. 設計方針

### 3.1 コンポーネント設計原則

| 原則 | 説明 |
|------|------|
| Headless + Style | ロジック (Radix UI) とスタイル (Tailwind + cva) を分離 |
| 透過的 props | `React.ComponentPropsWithoutRef` でネイティブ属性を透過 |
| ref 転送 | `React.forwardRef` で ref をプリミティブに伝播 |
| 宣言的バリアント | cva で variant / size を型安全に管理 |
| コンパクト設計 | design-system.md Section 6.3 の要素高さ基準に準拠 |

### 3.2 スタイル基準 (design-system.md 参照)

| 項目 | 値 | 参照 |
|------|-----|------|
| 角丸 | `rounded-sm` (0.25rem) | Section 7 |
| フォーカス | `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` | Section 11.2 |
| 無効化 | `disabled:pointer-events-none disabled:opacity-50` | Section 10.3 |
| トランジション | `transition-colors` (100ms) | Section 8 |
| ボタン高さ (default) | `h-8` (2rem) | Section 6.3 |
| ボタン高さ (sm) | `h-7` (1.75rem) | Section 6.3 |
| 入力高さ | `h-8` (2rem) | Section 6.3 |

### 3.3 Toast について

Toast (通知コンポーネント) は Phase 2 の UI 部品一覧に含まれるが、本タスクでは対象外とする。
Toast は検索実行のフィードバック等、機能実装と密結合するため Phase 3 以降で必要に応じて追加する。

### 3.4 Label の追加

implementation-roadmap.md の UI 部品リストには Label が明記されていないが、フォーム部品の基盤として必須であるため本タスクで追加する。
Radix UI の `@radix-ui/react-label` を使用する。

## 4. 実装仕様

### 4.1 Button

```tsx
// src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2 text-xs',
        lg: 'h-9 px-4',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends React.ComponentPropsWithoutRef<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export type { ButtonProps };
export { Button, buttonVariants };
```

#### バリアント定義

| variant | 用途 | 主な使用箇所 |
|---------|------|------------|
| `default` | プライマリアクション | 検索開始ボタン |
| `destructive` | 破壊的アクション | リセット、キャンセル |
| `outline` | セカンダリアクション | フィルタ、エクスポート |
| `secondary` | 補助的アクション | 副次的な操作 |
| `ghost` | 低強調アクション | テーブル行内操作、ThemeToggle 相当 |
| `link` | リンクスタイル | 補足情報リンク |

| size | 高さ | 用途 |
|------|------|------|
| `default` | `h-8` (2rem) | 一般的なボタン |
| `sm` | `h-7` (1.75rem) | テーブル内・コンパクト UI |
| `lg` | `h-9` (2.25rem) | CTA ボタン |
| `icon` | `h-8 w-8` (2rem) | アイコンのみボタン |

#### asChild パターン

`asChild={true}` を指定すると、`<Slot>` により子要素にスタイルを委譲する。リンクボタンなど `<a>` タグをラップする場合に使用する。

### 4.2 Input

```tsx
// src/components/ui/input.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.ComponentPropsWithoutRef<'input'> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded-sm border border-input bg-background px-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export type { InputProps };
export { Input };
```

#### 設計補足

- Radix UI にはネイティブ Input に相当するプリミティブがないため、`<input>` を直接スタイリングする
- 数値入力のフォーカスイン全選択・blur バリデーションは design-system.md Section 10.4 に定義されているが、フォーム部品 (Phase 2 後半の `IvRangeInput` 等) のレイヤーで実装する。本コンポーネントは汎用的な `<input>` ラッパーに留める
- `file:` 擬似クラスでファイル入力のスタイルリセットを含むが、本プロジェクトでは使用頻度が低い

### 4.3 Label

```tsx
// src/components/ui/label.tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {}

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export type { LabelProps };
export { Label };
```

#### 設計補足

- `@radix-ui/react-label` を使用し、`htmlFor` によるフォーカス移動やアクセシビリティを標準提供する
- `peer-disabled` により、関連する入力が `disabled` の場合にラベルの見た目を連動させる

### 4.4 Select

```tsx
// src/components/ui/select.tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-8 w-full items-center justify-between rounded-sm border border-input bg-background px-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronUp className="size-3.5" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronDown className="size-3.5" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-sm border border-border bg-card text-card-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-medium', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-[0.125rem] py-1.5 pl-6 pr-2 text-sm outline-none focus:bg-accent/10 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-1.5 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
```

#### 使用例

```tsx
<Select value={version} onValueChange={setVersion}>
  <SelectTrigger className="w-[10rem]">
    <SelectValue placeholder="バージョン選択" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="bw">ブラック・ホワイト</SelectItem>
    <SelectItem value="bw2">ブラック2・ホワイト2</SelectItem>
  </SelectContent>
</Select>
```

### 4.5 Checkbox

```tsx
// src/components/ui/checkbox.tsx
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-4 shrink-0 rounded-[0.125rem] border border-input transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="size-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```

#### 設計補足

- サイズは design-system.md Section 6.3 の `size-4` (1rem / 16px) に準拠
- 角丸は Section 7 の小サイズ `rounded-[0.125rem]` (2px) を適用
- `peer` クラスにより、隣接する Label の `peer-disabled` スタイルと連動

### 4.6 Tabs

```tsx
// src/components/ui/tabs.tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-8 items-center justify-center rounded-sm bg-muted p-0.5 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-[0.125rem] px-2.5 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
```

#### 使用予定

| 用途 | Tabs 構成 |
|------|----------|
| 機能切り替え | 起動時刻検索 / 個体生成 / 孵化検索 / misc |
| フォーム内折りたたみ | 基本設定 / 詳細設定 |

### 4.7 Dialog

```tsx
// src/components/ui/dialog.tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}
DialogHeader.displayName = 'DialogHeader';

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2',
        className,
      )}
      {...props}
    />
  );
}
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
```

#### 設計補足

- 角丸は design-system.md Section 7 の大サイズ `rounded-lg` (0.5rem / 8px) を適用
- アニメーションは `tailwindcss-animate` の `animate-in` / `animate-out` ユーティリティを使用。
  未導入の場合は `@keyframes` を `src/index.css` に直接定義する (Section 4.8 参照)
- 閉じるボタンは `<X>` アイコン + `sr-only` テキストでアクセシビリティを確保

### 4.8 CSS 追加 (index.css)

`tailwindcss-animate` を導入せず、アニメーション用のキーフレームとユーティリティを `src/index.css` に直接定義する。

```css
/* src/index.css に追加 */

@layer base {
  /* prefers-reduced-motion 対応 (design-system.md Section 8.4) */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@theme {
  /* アニメーション用 (design-system.md Section 8) */
  --animate-in: enter 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --animate-out: exit 150ms cubic-bezier(0.7, 0, 0.84, 0);
}

@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(
        var(--tw-enter-translate-x, 0),
        var(--tw-enter-translate-y, 0),
        0
      )
      scale3d(
        var(--tw-enter-scale, 1),
        var(--tw-enter-scale, 1),
        var(--tw-enter-scale, 1)
      )
      rotate(var(--tw-enter-rotate, 0));
  }
}

@keyframes exit {
  to {
    opacity: var(--tw-exit-opacity, 1);
    transform: translate3d(
        var(--tw-exit-translate-x, 0),
        var(--tw-exit-translate-y, 0),
        0
      )
      scale3d(
        var(--tw-exit-scale, 1),
        var(--tw-exit-scale, 1),
        var(--tw-exit-scale, 1)
      )
      rotate(var(--tw-exit-rotate, 0));
  }
}

/* tailwindcss-animate 相当のユーティリティ */
@utility animate-in {
  animation-name: enter;
  animation-duration: 150ms;
  --tw-enter-opacity: initial;
  --tw-enter-scale: initial;
  --tw-enter-rotate: initial;
  --tw-enter-translate-x: initial;
  --tw-enter-translate-y: initial;
}

@utility animate-out {
  animation-name: exit;
  animation-duration: 150ms;
  --tw-exit-opacity: initial;
  --tw-exit-scale: initial;
  --tw-exit-rotate: initial;
  --tw-exit-translate-x: initial;
  --tw-exit-translate-y: initial;
}

@utility fade-in-0 {
  --tw-enter-opacity: 0;
}

@utility fade-out-0 {
  --tw-exit-opacity: 0;
}

@utility zoom-in-95 {
  --tw-enter-scale: 0.95;
}

@utility zoom-out-95 {
  --tw-exit-scale: 0.95;
}

@utility slide-in-from-top-2 {
  --tw-enter-translate-y: -0.5rem;
}

@utility slide-in-from-bottom-2 {
  --tw-enter-translate-y: 0.5rem;
}

@utility slide-in-from-left-2 {
  --tw-enter-translate-x: -0.5rem;
}

@utility slide-in-from-right-2 {
  --tw-enter-translate-x: 0.5rem;
}

@utility slide-in-from-top-\[48\%\] {
  --tw-enter-translate-y: -48%;
}

@utility slide-in-from-left-1\/2 {
  --tw-enter-translate-x: -50%;
}

@utility slide-out-to-top-\[48\%\] {
  --tw-exit-translate-y: -48%;
}

@utility slide-out-to-left-1\/2 {
  --tw-exit-translate-x: -50%;
}
```

## 5. テスト方針

各 UI 部品に対してコンポーネントテストを実施する。テスト環境は jsdom。

### 5.1 テスト対象・検証内容

| コンポーネント | テスト内容 |
|--------------|----------|
| Button | デフォルト描画、各バリアント/サイズのクラス適用、`disabled` 時の挙動、`asChild` によるスロット描画、クリックイベント発火 |
| Input | デフォルト描画、`placeholder` 表示、`disabled` 時の挙動、`type` 属性透過、`onChange` イベント発火 |
| Label | デフォルト描画、`htmlFor` 属性による関連付け |
| Select | トリガー描画、開閉動作、アイテム選択時の `onValueChange` 発火 |
| Checkbox | デフォルト描画、クリックで checked 状態の切り替え、`onCheckedChange` 発火、`disabled` 時の挙動 |
| Tabs | タブリスト描画、タブ切り替えでコンテンツが切り替わる、キーボード操作 (Arrow キー) |
| Dialog | トリガーで開く、閉じるボタンで閉じる、オーバーレイ描画、タイトル・説明テキスト表示 |

### 5.2 テスト方針

- `@testing-library/react` + `@testing-library/user-event` を使用
- DOM 構造への過度な依存は避け、ユーザー操作ベースのテストとする
- カスタム `className` の上書きテストは省略 (cva / cn の結合は単純なユーティリティであり、個別テスト不要)

### 5.3 テストコード例

```tsx
// src/test/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('デフォルトバリアントで描画される', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  it('クリックイベントが発火する', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('disabled 時はクリックイベントが発火しない', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('asChild で子要素にスタイルを委譲する', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});
```

## 6. 実装チェックリスト

- [ ] `@radix-ui/react-label` パッケージを追加
- [ ] `tailwindcss-animate` 相当のユーティリティを `src/index.css` に追加
- [ ] `prefers-reduced-motion` メディアクエリを `src/index.css` に追加
- [ ] `src/components/ui/button.tsx` を作成
- [ ] `src/components/ui/input.tsx` を作成
- [ ] `src/components/ui/label.tsx` を作成
- [ ] `src/components/ui/select.tsx` を作成
- [ ] `src/components/ui/checkbox.tsx` を作成
- [ ] `src/components/ui/tabs.tsx` を作成
- [ ] `src/components/ui/dialog.tsx` を作成
- [ ] `src/test/components/ui/button.test.tsx` を作成
- [ ] `src/test/components/ui/input.test.tsx` を作成
- [ ] `src/test/components/ui/label.test.tsx` を作成
- [ ] `src/test/components/ui/select.test.tsx` を作成
- [ ] `src/test/components/ui/checkbox.test.tsx` を作成
- [ ] `src/test/components/ui/tabs.test.tsx` を作成
- [ ] `src/test/components/ui/dialog.test.tsx` を作成
- [ ] `pnpm lint` を通過
- [ ] `pnpm format:check:ts` を通過
- [ ] `pnpm test:run` を通過
