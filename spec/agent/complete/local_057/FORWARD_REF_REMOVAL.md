# React 19 forwardRef 除去 仕様書

## 1. 概要

### 1.1 目的

React 19 で不要になった `React.forwardRef` を `src/components/ui/` の全コンポーネントから除去し、`ref` を通常の prop として受け取る形式に統一する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `forwardRef` | React 18 以前で `ref` を子コンポーネントに転送するために必要だった API |
| `ComponentPropsWithRef` | `ref` を含む props 型。React 19 で `ref` が通常 prop になったため使用可能 |
| `ComponentPropsWithoutRef` | `ref` を除外した props 型。`forwardRef` 使用時に組み合わせていた |

### 1.3 背景・問題

- 本プロジェクトは React 19 (`^19.2.0`) を使用しており、`ref` は通常の prop として渡せる
- `src/components/ui/` 内の 10 ファイル・計 30 コンポーネントが `React.forwardRef` を使用している
- `forwardRef` は React 19 では非推奨であり、将来のバージョンで削除される可能性がある
- `forwardRef` の使用は `displayName` の手動設定が必要な点でもボイラープレートを増やしている

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| ボイラープレート削減 | `forwardRef` ラッパー + `displayName` 設定が不要になる |
| 型安全性向上 | `ComponentPropsWithRef` で `ref` を含む完全な props 型が得られる |
| React 19 準拠 | 非推奨 API への依存を除去 |

### 1.5 着手条件

- [x] React 19 (`^19.2.0`) が `package.json` に設定済み

## 2. 対象ファイル

### 2.1 実装ファイル

| ファイル | コンポーネント数 | 対象コンポーネント |
|---------|---------------|-----------------|
| `src/components/ui/button.tsx` | 1 | `Button` |
| `src/components/ui/checkbox.tsx` | 1 | `Checkbox` |
| `src/components/ui/dialog.tsx` | 4 | `DialogOverlay`, `DialogContent`, `DialogTitle`, `DialogDescription` |
| `src/components/ui/input.tsx` | 1 | `Input` |
| `src/components/ui/label.tsx` | 1 | `Label` |
| `src/components/ui/progress.tsx` | 1 | `Progress` |
| `src/components/ui/select.tsx` | 6 | `SelectTrigger`, `SelectScrollUpButton`, `SelectScrollDownButton`, `SelectContent`, `SelectLabel`, `SelectItem` |
| `src/components/ui/sheet.tsx` | 4 | `SheetOverlay`, `SheetContent`, `SheetTitle`, `SheetDescription` |
| `src/components/ui/table.tsx` | 7 | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` |
| `src/components/ui/tabs.tsx` | 3 | `TabsList`, `TabsTrigger`, `TabsContent` |

合計: **10 ファイル、30 コンポーネント**

### 2.2 変更不要なファイル

| ファイル | 理由 |
|---------|------|
| `src/components/ui/badge.tsx` | `forwardRef` 未使用 |
| `src/components/ui/toast.tsx` | `forwardRef` 未使用 |
| `src/components/ui/toast-state.ts` | ロジックのみ |
| `src/components/ui/button-variants.ts` | cva 定義のみ |

### 2.3 アーキテクチャドキュメント

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| `spec/agent/architecture/design-system.md` | Section 15.3 props 設計規約 | `React.forwardRef` パターンを React 19 形式に更新 |

### 2.4 WIP 仕様書

| ファイル | 影響有無 | 変更内容 |
|---------|---------|---------|
| `spec/agent/wip/local_054/DATETIME_SEARCH.md` | 要確認 | 新規コンポーネント作成時に `forwardRef` を使用しないことを前提とする |
| `spec/agent/wip/local_055/EGG_SEARCH.md` | 要確認 | 同上 |
| `spec/agent/wip/local_056/TOGGLE_UI_SWITCH.md` | 整合済み | Switch コンポーネントは `forwardRef` なしで設計済み |

## 3. 設計方針

### 3.1 変換パターン

全コンポーネントに共通する機械的な変換を適用する。

#### 変換前 (forwardRef パターン)

```tsx
const Component = React.forwardRef<
  React.ComponentRef<typeof Primitive>,
  React.ComponentPropsWithoutRef<typeof Primitive>
>(({ className, ...props }, ref) => (
  <Primitive ref={ref} className={cn(...)} {...props} />
));
Component.displayName = '...';
```

#### 変換後 (React 19 関数コンポーネント)

```tsx
function Component({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive>) {
  return <Primitive ref={ref} className={cn(...)} {...props} />;
}
```

### 3.2 変換ルール

| 項目 | 変換前 | 変換後 |
|------|-------|-------|
| 定義形式 | `const C = React.forwardRef<Ref, Props>((props, ref) => ...)` | `function C({ ref, ...props }: PropsWithRef) { ... }` |
| Props 型 | `React.ComponentPropsWithoutRef<T>` | `React.ComponentPropsWithRef<T>` |
| `ref` の受け取り | 第 2 引数 | props の分割代入 |
| `displayName` | 必須 (手動設定) | 不要 (関数名から自動推論) |
| エクスポート | 変更なし | 変更なし |

### 3.3 Button コンポーネントの特殊処理

`Button` は独自の `ButtonProps` インターフェースを定義しており、変換パターンが若干異なる。

```tsx
// 変換前
interface ButtonProps
  extends React.ComponentPropsWithoutRef<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => { ... }
);

// 変換後
interface ButtonProps
  extends React.ComponentPropsWithRef<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ref,
  ...props
}: ButtonProps) { ... }
```

### 3.4 Input コンポーネントの特殊処理

`Input` は HTML 要素を直接ラップしており、ジェネリクスの形式が異なる。

```tsx
// 変換前
const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<'input'>
>(({ className, type, ...props }, ref) => { ... });

// 変換後
function Input({
  className,
  type,
  ref,
  ...props
}: React.ComponentPropsWithRef<'input'>) { ... }
```

### 3.5 実行順序

全 10 ファイルは互いに依存しないため、任意の順序で変換可能。ただし以下を推奨:

1. `button.tsx` (独自 Props 型のパターン確認)
2. `input.tsx` (HTML 要素直接ラップのパターン確認)
3. 残り 8 ファイル (Radix Primitive ラップの共通パターン)

## 4. 実装仕様

### 4.1 各ファイルの変更概要

#### `button.tsx`

- `ComponentPropsWithoutRef<'button'>` → `ComponentPropsWithRef<'button'>`
- `forwardRef<HTMLButtonElement, ButtonProps>` → 関数宣言
- `displayName` 行を削除

#### `checkbox.tsx`

- `forwardRef<ComponentRef<...>, ComponentPropsWithoutRef<...>>` → 関数宣言 + `ComponentPropsWithRef<...>`
- `displayName` 行を削除

#### `dialog.tsx`

- 4 コンポーネント (`DialogOverlay`, `DialogContent`, `DialogTitle`, `DialogDescription`) に同一変換を適用
- 各 `displayName` 行を削除

#### `input.tsx`

- `forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>` → 関数宣言 + `ComponentPropsWithRef<'input'>`
- `displayName` 行を削除

#### `label.tsx`

- 1 コンポーネントに変換を適用
- `displayName` 行を削除

#### `progress.tsx`

- 1 コンポーネントに変換を適用
- `displayName` 行を削除

#### `select.tsx`

- 6 コンポーネントに同一変換を適用
- 各 `displayName` 行を削除

#### `sheet.tsx`

- 4 コンポーネントに同一変換を適用
- 各 `displayName` 行を削除

#### `table.tsx`

- 7 コンポーネントに同一変換を適用
- 各 `displayName` 行を削除

#### `tabs.tsx`

- 3 コンポーネントに同一変換を適用
- 各 `displayName` 行を削除

## 5. テスト方針

### 5.1 検証方法

| 検証 | 方法 |
|------|------|
| 型チェック | `pnpm exec tsc --noEmit` で型エラーがないことを確認 |
| Lint | `pnpm lint` で警告・エラーがないことを確認 |
| 既存テスト | `pnpm test:run` で全テスト通過を確認 |
| 目視確認 | `pnpm dev` で UI の見た目・挙動に変化がないことを確認 |

### 5.2 新規テスト

機械的な変換であり、外部動作に変化はないため、新規テストの追加は不要。既存テストで動作の退行がないことを検証する。

## 6. 実装チェックリスト

- [x] `src/components/ui/button.tsx` から `forwardRef` を除去
- [x] `src/components/ui/checkbox.tsx` から `forwardRef` を除去
- [x] `src/components/ui/dialog.tsx` から `forwardRef` を除去 (4 コンポーネント)
- [x] `src/components/ui/input.tsx` から `forwardRef` を除去
- [x] `src/components/ui/label.tsx` から `forwardRef` を除去
- [x] `src/components/ui/progress.tsx` から `forwardRef` を除去
- [x] `src/components/ui/select.tsx` から `forwardRef` を除去 (6 コンポーネント)
- [x] `src/components/ui/sheet.tsx` から `forwardRef` を除去 (4 コンポーネント)
- [x] `src/components/ui/table.tsx` から `forwardRef` を除去 (7 コンポーネント)
- [x] `src/components/ui/tabs.tsx` から `forwardRef` を除去 (3 コンポーネント)
- [x] `design-system.md` Section 15.3 の props パターンを更新
- [x] `pnpm exec tsc --noEmit` で型チェック通過
- [x] `pnpm lint` でエラーなし
- [x] `pnpm test:run` で全テスト通過
