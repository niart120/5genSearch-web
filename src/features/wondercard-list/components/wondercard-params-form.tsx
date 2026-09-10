import { useId, useMemo, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AdvanceRangeInput } from '@/components/forms/advance-range-input';
import { handleFocusSelectAll } from '@/components/forms/input-helpers';
import { getWonderCardDisplays } from '@/data/wondercards/display';
import { useUiStore } from '@/stores/settings/ui';
import { useTrainerStore } from '@/stores/settings/trainer';
import { cn } from '@/lib/utils';
import type { WonderCardFormState } from '../types';
import type { useWonderCardSelection } from '../hooks/use-wondercard-selection';

interface WonderCardParamsFormProps {
  value: WonderCardFormState;
  onChange: (partial: Partial<WonderCardFormState>) => void;
  selection: ReturnType<typeof useWonderCardSelection>;
  disabled?: boolean;
  syncKey?: number;
}

export function WonderCardParamsForm({
  value,
  onChange,
  selection,
  disabled,
  syncKey,
}: WonderCardParamsFormProps) {
  const { t } = useLingui();
  const id = useId();
  const [open, setOpen] = useState(false);
  const locale = useUiStore((s) => s.language);
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);
  const { setTid, setSid } = useTrainerStore.getState();
  const displays = useMemo(
    () => getWonderCardDisplays(selection.cards, locale),
    [selection.cards, locale]
  );
  const selected = displays.find((card) => card.id === value.cardId);
  const label = selected
    ? [selected.label, selected.trainerLabel, selected.disambiguationId].filter(Boolean).join(' ')
    : value.cardId || t`Select a Wonder Card`;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor={`${id}-card`} className="text-xs">
          <Trans>Wonder Card</Trans>
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={`${id}-card`}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-8 w-full min-w-0 justify-between text-xs font-normal"
              disabled={disabled || selection.loading}
              title={label}
            >
              <span className="truncate">
                {selection.loading ? t`Loading Wonder Cards...` : label}
              </span>
              <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder={t`Search Wonder Cards...`} />
              <CommandList>
                <CommandEmpty>{t`No Wonder Cards found`}</CommandEmpty>
                {displays.map((card) => (
                  <CommandItem
                    key={card.id}
                    value={card.id}
                    keywords={[card.label, card.trainerLabel ?? '', card.disambiguationId ?? '']}
                    onSelect={() => {
                      onChange({ cardId: card.id });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-3.5 shrink-0',
                        value.cardId === card.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block break-words">{card.label}</span>
                      {card.trainerLabel || card.disambiguationId ? (
                        <span className="block break-all text-xs text-muted-foreground">
                          {[card.trainerLabel, card.disambiguationId].filter(Boolean).join(' ')}
                        </span>
                      ) : undefined}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selection.error ? (
          <p role="alert" className="text-xs text-destructive">
            <Trans>Failed to load Wonder Cards</Trans>
          </p>
        ) : undefined}
        {selection.unavailable ? (
          <p role="alert" className="text-xs text-destructive">
            <Trans>
              This Wonder Card is unavailable for the selected ROM. Select another card.
            </Trans>
          </p>
        ) : undefined}
      </div>
      {selection.card?.kind === 'egg' ? (
        <fieldset className="grid grid-cols-2 gap-2" disabled={disabled}>
          <legend className="mb-1 text-xs font-medium">
            <Trans>Recipient</Trans>
          </legend>
          {[
            { key: 'tid', label: 'TID', value: tid, set: setTid },
            { key: 'sid', label: 'SID', value: sid, set: setSid },
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label htmlFor={`${id}-${field.key}`} className="text-xs">
                {field.label}
              </Label>
              <Input
                id={`${id}-${field.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={65_535}
                step={1}
                className="h-8 text-xs"
                value={field.value ?? ''}
                onFocus={handleFocusSelectAll}
                onChange={(e) =>
                  field.set(e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
            </div>
          ))}
        </fieldset>
      ) : undefined}
      <AdvanceRangeInput
        value={value.genConfig}
        onChange={(partial) => onChange({ genConfig: { ...value.genConfig, ...partial } })}
        disabled={disabled}
        syncKey={syncKey}
      />
    </section>
  );
}
