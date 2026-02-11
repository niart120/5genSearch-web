/**
 * EggDatetimeSearchResult テーブル列定義
 *
 * 孵化検索結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toHex, formatDatetime } from '@/lib/format';
import { getNatureName } from '@/lib/game-data-names';
import type { SupportedLocale } from '@/i18n';
import type { EggDatetimeSearchResult, Gender, ShinyType, AbilitySlot } from '@/wasm/wasm_pkg.js';

const columnHelper = createColumnHelper<EggDatetimeSearchResult>();

function formatGender(gender: Gender): string {
  switch (gender) {
    case 'Male': {
      return '♂';
    }
    case 'Female': {
      return '♀';
    }
    case 'Genderless': {
      return '-';
    }
  }
}

function formatShiny(shinyType: ShinyType): string {
  switch (shinyType) {
    case 'Star': {
      return '☆';
    }
    case 'Square': {
      return '◇';
    }
    case 'None': {
      return '';
    }
  }
}

function formatAbilitySlot(slot: AbilitySlot): string {
  switch (slot) {
    case 'First': {
      return '1';
    }
    case 'Second': {
      return '2';
    }
    case 'Hidden': {
      return 'H';
    }
  }
}

function formatIvs(ivs: {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}): string {
  return `${ivs.hp}-${ivs.atk}-${ivs.def}-${ivs.spa}-${ivs.spd}-${ivs.spe}`;
}

/** Startup バリアントからの抽出ヘルパー */
function getStartup(result: EggDatetimeSearchResult) {
  const source = result.egg.source;
  if ('Startup' in source) return source.Startup;
  return;
}

function createEggResultColumns(
  locale: SupportedLocale,
  onSelect?: (result: EggDatetimeSearchResult) => void
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
    columnHelper.accessor((row) => getNatureName(row.egg.core.nature, locale), {
      id: 'nature',
      header: () => t`Nature`,
      size: 80,
    }),
    columnHelper.accessor((row) => formatIvs(row.egg.core.ivs), {
      id: 'ivs',
      header: () => 'IV',
      size: 120,
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => formatAbilitySlot(row.egg.core.ability_slot), {
      id: 'ability',
      header: () => t`Ability`,
      size: 50,
    }),
    columnHelper.accessor((row) => formatGender(row.egg.core.gender), {
      id: 'gender',
      header: () => t`Gender`,
      size: 50,
    }),
    columnHelper.accessor((row) => formatShiny(row.egg.core.shiny_type), {
      id: 'shiny',
      header: () => t`Shiny`,
      size: 40,
    }),
    columnHelper.accessor((row) => row.egg.advance, {
      id: 'advance',
      header: () => t`Advance`,
      size: 60,
    }),
    columnHelper.accessor((row) => row.egg.margin_frames, {
      id: 'margin',
      header: () => t`Margin`,
      size: 60,
      cell: (info) => {
        const val = info.getValue();
        return val === undefined ? '-' : val;
      },
    }),
  ];
}

export { createEggResultColumns };
