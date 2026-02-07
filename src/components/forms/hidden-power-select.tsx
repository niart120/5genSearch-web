import * as React from 'react';
import { Trans } from '@lingui/react/macro';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { HIDDEN_POWER_ORDER, getHiddenPowerName } from '@/lib/game-data-names';
import { useUiStore } from '@/stores/settings/ui';
import type { HiddenPowerType } from '@/wasm/wasm_pkg';

interface HiddenPowerSelectProps {
  /** 選択中のめざパタイプリスト (空配列 = 条件なし) */
  value: HiddenPowerType[];
  /** 値変更コールバック */
  onChange: (value: HiddenPowerType[]) => void;
  /** 無効化 */
  disabled?: boolean;
}

function HiddenPowerSelect({ value, onChange, disabled }: HiddenPowerSelectProps) {
  const language = useUiStore((s) => s.language);
  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggleType = (type: HiddenPowerType) => {
    if (selectedSet.has(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  const selectAll = () => onChange([...HIDDEN_POWER_ORDER]);
  const clearAll = () => onChange([]);

  const triggerLabel =
    value.length === 0 ? <Trans>指定なし</Trans> : <Trans>{value.length}件選択中</Trans>;

  return (
    <Popover.Root>
      <Popover.Trigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label="hidden-power-select-trigger"
        >
          <span className="truncate">
            <Trans>めざパ</Trans> ({triggerLabel})
          </span>
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
          <div className="mb-2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} type="button">
              <Trans>全選択</Trans>
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} type="button">
              <Trans>全解除</Trans>
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {HIDDEN_POWER_ORDER.map((type) => (
              <label
                key={type}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs',
                  'hover:bg-accent/10',
                  selectedSet.has(type) && 'bg-accent/5'
                )}
              >
                <Checkbox
                  checked={selectedSet.has(type)}
                  onCheckedChange={() => toggleType(type)}
                  className="size-3.5"
                />
                <span className="whitespace-nowrap">{getHiddenPowerName(type, language)}</span>
              </label>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export type { HiddenPowerSelectProps };
export { HiddenPowerSelect };
