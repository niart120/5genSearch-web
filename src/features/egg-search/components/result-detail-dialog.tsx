/**
 * 孵化検索結果詳細ダイアログ
 *
 * EggDatetimeSearchResult の詳細を表示する Radix Dialog。
 * 起動条件 + 個体データ + 検索情報を表示し、各値にコピーボタンを付ける。
 */

import { useCallback } from 'react';
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
import { toBigintHex, toHex, formatDatetime, formatKeyCode } from '@/lib/format';
import { getNatureName } from '@/lib/game-data-names';
import { useUiStore } from '@/stores/settings/ui';
import type { EggDatetimeSearchResult, AbilitySlot, Gender, ShinyType } from '@/wasm/wasm_pkg.js';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: EggDatetimeSearchResult | undefined;
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
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
      return '-';
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

function ResultDetailDialog({ open, onOpenChange, result }: ResultDetailDialogProps) {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  if (!result) return;

  const { egg } = result;
  const startup = 'Startup' in egg.source ? egg.source.Startup : undefined;
  const seed = 'Seed' in egg.source ? egg.source.Seed : undefined;

  const baseSeed = startup?.base_seed ?? seed?.base_seed;
  const ivs = egg.core.ivs;
  const ivsStr = `${ivs.hp}-${ivs.atk}-${ivs.def}-${ivs.spa}-${ivs.spd}-${ivs.spe}`;

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
          <DetailRow label={t`Shiny`} value={formatShiny(egg.core.shiny_type)} />

          {/* 検索情報 */}
          <DetailRow label={t`Advance`} value={String(egg.advance)} />
          <DetailRow
            label={t`Margin frames`}
            value={egg.margin_frames === undefined ? '-' : String(egg.margin_frames)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ResultDetailDialog };
export type { ResultDetailDialogProps };
