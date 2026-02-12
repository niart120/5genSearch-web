/**
 * EggDatetimeSearchResult テーブル列定義
 *
 * 孵化検索結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toHex, formatDatetime, formatGender, formatShiny, formatAbilitySlot } from '@/lib/format';
import { getNatureName, STAT_HEADERS_JA, STAT_HEADERS_EN } from '@/lib/game-data-names';
import type { SupportedLocale } from '@/i18n';
import type { EggDatetimeSearchResult } from '@/wasm/wasm_pkg.js';

const columnHelper = createColumnHelper<EggDatetimeSearchResult>();

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
  const headers = locale === 'ja' ? STAT_HEADERS_JA : STAT_HEADERS_EN;
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

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
    // 個別 IV 列 (H/A/B/C/D/S)
    ...headers.map((header, i) =>
      columnHelper.accessor((row) => row.egg.core.ivs[ivKeys[i]], {
        id: `iv_${i}`,
        header: () => header,
        size: 40,
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      })
    ),
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
