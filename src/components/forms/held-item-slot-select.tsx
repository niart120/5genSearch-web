/**
 * 持ち物スロット選択コンポーネント
 *
 * HeldItemSlot をチェックボックス形式で複数選択する。
 * エンカウント種別に応じて条件付き表示する想定。
 */

import { useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { HeldItemSlot } from '@/wasm/wasm_pkg.js';

interface HeldItemSlotSelectProps {
  value: HeldItemSlot[];
  onChange: (slots: HeldItemSlot[]) => void;
  disabled?: boolean;
}

const SLOTS: HeldItemSlot[] = ['Common', 'Rare', 'VeryRare', 'None'];

function HeldItemSlotSelect({ value, onChange, disabled }: HeldItemSlotSelectProps): ReactElement {
  const { t } = useLingui();

  const selectedSet = useMemo(() => new Set(value), [value]);

  const slotLabels: Record<HeldItemSlot, string> = useMemo(
    () => ({
      Common: t`Common (50%)`,
      Rare: t`Rare (5%)`,
      VeryRare: t`Very rare (1%)`,
      None: t`None`,
    }),
    [t]
  );

  const handleToggle = useCallback(
    (slot: HeldItemSlot, checked: boolean) => {
      const next = checked ? [...value, slot] : value.filter((s) => s !== slot);
      onChange(next);
    },
    [value, onChange]
  );

  const label =
    value.length === 0 ? <Trans>Not specified</Trans> : <Trans>{value.length} selected</Trans>;

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        <Trans>Held item</Trans>
      </Label>
      <Popover.Root>
        <Popover.Trigger asChild disabled={disabled}>
          <Button
            variant="outline"
            className="h-8 w-full justify-between text-xs"
            aria-label="held-item-slot-select-trigger"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={cn(
              'z-50 rounded-sm border border-border bg-card p-3 shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
            sideOffset={4}
            align="start"
          >
            <div className="flex flex-col gap-1">
              {SLOTS.map((slot) => (
                <label key={slot} className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    checked={selectedSet.has(slot)}
                    onCheckedChange={(c) => handleToggle(slot, c === true)}
                    className="size-3.5"
                  />
                  {slotLabels[slot]}
                </label>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export { HeldItemSlotSelect };
export type { HeldItemSlotSelectProps };
