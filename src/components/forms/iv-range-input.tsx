import { Trans } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getStatLabel, IV_STAT_KEYS } from '@/lib/game-data-names';
import type { IvStatKey } from '@/lib/game-data-names';
import { handleFocusSelectAll } from '@/components/forms/input-helpers';
import { useNumericInput } from '@/hooks/use-numeric-input';
import { isIntegerRangeValid } from '@/lib/range-validation';
import { RangeError } from './range-error';
import { useUiStore } from '@/stores/settings/ui';
import { isIvRangeEnabled, type IvFilterInput } from '@/lib/search-filter-context';

const IV_MIN = 0;
const IV_MAX = 31;

type IvRangeValue = IvFilterInput;

interface IvRangeInputProps {
  /** 現在の IV フィルタ値 (6 ステータスの min/max) */
  value: IvRangeValue;
  /** 値変更コールバック */
  onChange: (value: IvRangeValue) => void;
  /** 無効化 */
  disabled?: boolean;
}

interface IvStatRowProps {
  label: string;
  statKey: IvStatKey;
  min: number;
  max: number;
  disabled?: boolean;
  onMinChange: (min: number) => void;
  onMaxChange: (max: number) => void;
  showUnknown?: boolean;
  isUnknown: boolean;
  onUnknownChange: (checked: boolean) => void;
}

function IvStatRow({
  label,
  statKey,
  min,
  max,
  disabled,
  onMinChange,
  onMaxChange,
  showUnknown,
  isUnknown,
  onUnknownChange,
}: IvStatRowProps) {
  const minInput = useNumericInput(
    min,
    { defaultValue: IV_MIN, min: IV_MIN, max: IV_MAX },
    isUnknown
  );
  const maxInput = useNumericInput(
    max,
    { defaultValue: IV_MAX, min: IV_MIN, max: IV_MAX },
    isUnknown
  );
  const invalid = !disabled && !isUnknown && !isIntegerRangeValid(min, max, IV_MIN, IV_MAX);
  const errorId = `iv-${statKey}-error`;

  const minId = `iv-${statKey}-min`;
  const maxId = `iv-${statKey}-max`;
  const unknownId = `iv-${statKey}-unknown`;

  return (
    <>
      <Label htmlFor={minId} className="font-mono tabular-nums text-sm font-medium">
        {label}
      </Label>
      <Input
        id={minId}
        className="w-14 px-1 text-center font-mono tabular-nums"
        inputMode="numeric"
        value={minInput.text}
        onChange={(e) => minInput.setText(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={() => onMinChange(minInput.commit())}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        disabled={disabled || isUnknown}
        placeholder={isUnknown ? '?' : '0'}
        aria-label={`${label} min`}
      />
      <Input
        id={maxId}
        className="w-14 px-1 text-center font-mono tabular-nums"
        inputMode="numeric"
        value={maxInput.text}
        onChange={(e) => maxInput.setText(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={() => onMaxChange(maxInput.commit())}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        disabled={disabled || isUnknown}
        placeholder={isUnknown ? '?' : '31'}
        aria-label={`${label} max`}
      />
      {showUnknown && (
        <div className="flex items-center gap-1">
          <Checkbox
            id={unknownId}
            checked={isUnknown}
            onCheckedChange={(checked) => onUnknownChange(checked === true)}
            disabled={disabled}
            aria-label={`${label} unknown`}
          />
        </div>
      )}
      <RangeError id={errorId} invalid={invalid} />
    </>
  );
}

function IvRangeInput({ value, onChange, disabled }: IvRangeInputProps) {
  const language = useUiStore((s) => s.language);

  const gridCols = 'grid-cols-[auto_1fr_1fr_auto]';

  return (
    <div>
      <div className={cn('grid items-center gap-x-2 gap-y-0 mb-1', gridCols)}>
        <span className="text-xs text-muted-foreground" />
        <span className="text-xs text-muted-foreground text-center">min</span>
        <span className="text-xs text-muted-foreground text-center">max</span>
        <span className="text-xs text-muted-foreground text-center">
          <Trans>Any</Trans>
        </span>
      </div>
      <div className={cn('grid items-center gap-x-2 gap-y-1', gridCols)}>
        {IV_STAT_KEYS.map((key) => {
          const isUnknown = !isIvRangeEnabled(value, key);
          return (
            <IvStatRow
              key={key}
              label={getStatLabel(key, language)}
              statKey={key}
              min={value[key][0]}
              max={Math.min(31, value[key][1])}
              disabled={disabled}
              onMinChange={(min) => {
                onChange({ ...value, [key]: [min, value[key][1]] });
              }}
              onMaxChange={(max) => {
                onChange({ ...value, [key]: [value[key][0], max] });
              }}
              showUnknown
              isUnknown={isUnknown}
              onUnknownChange={(checked) => {
                onChange({
                  ...value,
                  [key]: [value[key][0], Math.min(31, value[key][1])],
                  enabledStats: { ...value.enabledStats, [key]: !checked },
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export type { IvRangeInputProps };
export { IvRangeInput };
