import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { formatDatetime, toHex } from '@/lib/format';
import type { WonderCardResultView } from '@/lib/result-view';
import {
  createWonderCardResultColumns,
  type WonderCardResultColumnsOptions,
} from '@/features/wondercard-list/components/wondercard-result-columns';

const helper = createColumnHelper<WonderCardResultView>();
export const WONDERCARD_SEARCH_SORTING = [
  { id: 'datetime', desc: false },
  { id: 'advance', desc: false },
];

export function createWonderCardSearchColumns(options: WonderCardResultColumnsOptions) {
  const columns = createWonderCardResultColumns(options);
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
      cell: (info) => {
        const source = info.row.original.raw.source;
        return 'Startup' in source ? formatDatetime(source.Startup.datetime) : '';
      },
    }
  );
  return [
    ...core.slice(0, 1),
    datetimeColumn,
    ...core.slice(1),
    ...stats,
    helper.accessor(
      (row) => ('Startup' in row.raw.source ? row.raw.source.Startup.condition.timer0 : 0),
      {
        id: 'timer0',
        header: 'Timer0',
        size: 70,
        cell: (info) =>
          'Startup' in info.row.original.raw.source ? toHex(info.getValue(), 4) : '',
      }
    ),
    helper.accessor(
      (row) => ('Startup' in row.raw.source ? row.raw.source.Startup.condition.vcount : 0),
      {
        id: 'vcount',
        header: 'VCount',
        size: 60,
        cell: (info) =>
          'Startup' in info.row.original.raw.source ? toHex(info.getValue(), 2) : '',
      }
    ),
    helper.accessor((row) => row.ui.key_input ?? '', {
      id: 'key_input',
      header: () => t`Key input`,
      size: 100,
    }),
  ];
}
