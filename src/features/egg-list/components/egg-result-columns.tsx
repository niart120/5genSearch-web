/**
 * EggListResultView テーブル列定義
 *
 * タマゴ個体生成結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNeedleArrow, STAT_HEADERS_JA, STAT_HEADERS_EN } from '@/lib/game-data-names';
import type { EggListResultView } from '@/lib/result-view';

import type { StatDisplayMode } from '@/lib/game-data-names';

const columnHelper = createColumnHelper<EggListResultView>();
const IV_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'special_attack',
  'special_defense',
  'speed',
] as const;

interface EggResultColumnsOptions {
  onSelect?: (result: EggListResultView) => void;
  statMode?: StatDisplayMode;
  locale?: string;
}

function createEggResultColumns(options: EggResultColumnsOptions = {}) {
  const { onSelect, statMode = 'stats', locale = 'ja' } = options;
  const headers = locale === 'ja' ? STAT_HEADERS_JA : STAT_HEADERS_EN;
  const dataKey = statMode === 'stats' ? 'stats' : 'ivs';

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
    columnHelper.accessor((row) => row.raw.advance, {
      id: 'advance',
      header: () => t`Advance`,
      size: 70,
    }),
    columnHelper.accessor((row) => getNeedleArrow(row.ui.needle_direction), {
      id: 'needle',
      header: () => t`Needle`,
      size: 36,
    }),
    columnHelper.accessor((row) => row.ui.nature_name, {
      id: 'nature',
      header: () => t`Nature`,
      size: 80,
    }),
    columnHelper.accessor((row) => row.ui.ability_name, {
      id: 'ability',
      header: () => t`Ability`,
      size: 90,
    }),
    columnHelper.accessor((row) => row.ui.gender_symbol, {
      id: 'gender',
      header: () => t`Gender`,
      size: 50,
    }),
    columnHelper.accessor((row) => row.ui.shiny_symbol, {
      id: 'shiny',
      header: () => t`Shiny`,
      size: 40,
    }),
    // 個別ステータス列 (H/A/B/C/D/S)
    ...headers.map((header, i) =>
      columnHelper.accessor(
        (row) =>
          statMode === 'stats' ? row.raw.core.stats[STAT_KEYS[i]] : row.raw.core.ivs[IV_KEYS[i]],
        {
          id: `${dataKey}_${i}`,
          header: () => header,
          size: 40,
          cell: (info) => (
            <span className="font-mono text-xs">{info.row.original.ui[dataKey][i]}</span>
          ),
        }
      )
    ),
    columnHelper.accessor((row) => row.ui.hidden_power_type, {
      id: 'hidden_power',
      header: () => t`Hidden Power`,
      size: 80,
    }),
    columnHelper.accessor((row) => row.ui.pid, {
      id: 'pid',
      header: () => 'PID',
      size: 80,
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.raw.margin_frames, {
      id: 'margin_frames',
      header: () => t`Margin`,
      size: 60,
      cell: (info) => info.row.original.ui.margin_frames ?? '-',
    }),
  ];
}

export { createEggResultColumns };
export type { EggResultColumnsOptions };
