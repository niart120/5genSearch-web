/**
 * ID 調整検索結果テーブル列定義
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { toBigintHex, toHex, formatDatetime, formatShiny, formatKeyMask } from '@/lib/format';
import { SeedIvTooltip } from '@/components/data-display/seed-iv-tooltip';
import type { IvTooltipContext } from '@/lib/iv-tooltip';
import type { TrainerInfoSearchResult, SeedOrigin } from '@/wasm/wasm_pkg.js';
import { lcg_seed_to_mt_seed } from '@/wasm/wasm_pkg.js';

/** Startup バリアントのアクセサヘルパー */
function getStartup(origin: SeedOrigin) {
  if ('Startup' in origin) return origin.Startup;
  return;
}

const columnHelper = createColumnHelper<TrainerInfoSearchResult>();

export function createTrainerInfoColumns(contexts: IvTooltipContext[]) {
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
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row.seed_origin);
        return s ? formatKeyMask(s.condition.key_mask) : '';
      },
      {
        id: 'key',
        header: () => t`Key`,
        size: 100,
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
    columnHelper.accessor(
      (row) => {
        const s = getStartup(row.seed_origin);
        return s ? toBigintHex(s.base_seed, 16) : '';
      },
      {
        id: 'baseSeed',
        header: () => 'Base Seed',
        size: 160,
        cell: (info) => {
          const s = getStartup(info.row.original.seed_origin);
          if (!s) return <span className="font-mono text-xs">{info.getValue()}</span>;
          const mtSeed = lcg_seed_to_mt_seed(s.base_seed);
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
