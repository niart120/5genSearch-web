# データ表示部品 仕様書

## 1. 概要

### 1.1 目的

Phase 2 共通コンポーネントのうち、データ表示部品 (Table, ResultCard, ProgressBar) を実装し、Phase 3 の各検索機能が統一されたデザイン・操作体験で結果を表示できる基盤を整備する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| DataTable | `@tanstack/react-table` + `@tanstack/react-virtual` を基盤とする仮想スクロール対応テーブルコンポーネント。列定義 (`ColumnDef`) を渡すことで統一デザインのテーブルを生成する |
| Table プリミティブ | `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`, `<TableHead>` の shadcn/ui スタイル HTML テーブルラッパー。DataTable の描画層で使用する |
| ResultCard | モバイル向けカード形式の結果表示コンポーネント。DataTable の代替として `useMediaQuery` で切り替える |
| ProgressBar | Radix UI Progress ベースの進捗バーコンポーネント。集約された検索進捗・経過時間・残り時間・スループットを表示する |
| 仮想スクロール | DOM に存在する行数を表示領域分のみに抑え、大量データの描画パフォーマンスを確保する技法。`@tanstack/react-virtual` で実現する |
| 列定義 | `@tanstack/react-table` の `ColumnDef<TData>` 型。ヘッダー、セルレンダラー、ソート・フィルタ設定を宣言的に定義する |

### 1.3 背景・問題

Phase 1 で構築済みの基盤:

- Worker 基盤 (`services/worker-pool.ts`) + 進捗集約 (`services/progress.ts`)
- 検索結果 Store (`stores/search/results.ts`)
- フック (`hooks/use-search.ts`, `hooks/use-search-results.ts`)
- `useMediaQuery` フック (`hooks/use-media-query.ts`)

Phase 3 の各検索機能 (起動時刻検索、ポケモンリスト、孵化検索、misc) はすべて検索結果のテーブル表示と進捗表示を必要とする。各機能で個別にテーブルを実装すると、デザインの不一致・コード重複・保守コスト増大が生じる。

共通のデータ表示部品を提供し、Phase 3 では**列定義の宣言のみ**で統一されたテーブル UI を生成できるようにする。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 実装効率 | Phase 3 の各機能で列定義を書くだけでテーブルが完成する |
| デザイン一貫性 | 全テーブルが同一のスタイル (ゼブラストライプ、固定ヘッダー、フォント) を持つ |
| パフォーマンス | 仮想スクロールにより数万件の結果を遅延なく表示できる |
| レスポンシブ対応 | PC テーブル / モバイルカードの切り替え基盤が整う |

### 1.5 着手条件

| 条件 | 状態 |
|------|------|
| Phase 1 基盤整備完了 | 充足 |
| Phase 2 UI 部品 (Button, Input, etc.) | 充足 |
| デザインシステム定義 (テーブルスタイル) | 充足 (`design-system.md` Section 9) |
| レスポンシブ設計定義 | 充足 (`responsive-design.md`) |

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|----------|---------|
| `src/components/ui/table.tsx` | 新規 | Table プリミティブ (Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TableCaption) |
| `src/components/ui/progress.tsx` | 新規 | Radix Progress ベースの進捗バー UI 部品 |
| `src/components/ui/badge.tsx` | 新規 | Badge UI 部品 (結果件数、ステータス表示に使用) |
| `src/components/data-display/data-table.tsx` | 新規 | DataTable コンポーネント (仮想スクロール + TanStack Table 統合) |
| `src/components/data-display/data-table-types.ts` | 新規 | DataTable の型定義・設定型 |
| `src/components/data-display/result-card.tsx` | 新規 | モバイル向けカード形式結果表示 |
| `src/components/data-display/search-progress.tsx` | 新規 | 検索進捗表示コンポーネント (ProgressBar + 統計情報) |
| `src/components/data-display/empty-state.tsx` | 新規 | 結果なし / 検索未実行時の空状態表示 |
| `src/components/data-display/index.ts` | 新規 | barrel export |
| `src/lib/format.ts` | 新規 | 表示用フォーマッタ (経過時間、残り時間、スループット、件数、16 進数等) |
| `src/lib/hex.ts` | 変更 | `toHexString` / `toHexWordString` を削除し `toHex(value, digits)` に一本化 |
| `src/services/progress.ts` | 変更 | `formatRemainingTime` / `formatThroughput` / `formatProgress` を削除 (`lib/format.ts` へ完全移動) |
| `src/components/forms/mac-address-input.tsx` | 変更 | `toHexString` → `toHex` に移行 |
| `src/components/forms/timer0-vcount-range-input.tsx` | 変更 | `toHexString` / `toHexWordString` → `toHex` に移行 |
| `src/test/components/data-display/` | 新規 | コンポーネントテスト |
| `src/test/unit/lib/format.test.ts` | 新規 | フォーマッタのユニットテスト (既存 progress.test.ts のフォーマッタテストを移動) |
| `src/test/unit/services/progress.test.ts` | 変更 | `formatRemainingTime` / `formatThroughput` / `formatProgress` のテストを `format.test.ts` へ移動。`ProgressAggregator` テストのみ残す |
| `src/test/unit/hex.test.ts` | 変更 | `toHexString` / `toHexWordString` テストを `toHex` テストに置換 |
| `package.json` | 変更 | `@tanstack/react-table`, `@tanstack/react-virtual` 追加 |

## 3. 設計方針

### 3.1 コンポーネント構成

```
src/components/
├── ui/
│   ├── table.tsx           # Table プリミティブ (HTML <table> ラッパー)
│   ├── progress.tsx        # Radix Progress バー
│   └── badge.tsx           # Badge (件数・ステータス表示)
└── data-display/
    ├── data-table.tsx       # DataTable (TanStack Table + Virtual)
    ├── data-table-types.ts  # DataTable 型定義
    ├── result-card.tsx      # モバイル向けカード
    ├── search-progress.tsx  # 検索進捗表示
    ├── empty-state.tsx      # 空状態表示
    └── index.ts             # barrel export
```

**レイヤー構成**:

```
data-display/data-table.tsx  ← TanStack Table + Virtual
         │
         ├── ui/table.tsx    ← HTML 描画プリミティブ
         ├── ui/badge.tsx    ← 件数表示
         └── ui/progress.tsx ← 進捗表示 (search-progress.tsx 経由)
```

- `ui/` 層: スタイルのみを持つ薄いラッパー。ロジックなし
- `data-display/` 層: TanStack ライブラリと `ui/` を組み合わせた機能コンポーネント

### 3.2 DataTable の設計方針

#### 3.2.1 列定義駆動

Phase 3 の各機能は `ColumnDef<TData>[]` を定義するだけでテーブルを生成する。テーブル自体のレイアウト・スタイル・仮想スクロールは DataTable が内包する。

```
Phase 3 機能側                  Phase 2 共通部品
┌─────────────────────┐        ┌──────────────────┐
│ columns: ColumnDef[]│──────→│ DataTable        │
│ data: TData[]       │        │  ├ TanStack Table │
│ options?: ...       │        │  ├ Virtual Scroll │
│                     │        │  └ ui/table.tsx   │
└─────────────────────┘        └──────────────────┘
```

#### 3.2.2 仮想スクロール

- `@tanstack/react-virtual` の `useVirtualizer` でビューポート内の行のみレンダリング
- 行高さは `h-8` (2rem) を基準とし、`remToPx()` で変換した値を `estimateSize` に渡す
- `overscan` はデフォルト 8 行 (スクロール時のちらつき防止)

#### 3.2.3 ソート

- TanStack Table の `getSortedRowModel` を使用
- ヘッダークリックでカラムソートのトグル (`asc → desc → none`)
- ソートアイコンをヘッダーに表示 (Lucide `ArrowUpDown` / `ArrowUp` / `ArrowDown`)
- 列定義で `enableSorting: false` を指定するとソート無効化

#### 3.2.4 レスポンシブ対応

- PC (`lg+`): DataTable (テーブル形式)
- モバイル (`< lg`): ResultCard (カード形式) に切り替え
- 切り替えは呼び出し側で `useMediaQuery` を使用して判断し、DataTable または ResultCard をレンダリングする
- DataTable 自身は PC 表示のみを担当し、内部でレスポンシブ分岐しない

### 3.3 ResultCard の設計方針

- `data` 配列と `renderCard` コールバックを受け取る汎用カードリストコンポーネント
- 仮想スクロールはカードリストにも適用する (`useVirtualizer` でカード高さを推定)
- カードのレイアウト・内容は `renderCard` で機能側が定義する
- フレームのみ (スクロールコンテナ + 仮想化 + 空状態) を提供する

### 3.4 進捗表示の設計方針

- 既存の `services/progress.ts` (`AggregatedProgress` 型) と連携
- 集約済み進捗の表示のみを担当 (Worker 個別表示はスコープ外)
- 表示項目: 進捗バー、進捗率、経過時間、推定残り時間、スループット
- 個別 Worker の進捗一覧は Phase 3 以降で必要になれば追加する

### 3.5 フォーマッタの設計方針

- `src/lib/format.ts` に純粋関数として定義
- ロケール (`SupportedLocale`) 対応
- Lingui のスコープ外 (ゲームデータ辞書と同様、定型フォーマットのため)
- ただし、ラベル文言 (「経過時間」「残り時間」等) は Lingui 翻訳対象とする

#### 3.5.1 既存実装との統合 (破壊的変更)

以下の既存関数と機能が重複するため、`lib/format.ts` への集約と呼び出し側の一斉移行を行う。後方互換 (re-export / 委譲) は維持せず、旧 API を削除する。

| 既存関数 | 既存ファイル | 対応 |
|----------|------------|------|
| `formatRemainingTime(ms)` | `services/progress.ts` | `services/progress.ts` から**削除**し `lib/format.ts` へ完全移動 |
| `formatThroughput(throughput)` | `services/progress.ts` | 同上。シグネチャは既存を維持 (`2.50M/s` 形式) |
| `formatProgress(progress)` | `services/progress.ts` | 同上 |
| `toHexString(value)` | `lib/hex.ts` | **削除**。呼び出し側を `toHex(value, 2)` に移行 |
| `toHexWordString(value)` | `lib/hex.ts` | **削除**。呼び出し側を `toHex(value, 4)` に移行 |

`formatDuration` は `formatRemainingTime` と実質同一のため、新設しない。

#### 3.5.2 呼び出し側の移行対象

| ファイル | 変更内容 |
|----------|----------|
| `components/forms/mac-address-input.tsx` | `toHexString(byte)` → `toHex(byte, 2)` |
| `components/forms/timer0-vcount-range-input.tsx` | `toHexString` → `toHex(v, 2)`, `toHexWordString` → `toHex(v, 4)` |
| `test/unit/services/progress.test.ts` | `formatProgress` / `formatRemainingTime` / `formatThroughput` のテストを `test/unit/lib/format.test.ts` へ移動 |
| `test/unit/hex.test.ts` | `toHexString` / `toHexWordString` テストを `toHex` テストに置換 |

### 3.6 サイズ単位の方針

デザインシステム (Section 5.1) に従い、固定 `px` レイアウトは使用しない。

- **CSS スタイリング**: Tailwind クラス (rem ベース) を使用
- **行高さ**: `h-8` (2rem、design-system.md Section 6.3) に準拠
- **仮想スクロール API**: `@tanstack/react-virtual` の `estimateSize` はピクセル値を要求するため、定数を rem で定義し `remToPx()` ヘルパーで変換する
- **virtualizer 出力値** (`virtualItem.start`, `getTotalSize()` 等) はライブラリがピクセル単位で返すため、`style` 属性への px 代入は API 制約上の例外として許容する

## 4. 実装仕様

### 4.1 Table プリミティブ (`ui/table.tsx`)

shadcn/ui 標準の HTML テーブルラッパー。`design-system.md` Section 9.2 のスタイルを適用する。

```tsx
// src/components/ui/table.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

const Table = forwardRef<
  HTMLTableElement,
  ComponentPropsWithoutRef<'table'>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  ComponentPropsWithoutRef<'thead'>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('sticky top-0 bg-muted text-xs [&_tr]:border-b', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<
  HTMLTableSectionElement,
  ComponentPropsWithoutRef<'tbody'>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableRow = forwardRef<
  HTMLTableRowElement,
  ComponentPropsWithoutRef<'tr'>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border transition-colors hover:bg-accent/10 odd:bg-background even:bg-muted/30',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = forwardRef<
  HTMLTableCellElement,
  ComponentPropsWithoutRef<'th'>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-2 py-1 text-left align-middle font-medium text-muted-foreground select-none',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = forwardRef<
  HTMLTableCellElement,
  ComponentPropsWithoutRef<'td'>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-2 py-1 align-middle', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  ComponentPropsWithoutRef<'caption'>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-2 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
```

### 4.2 Progress (`ui/progress.tsx`)

Radix UI Progress ベースの進捗バー。

```tsx
// src/components/ui/progress.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
```

### 4.3 Badge (`ui/badge.tsx`)

結果件数やステータス表示用のバッジ。

```tsx
// src/components/ui/badge.tsx
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
```

### 4.4 DataTable 型定義 (`data-display/data-table-types.ts`)

```tsx
// src/components/data-display/data-table-types.ts
import type { ColumnDef, SortingState } from '@tanstack/react-table';

/**
 * DataTable の設定オプション
 */
export interface DataTableOptions<TData> {
  /** 列定義 */
  columns: ColumnDef<TData, unknown>[];

  /** テーブルに表示するデータ */
  data: TData[];

  /** ソートの初期状態 */
  initialSorting?: SortingState;

  /** 仮想スクロールの行高さ (rem)。デフォルト: 2 (= h-8) */
  rowHeightRem?: number;

  /** 仮想スクロールの overscan 行数。デフォルト: 8 */
  overscan?: number;

  /**
   * 行のユニークキー取得関数。
   * 未指定時はインデックスを使用する。
   */
  getRowId?: (row: TData, index: number) => string;

  /**
   * テーブルコンテナの追加クラス名。
   * 高さ指定 (例: `h-96`, `flex-1`) は呼び出し側が担当する。
   */
  className?: string;

  /**
   * 結果が 0 件の場合に表示するメッセージ。
   * 未指定時は EmptyState のデフォルトを使用する。
   */
  emptyMessage?: string;
}
```

### 4.5 DataTable コンポーネント (`data-display/data-table.tsx`)

```tsx
// src/components/data-display/data-table.tsx
import { useState, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';
import { remToPx } from '@/lib/format';
import type { DataTableOptions } from './data-table-types';

/** design-system.md Section 6.3: テーブル行 h-8 = 2rem */
const DEFAULT_ROW_HEIGHT_REM = 2;
const DEFAULT_OVERSCAN = 8;

function DataTable<TData>({
  columns,
  data,
  initialSorting = [],
  rowHeightRem = DEFAULT_ROW_HEIGHT_REM,
  overscan = DEFAULT_OVERSCAN,
  getRowId,
  className,
  emptyMessage,
}: DataTableOptions<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId
      ? (row, index) => getRowId(row, index)
      : undefined,
  });

  const { rows } = table.getRowModel();
  const containerRef = useRef<HTMLDivElement>(null);

  const rowHeightPx = remToPx(rowHeightRem);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => rowHeightPx, [rowHeightPx]),
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
    >
      <Table className="min-w-max text-xs">
        <TableHeader>
          <TableRow className="border-0">
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();

                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(
                      canSort && 'cursor-pointer hover:text-foreground',
                    )}
                    style={{ width: header.getSize() }}
                    onClick={
                      canSort
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder
                        ? undefined
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {canSort && (
                        <span className="inline-flex size-3.5 shrink-0">
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-30" />
                          )}
                        </span>
                      )}
                    </span>
                  </TableHead>
                );
              }),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* 仮想スクロール: 上部パディング */}
          {virtualRows.length > 0 && virtualRows[0].start > 0 && (
            <tr aria-hidden="true" className="border-0 pointer-events-none">
              <td
                colSpan={columns.length}
                className="p-0 border-0"
                style={{ height: virtualRows[0].start }}
              />
            </tr>
          )}

          {/* 仮想スクロール: 表示行 */}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <TableRow
                key={row.id}
                data-index={virtualRow.index}
                ref={(node) => virtualizer.measureElement(node)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}

          {/* 仮想スクロール: 下部パディング */}
          {virtualRows.length > 0 &&
            totalHeight - (virtualRows.at(-1)?.end ?? 0) > 0 && (
              <tr aria-hidden="true" className="border-0 pointer-events-none">
                <td
                  colSpan={columns.length}
                  className="p-0 border-0"
                  style={{
                    height: totalHeight - (virtualRows.at(-1)?.end ?? 0),
                  }}
                />
              </tr>
            )}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataTable };
```

### 4.6 EmptyState (`data-display/empty-state.tsx`)

```tsx
// src/components/data-display/empty-state.tsx
import { Trans } from '@lingui/react/macro';

interface EmptyStateProps {
  /** 表示メッセージ (省略時はデフォルトメッセージ) */
  message?: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {message ?? <Trans>No results</Trans>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
```

### 4.7 ResultCard (`data-display/result-card.tsx`)

モバイル向けの汎用カードリストコンポーネント。

```tsx
// src/components/data-display/result-card.tsx
import { useRef, useCallback, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EmptyState } from './empty-state';
import { remToPx } from '@/lib/format';
import { cn } from '@/lib/utils';

/** カード推定高さ: 7.5rem (root 16px 時 120px 相当) */
const DEFAULT_CARD_HEIGHT_REM = 7.5;
const DEFAULT_OVERSCAN = 4;

interface ResultCardListProps<TData> {
  /** 表示データ */
  data: TData[];

  /** カード 1 件分のレンダラー */
  renderCard: (item: TData, index: number) => ReactNode;

  /** カード推定高さ (rem)。デフォルト: 7.5 */
  cardHeightRem?: number;

  /** overscan 数。デフォルト: 4 */
  overscan?: number;

  /** コンテナの追加クラス名 */
  className?: string;

  /** 結果 0 件時のメッセージ */
  emptyMessage?: string;
}

function ResultCardList<TData>({
  data,
  renderCard,
  cardHeightRem = DEFAULT_CARD_HEIGHT_REM,
  overscan = DEFAULT_OVERSCAN,
  className,
  emptyMessage,
}: ResultCardListProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardHeightPx = remToPx(cardHeightRem);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => cardHeightPx, [cardHeightPx]),
    overscan,
  });

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            ref={(node) => virtualizer.measureElement(node)}
            data-index={virtualItem.index}
            className="absolute left-0 top-0 w-full px-1 py-0.5"
            style={{ transform: `translateY(${virtualItem.start}px)` }}
          >
            {renderCard(data[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export { ResultCardList };
export type { ResultCardListProps };
```

### 4.8 SearchProgress (`data-display/search-progress.tsx`)

検索進捗の統合表示コンポーネント。`services/progress.ts` の `AggregatedProgress` と連携する。

```tsx
// src/components/data-display/search-progress.tsx
import { Trans } from '@lingui/react/macro';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatElapsedTime } from '@/lib/format';
import { formatRemainingTime, formatThroughput } from '@/lib/format';

/**
 * 検索進捗の入力データ型。
 * services/progress.ts の AggregatedProgress と互換性を持つ。
 */
export interface SearchProgressData {
  /** 進捗率 (0-100) */
  percentage: number;
  /** 経過時間 (ms) */
  elapsedMs: number;
  /** 推定残り時間 (ms) */
  estimatedRemainingMs: number;
  /** スループット (処理数/秒) */
  throughput: number;
  /** 処理済み数 */
  totalProcessed: number;
  /** 総数 */
  totalCount: number;
}

interface SearchProgressProps {
  /** 進捗データ */
  progress: SearchProgressData;
  /** 追加クラス名 */
  className?: string;
}

function SearchProgress({
  progress,
  className,
}: SearchProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* プログレスバー */}
      <Progress value={progress.percentage} className="h-2" />

      {/* 統計情報グリッド */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs lg:grid-cols-4">
        <div>
          <div className="text-muted-foreground">
            <Trans>Progress</Trans>
          </div>
          <div className="font-mono tabular-nums">
            {progress.percentage.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">
            <Trans>Elapsed</Trans>
          </div>
          <div className="font-mono tabular-nums">
            {formatElapsedTime(progress.elapsedMs)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">
            <Trans>Remaining</Trans>
          </div>
          <div className="font-mono tabular-nums">
            {formatRemainingTime(progress.estimatedRemainingMs)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">
            <Trans>Speed</Trans>
          </div>
          <div className="font-mono tabular-nums">
            {formatThroughput(progress.throughput)}
          </div>
        </div>
      </div>
    </div>
  );
}

export { SearchProgress };
export type { SearchProgressProps };
```

### 4.9 フォーマッタ (`lib/format.ts`)

データ表示で新規に必要なフォーマッタおよび `services/progress.ts` から移動するフォーマッタを集約する。

```tsx
// src/lib/format.ts
import type { SupportedLocale } from '@/i18n';

/**
 * rem 値をピクセル値に変換する。
 * ブラウザの root font-size を参照するため、ユーザーの文字サイズ設定に追従する。
 * @tanstack/react-virtual の estimateSize 等、px を要求する API 向け。
 */
export function remToPx(rem: number): number {
  if (typeof document === 'undefined') {
    return rem * 16; // SSR / テスト環境フォールバック
  }
  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return rem * rootFontSize;
}

/**
 * 経過時間をフォーマットする (mm:ss または hh:mm:ss)
 */
export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * bigint を 16 進数文字列に変換する (大文字、prefix なし)
 */
export function toBigintHex(value: bigint, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * 件数をフォーマットする (例: "1,234 件" / "1,234 results")
 */
export function formatResultCount(
  count: number,
  locale: SupportedLocale,
): string {
  const bcp47 = locale === 'ja' ? 'ja-JP' : 'en-US';
  const formatted = new Intl.NumberFormat(bcp47).format(count);
  return locale === 'ja' ? `${formatted} 件` : `${formatted} results`;
}

// --- 以下、services/progress.ts から移動 ---

import type { AggregatedProgress } from '@/services/progress';

/**
 * 進捗情報をフォーマット
 * (元: services/progress.ts)
 */
export function formatProgress(progress: AggregatedProgress): string {
  const { percentage, throughput, estimatedRemainingMs, tasksCompleted, tasksTotal } = progress;

  const remainingSeconds = Math.ceil(estimatedRemainingMs / 1000);
  const throughputStr =
    throughput >= 1000 ? `${(throughput / 1000).toFixed(1)}K/s` : `${Math.round(throughput)}/s`;

  return `${percentage.toFixed(1)}% | ${throughputStr} | 残り ${remainingSeconds}s | タスク ${tasksCompleted}/${tasksTotal}`;
}

/**
 * 推定残り時間を人間が読みやすい形式にフォーマット
 * (元: services/progress.ts)
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * スループットを人間が読みやすい形式にフォーマット
 * (元: services/progress.ts)
 */
export function formatThroughput(throughput: number): string {
  if (throughput >= 1_000_000) {
    return `${(throughput / 1_000_000).toFixed(2)}M/s`;
  }
  if (throughput >= 1000) {
    return `${(throughput / 1000).toFixed(1)}K/s`;
  }
  return `${Math.round(throughput)}/s`;
}
```

### 4.9.1 hex.ts の変更

`toHexString` / `toHexWordString` を削除し、汎用 `toHex(value, digits)` に一本化する。

```tsx
// src/lib/hex.ts (変更後)

/** 16 進数文字列を 1 バイト整数 (0–255) にパースする */
function parseHexByte(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,2}$/.test(trimmed)) return defaultValue;
  return Number.parseInt(trimmed, 16);
}

/** 16 進数文字列を 2 バイト整数 (0–65535) にパースする */
function parseHexWord(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,4}$/.test(trimmed)) return defaultValue;
  return Number.parseInt(trimmed, 16);
}

/** 数値を指定桁数の 16 進数大文字文字列に変換する */
function toHex(value: number, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/** MAC アドレス文字列をパースして 6 バイト配列を返す。不正な形式なら undefined */
function parseMacAddress(
  input: string,
): [number, number, number, number, number, number] | undefined {
  const cleaned = input.replaceAll(/[-:]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(cleaned)) return undefined;
  return [
    Number.parseInt(cleaned.slice(0, 2), 16),
    Number.parseInt(cleaned.slice(2, 4), 16),
    Number.parseInt(cleaned.slice(4, 6), 16),
    Number.parseInt(cleaned.slice(6, 8), 16),
    Number.parseInt(cleaned.slice(8, 10), 16),
    Number.parseInt(cleaned.slice(10, 12), 16),
  ];
}

export { parseHexByte, parseHexWord, toHex, parseMacAddress };
```

### 4.10 barrel export (`data-display/index.ts`)

```tsx
// src/components/data-display/index.ts
export { DataTable } from './data-table';
export type { DataTableOptions } from './data-table-types';
export { ResultCardList } from './result-card';
export type { ResultCardListProps } from './result-card';
export { SearchProgress } from './search-progress';
export type {
  SearchProgressData,
  SearchProgressProps,
} from './search-progress';
export { EmptyState } from './empty-state';
export type { EmptyStateProps } from './empty-state';
```

### 4.11 Phase 3 での使用例

Phase 3 で起動時刻検索の結果テーブルを定義する際のイメージ。DataTable に列定義を渡すだけで統一デザインのテーブルが生成される。

```tsx
// Phase 3 イメージ: features/datetime-search/columns.ts
import { createColumnHelper } from '@tanstack/react-table';
import { toHex } from '@/lib/hex';
import { toBigintHex } from '@/lib/format';
// 旧 API: toHexString / toHexWordString は削除済み → toHex(value, digits) を使用
import type { UiPokemonData } from '@/wasm/wasm_pkg';

const columnHelper = createColumnHelper<UiPokemonData>();

export const datetimeSearchColumns = [
  columnHelper.accessor('advance', {
    header: 'Advance',
    cell: (info) => info.getValue(),
    size: 80,
  }),
  columnHelper.accessor('base_seed', {
    header: 'LCG Seed',
    cell: (info) => (
      <span className="font-mono tabular-nums">{info.getValue()}</span>
    ),
    size: 180,
  }),
  columnHelper.accessor('datetime_iso', {
    header: 'Date/Time',
    cell: (info) => info.getValue() ?? '-',
    size: 160,
  }),
  columnHelper.accessor('nature_name', {
    header: () => <Trans>Nature</Trans>,
    cell: (info) => info.getValue(),
    size: 80,
  }),
  columnHelper.accessor('ivs', {
    header: 'IVs',
    cell: (info) => {
      const ivs = info.getValue();
      return (
        <span className="font-mono tabular-nums">
          {ivs.join('-')}
        </span>
      );
    },
    enableSorting: false,
    size: 120,
  }),
  // ... 他の列
];

// Phase 3 イメージ: features/datetime-search/components/results.tsx
function DatetimeSearchResults({ results }: { results: UiPokemonData[] }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (isDesktop) {
    return (
      <DataTable
        columns={datetimeSearchColumns}
        data={results}
        className="flex-1"
      />
    );
  }

  return (
    <ResultCardList
      data={results}
      renderCard={(item) => (
        <div className="rounded-sm border p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-mono">{item.base_seed}</span>
            <span>{item.nature_name}</span>
          </div>
          <div className="font-mono tabular-nums text-xs">
            {item.ivs.join('-')}
          </div>
        </div>
      )}
      className="flex-1"
    />
  );
}
```

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/lib/format.test.ts`)

| テスト | 検証内容 |
|--------|---------|
| `formatElapsedTime` | 0ms → `"00:00"`, 61000ms → `"01:01"`, 3661000ms → `"01:01:01"` |
| `formatRemainingTime` | 0 → `"0s"`, 負値 → `"0s"`, 90000ms → `"1m 30s"`, 3700000ms → `"1h 1m"` (既存テストケース維持) |
| `formatThroughput` | 500 → `"500/s"`, 5000 → `"5.0K/s"`, 2500000 → `"2.50M/s"` (既存テストケース維持) |
| `formatProgress` | AggregatedProgress → 複合フォーマット文字列 (既存テストケース維持) |
| `toBigintHex` | 16桁パディング |
| `formatResultCount` | ja: `"1,234 件"`, en: `"1,234 results"` |

### 5.2 コンポーネントテスト (`src/test/components/data-display/`)

| テスト | 対象 | 検証内容 |
|--------|------|---------|
| `data-table.test.tsx` | DataTable | 列定義通りにヘッダー・セルがレンダリングされる |
| | | 空データ時に EmptyState が表示される |
| | | ソート可能列のヘッダークリックでソート状態が変化する |
| `result-card.test.tsx` | ResultCardList | renderCard が各データに対して呼ばれる |
| | | 空データ時に EmptyState が表示される |
| `search-progress.test.tsx` | SearchProgress | 進捗バーと統計情報がレンダリングされる |
| | | 0% / 50% / 100% の各状態が正しく表示される |
| `empty-state.test.tsx` | EmptyState | デフォルトメッセージが表示される |
| | | カスタムメッセージが表示される |

### 5.3 テスト環境

- コンポーネントテスト: jsdom (`vitest.config.ts` の設定継承)
- i18n: テスト用に `setupTestI18n()` でソースメッセージ (英語) 表示
- Lingui マクロ: Vite 設定から `@lingui/babel-plugin-lingui-macro` が有効

### 5.4 仮想スクロールのテスト制約

jsdom は `getBoundingClientRect` / `IntersectionObserver` を完全にサポートしないため、仮想スクロールの行表示範囲テストは行わない。仮想スクロールのレンダリング確認は手動検証またはE2Eテスト (Playwright) で行う。コンポーネントテストでは「データが渡された場合にテーブル構造がレンダリングされる」レベルの確認に留める。

## 6. 実装チェックリスト

### 6.1 依存パッケージ

- [x] `@tanstack/react-table` をインストール
- [x] `@tanstack/react-virtual` をインストール
- [x] `@radix-ui/react-progress` をインストール

### 6.2 UI プリミティブ (`components/ui/`)

- [x] `table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption
- [x] `progress.tsx` — Radix Progress ラッパー
- [x] `badge.tsx` — Badge (variant: default / secondary / destructive / outline)

### 6.3 データ表示部品 (`components/data-display/`)

- [x] `data-table-types.ts` — DataTableOptions 型定義
- [x] `data-table.tsx` — DataTable (TanStack Table + Virtual)
- [x] `result-card.tsx` — ResultCardList (モバイル向けカード)
- [x] `search-progress.tsx` — SearchProgress (進捗バー + 統計)
- [x] `empty-state.tsx` — EmptyState (空状態)
- [x] `index.ts` — barrel export

### 6.4 ユーティリティ・リファクタリング

- [x] `lib/format.ts` — フォーマッタ集約 (`formatElapsedTime`, `formatRemainingTime`, `formatThroughput`, `formatProgress`, `toBigintHex`, `formatResultCount`, `remToPx`)
- [x] `lib/hex.ts` — `toHexString` / `toHexWordString` 削除、`toHex(value, digits)` に一本化
- [x] `services/progress.ts` — `formatRemainingTime` / `formatThroughput` / `formatProgress` を削除
- [x] `components/forms/mac-address-input.tsx` — `toHexString` → `toHex` に移行
- [x] `components/forms/timer0-vcount-range-input.tsx` — `toHexString` / `toHexWordString` → `toHex` に移行
- [x] `test/unit/services/progress.test.ts` — フォーマッタテストを `format.test.ts` へ移動
- [x] `test/unit/hex.test.ts` — `toHexString` / `toHexWordString` テストを `toHex` テストに置換

### 6.5 テスト

- [x] `test/unit/lib/format.test.ts` — フォーマッタユニットテスト
- [x] `test/components/data-display/data-table.test.tsx`
- [x] `test/components/data-display/result-card.test.tsx`
- [x] `test/components/data-display/search-progress.test.tsx`
- [x] `test/components/data-display/empty-state.test.tsx`

### 6.6 既存ファイルの更新

- [x] `design-system.md` のテーブルライブラリ記述を実態に合わせて更新 (必要に応じて)

## 7. 依存関係

```
@tanstack/react-table ─┐
@tanstack/react-virtual ┤
                        ▼
              data-display/data-table.tsx
                        │
                        ├── ui/table.tsx
                        ├── data-display/empty-state.tsx
                        └── lib/format.ts (remToPx)

@radix-ui/react-progress
        │
        ▼
  ui/progress.tsx
        │
        ▼
  data-display/search-progress.tsx
        │
        └── lib/format.ts (formatElapsedTime, formatRemainingTime, formatThroughput)

data-display/result-card.tsx
        │
        ├── @tanstack/react-virtual
        ├── lib/format.ts (remToPx)
        └── data-display/empty-state.tsx

lib/hex.ts
        └── toHex (汎用。旧 toHexString / toHexWordString は削除済み)
```

## 8. 関連ドキュメント

- [デザインシステム](../architecture/design-system.md) — Section 9: データテーブル
- [レスポンシブ対応](../architecture/responsive-design.md) — テーブル/カード切り替え
- [フロントエンド構成](../architecture/frontend-structure.md) — `data-display/` の位置付け
- [実装ロードマップ](../architecture/implementation-roadmap.md) — Phase 2 Section 4.4
- [i18n 設計](../architecture/i18n-design.md) — 翻訳対象の判断基準
