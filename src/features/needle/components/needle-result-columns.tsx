/**
 * 針検索結果テーブル列定義
 */

import type { ColumnDef } from '@tanstack/react-table';
import { Trans } from '@lingui/react/macro';
import { toBigintHex, toHex } from '@/lib/format';
import type { NeedleSearchResult } from '@/wasm/wasm_pkg.js';

/** Startup バリアントのデータ取得ヘルパー */
function getStartup(result: NeedleSearchResult) {
  if ('Startup' in result.source) return result.source.Startup;
  return;
}

export function createNeedleResultColumns(): ColumnDef<NeedleSearchResult>[] {
  return [
    {
      accessorFn: (row) => row.advance,
      id: 'advance',
      header: () => <Trans>Advance</Trans>,
      size: 80,
      cell: ({ getValue }) => <span className="font-mono">{getValue<number>()}</span>,
    },
    {
      accessorFn: (row) => {
        const s = getStartup(row);
        if (s) return toBigintHex(s.base_seed, 16);
        if ('Seed' in row.source) return toBigintHex(row.source.Seed.base_seed, 16);
        return '';
      },
      id: 'initialSeed',
      header: () => <Trans>Initial Seed</Trans>,
      size: 160,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorFn: (row) => {
        const s = getStartup(row);
        if (!s) return '';
        const dt = s.datetime;
        return `${dt.year}/${String(dt.month).padStart(2, '0')}/${String(dt.day).padStart(2, '0')}`;
      },
      id: 'date',
      header: () => <Trans>Date</Trans>,
      size: 100,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorFn: (row) => {
        const s = getStartup(row);
        if (!s) return '';
        const dt = s.datetime;
        return `${String(dt.hour).padStart(2, '0')}:${String(dt.minute).padStart(2, '0')}:${String(dt.second).padStart(2, '0')}`;
      },
      id: 'time',
      header: () => <Trans>Time</Trans>,
      size: 80,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorFn: (row) => {
        const s = getStartup(row);
        return s ? toHex(s.condition.timer0, 4) : '';
      },
      id: 'timer0',
      header: () => 'Timer0',
      size: 70,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorFn: (row) => {
        const s = getStartup(row);
        return s ? toHex(s.condition.vcount, 2) : '';
      },
      id: 'vcount',
      header: () => 'VCount',
      size: 60,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
  ];
}
