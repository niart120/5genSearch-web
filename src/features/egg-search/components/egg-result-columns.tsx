import { AdvanceTooltip } from '@/components/data-display/rng-tooltips';
/**
 * EggSearchResultView テーブル列定義
 *
 * 孵化検索結果を DataTable で表示するための ColumnDef。
 */

import { createColumnHelper } from '@tanstack/react-table';
import { t } from '@lingui/core/macro';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EggMarginTooltip } from '@/components/data-display/egg-margin-tooltip';
import { toHex, formatDatetime } from '@/lib/format';
import { STAT_HEADERS_JA, STAT_HEADERS_EN } from '@/lib/game-data-names';
import type { SupportedLocale } from '@/i18n';
import type { EggSearchResultView } from '@/lib/result-view';

const columnHelper = createColumnHelper<EggSearchResultView>();

/** Startup バリアントからの抽出ヘルパー */
function getStartup(result: EggSearchResultView) {
  const source = result.raw.egg.source;
  if ('Startup' in source) return source.Startup;
  return;
}

function createEggResultColumns(
  locale: SupportedLocale,
  onSelect?: (result: EggSearchResultView) => void
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
    columnHelper.accessor((row) => row.ui.nature_name, {
      id: 'nature',
      header: () => t`Nature`,
      size: 80,
    }),
    // 個別 IV 列 (H/A/B/C/D/S)
    ...headers.map((header, i) =>
      columnHelper.accessor((row) => row.raw.egg.core.ivs[ivKeys[i]], {
        id: `iv_${i}`,
        header: () => header,
        size: 40,
        cell: (info) => <span className="font-mono text-xs">{info.row.original.ui.ivs[i]}</span>,
      })
    ),
    columnHelper.accessor((row) => row.ui.ability_name, {
      id: 'ability',
      header: () => t`Ability`,
      size: 50,
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
    columnHelper.accessor((row) => row.raw.egg.advance, {
      id: 'advance',
      header: () => (
        <span className="inline-flex items-center gap-1">
          {t`Advance`}
          <AdvanceTooltip />
        </span>
      ),
      size: 84,
    }),
    columnHelper.accessor((row) => row.raw.egg.margin_frames, {
      id: 'margin',
      header: () => (
        <span className="inline-flex items-center gap-1">
          {t`Margin`}
          <EggMarginTooltip />
        </span>
      ),
      size: 84,
      cell: (info) => {
        const val = info.row.original.ui.margin_frames;
        return val === undefined ? '-' : val;
      },
    }),
  ];
}

export { createEggResultColumns };
