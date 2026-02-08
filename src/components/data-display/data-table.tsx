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

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable API constraint
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
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
    <div ref={containerRef} className={cn('overflow-auto', className)}>
      <Table className="min-w-max text-xs">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(canSort && 'cursor-pointer')}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder
                        ? undefined
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort &&
                        (sorted === 'asc' ? (
                          <ArrowUp className="size-3.5" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" />
                        ))}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {/* 上部スペーサー */}
          {virtualRows.length > 0 && virtualRows[0].start > 0 && (
            <tr>
              <td colSpan={columns.length} style={{ height: virtualRows[0].start }} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <TableRow key={row.id} data-index={virtualRow.index} ref={virtualizer.measureElement}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {/* 下部スペーサー */}
          {virtualRows.length > 0 && (
            <tr>
              <td
                colSpan={columns.length}
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
