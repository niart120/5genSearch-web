/**
 * MT Seed 検索フォーム
 *
 * IV フィルタ + MT オフセット + 徘徊ポケモンフラグの入力を担う。
 */

import { type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { HiddenPowerSelect } from '@/components/forms/hidden-power-select';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import type { IvFilter, HiddenPowerType } from '@/wasm/wasm_pkg.js';

interface MtseedSearchFormProps {
  ivFilter: IvFilter;
  mtOffset: number;
  isRoamer: boolean;
  onIvFilterChange: (filter: IvFilter) => void;
  onMtOffsetChange: (offset: number) => void;
  onRoamerChange: (isRoamer: boolean) => void;
  disabled?: boolean;
}

function MtseedSearchForm({
  ivFilter,
  mtOffset,
  isRoamer,
  onIvFilterChange,
  onMtOffsetChange,
  onRoamerChange,
  disabled,
}: MtseedSearchFormProps): ReactElement {
  const { t } = useLingui();

  const handleIvRangeChange = (
    value: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>
  ) => {
    onIvFilterChange({
      ...ivFilter,
      ...value,
    });
  };

  const handleHiddenPowerTypesChange = (types: HiddenPowerType[]) => {
    onIvFilterChange({
      ...ivFilter,
      hidden_power_types: types.length > 0 ? types : undefined,
    });
  };

  const handleMinPowerChange = (minPower: number | undefined) => {
    onIvFilterChange({
      ...ivFilter,
      hidden_power_min_power: minPower,
    });
  };

  return (
    <div className="space-y-4">
      {/* MT オフセット + 徘徊ポケモン */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mt-offset">
            <Trans>MT Advances</Trans>
          </Label>
          <Input
            id="mt-offset"
            type="number"
            min={0}
            value={mtOffset}
            onChange={(e) => onMtOffsetChange(Math.max(0, Number(e.target.value) || 0))}
            onBlur={(e) =>
              onMtOffsetChange(
                clampOrDefault(e.target.value, { defaultValue: 0, min: 0, max: 999 })
              )
            }
            onFocus={handleFocusSelectAll}
            disabled={disabled}
            className="w-20"
            aria-label={t`MT Advances`}
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch
            id="roamer"
            checked={isRoamer}
            onCheckedChange={onRoamerChange}
            disabled={disabled}
          />
          <Label htmlFor="roamer">
            <Trans>Roamer</Trans>
          </Label>
        </div>
      </div>

      {/* IV 範囲入力 */}
      <div className="space-y-1.5">
        <Label>
          <Trans>IV Range</Trans>
        </Label>
        <IvRangeInput value={ivFilter} onChange={handleIvRangeChange} disabled={disabled} />
      </div>

      {/* めざパ条件 */}
      <div className="space-y-1.5">
        <Label>
          <Trans>Hidden Power</Trans>
        </Label>
        <HiddenPowerSelect
          value={ivFilter.hidden_power_types ?? []}
          onChange={handleHiddenPowerTypesChange}
          minPower={ivFilter.hidden_power_min_power}
          onMinPowerChange={handleMinPowerChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export { MtseedSearchForm };
