/**
 * ポケモンフィルター入力フォーム
 *
 * PokemonFilter (WASM 用) と StatsFilter (クライアントサイド) の入力 UI。
 * フィルター有効/無効トグル、リセットボタン付き。
 * statMode に応じて IV / 実ステータスフィルターを切り替える。
 */

import { useState, useCallback, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown, RotateCcw } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import {
  HIDDEN_POWER_ORDER,
  getHiddenPowerName,
  getStatLabel,
  IV_STAT_KEYS,
} from '@/lib/game-data-names';
import type { IvStatKey } from '@/lib/game-data-names';
import { initMainThreadWasm } from '@/services/wasm-init';
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
} from '@/wasm/wasm_pkg.js';
import type { StatDisplayMode } from './pokemon-result-columns';
import type { StatsFilter } from '../types';

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
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** ステータス固定値入力 (6 ステータス横並び) */
function StatsFixedInput({
  value,
  onChange,
  disabled,
}: {
  value: StatsFilter;
  onChange: (v: StatsFilter) => void;
  disabled?: boolean;
}) {
  const language = useUiStore((s) => s.language);

  const [localValues, setLocalValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      IV_STAT_KEYS.map((stat) => [stat, value[stat] === undefined ? '' : String(value[stat])])
    )
  );

  const localValuesRef = useRef(localValues);
  useEffect(() => {
    localValuesRef.current = localValues;
  });

  const handleChange = useCallback((stat: (typeof IV_STAT_KEYS)[number], raw: string) => {
    setLocalValues((prev) => ({ ...prev, [stat]: raw }));
  }, []);

  const handleBlur = useCallback(
    (stat: (typeof IV_STAT_KEYS)[number]) => {
      const raw = (localValuesRef.current[stat] ?? '').trim();
      if (raw === '') {
        setLocalValues((prev) => ({ ...prev, [stat]: '' }));
        onChange({ ...value, [stat]: undefined });
        return;
      }
      const parsed = Number.parseInt(raw, 10);
      const clamped = Number.isNaN(parsed) ? undefined : Math.max(0, Math.min(999, parsed));
      setLocalValues((prev) => ({
        ...prev,
        [stat]: clamped === undefined ? '' : String(clamped),
      }));
      onChange({ ...value, [stat]: clamped });
    },
    [value, onChange]
  );

  return (
    <div className="grid grid-cols-6 gap-1">
      {IV_STAT_KEYS.map((stat) => (
        <div key={stat} className="flex flex-col items-center gap-0.5">
          <span className="text-[0.65rem] font-mono text-muted-foreground">
            {getStatLabel(stat as IvStatKey, language)}
          </span>
          <Input
            type="text"
            inputMode="numeric"
            className="h-7 w-full text-center text-xs tabular-nums px-1"
            value={localValues[stat]}
            onChange={(e) => handleChange(stat, e.target.value)}
            onBlur={() => handleBlur(stat)}
            onFocus={handleFocusSelectAll}
            disabled={disabled}
            placeholder="-"
            aria-label={`${getStatLabel(stat as IvStatKey, language)} stats`}
          />
        </div>
      ))}
    </div>
  );
}

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
    <Popover.Root>
      <Popover.Trigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label="species-select-trigger"
        >
          <span className="truncate">
            <Trans>Species</Trans> ({label})
          </span>
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
                <label key={s.speciesId} className="flex cursor-pointer items-center gap-2 text-xs">
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
  );
}

/** めざパタイプ選択 Popover */
function HiddenPowerSelect({
  selectedTypes,
  onChange,
  disabled,
}: {
  selectedTypes: HiddenPowerType[];
  onChange: (types: HiddenPowerType[]) => void;
  disabled?: boolean;
}) {
  const language = useUiStore((s) => s.language);
  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);
  const label =
    selectedTypes.length === 0 ? (
      <Trans>Not specified</Trans>
    ) : (
      <Trans>{selectedTypes.length} selected</Trans>
    );

  const toggle = (type: HiddenPowerType) => {
    if (selectedSet.has(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label="hidden-power-type-trigger"
        >
          <span className="truncate">
            <Trans>Hidden Power type</Trans> ({label})
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
                  onCheckedChange={() => toggle(type)}
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
  disabled,
}: PokemonFilterFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const [isOpen, setIsOpen] = useState(false);

  // フィルター有効/無効トグル (内部状態を保持したまま切り替え)
  const [filterEnabled, setFilterEnabled] = useState(
    value !== undefined || statsFilter !== undefined
  );

  // 内部フィルタ状態 (トグル OFF 時も保持)
  const [internalFilter, setInternalFilter] = useState<PokemonFilter>(value ?? DEFAULT_FILTER);
  const [internalStats, setInternalStats] = useState<StatsFilter>(
    statsFilter ?? DEFAULT_STATS_FILTER
  );

  // species 名前解決 (WASM 経由)
  const [speciesNames, setSpeciesNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
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

  // --- propagation helpers ---

  const hasAnyFilter = useCallback((f: PokemonFilter): boolean => {
    return (
      f.iv !== undefined ||
      (f.natures !== undefined && f.natures.length > 0) ||
      f.gender !== undefined ||
      f.ability_slot !== undefined ||
      f.shiny !== undefined ||
      (f.species_ids !== undefined && f.species_ids.length > 0) ||
      f.level_range !== undefined
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
    setFilterEnabled(false);
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
    (slot: string) => {
      updateFilter({ ability_slot: slot === '__none__' ? undefined : (slot as AbilitySlot) });
    },
    [updateFilter]
  );

  const handleGenderChange = useCallback(
    (gender: string) => {
      updateFilter({ gender: gender === '__none__' ? undefined : (gender as Gender) });
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
    (shinyValue: string) => {
      updateFilter({
        shiny: shinyValue === '__none__' ? undefined : (shinyValue as ShinyFilter),
      });
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

  // めざパ威力ローカル state
  const [localMinPower, setLocalMinPower] = useState(
    String(internalFilter.iv?.hidden_power_min_power ?? '')
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
          {/* 1. 特性スロット */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Ability slot</Trans>
            </Label>
            <Select
              value={internalFilter.ability_slot ?? '__none__'}
              onValueChange={handleAbilitySlotChange}
              disabled={filterDisabled}
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

          {/* 2. 性別 */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Gender</Trans>
            </Label>
            <Select
              value={internalFilter.gender ?? '__none__'}
              onValueChange={handleGenderChange}
              disabled={filterDisabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t`Not specified`}</SelectItem>
                <SelectItem value="Male">♂</SelectItem>
                <SelectItem value="Female">♀</SelectItem>
                <SelectItem value="Genderless">-</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. 性格 */}
          <NatureSelect
            value={internalFilter.natures ?? []}
            onChange={handleNaturesChange}
            disabled={filterDisabled}
          />

          {/* 4. 色違い */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Shiny</Trans>
            </Label>
            <Select
              value={internalFilter.shiny ?? '__none__'}
              onValueChange={handleShinyChange}
              disabled={filterDisabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t`Not specified`}</SelectItem>
                <SelectItem value="Star">☆</SelectItem>
                <SelectItem value="Square">◇</SelectItem>
                <SelectItem value="Shiny">☆ & ◇</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5a. 実ステータスフィルター (Stats モード時) */}
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

          {/* 5b. IV フィルター (IV モード時) */}
          {statMode === 'ivs' && (
            <>
              <IvRangeInput value={ivValue} onChange={handleIvChange} disabled={filterDisabled} />

              {/* 6. めざパタイプ (IV モード時のみ) */}
              <HiddenPowerSelect
                selectedTypes={internalFilter.iv?.hidden_power_types ?? []}
                onChange={handleHiddenPowerTypesChange}
                disabled={filterDisabled}
              />

              {/* 7. めざパ威力下限 (IV モード時のみ) */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs">
                  <Trans>Hidden Power min power</Trans>
                </Label>
                <Input
                  className="h-7 w-20 text-xs tabular-nums"
                  inputMode="numeric"
                  value={localMinPower}
                  onChange={(e) => setLocalMinPower(e.target.value)}
                  onFocus={handleFocusSelectAll}
                  onBlur={() => {
                    if (localMinPower === '' || localMinPower === '0') {
                      setLocalMinPower('');
                      handleHiddenPowerMinPowerChange();
                      return;
                    }
                    const v = clampOrDefault(localMinPower, {
                      defaultValue: 30,
                      min: 30,
                      max: 70,
                    });
                    setLocalMinPower(String(v));
                    handleHiddenPowerMinPowerChange(v);
                  }}
                  disabled={filterDisabled}
                  placeholder="30"
                />
              </div>
            </>
          )}

          {/* 8. 種族フィルタ (Popover) */}
          {uniqueSpecies.length > 0 && (
            <SpeciesSelect
              uniqueSpecies={uniqueSpecies}
              speciesNames={speciesNames}
              selectedIds={internalFilter.species_ids ?? []}
              onToggle={handleSpeciesToggle}
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
