import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import type { PokemonListResultView } from '@/lib/result-view';
import {
  createPokemonResultColumns,
  type PokemonResultColumnsOptions,
} from '@/features/pokemon-list/components/pokemon-result-columns';

const helper = createColumnHelper<PokemonListResultView>();
export const POKEMON_SEARCH_SORTING = [
  { id: 'datetime', desc: false },
  { id: 'advance', desc: false },
];

export function createPokemonSearchColumns(options: PokemonResultColumnsOptions) {
  const columns = createPokemonResultColumns(options);
  const ids = ['detail', 'advance', 'species', 'nature', 'shiny', 'gender', 'ability', 'level'];
  const core = ids.flatMap((id) => columns.filter((column) => column.id === id));
  const stats = columns.filter(
    (column) => column.id?.startsWith('ivs_') || column.id?.startsWith('stats_')
  );
  const datetimeColumn = helper.accessor(
    (row) => {
      if (!('Startup' in row.raw.source)) return 0;
      const date = row.raw.source.Startup.datetime;
      return Date.UTC(date.year, date.month - 1, date.day, date.hour, date.minute, date.second);
    },
    {
      id: 'datetime',
      header: () => t`Date/Time`,
      size: 160,
      cell: (info) => info.row.original.ui.datetime_iso,
    }
  );
  return [
    ...core.slice(0, 1),
    datetimeColumn,
    ...core.slice(1),
    ...stats,
    helper.accessor(
      (row) => ('Startup' in row.raw.source ? row.raw.source.Startup.condition.timer0 : 0),
      { id: 'timer0', header: 'Timer0', size: 64, cell: (info) => info.row.original.ui.timer0 }
    ),
    helper.accessor((row) => row.ui.key_input ?? '', {
      id: 'key_input',
      header: () => t`Key input`,
      size: 100,
    }),
  ];
}
