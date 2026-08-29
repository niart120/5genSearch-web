/**
 * 孵化検索結果詳細ダイアログ
 *
 * EggSearchResultView の詳細を表示する Radix Dialog。
 * 起動条件 + 個体データ + 検索情報を表示し、各値にコピーボタンを付ける。
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { ClipboardCopy } from 'lucide-react';
import { toast } from '@/components/ui/toast-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/data-display/detail-row';
import { toBigintHex, toHex, formatDatetime, formatKeyMask } from '@/lib/format';
import { getStatLabel, IV_STAT_KEYS } from '@/lib/game-data-names';
import { useSearchResultsStore } from '@/stores/search/results';
import { useUiStore } from '@/stores/settings/ui';
import type { EggSearchResultView } from '@/lib/result-view';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: EggSearchResultView | undefined;
}

function ResultDetailDialog({ open, onOpenChange, result }: ResultDetailDialogProps) {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  if (!result) return;

  const { egg } = result.raw;
  const { ui } = result;
  const startup = 'Startup' in egg.source ? egg.source.Startup : undefined;
  const seed = 'Seed' in egg.source ? egg.source.Seed : undefined;

  const baseSeed = startup?.base_seed ?? seed?.base_seed;
  const ivsStr = ui.ivs
    .map((value, index) => `${getStatLabel(IV_STAT_KEYS[index], language)}:${value}`)
    .join(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Result details</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Egg search result details</Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          {/* 起動条件 */}
          {startup && (
            <>
              <DetailRow label={t`Date/Time`} value={formatDatetime(startup.datetime)} />
              <DetailRow label="Timer0" value={toHex(startup.condition.timer0, 4)} />
              <DetailRow label="VCount" value={toHex(startup.condition.vcount, 2)} />
              <DetailRow label={t`Key input`} value={formatKeyMask(startup.condition.key_mask)} />
            </>
          )}
          {baseSeed !== undefined && (
            <DetailRow label={t`LCG Seed`} value={toBigintHex(baseSeed, 16)} />
          )}

          {/* 個体データ */}
          <DetailRow label="IV" value={ivsStr} />
          <DetailRow label={t`Nature`} value={ui.nature_name} />
          <DetailRow label={t`Ability`} value={ui.ability_name} />
          <DetailRow label={t`Gender`} value={ui.gender_symbol} />
          <DetailRow label={t`Shiny`} value={ui.shiny_symbol || '-'} />

          {/* 検索情報 */}
          <DetailRow label={t`Advance`} value={String(ui.advance)} />
          <DetailRow
            label={t`Margin frames`}
            value={ui.margin_frames === undefined ? '-' : String(ui.margin_frames)}
          />
        </div>

        {/* Seed 入力に転記 */}
        <div className="flex flex-col gap-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              useSearchResultsStore.getState().setPendingDetailOrigin(egg.source);
              toast.success(t`Copied to seed input`);
            }}
          >
            <ClipboardCopy className="mr-1 size-3" />
            <Trans>Copy to seed input</Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ResultDetailDialog };
export type { ResultDetailDialogProps };
