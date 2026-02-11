/**
 * ポケモンフィルター入力フォーム
 *
 * PokemonFilter の入力 UI。折りたたみ可能で、デフォルトは閉じた状態。
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { NatureSelect } from '@/components/forms/nature-select';
import { cn } from '@/lib/utils';
import { initMainThreadWasm } from '@/services/wasm-init';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';
import type {
  PokemonFilter,
  IvFilter,
  Nature,
  Gender,
  AbilitySlot,
  ShinyFilter,
} from '@/wasm/wasm_pkg.js';
import { useUiStore } from '@/stores/settings/ui';

interface PokemonFilterFormProps {
  value: PokemonFilter | undefined;
  onChange: (filter: PokemonFilter | undefined) => void;
  availableSpecies: EncounterSpeciesOption[];
  disabled?: boolean;
}

const DEFAULT_IV_FILTER: IvFilter = {
  hp: [0, 31],
  atk: [0, 31],
  def: [0, 31],
  spa: [0, 31],
  spd: [0, 31],
  spe: [0, 31],
};

const DEFAULT_FILTER: PokemonFilter = {
  iv: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  species_ids: undefined,
  level_range: undefined,
};

function PokemonFilterForm({
  value,
  onChange,
  availableSpecies,
  disabled,
}: PokemonFilterFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const [isOpen, setIsOpen] = useState(false);

  const filter = value ?? DEFAULT_FILTER;

  // species 名前解決 (WASM 経由)
  const [speciesNames, setSpeciesNames] = useState<Map<number, string>>(new Map());

  // availableSpecies が変わったら名前を解決
  useMemo(() => {
    const ids = availableSpecies.map((s) => s.speciesId);
    if (ids.length === 0) {
      setSpeciesNames(new Map());
      return;
    }
    void initMainThreadWasm().then(async () => {
      const { get_species_name } = await import('@/wasm/wasm_pkg.js');
      const map = new Map<number, string>();
      for (const id of ids) {
        map.set(id, get_species_name(id, language));
      }
      setSpeciesNames(map);
    });
  }, [availableSpecies, language]);

  const update = useCallback(
    (partial: Partial<PokemonFilter>) => {
      const updated = { ...filter, ...partial };
      const hasAny =
        updated.iv !== undefined ||
        (updated.natures !== undefined && updated.natures.length > 0) ||
        updated.gender !== undefined ||
        updated.ability_slot !== undefined ||
        updated.shiny !== undefined ||
        (updated.species_ids !== undefined && updated.species_ids.length > 0) ||
        updated.level_range !== undefined;
      onChange(hasAny ? updated : undefined);
    },
    [filter, onChange]
  );

  const handleIvChange = useCallback(
    (ivs: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>) => {
      const allDefault =
        ivs.hp[0] === 0 &&
        ivs.hp[1] === 31 &&
        ivs.atk[0] === 0 &&
        ivs.atk[1] === 31 &&
        ivs.def[0] === 0 &&
        ivs.def[1] === 31 &&
        ivs.spa[0] === 0 &&
        ivs.spa[1] === 31 &&
        ivs.spd[0] === 0 &&
        ivs.spd[1] === 31 &&
        ivs.spe[0] === 0 &&
        ivs.spe[1] === 31;
      update({ iv: allDefault ? undefined : { ...DEFAULT_IV_FILTER, ...ivs } });
    },
    [update]
  );

  const handleNaturesChange = useCallback(
    (natures: Nature[]) => {
      update({ natures: natures.length > 0 ? natures : undefined });
    },
    [update]
  );

  const handleGenderChange = useCallback(
    (gender: string) => {
      update({ gender: gender === '__none__' ? undefined : (gender as Gender) });
    },
    [update]
  );

  const handleAbilitySlotChange = useCallback(
    (slot: string) => {
      update({
        ability_slot: slot === '__none__' ? undefined : (slot as AbilitySlot),
      });
    },
    [update]
  );

  const handleShinyChange = useCallback(
    (checked: boolean) => {
      update({ shiny: checked ? ('Shiny' as ShinyFilter) : undefined });
    },
    [update]
  );

  const handleSpeciesToggle = useCallback(
    (speciesId: number, checked: boolean) => {
      const current = filter.species_ids ?? [];
      const next = checked ? [...current, speciesId] : current.filter((id) => id !== speciesId);
      update({ species_ids: next.length > 0 ? next : undefined });
    },
    [filter.species_ids, update]
  );

  const ivValue = filter.iv ?? DEFAULT_IV_FILTER;

  // 種族選択用のソートされたリスト (重複排除)
  const uniqueSpecies = useMemo(() => {
    const seen = new Set<number>();
    return availableSpecies.filter((s) => {
      if (seen.has(s.speciesId)) return false;
      seen.add(s.speciesId);
      return true;
    });
  }, [availableSpecies]);

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <ChevronDown className={cn('size-4 transition-transform', !isOpen && '-rotate-90')} />
        <Trans>Filter (optional)</Trans>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 pl-1">
          {/* IV フィルター */}
          <IvRangeInput value={ivValue} onChange={handleIvChange} disabled={disabled} />

          {/* 性格 */}
          <NatureSelect
            value={filter.natures ?? []}
            onChange={handleNaturesChange}
            disabled={disabled}
          />

          {/* 性別 */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Gender</Trans>
            </Label>
            <Select
              value={filter.gender ?? '__none__'}
              onValueChange={handleGenderChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t`Not specified`}</SelectItem>
                <SelectItem value="Male">♂</SelectItem>
                <SelectItem value="Female">♀</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 特性スロット */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Ability slot</Trans>
            </Label>
            <Select
              value={filter.ability_slot ?? '__none__'}
              onValueChange={handleAbilitySlotChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t`Not specified`}</SelectItem>
                <SelectItem value="First">{t`Ability 1`}</SelectItem>
                <SelectItem value="Second">{t`Ability 2`}</SelectItem>
                <SelectItem value="Hidden">{t`Hidden Ability`}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 色違い */}
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={filter.shiny !== undefined}
              onCheckedChange={(checked) => handleShinyChange(checked === true)}
              disabled={disabled}
            />
            <Trans>Shiny only</Trans>
          </label>

          {/* 種族フィルタ */}
          {uniqueSpecies.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">
                <Trans>Species filter</Trans>
              </Label>
              <div className="flex max-h-32 flex-col gap-0.5 overflow-y-auto rounded-sm border border-input p-1">
                {uniqueSpecies.map((s) => {
                  const name = speciesNames.get(s.speciesId) ?? `#${s.speciesId}`;
                  const checked = filter.species_ids?.includes(s.speciesId) ?? false;
                  return (
                    <label key={s.speciesId} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => handleSpeciesToggle(s.speciesId, c === true)}
                        disabled={disabled}
                      />
                      {name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export { PokemonFilterForm };
export type { PokemonFilterFormProps };
