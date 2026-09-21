/**
 * レベル範囲入力コンポーネント
 *
 * min / max の 2 つの数値入力でレベル範囲を指定する。
 * 有効状態と範囲値を分けて保持し、blur 時に 1--100 でクランプする。
 */

import { useId, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { handleFocusSelectAll } from './input-helpers';
import { useNumericInput } from '@/hooks/use-numeric-input';
import { isIntegerRangeValid } from '@/lib/range-validation';
import { RangeError } from './range-error';

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
  const min = value?.[0] ?? LEVEL_MIN;
  const max = value?.[1] ?? LEVEL_MAX;
  const minInput = useNumericInput(
    min,
    { defaultValue: LEVEL_MIN, min: LEVEL_MIN, max: LEVEL_MAX },
    enabled
  );
  const maxInput = useNumericInput(
    max,
    { defaultValue: LEVEL_MAX, min: LEVEL_MIN, max: LEVEL_MAX },
    enabled
  );
  const invalid = !disabled && enabled && !isIntegerRangeValid(min, max, LEVEL_MIN, LEVEL_MAX);
  const errorId = `${id}-error`;

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
          value={minInput.text}
          onChange={(e) => minInput.setText(e.target.value)}
          onBlur={() => onChange([minInput.commit(), max])}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
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
          value={maxInput.text}
          onChange={(e) => maxInput.setText(e.target.value)}
          onBlur={() => onChange([min, maxInput.commit()])}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onFocus={handleFocusSelectAll}
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          disabled={disabled || !enabled}
          aria-label="level-max"
        />
      </div>
      <RangeError id={errorId} invalid={invalid} />
    </>
  );
}

export { LevelRangeInput };
export type { LevelRangeInputProps };
