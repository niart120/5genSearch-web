/**
 * SeedOrigin テーブル列定義
 *
 * 起動時刻検索結果 (SeedOrigin) を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/react/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toBigintHex, toHex, formatDatetime, formatKeyCode } from '@/lib/format';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';

/** Startup バリアントを前提とした列アクセサ用ヘルパー */
function getStartup(origin: SeedOrigin) {
  if ('Startup' in origin) return origin.Startup;
  return;
}

const columnHelper = createColumnHelper<SeedOrigin>();

function createSeedOriginColumns(onSelect?: (origin: SeedOrigin) => void) {
  return [
    columnHelper.display({
      id: 'detail',
      size: 40,
      cell: (info) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => onSelect?.(info.row.original)}
          aria-label={t`Details`}
        >
          <Info className="size-3.5" />
        </Button>
      ),
    }),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row);
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
        const s = getStartup(row);
        return s ? toHex(s.condition.timer0, 4) : '';
      },
      {
        id: 'timer0',
        header: () => 'Timer0',
        size: 70,
      }
    ),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row);
        return s ? toHex(s.condition.vcount, 2) : '';
      },
      {
        id: 'vcount',
        header: () => 'VCount',
        size: 60,
      }
    ),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row);
        return s ? formatKeyCode(s.condition.key_code) : '';
      },
      {
        id: 'key',
        header: () => t`Key`,
        size: 100,
      }
    ),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row);
        if (s) return toBigintHex(s.base_seed, 16);
        if ('Seed' in row) return toBigintHex(row.Seed.base_seed, 16);
        return '';
      },
      {
        id: 'baseSeed',
        header: () => 'Base Seed',
        size: 160,
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }
    ),
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row);
        if (s) return toHex(s.mt_seed, 8);
        if ('Seed' in row) return toHex(row.Seed.mt_seed, 8);
        return '';
      },
      {
        id: 'mtSeed',
        header: () => 'MT Seed',
        size: 100,
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }
    ),
  ];
}

export { createSeedOriginColumns };
