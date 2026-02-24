/**
 * ポケモンフィルター入力フォーム
 *
 * PokemonFilter (WASM 用) と StatsFilter (WASM 用) の入力 UI。
 * フィルター有効/無効トグル、リセットボタン付き。
 * statMode に応じて IV / 実ステータスフィルターを切り替える。
 */

import { useState, useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown, RotateCcw } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { NatureSelect } from '@/components/forms/nature-select';
import { HiddenPowerSelect } from '@/components/forms/hidden-power-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { StatsFixedInput } from '@/components/forms/stats-fixed-input';
import { LevelRangeInput } from '@/components/forms/level-range-input';
import { HeldItemSlotSelect } from '@/components/forms/held-item-slot-select';
import { EncounterResultSelect } from '@/components/forms/encounter-result-select';
import { cn } from '@/lib/utils';
import { IV_STAT_KEYS } from '@/lib/game-data-names';

import { get_species_name } from '@/wasm/wasm_pkg.js';
import { useUiStore } from '@/stores/settings/ui';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';
import type {
  PokemonFilter,
  IvFilter,
  Nature,
  Gender,
  AbilitySlot,
  ShinyFilter,
  HiddenPowerType,
  StatsFilter,
  EncounterType,
  EncounterResultFilter,
  HeldItemSlot,
} from '@/wasm/wasm_pkg.js';
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
  stats: undefined,
};

// ---------------------------------------------------------------------------
// Conditional display sets
// ---------------------------------------------------------------------------

const HELD_ITEM_ENCOUNTER_TYPES: Set<EncounterType> = new Set([
  'Surfing',
  'SurfingBubble',
  'Fishing',
  'FishingBubble',
  'ShakingGrass',
]);

const ENCOUNTER_RESULT_ENCOUNTER_TYPES: Set<EncounterType> = new Set([
  'DustCloud',
  'PokemonShadow',
  'Fishing',
]);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function PokemonFilterForm({
  value,
  onChange,
  statsFilter,
  onStatsFilterChange,
  statMode,
  availableSpecies,
  encounterType,
  disabled,
}: PokemonFilterFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const [isOpen, setIsOpen] = useState(false);

  // フィルター有効/無効トグル (内部状態を保持したまま切り替え)
  const [filterEnabled, setFilterEnabled] = useState(true);

  // 内部フィルタ状態 (トグル OFF 時も保持)
  const [internalFilter, setInternalFilter] = useState<PokemonFilter>(value ?? DEFAULT_FILTER);
  const [internalStats, setInternalStats] = useState<StatsFilter>(
    statsFilter ?? DEFAULT_STATS_FILTER
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

  // --- propagation helpers ---

  const hasAnyFilter = useCallback((f: PokemonFilter): boolean => {
    return (
      f.iv !== undefined ||
      (f.natures !== undefined && f.natures.length > 0) ||
      f.gender !== undefined ||
      f.ability_slot !== undefined ||
      f.shiny !== undefined ||
      (f.species_ids !== undefined && f.species_ids.length > 0) ||
      f.level_range !== undefined ||
      (f.held_item_slots !== undefined && f.held_item_slots.length > 0) ||
      f.encounter_result_filter !== undefined
    );
  }, []);

  const isStatsDefault = useCallback((s: StatsFilter): boolean => {
    return IV_STAT_KEYS.every((k) => s[k] === undefined);
  }, []);

  const propagate = useCallback(
    (f: PokemonFilter, s: StatsFilter, enabled: boolean) => {
      if (!enabled) {
        onChange();
        onStatsFilterChange();
        return;
      }
      onChange(hasAnyFilter(f) ? f : undefined);
      onStatsFilterChange(isStatsDefault(s) ? undefined : s);
    },
    [onChange, onStatsFilterChange, hasAnyFilter, isStatsDefault]
  );

  // --- 条件付き表示判定 ---

  const showHeldItem = HELD_ITEM_ENCOUNTER_TYPES.has(encounterType);
  const showEncounterResult = ENCOUNTER_RESULT_ENCOUNTER_TYPES.has(encounterType);

  // encounterType 変更時に非表示フィルタを undefined で伝播
  const prevEncounterType = useRef(encounterType);
  useEffect(() => {
    if (prevEncounterType.current === encounterType) return;
    prevEncounterType.current = encounterType;
    const nextHeldItem = HELD_ITEM_ENCOUNTER_TYPES.has(encounterType)
      ? internalFilter.held_item_slots
      : undefined;
    const nextEncResult = ENCOUNTER_RESULT_ENCOUNTER_TYPES.has(encounterType)
      ? internalFilter.encounter_result_filter
      : undefined;
    const next = {
      ...internalFilter,
      held_item_slots: nextHeldItem,
      encounter_result_filter: nextEncResult,
    };
    // 内部状態は保持し、親への伝播値のみ調整
    propagate(next, internalStats, filterEnabled);
  }, [encounterType, internalFilter, internalStats, filterEnabled, propagate]);

  // --- update helpers ---

  const updateFilter = useCallback(
    (partial: Partial<PokemonFilter>) => {
      const next = { ...internalFilter, ...partial };
      setInternalFilter(next);
      propagate(next, internalStats, filterEnabled);
    },
    [internalFilter, internalStats, filterEnabled, propagate]
  );

  const updateStats = useCallback(
    (next: StatsFilter) => {
      setInternalStats(next);
      propagate(internalFilter, next, filterEnabled);
    },
    [internalFilter, filterEnabled, propagate]
  );

  // --- handlers ---

  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      setFilterEnabled(checked);
      propagate(internalFilter, internalStats, checked);
    },
    [internalFilter, internalStats, propagate]
  );

  const handleReset = useCallback(() => {
    setInternalFilter(DEFAULT_FILTER);
    setInternalStats(DEFAULT_STATS_FILTER);
    onChange();
    onStatsFilterChange();
  }, [onChange, onStatsFilterChange]);

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
      // 既存の hidden_power 設定を保持
      const existingIv = internalFilter.iv;
      const nextIv =
        allDefault &&
        !existingIv?.hidden_power_types &&
        existingIv?.hidden_power_min_power === undefined
          ? undefined
          : {
              ...DEFAULT_IV_FILTER,
              ...ivs,
              hidden_power_types: existingIv?.hidden_power_types,
              hidden_power_min_power: existingIv?.hidden_power_min_power,
            };
      updateFilter({ iv: nextIv });
    },
    [internalFilter.iv, updateFilter]
  );

  const handleHiddenPowerTypesChange = useCallback(
    (types: HiddenPowerType[]) => {
      const existing = internalFilter.iv ?? DEFAULT_IV_FILTER;
      updateFilter({
        iv: {
          ...existing,
          hidden_power_types: types.length > 0 ? types : undefined,
        },
      });
    },
    [internalFilter.iv, updateFilter]
  );

  const handleHiddenPowerMinPowerChange = useCallback(
    (minPower?: number) => {
      const existing = internalFilter.iv ?? DEFAULT_IV_FILTER;
      updateFilter({
        iv: {
          ...existing,
          hidden_power_min_power: minPower,
        },
      });
    },
    [internalFilter.iv, updateFilter]
  );

  const handleAbilitySlotChange = useCallback(
    (slot: AbilitySlot | undefined) => {
      updateFilter({ ability_slot: slot });
    },
    [updateFilter]
  );

  const handleGenderChange = useCallback(
    (gender: Gender | undefined) => {
      updateFilter({ gender });
    },
    [updateFilter]
  );

  const handleNaturesChange = useCallback(
    (natures: Nature[]) => {
      updateFilter({ natures: natures.length > 0 ? natures : undefined });
    },
    [updateFilter]
  );

  const handleShinyChange = useCallback(
    (shiny: ShinyFilter | undefined) => {
      updateFilter({ shiny });
    },
    [updateFilter]
  );

  const handleSpeciesToggle = useCallback(
    (speciesId: number, checked: boolean) => {
      const current = internalFilter.species_ids ?? [];
      const next = checked ? [...current, speciesId] : current.filter((id) => id !== speciesId);
      updateFilter({ species_ids: next.length > 0 ? next : undefined });
    },
    [internalFilter.species_ids, updateFilter]
  );

  const handleLevelRangeChange = useCallback(
    (range: [number, number] | undefined) => {
      updateFilter({ level_range: range });
    },
    [updateFilter]
  );

  const handleHeldItemSlotsChange = useCallback(
    (slots: HeldItemSlot[]) => {
      updateFilter({ held_item_slots: slots.length > 0 ? slots : undefined });
    },
    [updateFilter]
  );

  const handleEncounterResultChange = useCallback(
    (filter: EncounterResultFilter | undefined) => {
      updateFilter({ encounter_result_filter: filter });
    },
    [updateFilter]
  );

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
          {statMode === 'stats' && (
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
          {statMode === 'ivs' && (
            <>
              <IvRangeInput value={ivValue} onChange={handleIvChange} disabled={filterDisabled} />

              {/* めざパタイプ + 威力下限 (IV モード時のみ) */}
              <HiddenPowerSelect
                value={internalFilter.iv?.hidden_power_types ?? []}
                onChange={handleHiddenPowerTypesChange}
                minPower={internalFilter.iv?.hidden_power_min_power}
                onMinPowerChange={handleHiddenPowerMinPowerChange}
                disabled={filterDisabled}
              />
            </>
          )}

          {/* 2-5. 個体属性系 (2列グリッド) */}
          <div className="grid grid-cols-2 gap-2">
            <AbilitySlotSelect
              value={internalFilter.ability_slot}
              onChange={handleAbilitySlotChange}
              disabled={filterDisabled}
            />

            <GenderSelect
              value={internalFilter.gender}
              onChange={handleGenderChange}
              disabled={filterDisabled}
            />

            <NatureSelect
              value={internalFilter.natures ?? []}
              onChange={handleNaturesChange}
              disabled={filterDisabled}
            />

            <ShinySelect
              value={internalFilter.shiny}
              onChange={handleShinyChange}
              disabled={filterDisabled}
            />

            {/* レベル範囲 (min / max を2列に配置) */}
            <LevelRangeInput
              value={internalFilter.level_range}
              onChange={handleLevelRangeChange}
              disabled={filterDisabled}
            />
          </div>

          {/* エンカウント系 (条件付き表示) */}
          {uniqueSpecies.length > 0 && (
            <SpeciesSelect
              uniqueSpecies={uniqueSpecies}
              speciesNames={effectiveSpeciesNames}
              selectedIds={internalFilter.species_ids ?? []}
              onToggle={handleSpeciesToggle}
              disabled={filterDisabled}
            />
          )}

          {showHeldItem && (
            <HeldItemSlotSelect
              value={internalFilter.held_item_slots ?? []}
              onChange={handleHeldItemSlotsChange}
              disabled={filterDisabled}
            />
          )}

          {showEncounterResult && (
            <EncounterResultSelect
              value={internalFilter.encounter_result_filter}
              onChange={handleEncounterResultChange}
              encounterType={encounterType}
              disabled={filterDisabled}
            />
          )}
        </div>
      )}
    </section>
  );
}

export { PokemonFilterForm };
export type { PokemonFilterFormProps };
