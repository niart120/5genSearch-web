import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { NatureSelect } from '@/components/forms/nature-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { StatsFixedInput } from '@/components/forms/stats-fixed-input';
import { IvFilterFields } from '@/components/forms/iv-filter-fields';
import {
  getWonderCardFilterVisibility,
  DEFAULT_IV_RANGES,
  type WonderCardFilterContext,
  type WonderCardFilterInput,
} from '@/lib/search-filter-context';
import { cn } from '@/lib/utils';
import type { StatsFilter } from '@/wasm/wasm_pkg.js';
import type { WonderCardFormState } from '../types';

const DEFAULT_FILTER: WonderCardFilterInput = {
  iv: undefined,
  stats: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
};
const DEFAULT_STATS: StatsFilter = {
  hp: undefined,
  atk: undefined,
  def: undefined,
  spa: undefined,
  spd: undefined,
  spe: undefined,
};

interface WonderCardFilterFormProps {
  value: WonderCardFormState;
  onChange: (partial: Partial<WonderCardFormState>) => void;
  context: WonderCardFilterContext | undefined;
  disabled?: boolean;
}

export function WonderCardFilterForm({
  value,
  onChange,
  context,
  disabled,
}: WonderCardFilterFormProps) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const filter = value.filter ?? DEFAULT_FILTER;
  const enabled = filter.enabled !== false;
  const filterDisabled = disabled || !enabled;
  const visible = getWonderCardFilterVisibility(context);
  const update = (partial: Partial<WonderCardFilterInput>) =>
    onChange({ filter: { ...filter, ...partial } });
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-1 text-sm font-medium"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90')} />
          <Trans>Filter</Trans>
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={(enabled) => update({ enabled })}
          disabled={disabled}
          aria-label={t`Enable filter`}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => onChange({ filter: undefined, statsFilter: undefined })}
          disabled={disabled}
          aria-label={t`Reset filter`}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      {open ? (
        <div className={cn('flex flex-col gap-3 pl-1', filterDisabled && 'opacity-50')}>
          {value.statMode === 'stats' ? (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">
                <Trans>Stats filter</Trans>
              </Label>
              <StatsFixedInput
                value={value.statsFilter ?? DEFAULT_STATS}
                onChange={(statsFilter) => onChange({ statsFilter })}
                disabled={filterDisabled}
              />
            </div>
          ) : (
            <IvFilterFields
              value={filter.iv ?? DEFAULT_IV_RANGES}
              onChange={(iv) => update({ iv })}
              disabled={filterDisabled}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            {visible.ability ? (
              <AbilitySlotSelect
                value={filter.ability_slot}
                onChange={(ability_slot) => update({ ability_slot })}
                disabled={filterDisabled}
              />
            ) : undefined}
            {visible.gender ? (
              <GenderSelect
                value={filter.gender}
                onChange={(gender) => update({ gender })}
                disabled={filterDisabled}
              />
            ) : undefined}
            {visible.nature ? (
              <NatureSelect
                value={filter.natures ?? []}
                onChange={(natures) => update({ natures })}
                disabled={filterDisabled}
              />
            ) : undefined}
            {visible.shiny ? (
              <ShinySelect
                value={filter.shiny}
                onChange={(shiny) => update({ shiny })}
                disabled={filterDisabled}
              />
            ) : undefined}
          </div>
        </div>
      ) : undefined}
    </section>
  );
}
