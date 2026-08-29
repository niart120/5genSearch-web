import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { createEggResultColumns } from '@/features/egg-search/components/egg-result-columns';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { createEggSearchResultView } from '@/test/helpers/egg-result-view';
import type { EggSearchResultView } from '@/lib/result-view';

function ResultCell({ result }: { result: EggSearchResultView }) {
  const columns = createEggResultColumns('ja');
  const table = useReactTable({ columns, data: [result], getCoreRowModel: getCoreRowModel() });
  const cell = table
    .getRowModel()
    .rows[0]?.getAllCells()
    .find((candidate) => candidate.column.id === 'iv_0');
  if (!cell) return;
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

describe('Egg Search result columns', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('不明個体値は raw の32でソートし、セルには?を表示する', () => {
    const result = createEggSearchResultView();
    const columns = createEggResultColumns('ja');
    const hpColumn = columns.find((column) => column.id === 'iv_0');

    expect(
      hpColumn && 'accessorFn' in hpColumn ? hpColumn.accessorFn?.(result, 0) : undefined
    ).toBe(32);

    render(
      <I18nTestWrapper>
        <ResultCell result={result} />
      </I18nTestWrapper>
    );

    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.queryByText('32')).not.toBeInTheDocument();
  });
});
