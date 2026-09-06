/**
 * レベル範囲入力コンポーネント
 *
 * min / max の 2 つの数値入力でレベル範囲を指定する。
 * 有効状態と範囲値を分けて保持し、blur 時に 1--100 でクランプする。
 */

import { useState, useCallback, useId, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { clampOrDefault, handleFocusSelectAll } from './input-helpers';

interface LevelRangeInputProps {
  value: [number, number] | undefined;
  onChange: (range?: [number, number]) => void;
  disabled?: boolean;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
}

const LEVEL_MIN = 1;
const LEVEL_MAX = 100;

function LevelRangeInput({
  value,
  onChange,
  disabled,
  enabled = value !== undefined,
  onEnabledChange,
}: LevelRangeInputProps): ReactElement {
  const { t } = useLingui();
  const id = useId();
  const [minText, setMinText] = useState(String(value?.[0] ?? LEVEL_MIN));
  const [maxText, setMaxText] = useState(String(value?.[1] ?? LEVEL_MAX));

  // 外部 prop 変更時 (リセット等) に内部テキストを同期 (レンダー中の state 調整)
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue?.[0] !== value?.[0] || prevValue?.[1] !== value?.[1]) {
    setPrevValue(value);
    setMinText(String(value?.[0] ?? LEVEL_MIN));
    setMaxText(String(value?.[1] ?? LEVEL_MAX));
  }

  const emit = useCallback(
    (nextMin: string, nextMax: string) => {
      const min = clampOrDefault(nextMin, {
        defaultValue: LEVEL_MIN,
        min: LEVEL_MIN,
        max: LEVEL_MAX,
      });
      const max = clampOrDefault(nextMax, {
        defaultValue: LEVEL_MAX,
        min: LEVEL_MIN,
        max: LEVEL_MAX,
      });
      onChange([Math.min(min, max), Math.max(min, max)]);
    },
    [onChange]
  );

  const handleMinBlur = useCallback(() => {
    if (minText.trim() !== '') {
      const clamped = clampOrDefault(minText, {
        defaultValue: LEVEL_MIN,
        min: LEVEL_MIN,
        max: LEVEL_MAX,
      });
      setMinText(String(clamped));
    }
    emit(minText, maxText);
  }, [minText, maxText, emit]);

  const handleMaxBlur = useCallback(() => {
    if (maxText.trim() !== '') {
      const clamped = clampOrDefault(maxText, {
        defaultValue: LEVEL_MAX,
        min: LEVEL_MIN,
        max: LEVEL_MAX,
      });
      setMaxText(String(clamped));
    }
    emit(minText, maxText);
  }, [minText, maxText, emit]);

  return (
    <>
      {onEnabledChange && (
        <label className="col-span-2 flex items-center gap-2 text-xs">
          <Checkbox
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked === true)}
            disabled={disabled}
            aria-label={t`Enable level range`}
          />
          <Trans>Level range</Trans>
        </label>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-min`} className="text-xs">
          <Trans>Level min</Trans>
        </Label>
        <Input
          id={`${id}-min`}
          type="number"
          inputMode="numeric"
          className="h-8 text-xs"
          placeholder={String(LEVEL_MIN)}
          value={minText}
          onChange={(e) => setMinText(e.target.value)}
          onBlur={handleMinBlur}
          onFocus={handleFocusSelectAll}
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          disabled={disabled || !enabled}
          aria-label="level-min"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-max`} className="text-xs">
          <Trans>Level max</Trans>
        </Label>
        <Input
          id={`${id}-max`}
          type="number"
          inputMode="numeric"
          className="h-8 text-xs"
          placeholder={String(LEVEL_MAX)}
          value={maxText}
          onChange={(e) => setMaxText(e.target.value)}
          onBlur={handleMaxBlur}
          onFocus={handleFocusSelectAll}
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          disabled={disabled || !enabled}
          aria-label="level-max"
        />
      </div>
    </>
  );
}

export { LevelRangeInput };
export type { LevelRangeInputProps };
