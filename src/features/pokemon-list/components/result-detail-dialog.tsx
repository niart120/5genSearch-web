/**
 * ポケモンリスト結果詳細ダイアログ
 *
 * UiPokemonData の全フィールドを表示する Radix Dialog。
 */

import { useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getNeedleArrow } from '@/lib/game-data-names';
import type { UiPokemonData } from '@/wasm/wasm_pkg.js';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: UiPokemonData | undefined;
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps): ReactElement {
  const { t } = useLingui();
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm">{value}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleCopy}
          aria-label={t`Copy ${label}`}
        >
          <Copy className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function ResultDetailDialog({
  open,
  onOpenChange,
  result,
}: ResultDetailDialogProps): ReactElement | undefined {
  const { t } = useLingui();

  if (!result) return;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Result details</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Pokemon generation result details</Trans>
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
          <DetailRow label={t`Species`} value={result.species_name} />
          <DetailRow label={t`Nature`} value={result.nature_name} />
          <DetailRow label={t`Ability`} value={result.ability_name} />
          <DetailRow label={t`Gender`} value={result.gender_symbol} />
          <DetailRow label={t`Shiny`} value={result.shiny_symbol || '-'} />
          <DetailRow
            label="IV"
            value={result.ivs.map((v, i) => `${['H', 'A', 'B', 'C', 'D', 'S'][i]}:${v}`).join(' ')}
          />
          <DetailRow
            label={t`Stats`}
            value={result.stats
              .map((v, i) => `${['H', 'A', 'B', 'C', 'D', 'S'][i]}:${v}`)
              .join(' ')}
          />
          <DetailRow
            label={t`Hidden Power`}
            value={`${result.hidden_power_type} (${result.hidden_power_power})`}
          />
          <DetailRow label="PID" value={result.pid} />
          <DetailRow label="Lv" value={String(result.level)} />
          <DetailRow label={t`Sync`} value={result.sync_applied ? '〇' : '×'} />
          {result.held_item_name !== undefined && (
            <DetailRow label={t`Held item`} value={result.held_item_name} />
          )}

          {/* エンカウント情報 */}
          <DetailRow label={t`Advance`} value={String(result.advance)} />
          {result.moving_encounter_guaranteed !== undefined && (
            <DetailRow label={t`Moving encounter`} value={result.moving_encounter_guaranteed} />
          )}
          {result.special_encounter_triggered !== undefined && (
            <DetailRow label={t`Special encounter`} value={result.special_encounter_triggered} />
          )}
          {result.special_encounter_direction !== undefined && (
            <DetailRow label={t`Special direction`} value={result.special_encounter_direction} />
          )}
          <DetailRow label={t`Encounter result`} value={result.encounter_result} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ResultDetailDialog };
export type { ResultDetailDialogProps };
