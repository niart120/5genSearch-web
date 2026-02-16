/**
 * SeedOrigin テーブル列定義
 *
 * 起動時刻検索結果 (SeedOrigin) を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toBigintHex, toHex, formatDatetime, formatKeyCode } from '@/lib/format';
import { SeedIvTooltip } from '@/components/data-display/seed-iv-tooltip';
import type { IvTooltipContext } from '@/lib/iv-tooltip';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';
import { lcg_seed_to_mt_seed } from '@/wasm/wasm_pkg.js';

/** Startup バリアントを前提とした列アクセサ用ヘルパー */
function getStartup(origin: SeedOrigin) {
  if ('Startup' in origin) return origin.Startup;
  return;
}

const columnHelper = createColumnHelper<SeedOrigin>();

function createSeedOriginColumns(
  contexts: IvTooltipContext[],
  onSelect?: (origin: SeedOrigin) => void
) {
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
        cell: (info) => {
          const row = info.row.original;
          const s = getStartup(row);
          const baseSeed = s?.base_seed ?? ('Seed' in row ? row.Seed.base_seed : undefined);
          if (baseSeed === undefined) {
            return <span className="font-mono text-xs">{info.getValue()}</span>;
          }
          const mtSeed = lcg_seed_to_mt_seed(baseSeed);
          return (
            <SeedIvTooltip mtSeed={mtSeed} contexts={contexts}>
              <span className="font-mono text-xs">{info.getValue()}</span>
            </SeedIvTooltip>
          );
        },
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
        cell: (info) => {
          const row = info.row.original;
          const s = getStartup(row);
          const mtSeed = s?.mt_seed ?? ('Seed' in row ? row.Seed.mt_seed : undefined);
          if (mtSeed === undefined) {
            return <span className="font-mono text-xs">{info.getValue()}</span>;
          }
          return (
            <SeedIvTooltip mtSeed={mtSeed} contexts={contexts}>
              <span className="font-mono text-xs">{info.getValue()}</span>
            </SeedIvTooltip>
          );
        },
      }
    ),
  ];
}

export { createSeedOriginColumns };
