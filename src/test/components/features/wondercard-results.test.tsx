import { act, render, renderHook, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { i18n } from '@lingui/core';
import { createWonderCardResultColumns } from '@/features/wondercard-list/components/wondercard-result-columns';
import { createWonderCardSearchColumns } from '@/features/wondercard-search/components/wondercard-search-columns';
import { ResultDetailDialog } from '@/features/wondercard-list/components/result-detail-dialog';
import {
  createWonderCardListExportColumns,
  createWonderCardSearchExportColumns,
} from '@/services/export-columns';
import { filterColumns, toCsv, toJson, toTsv, buildExportMeta } from '@/services/export';
import { createWonderCardView } from '@/test/fixtures/wondercards/ui';
import { I18nTestWrapper } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import { messages as ja } from '@/i18n/locales/ja/messages';
import { messages as en } from '@/i18n/locales/en/messages';
import type { WonderCardResultView } from '@/lib/result-view';
import { getDsConfigInitialState } from '@/stores/settings/ds-config';

beforeEach(() => {
  i18n.load({ ja, en });
  i18n.activate('en');
  useUiStore.getState().setLanguage('en');
});

function ResultTable() {
  const table = useReactTable({
    columns: createWonderCardSearchColumns({ locale: 'en', statMode: 'ivs' }),
    data: [createWonderCardView()],
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((g) => (
          <tr key={g.id}>
            {g.headers.map((h) => (
              <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((r) => (
          <tr key={r.id}>
            {r.getAllCells().map((c) => (
              <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

it('検索列を仕様順に表示し、日時・Timer0・VCount を表示する', () => {
  render(
    <I18nTestWrapper>
      <ResultTable />
    </I18nTestWrapper>
  );
  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
    '',
    'Date/Time',
    'Advance',
    'Species',
    'Nature',
    'Shiny',
    'Gender',
    'Ability',
    'Lv',
    'HP',
    'Atk',
    'Def',
    'SpA',
    'SpD',
    'Spe',
    'Timer0',
    'VCount',
    'Key input',
  ]);
  expect(screen.getByRole('cell', { name: '2010/09/18 12:00:00' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '0C79' })).toBeInTheDocument();
});

it.each(['ivs', 'stats'] as const)('%s を表示文字列ではなく生データの数値でソートする', (mode) => {
  const a = createWonderCardView();
  const b = createWonderCardView();
  a.raw.core.ivs.hp = 9;
  b.raw.core.ivs.hp = 10;
  a.raw.core.stats.hp = 99;
  b.raw.core.stats.hp = 100;
  a.ui[mode][0] = '999';
  b.ui[mode][0] = '1';
  const columns = createWonderCardResultColumns({ statMode: mode });
  const data = [b, a];
  const { result } = renderHook(() =>
    useReactTable<WonderCardResultView>({
      columns,
      data,
      state: { sorting: [{ id: `${mode}_0`, desc: false }] },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    })
  );
  expect(result.current.getRowModel().rows.map((r) => r.original)).toEqual([a, b]);
});

it('詳細は配達員の項目を表示し、言語切り替えでも同じ結果を表示する', () => {
  const row = createWonderCardView();
  const { rerender } = render(
    <I18nTestWrapper>
      <ResultDetailDialog open onOpenChange={vi.fn()} result={row} />
    </I18nTestWrapper>
  );
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('LCG Seed')).toBeInTheDocument();
  expect(dialog.getByText('2010/09/18 12:00:00')).toBeInTheDocument();
  expect(dialog.getByText('Fire (40)')).toBeInTheDocument();
  expect(dialog.queryByText('MT Seed')).not.toBeInTheDocument();
  expect(dialog.queryByText('Sync')).not.toBeInTheDocument();
  act(() => {
    i18n.activate('ja');
    useUiStore.getState().setLanguage('ja');
  });
  rerender(
    <I18nTestWrapper>
      <ResultDetailDialog
        open
        onOpenChange={vi.fn()}
        result={{ ...row, ui: { ...row.ui, species_name: 'ピカチュウ' } }}
      />
    </I18nTestWrapper>
  );
  expect(screen.getByText('ピカチュウ')).toBeInTheDocument();
  expect(screen.getByText('123456789ABCDEF0')).toBeInTheDocument();
});

it('通常出力の順序は各表に一致し、詳細だけに反対モード・針・PID を追加する', () => {
  const columns = createWonderCardSearchExportColumns('stats');
  expect(filterColumns(columns, false).map((c) => c.key)).toEqual([
    'datetime',
    'advance',
    'species',
    'nature',
    'shiny',
    'gender',
    'ability',
    'level',
    'hp',
    'atk',
    'def',
    'spa',
    'spd',
    'spe',
    'timer0',
    'vcount',
    'key_input',
  ]);
  expect(columns.filter((c) => c.detailOnly).map((c) => c.key)).toEqual([
    'needle',
    'hidden_power',
    'pid',
    'base_seed',
    'hp_alt',
    'atk_alt',
    'def_alt',
    'spa_alt',
    'spd_alt',
    'spe_alt',
    'hidden_power_power',
  ]);
  expect(filterColumns(createWonderCardListExportColumns('ivs'), false).map((c) => c.key)).toEqual([
    'advance',
    'needle',
    'species',
    'nature',
    'ability',
    'gender',
    'shiny',
    'hp',
    'atk',
    'def',
    'spa',
    'spd',
    'spe',
    'hidden_power',
    'level',
    'pid',
  ]);
  const rows = [createWonderCardView()];
  expect(toCsv(rows, columns)).toContain('2010/09/18 12:00:00');
  expect(toTsv(rows, columns)).toContain('123456789ABCDEF0');
  const meta = buildExportMeta({
    ...getDsConfigInitialState(),
    feature: 'wondercard-search',
    totalResults: 1,
    includeDetails: true,
  });
  expect(JSON.parse(toJson(rows, columns, meta)).results[0].hp_alt).toBe('9');
});
