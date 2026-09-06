import { AdvanceTooltip, NeedleTooltip } from '@/components/data-display/rng-tooltips';
/**
 * PokemonListResultView テーブル列定義
 *
 * ポケモンリスト生成結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getEncounterMethodName,
  getNeedleArrow,
  STAT_HEADERS_JA,
  STAT_HEADERS_EN,
} from '@/lib/game-data-names';
import { isSpecialEncounterType } from './encounter-constants';
import type { SupportedLocale } from '@/i18n';
import type { PokemonListResultView } from '@/lib/result-view';
import type { EncounterType } from '@/wasm/wasm_pkg.js';

import type { StatDisplayMode } from '@/lib/game-data-names';

const columnHelper = createColumnHelper<PokemonListResultView>();

const IV_VALUE_ACCESSORS: ReadonlyArray<(result: PokemonListResultView) => number> = [
  (result) => result.raw.core.ivs.hp,
  (result) => result.raw.core.ivs.atk,
  (result) => result.raw.core.ivs.def,
  (result) => result.raw.core.ivs.spa,
  (result) => result.raw.core.ivs.spd,
  (result) => result.raw.core.ivs.spe,
];

const STAT_VALUE_ACCESSORS: ReadonlyArray<(result: PokemonListResultView) => number | undefined> = [
  (result) => result.raw.core.stats.hp,
  (result) => result.raw.core.stats.attack,
  (result) => result.raw.core.stats.defense,
  (result) => result.raw.core.stats.special_attack,
  (result) => result.raw.core.stats.special_defense,
  (result) => result.raw.core.stats.speed,
];

interface PokemonResultColumnsOptions {
  onSelect?: (result: PokemonListResultView) => void;
  statMode?: StatDisplayMode;
  locale?: SupportedLocale;
  resultEncounterType?: EncounterType;
}

function createPokemonResultColumns(options: PokemonResultColumnsOptions = {}) {
  const { onSelect, statMode = 'stats', locale = 'ja', resultEncounterType } = options;
  const headers = locale === 'ja' ? STAT_HEADERS_JA : STAT_HEADERS_EN;
  const dataKey = statMode === 'stats' ? 'stats' : 'ivs';
  const rawValueAccessors = statMode === 'stats' ? STAT_VALUE_ACCESSORS : IV_VALUE_ACCESSORS;
  const specialEncounterColumns =
    resultEncounterType !== undefined && isSpecialEncounterType(resultEncounterType)
      ? [
          columnHelper.accessor((row) => row.ui.special_encounter_triggered ?? '', {
            id: 'special_encounter_triggered',
            header: () => getEncounterMethodName(resultEncounterType, locale),
            size: 72,
          }),
        ]
      : [];

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
      header: () => (
        <span className="inline-flex items-center gap-1">
          {t`Advance`}
          <AdvanceTooltip />
        </span>
      ),
      size: 94,
    }),
    columnHelper.accessor((row) => getNeedleArrow(row.ui.needle_direction), {
      id: 'needle',
      header: () => (
        <span className="inline-flex items-center gap-1">
          {t`Needle`}
          <NeedleTooltip />
        </span>
      ),
      size: 60,
    }),
    ...specialEncounterColumns,
    columnHelper.accessor((row) => row.ui.species_name, {
      id: 'species',
      header: () => t`Species`,
      size: 100,
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
      columnHelper.accessor((row) => rawValueAccessors[i]?.(row), {
        id: `${dataKey}_${i}`,
        header: () => header,
        size: 40,
        cell: (info) => (
          <span className="font-mono text-xs">{info.row.original.ui[dataKey][i]}</span>
        ),
      })
    ),
    columnHelper.accessor((row) => row.ui.hidden_power_type, {
      id: 'hidden_power',
      header: () => t`Hidden Power`,
      size: 80,
    }),
    columnHelper.accessor((row) => row.raw.core.level, {
      id: 'level',
      header: () => 'Lv',
      size: 40,
    }),
    columnHelper.accessor((row) => row.ui.pid, {
      id: 'pid',
      header: () => 'PID',
      size: 80,
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.raw.sync_applied, {
      id: 'sync',
      header: () => t`Sync`,
      size: 40,
      cell: (info) => (info.row.original.ui.sync_applied ? '〇' : '×'),
    }),
    columnHelper.accessor((row) => row.ui.held_item_name ?? '-', {
      id: 'held_item',
      header: () => t`Held item`,
      size: 80,
    }),
  ];
}

export { createPokemonResultColumns };
export type { PokemonResultColumnsOptions };
