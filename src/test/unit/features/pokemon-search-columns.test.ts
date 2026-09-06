import { createTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';
import { expect, it, vi } from 'vitest';
import {
  createPokemonSearchColumns,
  POKEMON_SEARCH_SORTING,
} from '@/features/pokemon-search/components/pokemon-search-columns';
import { createPokemonListResultView } from '@/test/helpers/pokemon-result-view';
import { setupTestI18n } from '@/test/helpers/i18n';

it.each(['ivs', 'stats'] as const)(
  'sorts by raw dates then advances and preserves the %s column order',
  (statMode) => {
    setupTestI18n('ja');
    const data = [
      { day: 2, advance: 0, display: 'A' },
      { day: 1, advance: 10, display: 'B' },
      { day: 1, advance: 2, display: 'Z' },
    ].map(({ day, advance, display }) => {
      const result = createPokemonListResultView();
      result.raw.advance = advance;
      result.raw.source = {
        Startup: {
          base_seed: 0n,
          mt_seed: 0,
          datetime: { year: 2024, month: 1, day, hour: 0, minute: 0, second: 0 },
          condition: { timer0: 3193, vcount: 96, key_mask: 0 },
        },
      };
      result.ui.datetime_iso = display;
      return result;
    });
    const columns = createPokemonSearchColumns({ statMode, locale: 'ja', onSelect: vi.fn() });
    const table = createTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      state: { sorting: POKEMON_SEARCH_SORTING },
      onStateChange: vi.fn(),
      renderFallbackValue: undefined,
    });
    expect(table.getRowModel().rows.map((row) => row.original.ui.datetime_iso)).toEqual([
      'Z',
      'B',
      'A',
    ]);
    expect(columns.map((column) => column.id)).toEqual([
      'detail',
      'datetime',
      'advance',
      'species',
      'nature',
      'shiny',
      'gender',
      'ability',
      'level',
      ...[0, 1, 2, 3, 4, 5].map((stat) => `${statMode}_${stat}`),
      'timer0',
      'vcount',
      'key_input',
    ]);
  }
);
