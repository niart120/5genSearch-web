import { AdvanceTooltip, NeedleTooltip } from '@/components/data-display/rng-tooltips';
/**
 * 配達員の結果詳細ダイアログ
 *
 * WonderCardResultView の表示用フィールドを表示する Radix Dialog。
 */

import { type ReactElement, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DetailRow } from '@/components/data-display/detail-row';
import { getNeedleArrow, IV_STAT_KEYS, getStatLabel } from '@/lib/game-data-names';
import { formatDatetime } from '@/lib/format';
import { useUiStore } from '@/stores/settings/ui';
import type { WonderCardResultView } from '@/lib/result-view';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: WonderCardResultView | undefined;
  children?: ReactNode;
}

function ResultDetailDialog({
  open,
  onOpenChange,
  result,
  children,
}: ResultDetailDialogProps): ReactElement | undefined {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  if (!result) return;
  const ui = result.ui;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Result details</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Deliveryman generation result details</Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {/* Seed 情報 */}
          <DetailRow label={t`LCG Seed`} value={ui.base_seed} />
          {'Startup' in result.raw.source && (
            <DetailRow
              label={t`Date/Time`}
              value={formatDatetime(result.raw.source.Startup.datetime)}
            />
          )}
          {ui.timer0 !== undefined && <DetailRow label="Timer0" value={ui.timer0} />}
          {ui.vcount !== undefined && <DetailRow label="VCount" value={ui.vcount} />}
          {ui.key_input !== undefined && <DetailRow label={t`Key input`} value={ui.key_input} />}

          {/* 個体データ */}
          <DetailRow
            help={<NeedleTooltip />}
            label={t`Needle`}
            value={getNeedleArrow(ui.needle_direction)}
          />
          <DetailRow label={t`Species`} value={ui.species_name} />
          <DetailRow label={t`Nature`} value={ui.nature_name} />
          <DetailRow label={t`Ability`} value={ui.ability_name} />
          <DetailRow label={t`Gender`} value={ui.gender_symbol} />
          <DetailRow label={t`Shiny`} value={ui.shiny_symbol || '-'} />
          <DetailRow
            label="IV"
            value={ui.ivs
              .map((v, i) => `${getStatLabel(IV_STAT_KEYS[i], language)}:${v}`)
              .join(' ')}
          />
          <DetailRow
            label={t`Stats`}
            value={ui.stats
              .map((v, i) => `${getStatLabel(IV_STAT_KEYS[i], language)}:${v}`)
              .join(' ')}
          />
          <DetailRow
            label={t`Hidden Power`}
            value={`${ui.hidden_power_type} (${ui.hidden_power_power})`}
          />
          <DetailRow label="PID" value={ui.pid} />
          <DetailRow label="Lv" value={String(ui.level)} />
          <DetailRow help={<AdvanceTooltip />} label={t`Advance`} value={String(ui.advance)} />
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export { ResultDetailDialog };
export type { ResultDetailDialogProps };
