/**
 * UiPokemonData テーブル列定義
 *
 * ポケモンリスト生成結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNeedleArrow } from '@/lib/game-data-names';
import type { UiPokemonData } from '@/wasm/wasm_pkg.js';

const columnHelper = createColumnHelper<UiPokemonData>();

/** ステータス順序: H, A, B, C, D, S */
const STAT_HEADERS_JA = ['H', 'A', 'B', 'C', 'D', 'S'] as const;
const STAT_HEADERS_EN = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'] as const;

type StatDisplayMode = 'stats' | 'ivs';

interface PokemonResultColumnsOptions {
  onSelect?: (result: UiPokemonData) => void;
  statMode?: StatDisplayMode;
  locale?: string;
}

function createPokemonResultColumns(options: PokemonResultColumnsOptions = {}) {
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
    columnHelper.accessor((row) => row.advance, {
      id: 'advance',
      header: () => t`Advance`,
      size: 70,
    }),
    columnHelper.accessor((row) => getNeedleArrow(row.needle_direction), {
      id: 'needle',
      header: () => t`Needle`,
      size: 36,
    }),
    columnHelper.accessor((row) => row.species_name, {
      id: 'species',
      header: () => t`Species`,
      size: 100,
    }),
    columnHelper.accessor((row) => row.nature_name, {
      id: 'nature',
      header: () => t`Nature`,
      size: 80,
    }),
    columnHelper.accessor((row) => row.ability_name, {
      id: 'ability',
      header: () => t`Ability`,
      size: 90,
    }),
    columnHelper.accessor((row) => row.gender_symbol, {
      id: 'gender',
      header: () => t`Gender`,
      size: 50,
    }),
    columnHelper.accessor((row) => row.shiny_symbol, {
      id: 'shiny',
      header: () => t`Shiny`,
      size: 40,
    }),
    // 個別ステータス列 (H/A/B/C/D/S)
    ...headers.map((header, i) =>
      columnHelper.accessor((row) => row[dataKey][i], {
        id: `${dataKey}_${i}`,
        header: () => header,
        size: 40,
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      })
    ),
    columnHelper.accessor((row) => row.hidden_power_type, {
      id: 'hidden_power',
      header: () => t`Hidden Power`,
      size: 80,
    }),
    columnHelper.accessor((row) => row.level, {
      id: 'level',
      header: () => 'Lv',
      size: 40,
    }),
    columnHelper.accessor((row) => row.pid, {
      id: 'pid',
      header: () => 'PID',
      size: 80,
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => (row.sync_applied ? '〇' : '×'), {
      id: 'sync',
      header: () => t`Sync`,
      size: 40,
    }),
    columnHelper.accessor((row) => row.held_item_name ?? '-', {
      id: 'held_item',
      header: () => t`Held item`,
      size: 80,
    }),
  ];
}

export { createPokemonResultColumns };
export type { StatDisplayMode, PokemonResultColumnsOptions };
