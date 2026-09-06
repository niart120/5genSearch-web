import { useMemo } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NatureSelect } from '@/components/forms/nature-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { LevelRangeInput } from '@/components/forms/level-range-input';
import { SpeciesSelect } from '@/components/forms/species-select';
import { get_species_name } from '@/wasm/wasm_pkg.js';
import type { PokemonDatetimeSearchFilter } from '@/wasm/wasm_pkg.js';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';
import { useUiStore } from '@/stores/settings/ui';
import { EMPTY_POKEMON_SEARCH_FILTER } from '../types';

export function PokemonSearchFilterForm({
  value,
  onChange,
  availableSpecies,
  disabled,
}: {
  value: PokemonDatetimeSearchFilter;
  onChange: (value: PokemonDatetimeSearchFilter) => void;
  availableSpecies: EncounterSpeciesOption[];
  disabled?: boolean;
}) {
  const { t } = useLingui();
  const language = useUiStore((state) => state.language);
  const species = useMemo(
    () => [...new Map(availableSpecies.map((item) => [item.speciesId, item])).values()],
    [availableSpecies]
  );
  const names = useMemo(
    () =>
      new Map(species.map((item) => [item.speciesId, get_species_name(item.speciesId, language)])),
    [species, language]
  );
  const update = (partial: Partial<PokemonDatetimeSearchFilter>) =>
    onChange({ ...value, ...partial });
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          <Trans>Filters</Trans>
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => onChange({ ...EMPTY_POKEMON_SEARCH_FILTER })}
          disabled={disabled}
          aria-label={t`Reset filter`}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ShinySelect
          value={value.shiny}
          onChange={(shiny) => update({ shiny })}
          disabled={disabled}
        />
        <NatureSelect
          value={value.natures ?? []}
          onChange={(natures) => update({ natures: natures.length > 0 ? natures : undefined })}
          disabled={disabled}
        />
        <GenderSelect
          value={value.gender}
          onChange={(gender) => update({ gender })}
          disabled={disabled}
        />
        <AbilitySlotSelect
          value={value.ability_slot}
          onChange={(ability_slot) => update({ ability_slot })}
          disabled={disabled}
        />
        <LevelRangeInput
          value={value.level_range}
          onChange={(level_range) => update({ level_range })}
          disabled={disabled}
        />
      </div>
      <SpeciesSelect
        uniqueSpecies={species}
        speciesNames={names}
        selectedIds={value.species_ids ?? []}
        onToggle={(id, checked) => {
          const ids = value.species_ids ?? [];
          const next = checked ? [...ids, id] : ids.filter((item) => item !== id);
          update({ species_ids: next.length > 0 ? next : undefined });
        }}
        disabled={disabled}
      />
    </section>
  );
}
