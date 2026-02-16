/**
 * タマゴ個体生成結果詳細ダイアログ
 *
 * UiEggData の全フィールドを表示する Radix Dialog。
 */

import { type ReactElement } from 'react';
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
import { useUiStore } from '@/stores/settings/ui';
import type { UiEggData } from '@/wasm/wasm_pkg.js';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: UiEggData | undefined;
}

function ResultDetailDialog({
  open,
  onOpenChange,
  result,
}: ResultDetailDialogProps): ReactElement | undefined {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  if (!result) return;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Result details</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Egg generation result details</Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {/* Seed 情報 */}
          <DetailRow label="Base Seed" value={result.base_seed} />
          <DetailRow label="MT Seed" value={result.mt_seed} />
          {result.datetime_iso !== undefined && (
            <DetailRow label={t`Date/Time`} value={result.datetime_iso} />
          )}
          {result.timer0 !== undefined && <DetailRow label="Timer0" value={result.timer0} />}
          {result.vcount !== undefined && <DetailRow label="VCount" value={result.vcount} />}
          {result.key_input !== undefined && (
            <DetailRow label={t`Key input`} value={result.key_input} />
          )}

          {/* 個体データ */}
          <DetailRow label={t`Needle`} value={getNeedleArrow(result.needle_direction)} />
          <DetailRow label={t`Species`} value={result.species_name ?? '-'} />
          <DetailRow label={t`Nature`} value={result.nature_name} />
          <DetailRow label={t`Ability`} value={result.ability_name} />
          <DetailRow label={t`Gender`} value={result.gender_symbol} />
          <DetailRow label={t`Shiny`} value={result.shiny_symbol || '-'} />
          <DetailRow
            label="IV"
            value={result.ivs
              .map((v, i) => `${getStatLabel(IV_STAT_KEYS[i], language)}:${v}`)
              .join(' ')}
          />
          <DetailRow
            label={t`Stats`}
            value={result.stats
              .map((v, i) => `${getStatLabel(IV_STAT_KEYS[i], language)}:${v}`)
              .join(' ')}
          />
          <DetailRow
            label={t`Hidden Power`}
            value={`${result.hidden_power_type} (${result.hidden_power_power})`}
          />
          <DetailRow label="PID" value={result.pid} />

          {/* 孵化情報 */}
          <DetailRow label={t`Advance`} value={String(result.advance)} />
          {result.margin_frames !== undefined && (
            <DetailRow label={t`Margin frames`} value={String(result.margin_frames)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ResultDetailDialog };
export type { ResultDetailDialogProps };
