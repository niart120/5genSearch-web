import { render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { createPokemonSearchColumns } from '@/features/pokemon-search/components/pokemon-search-columns';
import { ResultDetailDialog } from '@/features/pokemon-list/components/result-detail-dialog';
import { createPokemonSearchExportColumns } from '@/services/export-columns';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { createPokemonListResultView } from '@/test/helpers/pokemon-result-view';

function startupResult() {
  const result = createPokemonListResultView();
  result.raw.source = {
    Startup: {
      base_seed: 0n,
      mt_seed: 0,
      datetime: { year: 2024, month: 2, day: 29, hour: 3, minute: 4, second: 5 },
      condition: { timer0: 0x0c_79, vcount: 0x06, key_mask: 0 },
    },
  };
  result.ui.datetime_iso = '2024-02-29T03:04:05';
  result.ui.timer0 = '0C79';
  result.ui.vcount = '06';
  return result;
}

beforeEach(() => setupTestI18n('ja'));

function ResultTable() {
  // jsdom は仮想スクロールの表示領域を計測できないため、列の実レンダラーを直接使う。
  const table = useReactTable({
    columns: createPokemonSearchColumns({ statMode: 'ivs', locale: 'ja' }),
    data: [startupResult()],
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

it('shows the shared datetime format and both Timer0 and VCount in the result table', () => {
  render(
    <I18nTestWrapper>
      <ResultTable />
    </I18nTestWrapper>
  );

  expect(screen.getByRole('cell', { name: '2024/02/29 03:04:05' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'VCount' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '0C79' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '06' })).toBeInTheDocument();
});

it('uses the same datetime in details and search exports', () => {
  const result = startupResult();
  render(
    <I18nTestWrapper>
      <ResultDetailDialog open onOpenChange={vi.fn()} result={result} />
    </I18nTestWrapper>
  );

  expect(within(screen.getByRole('dialog')).getByText('2024/02/29 03:04:05')).toBeInTheDocument();
  const columns = createPokemonSearchExportColumns('ivs');
  expect(columns.find((column) => column.key === 'datetime')?.accessor(result)).toBe(
    '2024/02/29 03:04:05'
  );
  expect(columns.find((column) => column.key === 'vcount')?.accessor(result)).toBe('06');
});
