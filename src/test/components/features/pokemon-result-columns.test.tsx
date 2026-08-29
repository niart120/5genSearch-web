import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DataTable } from '@/components/data-display/data-table';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { createPokemonListResultView } from '@/test/helpers/pokemon-result-view';
import { createPokemonResultColumns } from '@/features/pokemon-list/components/pokemon-result-columns';
import type { EncounterType } from '@/wasm/wasm_pkg.js';

const TEST_RESULT = createPokemonListResultView({
  rawHp: 31,
  uiHp: '表示IV',
  uiStatHp: '表示能力',
});

function renderColumns(
  resultEncounterType: EncounterType | undefined,
  statMode: 'stats' | 'ivs' = 'stats'
) {
  return render(
    <I18nTestWrapper>
      <DataTable
        columns={createPokemonResultColumns({ resultEncounterType, locale: 'ja', statMode })}
        data={[TEST_RESULT]}
        className="h-96"
      />
    </I18nTestWrapper>
  );
}

function ResultCell({ statMode, columnId }: { statMode: 'stats' | 'ivs'; columnId: string }) {
  const columns = createPokemonResultColumns({ statMode, locale: 'ja' });
  const table = useReactTable({
    columns,
    data: [TEST_RESULT],
    getCoreRowModel: getCoreRowModel(),
  });
  const cell = table
    .getRowModel()
    .rows[0]?.getAllCells()
    .find((candidate) => candidate.column.id === columnId);
  if (!cell) return;
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

describe('createPokemonResultColumns', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it.each([
    ['ShakingGrass', '揺れる草むら'],
    ['DustCloud', '土煙'],
    ['SurfingBubble', 'なみのり(泡)'],
    ['FishingBubble', 'つり(泡)'],
    ['PokemonShadow', 'ポケモンの影'],
  ] as const)('%s の結果では %s 列を表示する', (resultEncounterType, header) => {
    renderColumns(resultEncounterType);

    expect(screen.getByText(header)).toBeInTheDocument();
  });

  it('土煙列を針の直後に挿入し、発生記号を参照する', () => {
    renderColumns('DustCloud');

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers.indexOf('土煙')).toBe(headers.indexOf('Needle') + 1);

    const specialColumn = createPokemonResultColumns({
      resultEncounterType: 'DustCloud',
      locale: 'ja',
    }).find((column) => column.id === 'special_encounter_triggered');
    expect(specialColumn).toBeDefined();
    expect(
      specialColumn && 'accessorFn' in specialColumn
        ? specialColumn.accessorFn?.(TEST_RESULT, 0)
        : undefined
    ).toBe('〇');
  });

  it.each([
    ['ivs', 'ivs_0', 31, '表示IV'],
    ['stats', 'stats_0', 101, '表示能力'],
  ] as const)('%s 列は raw の数値で並べ、ui の文字列を表示する', (statMode, id, raw, ui) => {
    render(
      <I18nTestWrapper>
        <ResultCell statMode={statMode} columnId={id} />
      </I18nTestWrapper>
    );

    const column = createPokemonResultColumns({ statMode, locale: 'ja' }).find(
      (candidate) => candidate.id === id
    );
    expect(column).toBeDefined();
    expect(column && 'accessorFn' in column ? column.accessorFn?.(TEST_RESULT, 0) : undefined).toBe(
      raw
    );
    expect(screen.getByText(ui)).toBeInTheDocument();
  });

  it.each<EncounterType>(['Normal', 'StaticSymbol'])(
    '%s の結果では発生列を表示しない',
    (resultEncounterType) => {
      renderColumns(resultEncounterType);

      expect(screen.queryByText('土煙')).not.toBeInTheDocument();
      expect(
        createPokemonResultColumns({ resultEncounterType, locale: 'ja' }).some(
          (column) => column.id === 'special_encounter_triggered'
        )
      ).toBe(false);
    }
  );
});
