/**
 * MT Seed 検索結果テーブル列定義
 */

import type { ColumnDef } from '@tanstack/react-table';
import { Trans } from '@lingui/react/macro';
import { toHex } from '@/lib/format';
import type { MtseedResult } from '@/wasm/wasm_pkg.js';

export function createMtseedResultColumns(): ColumnDef<MtseedResult>[] {
  return [
    {
      accessorFn: (row) => toHex(row.seed, 8),
      id: 'seed',
      header: () => <Trans>MT Seed</Trans>,
      cell: ({ getValue }) => <span className="font-mono">{getValue<string>()}</span>,
    },
    {
      accessorFn: (row) => row.ivs.hp,
      id: 'hp',
      header: () => <Trans>HP</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.atk,
      id: 'atk',
      header: () => <Trans>Atk</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.def,
      id: 'def',
      header: () => <Trans>Def</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.spa,
      id: 'spa',
      header: () => <Trans>SpA</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.spd,
      id: 'spd',
      header: () => <Trans>SpD</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.spe,
      id: 'spe',
      header: () => <Trans>Spe</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
  ];
}
