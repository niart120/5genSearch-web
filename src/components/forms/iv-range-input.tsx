import * as React from 'react';
import { Trans } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getStatLabel, IV_STAT_KEYS } from '@/lib/game-data-names';
import type { IvStatKey } from '@/lib/game-data-names';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import { useUiStore } from '@/stores/settings/ui';
import type { IvFilter } from '@/wasm/wasm_pkg';

const IV_MIN = 0;
const IV_MAX = 31;
const IV_MAX_WITH_UNKNOWN = 32;

type IvRangeValue = Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>;

interface IvRangeInputProps {
  /** 現在の IV フィルタ値 (6 ステータスの min/max) */
  value: IvRangeValue;
  /** 値変更コールバック */
  onChange: (value: IvRangeValue) => void;
  /**
   * 「不明(任意)」トグルを表示するかどうか。
   * true の場合、各ステータス行に Checkbox を表示し、
   * ON にすると max=32 (IV_VALUE_UNKNOWN を含む任意) として扱う。
   */
  allowUnknown?: boolean;
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
  const [localMin, setLocalMin] = React.useState(String(min));
  const [localMax, setLocalMax] = React.useState(String(max));

  React.useEffect(() => {
    setLocalMin(isUnknown ? '' : String(min));
  }, [min, isUnknown]);

  React.useEffect(() => {
    setLocalMax(isUnknown ? '' : String(max > IV_MAX ? '' : max));
  }, [max, isUnknown]);

  const handleMinBlur = () => {
    const clamped = clampOrDefault(localMin, {
      defaultValue: IV_MIN,
      min: IV_MIN,
      max: IV_MAX,
    });
    setLocalMin(String(clamped));
    onMinChange(clamped);
  };

  const handleMaxBlur = () => {
    const clamped = clampOrDefault(localMax, {
      defaultValue: IV_MAX,
      min: IV_MIN,
      max: IV_MAX,
    });
    setLocalMax(String(clamped));
    onMaxChange(clamped);
  };

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
        value={localMin}
        onChange={(e) => setLocalMin(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={handleMinBlur}
        disabled={disabled || isUnknown}
        placeholder={isUnknown ? '?' : '0'}
        aria-label={`${label} min`}
      />
      <Input
        id={maxId}
        className="w-14 px-1 text-center font-mono tabular-nums"
        inputMode="numeric"
        value={localMax}
        onChange={(e) => setLocalMax(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={handleMaxBlur}
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
    </>
  );
}

function IvRangeInput({ value, onChange, allowUnknown, disabled }: IvRangeInputProps) {
  const language = useUiStore((s) => s.language);

  const gridCols = allowUnknown ? 'grid-cols-[auto_1fr_1fr_auto]' : 'grid-cols-[auto_1fr_1fr]';

  return (
    <div>
      <div className={cn('grid items-center gap-x-2 gap-y-0 mb-1', gridCols)}>
        <span className="text-xs text-muted-foreground" />
        <span className="text-xs text-muted-foreground text-center">min</span>
        <span className="text-xs text-muted-foreground text-center">max</span>
        {allowUnknown && (
          <span className="text-xs text-muted-foreground text-center">
            <Trans>Any</Trans>
          </span>
        )}
      </div>
      <div className={cn('grid items-center gap-x-2 gap-y-1', gridCols)}>
        {IV_STAT_KEYS.map((key) => {
          const isUnknown = value[key][1] === IV_MAX_WITH_UNKNOWN;
          return (
            <IvStatRow
              key={key}
              label={getStatLabel(key, language)}
              statKey={key}
              min={value[key][0]}
              max={value[key][1]}
              disabled={disabled}
              onMinChange={(min) => {
                const clampedMin = Math.min(min, value[key][1]);
                onChange({ ...value, [key]: [clampedMin, value[key][1]] });
              }}
              onMaxChange={(max) => {
                const clampedMax = Math.max(max, value[key][0]);
                onChange({ ...value, [key]: [value[key][0], clampedMax] });
              }}
              showUnknown={allowUnknown}
              isUnknown={isUnknown}
              onUnknownChange={(checked) => {
                onChange({
                  ...value,
                  [key]: checked ? [IV_MIN, IV_MAX_WITH_UNKNOWN] : [IV_MIN, IV_MAX],
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
