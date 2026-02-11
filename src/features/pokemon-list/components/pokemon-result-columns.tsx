/**
 * UiPokemonData テーブル列定義
 *
 * ポケモンリスト生成結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UiPokemonData } from '@/wasm/wasm_pkg.js';

const columnHelper = createColumnHelper<UiPokemonData>();

function createPokemonResultColumns(onSelect?: (result: UiPokemonData) => void) {
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
    columnHelper.accessor((row) => row.ivs.join('-'), {
      id: 'ivs',
      header: () => 'IV',
      size: 120,
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
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
