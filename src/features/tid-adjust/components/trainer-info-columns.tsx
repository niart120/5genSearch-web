/**
 * ID 調整検索結果テーブル列定義
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { toHex, formatDatetime, formatShiny } from '@/lib/format';
import type { TrainerInfoSearchResult, SeedOrigin } from '@/wasm/wasm_pkg.js';

/** Startup バリアントのアクセサヘルパー */
function getStartup(origin: SeedOrigin) {
  if ('Startup' in origin) return origin.Startup;
  return;
}

const columnHelper = createColumnHelper<TrainerInfoSearchResult>();

export function createTrainerInfoColumns() {
  return [
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row.seed_origin);
        return s ? formatDatetime(s.datetime) : '';
      },
      {
        id: 'datetime',
        header: () => t`Date/Time`,
        size: 160,
      }
    ),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row.seed_origin);
        return s ? toHex(s.condition.timer0, 4) : '';
      },
      {
        id: 'timer0',
        header: () => 'Timer0',
        size: 70,
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
      }
    ),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row.seed_origin);
        return s ? toHex(s.condition.vcount, 2) : '';
      },
      {
        id: 'vcount',
        header: () => 'VCount',
        size: 60,
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
      }
    ),
    columnHelper.accessor((row) => row.trainer.tid, {
      id: 'tid',
      header: () => 'TID',
      size: 60,
    }),
    columnHelper.accessor((row) => row.trainer.sid, {
      id: 'sid',
      header: () => 'SID',
      size: 60,
    }),
    columnHelper.accessor((row) => (row.shiny_type ? formatShiny(row.shiny_type) : ''), {
      id: 'shiny',
      header: () => t`Shiny`,
      size: 50,
    }),
  ];
}
