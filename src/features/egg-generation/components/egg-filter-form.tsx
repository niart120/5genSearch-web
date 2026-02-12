/**
 * 孵化フィルター入力フォーム
 *
 * EggFilter の入力 UI。折りたたみ可能で、デフォルトは閉じた状態。
 */

import { useState, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { NatureSelect } from '@/components/forms/nature-select';
import { AbilitySlotSelect } from '@/components/forms/ability-slot-select';
import { GenderSelect } from '@/components/forms/gender-select';
import { ShinySelect } from '@/components/forms/shiny-select';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import { cn } from '@/lib/utils';
import type {
  EggFilter,
  IvFilter,
  Nature,
  Gender,
  AbilitySlot,
  ShinyFilter,
} from '@/wasm/wasm_pkg.js';

interface EggFilterFormProps {
  value: EggFilter | undefined;
  onChange: (filter: EggFilter | undefined) => void;
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

const DEFAULT_FILTER: EggFilter = {
  iv: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  min_margin_frames: undefined,
};

function EggFilterForm({ value, onChange, disabled }: EggFilterFormProps) {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const [localMarginFrames, setLocalMarginFrames] = useState('');

  const filter = value ?? DEFAULT_FILTER;

  const update = useCallback(
    (partial: Partial<EggFilter>) => {
      const updated = { ...filter, ...partial };
      // 全て undefined の場合は filter 自体を undefined に
      const hasAny =
        updated.iv !== undefined ||
        (updated.natures !== undefined && updated.natures.length > 0) ||
        updated.gender !== undefined ||
        updated.ability_slot !== undefined ||
        updated.shiny !== undefined ||
        updated.min_margin_frames !== undefined;
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
          <IvRangeInput
            value={ivValue}
            onChange={handleIvChange}
            allowUnknown
            disabled={disabled}
          />

          {/* 性格 */}
          <NatureSelect
            value={filter.natures ?? []}
            onChange={handleNaturesChange}
            disabled={disabled}
          />

          {/* 性別 */}
          <GenderSelect
            value={filter.gender}
            onChange={handleGenderChange}
            showGenderless={false}
            disabled={disabled}
          />

          {/* 特性スロット */}
          <AbilitySlotSelect
            value={filter.ability_slot}
            onChange={handleAbilitySlotChange}
            disabled={disabled}
          />

          {/* 色違い */}
          <ShinySelect value={filter.shiny} onChange={handleShinyChange} disabled={disabled} />

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
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export { EggFilterForm };
export type { EggFilterFormProps };
