import { SpeciesSelect } from '@/components/forms/species-select';
/**
 * ポケモンフィルター入力フォーム
 *
 * PokemonFilter (WASM 用) と StatsFilter (WASM 用) の入力 UI。
 * フィルター有効/無効トグル、リセットボタン付き。
 * statMode に応じて IV / 実ステータスフィルターを切り替える。
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { NatureSelect } from '@/components/forms/nature-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { StatsFixedInput } from '@/components/forms/stats-fixed-input';
import { LevelRangeInput } from '@/components/forms/level-range-input';
import { EncounterResultSelect } from '@/components/forms/encounter-result-select';
import { cn } from '@/lib/utils';
import { IvFilterFields } from '@/components/forms/iv-filter-fields';
import {
  getPokemonFilterVisibility,
  type PokemonFilterInput as PokemonFilter,
} from '@/lib/search-filter-context';

import { get_species_name } from '@/wasm/wasm_pkg.js';
import { useUiStore } from '@/stores/settings/ui';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';
import type { IvFilter, StatsFilter, EncounterType, EncounterSlotConfig } from '@/wasm/wasm_pkg.js';
import type { StatDisplayMode } from '@/lib/game-data-names';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PokemonFilterFormProps {
  value: PokemonFilter | undefined;
  onChange: (filter?: PokemonFilter) => void;
  statsFilter: StatsFilter | undefined;
  onStatsFilterChange: (filter?: StatsFilter) => void;
  statMode: StatDisplayMode;
  availableSpecies: EncounterSpeciesOption[];
  encounterType: EncounterType;
  slots?: EncounterSlotConfig[];
  syncKey?: number;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_IV_FILTER: IvFilter = {
  hp: [0, 31],
  atk: [0, 31],
  def: [0, 31],
  spa: [0, 31],
  spd: [0, 31],
  spe: [0, 31],
};

const DEFAULT_STATS_FILTER: StatsFilter = {
  hp: undefined,
  atk: undefined,
  def: undefined,
  spa: undefined,
  spd: undefined,
  spe: undefined,
};

const DEFAULT_FILTER: PokemonFilter = {
  iv: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  species_ids: undefined,
  level_range: undefined,
  held_item_slots: undefined,
  encounter_result_filter: undefined,
  special_encounter_triggered: undefined,
  stats: undefined,
};

// ---------------------------------------------------------------------------
function PokemonFilterForm({
  value,
  onChange,
  statsFilter,
  onStatsFilterChange,
  statMode,
  availableSpecies,
  encounterType,
  slots = [],
  disabled,
}: PokemonFilterFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const [isOpen, setIsOpen] = useState(false);

  const internalFilter = value ?? DEFAULT_FILTER;
  const internalStats = statsFilter ?? DEFAULT_STATS_FILTER;
  const filterEnabled = internalFilter.enabled !== false;
  const visible = getPokemonFilterVisibility(
    { encounterType, slots },
    internalFilter.encounter_result_filter
  );
  // species 名前解決 (WASM 経由)
  const speciesIds = useMemo(() => availableSpecies.map((s) => s.speciesId), [availableSpecies]);
  const effectiveSpeciesNames = useMemo(() => {
    if (speciesIds.length === 0) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const id of speciesIds) {
      map.set(id, get_species_name(id, language));
    }
    return map;
  }, [speciesIds, language]);

  const updateFilter = useCallback(
    (partial: Partial<PokemonFilter>) => {
      onChange({ ...internalFilter, ...partial });
    },
    [internalFilter, onChange]
  );
  const updateStats = onStatsFilterChange;
  const handleToggleEnabled = (enabled: boolean) => updateFilter({ enabled });
  const handleReset = () => {
    onChange();
    onStatsFilterChange();
  };
  const handleSpeciesToggle = (speciesId: number, checked: boolean) => {
    const ids = internalFilter.species_ids ?? [];
    const next = checked ? [...ids, speciesId] : ids.filter((id) => id !== speciesId);
    updateFilter({ species_ids: next.length > 0 ? next : undefined });
  };
  const ivValue = internalFilter.iv ?? DEFAULT_IV_FILTER;

  // 種族選択用 (重複排除)
  const uniqueSpecies = useMemo(() => {
    const seen = new Set<number>();
    return availableSpecies.filter((s) => {
      if (seen.has(s.speciesId)) return false;
      seen.add(s.speciesId);
      return true;
    });
  }, [availableSpecies]);

  const filterDisabled = disabled || !filterEnabled;

  return (
    <section className="flex flex-col gap-2">
      {/* ヘッダー: 開閉 + 有効トグル + リセット */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-1 text-sm font-medium"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <ChevronDown className={cn('size-4 transition-transform', !isOpen && '-rotate-90')} />
          <Trans>Filter</Trans>
        </button>
        <Switch
          id="filter-enabled-toggle"
          checked={filterEnabled}
          onCheckedChange={handleToggleEnabled}
          disabled={disabled}
          aria-label={t`Enable filter`}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleReset}
          disabled={disabled}
          aria-label={t`Reset filter`}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>

      {isOpen && (
        <div className={cn('flex flex-col gap-3 pl-1', filterDisabled && 'opacity-50')}>
          {/* 1a. 実ステータスフィルター (Stats モード時) */}
          {visible.pokemon && statMode === 'stats' && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">
                <Trans>Stats filter</Trans>
              </Label>
              <StatsFixedInput
                value={internalStats}
                onChange={updateStats}
                disabled={filterDisabled}
              />
            </div>
          )}

          {/* 1b. IV フィルター (IV モード時) */}
          {visible.pokemon && statMode === 'ivs' && (
            <IvFilterFields
              value={ivValue}
              onChange={(iv) => updateFilter({ iv })}
              disabled={filterDisabled}
            />
          )}

          {/* 2-5. 個体属性系 (2列グリッド) */}
          <div className="grid grid-cols-2 gap-2">
            {visible.ability && (
              <AbilitySlotSelect
                showHidden={false}
                value={internalFilter.ability_slot}
                onChange={(ability_slot) => updateFilter({ ability_slot })}
                disabled={filterDisabled}
              />
            )}

            {visible.gender && (
              <GenderSelect
                value={internalFilter.gender}
                onChange={(gender) => updateFilter({ gender })}
                disabled={filterDisabled}
              />
            )}

            {visible.pokemon && (
              <NatureSelect
                value={internalFilter.natures ?? []}
                onChange={(natures) => updateFilter({ natures })}
                disabled={filterDisabled}
              />
            )}

            {visible.shiny && (
              <ShinySelect
                value={internalFilter.shiny}
                onChange={(shiny) => updateFilter({ shiny })}
                disabled={filterDisabled}
              />
            )}

            {/* レベル範囲 (min / max を2列に配置) */}
            {visible.level && (
              <LevelRangeInput
                enabled={internalFilter.levelEnabled ?? internalFilter.level_range !== undefined}
                onEnabledChange={(levelEnabled) =>
                  updateFilter({
                    levelEnabled,
                    level_range: internalFilter.level_range ?? [1, 100],
                  })
                }
                value={internalFilter.level_range}
                onChange={(level_range) => updateFilter({ level_range })}
                disabled={filterDisabled}
              />
            )}
          </div>

          {/* エンカウント系 (条件付き表示) */}
          {visible.species && uniqueSpecies.length > 0 && (
            <SpeciesSelect
              uniqueSpecies={uniqueSpecies}
              speciesNames={effectiveSpeciesNames}
              selectedIds={internalFilter.species_ids ?? []}
              onToggle={handleSpeciesToggle}
              disabled={filterDisabled}
            />
          )}

          {visible.encounterResult && (
            <EncounterResultSelect
              value={visible.appliedResult}
              onChange={(encounter_result_filter) => updateFilter({ encounter_result_filter })}
              encounterType={encounterType}
              disabled={filterDisabled}
            />
          )}

          {visible.special ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                id="special-encounter-triggered"
                checked={internalFilter.special_encounter_triggered === true}
                onCheckedChange={(checked) =>
                  updateFilter({ special_encounter_triggered: checked === true ? true : undefined })
                }
                disabled={filterDisabled}
              />
              <Trans>Special encounter only</Trans>
            </label>
          ) : undefined}
        </div>
      )}
    </section>
  );
}

export { PokemonFilterForm };
export type { PokemonFilterFormProps };
