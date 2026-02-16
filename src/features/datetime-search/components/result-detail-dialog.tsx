/**
 * 結果詳細ダイアログ
 *
 * SeedOrigin の詳細を表示する Radix Dialog。
 * 各値にコピーボタンを付ける。
 */

import { useCallback, useMemo } from 'react';
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
import { SeedIvTooltip } from '@/components/data-display/seed-iv-tooltip';
import { getStandardContexts } from '@/lib/iv-tooltip';
import { toBigintHex, toHex, formatDatetime, formatKeyCode } from '@/lib/format';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';

interface ResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedOrigin: SeedOrigin | undefined;
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

function ResultDetailDialog({ open, onOpenChange, seedOrigin }: ResultDetailDialogProps) {
  const { t } = useLingui();
  const { config } = useDsConfigReadonly();
  const contexts = useMemo(() => getStandardContexts(config.version), [config.version]);

  if (!seedOrigin) return;

  const startup = 'Startup' in seedOrigin ? seedOrigin.Startup : undefined;
  const seed = 'Seed' in seedOrigin ? seedOrigin.Seed : undefined;

  const baseSeed = startup?.base_seed ?? seed?.base_seed;
  const mtSeed = startup?.mt_seed ?? seed?.mt_seed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Result details</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Startup condition details</Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
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
          {mtSeed !== undefined && (
            <SeedIvTooltip mtSeed={mtSeed} contexts={contexts}>
              <div>
                <DetailRow label="MT Seed" value={toHex(mtSeed, 8)} />
              </div>
            </SeedIvTooltip>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ResultDetailDialog };
export type { ResultDetailDialogProps };
