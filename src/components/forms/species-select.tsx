import { useMemo } from 'react';
import { Trans } from '@lingui/react/macro';
import { ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';

/** 種族選択 Popover (NatureSelect 風) */
function SpeciesSelect({
  uniqueSpecies,
  speciesNames,
  selectedIds,
  onToggle,
  disabled,
}: {
  uniqueSpecies: EncounterSpeciesOption[];
  speciesNames: Map<number, string>;
  selectedIds: number[];
  onToggle: (speciesId: number, checked: boolean) => void;
  disabled?: boolean;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const label =
    selectedIds.length === 0 ? (
      <Trans>Not specified</Trans>
    ) : (
      <Trans>{selectedIds.length} selected</Trans>
    );

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        <Trans>Species</Trans>
      </Label>
      <Popover.Root>
        <Popover.Trigger asChild disabled={disabled}>
          <Button
            variant="outline"
            className="h-8 w-full justify-between text-xs"
            aria-label="species-select-trigger"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={cn(
              'z-50 max-h-64 overflow-y-auto rounded-sm border border-border bg-card p-3 shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
            sideOffset={4}
            align="start"
          >
            <div className="flex flex-col gap-1">
              {uniqueSpecies.map((s) => {
                const name = speciesNames.get(s.speciesId) ?? `#${s.speciesId}`;
                return (
                  <label
                    key={s.speciesId}
                    className="flex cursor-pointer items-center gap-2 text-xs"
                  >
                    <Checkbox
                      checked={selectedSet.has(s.speciesId)}
                      onCheckedChange={(c) => onToggle(s.speciesId, c === true)}
                      className="size-3.5"
                    />
                    {name}
                  </label>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export { SpeciesSelect };
