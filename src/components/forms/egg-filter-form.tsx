/**
 * 孵化フィルター入力フォーム
 *
 * EggFilter の入力 UI。折りたたみ可能で、デフォルトは閉じた状態。
 * showToggle: フィルター有効/無効トグル (内部状態を保持したまま切り替え)
 * showReset: リセットボタン (全フィルターをデフォルトに戻す)
 */

import { useState, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { StatsFixedInput } from '@/components/forms/stats-fixed-input';
import type { StatsFixedValues } from '@/components/forms/stats-fixed-input';
import { NatureSelect } from '@/components/forms/nature-select';
import { HiddenPowerSelect } from '@/components/forms/hidden-power-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import { cn } from '@/lib/utils';
import type { StatDisplayMode } from '@/lib/game-data-names';

const EMPTY_STATS_FIXED: StatsFixedValues = {
  hp: undefined,
  atk: undefined,
  def: undefined,
  spa: undefined,
  spd: undefined,
  spe: undefined,
};
import type {
  EggFilter,
  IvFilter,
  Nature,
  Gender,
  AbilitySlot,
  ShinyFilter,
  HiddenPowerType,
} from '@/wasm/wasm_pkg.js';

interface EggFilterFormProps {
  value: EggFilter | undefined;
  onChange: (filter?: EggFilter) => void;
  /** Stats 表示モード。指定時に IV / Stats フィルタを切替表示する */
  statMode?: StatDisplayMode;
  statsFilter?: StatsFixedValues | undefined;
  onStatsFilterChange?: (filter?: StatsFixedValues) => void;
  disabled?: boolean;
  /** フィルター有効/無効 Switch を表示する。内部状態を保持したまま切り替える */
  showToggle?: boolean;
  /** リセットボタンを表示する */
  showReset?: boolean;
}

const DEFAULT_IV_FILTER: IvFilter = {
  hp: [0, 31],
  atk: [0, 31],
  def: [0, 31],
  spa: [0, 31],
  spd: [0, 31],
  spe: [0, 31],
};

const DEFAULT_FILTER: EggFilter = {
  iv: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  min_margin_frames: undefined,
};

function EggFilterForm({
  value,
  onChange,
  statMode,
  statsFilter,
  onStatsFilterChange,
  disabled,
  showToggle = false,
  showReset = false,
}: EggFilterFormProps) {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const [localMarginFrames, setLocalMarginFrames] = useState('');

  // --- Toggle mode: internal state management ---
  const [filterEnabled, setFilterEnabled] = useState(
    !showToggle || value !== undefined || statsFilter !== undefined
  );
  const [internalFilter, setInternalFilter] = useState<EggFilter>(value ?? DEFAULT_FILTER);
  const [internalStats, setInternalStats] = useState<StatsFixedValues | undefined>(statsFilter);

  // Toggle mode uses internal state; otherwise props directly
  const filter = showToggle ? internalFilter : (value ?? DEFAULT_FILTER);
  const effectiveStats = showToggle ? internalStats : statsFilter;

  // --- Propagation helpers ---

  const hasAnyFilter = useCallback((f: EggFilter): boolean => {
    return (
      f.iv !== undefined ||
      (f.natures !== undefined && f.natures.length > 0) ||
      f.gender !== undefined ||
      f.ability_slot !== undefined ||
      f.shiny !== undefined ||
      f.min_margin_frames !== undefined
    );
  }, []);

  /** Toggle mode: propagate or suppress based on enabled state */
  const propagateToggle = useCallback(
    (f: EggFilter, stats: StatsFixedValues | undefined, enabled: boolean) => {
      if (!enabled) {
        onChange();
        onStatsFilterChange?.();
        return;
      }
      onChange(hasAnyFilter(f) ? f : undefined);
      if (onStatsFilterChange) {
        const hasStats = stats !== undefined && Object.values(stats).some((v) => v !== undefined);
        onStatsFilterChange(hasStats ? stats : undefined);
      }
    },
    [onChange, onStatsFilterChange, hasAnyFilter]
  );

  // --- Update helpers ---

  const update = useCallback(
    (partial: Partial<EggFilter>) => {
      const updated = { ...filter, ...partial };
      if (showToggle) {
        setInternalFilter(updated);
        propagateToggle(updated, internalStats, filterEnabled);
      } else {
        onChange(hasAnyFilter(updated) ? updated : undefined);
      }
    },
    [filter, showToggle, internalStats, filterEnabled, propagateToggle, hasAnyFilter, onChange]
  );

  // --- Toggle / Reset handlers ---

  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      setFilterEnabled(checked);
      propagateToggle(internalFilter, internalStats, checked);
    },
    [internalFilter, internalStats, propagateToggle]
  );

  const handleReset = useCallback(() => {
    setLocalMarginFrames('');
    if (showToggle) {
      setInternalFilter(DEFAULT_FILTER);
      setInternalStats(undefined);
      setFilterEnabled(false);
    }
    onChange();
    onStatsFilterChange?.();
  }, [showToggle, onChange, onStatsFilterChange]);

  // --- Stats handler ---

  const handleStatsChange = useCallback(
    (v: StatsFixedValues) => {
      const hasAny = Object.values(v).some((val) => val !== undefined);
      const next = hasAny ? v : undefined;
      if (showToggle) {
        setInternalStats(next);
        if (filterEnabled) {
          onStatsFilterChange?.(next);
        }
      } else {
        onStatsFilterChange?.(next);
      }
    },
    [showToggle, filterEnabled, onStatsFilterChange]
  );

  // --- Field handlers ---

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
      const existingIv = filter.iv;
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
      update({ iv: nextIv });
    },
    [filter.iv, update]
  );

  const handleNaturesChange = useCallback(
    (natures: Nature[]) => {
      update({ natures: natures.length > 0 ? natures : undefined });
    },
    [update]
  );

  const handleGenderChange = useCallback(
    (gender: Gender | undefined) => {
      update({ gender });
    },
    [update]
  );

  const handleAbilitySlotChange = useCallback(
    (slot: AbilitySlot | undefined) => {
      update({ ability_slot: slot });
    },
    [update]
  );

  const handleShinyChange = useCallback(
    (shiny: ShinyFilter | undefined) => {
      update({ shiny });
    },
    [update]
  );

  const handleHiddenPowerTypesChange = useCallback(
    (types: HiddenPowerType[]) => {
      const existing = filter.iv ?? DEFAULT_IV_FILTER;
      update({
        iv: {
          ...existing,
          hidden_power_types: types.length > 0 ? types : undefined,
        },
      });
    },
    [filter.iv, update]
  );

  const handleHiddenPowerMinPowerChange = useCallback(
    (minPower?: number) => {
      const existing = filter.iv ?? DEFAULT_IV_FILTER;
      update({
        iv: {
          ...existing,
          hidden_power_min_power: minPower,
        },
      });
    },
    [filter.iv, update]
  );

  const handleMarginFramesBlur = useCallback(() => {
    if (localMarginFrames.trim() === '') {
      update({ min_margin_frames: undefined });
      return;
    }
    const clamped = clampOrDefault(localMarginFrames, {
      defaultValue: 0,
      min: 0,
      max: 999_999,
    });
    setLocalMarginFrames(String(clamped));
    update({ min_margin_frames: clamped });
  }, [localMarginFrames, update]);

  const ivValue = filter.iv ?? DEFAULT_IV_FILTER;
  const filterDisabled = disabled || (showToggle && !filterEnabled);

  return (
    <section className="flex flex-col gap-2">
      {/* ヘッダー: 開閉 + (Toggle) + (Reset) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-1 text-sm font-medium"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <ChevronDown className={cn('size-4 transition-transform', !isOpen && '-rotate-90')} />
          <Trans>Filter</Trans>
        </button>
        {showToggle && (
          <Switch
            id="egg-filter-toggle"
            checked={filterEnabled}
            onCheckedChange={handleToggleEnabled}
            disabled={disabled}
            aria-label={t`Enable filter`}
          />
        )}
        {showReset && (
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
        )}
      </div>

      {isOpen && (
        <div className={cn('flex flex-col gap-3 pl-1', filterDisabled && 'opacity-50')}>
          {/* 実ステータスフィルター (Stats モード時) */}
          {statMode === 'stats' && onStatsFilterChange && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">
                <Trans>Stats filter</Trans>
              </Label>
              <StatsFixedInput
                value={effectiveStats ?? EMPTY_STATS_FIXED}
                onChange={handleStatsChange}
                disabled={filterDisabled}
              />
            </div>
          )}

          {/* IV フィルター (IV モード時 or statMode 未指定時) */}
          {statMode !== 'stats' && (
            <>
              <IvRangeInput
                value={ivValue}
                onChange={handleIvChange}
                allowUnknown
                disabled={filterDisabled}
              />

              {/* めざパタイプ + 威力下限 */}
              <HiddenPowerSelect
                value={filter.iv?.hidden_power_types ?? []}
                onChange={handleHiddenPowerTypesChange}
                minPower={filter.iv?.hidden_power_min_power}
                onMinPowerChange={handleHiddenPowerMinPowerChange}
                disabled={filterDisabled}
              />
            </>
          )}

          {/* 性格 */}
          <NatureSelect
            value={filter.natures ?? []}
            onChange={handleNaturesChange}
            disabled={filterDisabled}
          />

          {/* 性別 */}
          <GenderSelect
            value={filter.gender}
            onChange={handleGenderChange}
            showGenderless={false}
            disabled={filterDisabled}
          />

          {/* 特性スロット */}
          <AbilitySlotSelect
            value={filter.ability_slot}
            onChange={handleAbilitySlotChange}
            disabled={filterDisabled}
          />

          {/* 色違い */}
          <ShinySelect
            value={filter.shiny}
            onChange={handleShinyChange}
            disabled={filterDisabled}
          />

          {/* 猶予フレーム下限 */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="egg-min-margin" className="text-xs">
              <Trans>Min margin frames</Trans>
            </Label>
            <Input
              id="egg-min-margin"
              type="number"
              inputMode="numeric"
              className="h-7 text-xs tabular-nums"
              placeholder={t`Not specified`}
              value={localMarginFrames}
              onChange={(e) => setLocalMarginFrames(e.target.value)}
              onBlur={handleMarginFramesBlur}
              onFocus={handleFocusSelectAll}
              min={0}
              disabled={filterDisabled}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export { EggFilterForm };
export type { EggFilterFormProps };
