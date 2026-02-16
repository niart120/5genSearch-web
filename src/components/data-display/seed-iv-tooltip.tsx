/**
 * Seed IV ツールチップコンポーネント
 *
 * MT Seed のホバー時に、各コンテキスト (BW/BW2/Egg) の IV スプレッドを表示する。
 */

import { useMemo, type ReactElement, type ReactNode } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { type IvTooltipContext, type IvTooltipLabelKey, formatIvSpread } from '@/lib/iv-tooltip';
import { formatIvs } from '@/lib/format';
import { compute_iv_spread } from '@/wasm/wasm_pkg.js';
import { useUiStore } from '@/stores/settings/ui';

interface SeedIvTooltipProps {
  /** MT Seed (number)。LCG Seed の場合は呼び出し側で事前変換する */
  mtSeed: number;
  /** 表示するコンテキスト一覧 */
  contexts: IvTooltipContext[];
  /** ツールチップトリガーとなる子要素 */
  children: ReactNode;
}

function useTooltipLabels(): Record<IvTooltipLabelKey, string> {
  const { t } = useLingui();
  return useMemo(
    () => ({
      'bw-wild': t`BW Stationary/Wild (offset 0)`,
      'bw-roamer': t`BW Roamer (offset 1)`,
      'bw2-wild': t`BW2 Stationary/Wild (offset 2)`,
      egg: t`Egg (offset 7)`,
    }),
    [t]
  );
}

function SeedIvTooltip({ mtSeed, contexts, children }: SeedIvTooltipProps): ReactElement {
  const labels = useTooltipLabels();
  const language = useUiStore((s) => s.language);

  const entries = useMemo(
    () =>
      contexts.map((ctx) => {
        const ivs = compute_iv_spread(mtSeed, ctx.mtOffset, ctx.isRoamer);
        return {
          label: labels[ctx.labelKey],
          spread: formatIvSpread(ivs, language),
          pattern: formatIvs(ivs),
        };
      }),
    [mtSeed, contexts, labels, language]
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="space-y-1 text-left">
        {entries.map((entry) => (
          <div key={entry.label} className="space-y-0.5">
            <div className="text-xs font-semibold leading-tight">{entry.label}</div>
            <div className="font-mono text-xs leading-tight">{entry.spread}</div>
            <div className="font-mono text-[10px] leading-tight text-muted-foreground">
              {entry.pattern}
            </div>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

export { SeedIvTooltip };
export type { SeedIvTooltipProps };
