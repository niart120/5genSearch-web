/**
 * 孵化検索結果詳細ダイアログ
 *
 * EggDatetimeSearchResult の詳細を表示する Radix Dialog。
 * 起動条件 + 個体データ + 検索情報を表示し、各値にコピーボタンを付ける。
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { ClipboardCopy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/data-display/detail-row';
import {
  toBigintHex,
  toHex,
  formatDatetime,
  formatKeyCode,
  formatGender,
  formatShinyDetailed,
  formatAbilitySlot,
} from '@/lib/format';
import { getNatureName, getStatLabel, IV_STAT_KEYS } from '@/lib/game-data-names';
import { useSearchResultsStore } from '@/stores/search/results';
import { useUiStore } from '@/stores/settings/ui';
import type { EggDatetimeSearchResult } from '@/wasm/wasm_pkg.js';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: EggDatetimeSearchResult | undefined;
}

function ResultDetailDialog({ open, onOpenChange, result }: ResultDetailDialogProps) {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  if (!result) return;

  const { egg } = result;
  const startup = 'Startup' in egg.source ? egg.source.Startup : undefined;
  const seed = 'Seed' in egg.source ? egg.source.Seed : undefined;

  const baseSeed = startup?.base_seed ?? seed?.base_seed;
  const ivs = egg.core.ivs;
  const ivsStr = IV_STAT_KEYS.map((key) => `${getStatLabel(key, language)}:${ivs[key]}`).join(' ');

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
              <DetailRow label={t`Key input`} value={formatKeyCode(startup.condition.key_code)} />
            </>
          )}
          {baseSeed !== undefined && (
            <DetailRow label="Base Seed" value={toBigintHex(baseSeed, 16)} />
          )}

          {/* 個体データ */}
          <DetailRow label="IV" value={ivsStr} />
          <DetailRow label={t`Nature`} value={getNatureName(egg.core.nature, language)} />
          <DetailRow label={t`Ability`} value={formatAbilitySlot(egg.core.ability_slot)} />
          <DetailRow label={t`Gender`} value={formatGender(egg.core.gender)} />
          <DetailRow label={t`Shiny`} value={formatShinyDetailed(egg.core.shiny_type)} />

          {/* 検索情報 */}
          <DetailRow label={t`Advance`} value={String(egg.advance)} />
          <DetailRow
            label={t`Margin frames`}
            value={egg.margin_frames === undefined ? '-' : String(egg.margin_frames)}
          />
        </div>

        {/* Seed 入力に転記 */}
        <div className="flex flex-col gap-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              useSearchResultsStore.getState().setPendingDetailOrigin(egg.source);
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
