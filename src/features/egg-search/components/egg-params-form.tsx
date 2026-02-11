/**
 * 孵化パラメータ入力フォーム
 *
 * EggGenerationParams + GenerationConfig の入力 UI を提供する。
 */

import { useState, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import { NATURE_ORDER, getNatureName } from '@/lib/game-data-names';
import { useUiStore } from '@/stores/settings/ui';
import { cn } from '@/lib/utils';
import type {
  EggGenerationParams,
  GenerationConfig,
  Nature,
  GenderRatio,
  Ivs,
  EverstonePlan,
} from '@/wasm/wasm_pkg.js';
import type { SupportedLocale } from '@/i18n';

interface EggParamsFormProps {
  value: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  onChange: (params: EggGenerationParams) => void;
  onGenConfigChange: (config: Pick<GenerationConfig, 'user_offset' | 'max_advance'>) => void;
  disabled?: boolean;
}

const GENDER_RATIO_ORDER: GenderRatio[] = [
  'F1M1',
  'F1M3',
  'F3M1',
  'F1M7',
  'MaleOnly',
  'FemaleOnly',
  'Genderless',
];

const GENDER_RATIO_LABELS: Record<GenderRatio, Record<SupportedLocale, string>> = {
  Genderless: { ja: '性別不明', en: 'Genderless' },
  MaleOnly: { ja: '♂のみ', en: 'Male only' },
  FemaleOnly: { ja: '♀のみ', en: 'Female only' },
  F1M7: { ja: '♀1:♂7', en: '♀1:♂7' },
  F1M3: { ja: '♀1:♂3', en: '♀1:♂3' },
  F1M1: { ja: '♀1:♂1', en: '♀1:♂1' },
  F3M1: { ja: '♀3:♂1', en: '♀3:♂1' },
};

const IV_STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

const STAT_SHORT_LABELS: Record<(typeof IV_STATS)[number], Record<SupportedLocale, string>> = {
  hp: { ja: 'H', en: 'HP' },
  atk: { ja: 'A', en: 'Atk' },
  def: { ja: 'B', en: 'Def' },
  spa: { ja: 'C', en: 'SpA' },
  spd: { ja: 'D', en: 'SpD' },
  spe: { ja: 'S', en: 'Spe' },
};

interface ParentIvsInputProps {
  label: string;
  ivs: Ivs;
  onChange: (ivs: Ivs) => void;
  disabled?: boolean;
  language: SupportedLocale;
}

function ParentIvsInput({ label, ivs, onChange, disabled, language }: ParentIvsInputProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(IV_STATS.map((stat) => [stat, String(ivs[stat])]))
  );

  const handleChange = useCallback((stat: (typeof IV_STATS)[number], raw: string) => {
    setLocalValues((prev) => ({ ...prev, [stat]: raw }));
  }, []);

  const handleBlur = useCallback(
    (stat: (typeof IV_STATS)[number]) => {
      const clamped = clampOrDefault(localValues[stat] ?? '0', {
        defaultValue: 0,
        min: 0,
        max: 31,
      });
      setLocalValues((prev) => ({ ...prev, [stat]: String(clamped) }));
      onChange({ ...ivs, [stat]: clamped });
    },
    [localValues, ivs, onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-6 gap-1">
        {IV_STATS.map((stat) => (
          <div key={stat} className="flex flex-col items-center gap-0.5">
            <span className="text-[0.65rem] font-mono text-muted-foreground">
              {STAT_SHORT_LABELS[stat][language]}
            </span>
            <Input
              type="number"
              inputMode="numeric"
              className="h-7 w-full text-center text-xs tabular-nums px-1"
              value={localValues[stat]}
              onChange={(e) => handleChange(stat, e.target.value)}
              onBlur={() => handleBlur(stat)}
              onFocus={handleFocusSelectAll}
              min={0}
              max={31}
              disabled={disabled}
              aria-label={`${label} ${STAT_SHORT_LABELS[stat][language]}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EggParamsForm({
  value,
  genConfig,
  onChange,
  onGenConfigChange,
  disabled,
}: EggParamsFormProps) {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const [isOpen, setIsOpen] = useState(true);

  // ローカル状態 (数値入力)
  const [localOffset, setLocalOffset] = useState(String(genConfig.user_offset));
  const [localMaxAdvance, setLocalMaxAdvance] = useState(String(genConfig.max_advance));

  const update = useCallback(
    (partial: Partial<EggGenerationParams>) => {
      onChange({ ...value, ...partial });
    },
    [value, onChange]
  );

  const handleEverstoneChange = useCallback(
    (nature: string) => {
      const everstone: EverstonePlan = nature === '__none__' ? 'None' : { Fixed: nature as Nature };
      update({ everstone });
    },
    [update]
  );

  const everstoneValue = (): string => {
    if (value.everstone === 'None') return '__none__';
    if (typeof value.everstone === 'object' && 'Fixed' in value.everstone)
      return value.everstone.Fixed;
    return '__none__';
  };

  const handleGenderRatioChange = useCallback(
    (ratio: string) => {
      update({ gender_ratio: ratio as GenderRatio });
    },
    [update]
  );

  const handleOffsetBlur = useCallback(() => {
    const clamped = clampOrDefault(localOffset, { defaultValue: 0, min: 0, max: 999_999 });
    setLocalOffset(String(clamped));
    onGenConfigChange({ ...genConfig, user_offset: clamped });
  }, [localOffset, genConfig, onGenConfigChange]);

  const handleMaxAdvanceBlur = useCallback(() => {
    const clamped = clampOrDefault(localMaxAdvance, { defaultValue: 100, min: 0, max: 999_999 });
    setLocalMaxAdvance(String(clamped));
    onGenConfigChange({ ...genConfig, max_advance: clamped });
  }, [localMaxAdvance, genConfig, onGenConfigChange]);

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <ChevronDown className={cn('size-4 transition-transform', !isOpen && '-rotate-90')} />
        <Trans>Egg parameters</Trans>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 pl-1">
          {/* かわらずのいし */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Everstone</Trans>
            </Label>
            <Select
              value={everstoneValue()}
              onValueChange={handleEverstoneChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t`Not used`}</SelectItem>
                {NATURE_ORDER.map((nature) => (
                  <SelectItem key={nature} value={nature}>
                    {getNatureName(nature, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* チェックボックス群 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={value.female_has_hidden}
                onCheckedChange={(checked) => update({ female_has_hidden: checked === true })}
                disabled={disabled}
              />
              <Trans>Female has HA</Trans>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={value.uses_ditto}
                onCheckedChange={(checked) => update({ uses_ditto: checked === true })}
                disabled={disabled}
              />
              <Trans>Uses Ditto</Trans>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={value.nidoran_flag}
                onCheckedChange={(checked) => update({ nidoran_flag: checked === true })}
                disabled={disabled}
              />
              <Trans>Nidoran♀</Trans>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={value.masuda_method}
                onCheckedChange={(checked) => update({ masuda_method: checked === true })}
                disabled={disabled}
              />
              <Trans>Masuda Method</Trans>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={value.consider_npc}
                onCheckedChange={(checked) => update({ consider_npc: checked === true })}
                disabled={disabled}
              />
              <Trans>Consider NPC</Trans>
            </label>
          </div>

          {/* 性別比 */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>Gender ratio</Trans>
            </Label>
            <Select
              value={value.gender_ratio}
              onValueChange={handleGenderRatioChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDER_RATIO_ORDER.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {GENDER_RATIO_LABELS[ratio][language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 親個体値 */}
          <ParentIvsInput
            label={t`Parent ♂ IVs`}
            ivs={value.parent_male}
            onChange={(ivs) => update({ parent_male: ivs })}
            disabled={disabled}
            language={language}
          />
          <ParentIvsInput
            label={t`Parent ♀ IVs`}
            ivs={value.parent_female}
            onChange={(ivs) => update({ parent_female: ivs })}
            disabled={disabled}
            language={language}
          />

          {/* user_offset / max_advance */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="egg-user-offset" className="text-xs">
                <Trans>Start offset</Trans>
              </Label>
              <Input
                id="egg-user-offset"
                type="number"
                inputMode="numeric"
                className="h-7 text-xs tabular-nums"
                value={localOffset}
                onChange={(e) => setLocalOffset(e.target.value)}
                onBlur={handleOffsetBlur}
                onFocus={handleFocusSelectAll}
                min={0}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="egg-max-advance" className="text-xs">
                <Trans>Max advance</Trans>
              </Label>
              <Input
                id="egg-max-advance"
                type="number"
                inputMode="numeric"
                className="h-7 text-xs tabular-nums"
                value={localMaxAdvance}
                onChange={(e) => setLocalMaxAdvance(e.target.value)}
                onBlur={handleMaxAdvanceBlur}
                onFocus={handleFocusSelectAll}
                min={0}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export { EggParamsForm };
export type { EggParamsFormProps };
