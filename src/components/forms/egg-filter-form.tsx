import { IvFilterFields } from './iv-filter-fields';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getEggFilterVisibility,
  type EggFilterInput as EggFilter,
} from '@/lib/search-filter-context';
/**
 * 孵化フィルター入力フォーム
 *
 * EggFilter の入力 UI。折りたたみ可能で、デフォルトは閉じた状態。
 * showToggle: フィルター有効/無効トグル (内部状態を保持したまま切り替え)
 * showReset: リセットボタン (全フィルターをデフォルトに戻す)
 */

import { useState, useCallback, useEffect } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { StatsFixedInput } from '@/components/forms/stats-fixed-input';
import { NatureSelect } from '@/components/forms/nature-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import { cn } from '@/lib/utils';
import type { StatDisplayMode } from '@/lib/game-data-names';
import type { IvFilter, StatsFilter, EggGenerationParams } from '@/wasm/wasm_pkg.js';

const DEFAULT_STATS_FILTER: StatsFilter = {
  hp: undefined,
  atk: undefined,
  def: undefined,
  spa: undefined,
  spd: undefined,
  spe: undefined,
};

interface EggFilterFormProps {
  eggParams: EggGenerationParams;
  value: EggFilter | undefined;
  onChange: (filter?: EggFilter) => void;
  /** Stats 表示モード。指定時に IV / Stats フィルタを切替表示する */
  statMode?: StatDisplayMode;
  statsFilter?: StatsFilter | undefined;
  onStatsFilterChange?: (filter?: StatsFilter) => void;
  syncKey?: number;
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
  stats: undefined,
};

function EggFilterForm({
  value,
  eggParams,
  onChange,
  statMode,
  statsFilter,
  onStatsFilterChange,
  syncKey,
  disabled,
  showToggle = false,
  showReset = false,
}: EggFilterFormProps) {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const [localMarginFrames, setLocalMarginFrames] = useState('');

  const filter = value ?? DEFAULT_FILTER;
  const effectiveStats = statsFilter;
  const filterEnabled = filter.enabled !== false;
  const visible = getEggFilterVisibility(eggParams, statMode);
  useEffect(() => {
    setLocalMarginFrames(String(filter.min_margin_frames ?? 0));
  }, [filter.min_margin_frames, syncKey]);
  const update = useCallback(
    (partial: Partial<EggFilter>) => onChange({ ...filter, ...partial }),
    [filter, onChange]
  );
  const handleToggleEnabled = (enabled: boolean) => update({ enabled });
  const handleReset = () => {
    setLocalMarginFrames('0');
    onChange();
    onStatsFilterChange?.();
  };
  const handleStatsChange = (stats: StatsFilter) => onStatsFilterChange?.(stats);
  const handleMarginFramesBlur = () => {
    const clamped = clampOrDefault(localMarginFrames, { defaultValue: 0, min: 0, max: 999_999 });
    setLocalMarginFrames(String(clamped));
    update({ min_margin_frames: clamped });
  };
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
          {visible.stats && onStatsFilterChange && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">
                <Trans>Stats filter</Trans>
              </Label>
              <StatsFixedInput
                value={effectiveStats ?? DEFAULT_STATS_FILTER}
                onChange={handleStatsChange}
                disabled={filterDisabled}
              />
            </div>
          )}

          {/* IV フィルター (IV モード時 or statMode 未指定時) */}
          {visible.iv && (
            <IvFilterFields
              value={ivValue}
              onChange={(iv) => update({ iv })}
              disabled={filterDisabled}
            />
          )}

          {/* 特性スロット / 性別 / 性格 / 色違い (2列) */}
          <div className="grid grid-cols-2 gap-2">
            <AbilitySlotSelect
              showHidden={visible.hiddenAbility}
              value={filter.ability_slot}
              onChange={(ability_slot) => update({ ability_slot })}
              disabled={filterDisabled}
            />

            <GenderSelect
              value={filter.gender}
              onChange={(gender) => update({ gender })}
              showGenderless={false}
              disabled={filterDisabled}
            />

            <NatureSelect
              value={filter.natures ?? []}
              onChange={(natures) => update({ natures })}
              disabled={filterDisabled}
            />

            <ShinySelect
              value={filter.shiny}
              onChange={(shiny) => update({ shiny })}
              disabled={filterDisabled}
            />
          </div>

          {visible.margin && (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filter.marginEnabled ?? filter.min_margin_frames !== undefined}
                  onCheckedChange={(checked) =>
                    update({
                      marginEnabled: checked === true,
                      min_margin_frames: filter.min_margin_frames ?? 0,
                    })
                  }
                  disabled={filterDisabled}
                  aria-label={t`Enable minimum margin frames`}
                />
                <Trans>Min margin frames</Trans>
              </label>
              <Input
                id="egg-min-margin"
                aria-label={t`Min margin frames`}
                type="number"
                inputMode="numeric"
                className="h-7 text-xs tabular-nums"
                placeholder={t`Not specified`}
                value={localMarginFrames}
                onChange={(e) => setLocalMarginFrames(e.target.value)}
                onBlur={handleMarginFramesBlur}
                onFocus={handleFocusSelectAll}
                min={0}
                disabled={
                  filterDisabled ||
                  !(filter.marginEnabled ?? filter.min_margin_frames !== undefined)
                }
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export { EggFilterForm };
export type { EggFilterFormProps };
