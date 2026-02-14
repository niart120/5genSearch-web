/**
 * DatetimeInput: 単一日時入力 (YYYY/MM/DD HH:MM:SS)
 *
 * - 日付: `<input type="date">` (ネイティブカレンダーピッカー)
 * - 時刻: NumField × 3 + スピナー (上下ボタン)
 */

import { useState, useCallback, type ReactElement } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clampOrDefault } from './input-helpers';
import type { Datetime } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DATETIME: Datetime = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
};

// ---------------------------------------------------------------------------
// NumField
// ---------------------------------------------------------------------------

interface NumFieldProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  min: number;
  max: number;
  disabled?: boolean;
  label: string;
  className?: string;
  /** ゼロ埋め桁数 (0 = 埋めなし) */
  padLength?: number;
}

/** clamp-on-blur 付き数値入力フィールド */
function NumField({
  id,
  value,
  onChange,
  defaultValue,
  min,
  max,
  disabled,
  label,
  className,
  padLength = 0,
}: NumFieldProps): ReactElement {
  // undefined = 未編集 (prop 値を表示)、string = 編集中 (ローカルバッファ)
  const [localInput, setLocalInput] = useState<string | undefined>();
  const formatValue = (v: number): string =>
    padLength > 0 ? String(v).padStart(padLength, '0') : String(v);
  const displayValue = localInput ?? formatValue(value);

  return (
    <Input
      id={id}
      className={cn('h-7 px-0 text-center font-mono tabular-nums', className)}
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => setLocalInput(e.target.value)}
      onFocus={(e) => {
        setLocalInput(String(value));
        e.target.select();
      }}
      onBlur={() => {
        if (localInput !== undefined) {
          const v = clampOrDefault(localInput, { defaultValue, min, max });
          onChange(v);
        }
        setLocalInput(undefined);
      }}
      disabled={disabled}
      aria-label={label}
    />
  );
}

// ---------------------------------------------------------------------------
// SpinnerNumField
// ---------------------------------------------------------------------------

interface SpinnerNumFieldProps extends NumFieldProps {
  step?: number;
}

/** スピナー (上下ボタン) 付き NumField */
function SpinnerNumField({ step = 1, ...props }: SpinnerNumFieldProps): ReactElement {
  const { value, onChange, min, max, disabled } = props;

  const increment = useCallback(() => {
    const next = Math.min(value + step, max);
    onChange(next);
  }, [value, step, max, onChange]);

  const decrement = useCallback(() => {
    const next = Math.max(value - step, min);
    onChange(next);
  }, [value, step, min, onChange]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5"
        disabled={disabled || value >= max}
        onClick={increment}
        tabIndex={-1}
        aria-label={`Increase ${props.label}`}
      >
        <ChevronUp className="size-3" />
      </Button>
      <NumField {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5"
        disabled={disabled || value <= min}
        onClick={decrement}
        tabIndex={-1}
        aria-label={`Decrease ${props.label}`}
      >
        <ChevronDown className="size-3" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DatetimeInput
// ---------------------------------------------------------------------------

/** YYYY-MM-DD 文字列を Datetime の年月日に分解 */
function parseDateString(
  dateStr: string
): { year: number; month: number; day: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return undefined;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/** Datetime の年月日を YYYY-MM-DD 文字列に変換 */
function toDateString(dt: Datetime): string {
  return `${dt.year}-${String(dt.month).padStart(2, '0')}-${String(dt.day).padStart(2, '0')}`;
}

interface DatetimeInputProps {
  value: Datetime;
  onChange: (value: Datetime) => void;
  disabled?: boolean;
}

/**
 * 単一日時入力 (YYYY/MM/DD HH:MM:SS)
 *
 * - 日付: `<input type="date">` (ネイティブカレンダーピッカー)
 * - 時刻: SpinnerNumField × 3 (上下ボタン付き)
 */
function DatetimeInput({ value, onChange, disabled }: DatetimeInputProps): ReactElement {
  const update = useCallback(
    (field: keyof Datetime, v: number) => {
      onChange({ ...value, [field]: v });
    },
    [value, onChange]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseDateString(e.target.value);
      if (!parsed) return;
      onChange({
        ...value,
        year: Math.max(2000, Math.min(2099, parsed.year)),
        month: parsed.month,
        day: parsed.day,
      });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 日付: ネイティブ date picker */}
      <Input
        type="date"
        min="2000-01-01"
        max="2099-12-31"
        value={toDateString(value)}
        onChange={handleDateChange}
        disabled={disabled}
        className="h-7 w-auto font-mono"
        aria-label="date"
      />

      <span className="text-sm text-muted-foreground" />

      {/* 時刻: スピナー付き NumField */}
      <div className="flex items-center gap-0.5">
        <SpinnerNumField
          id="startup-hour"
          value={value.hour}
          onChange={(v) => update('hour', v)}
          defaultValue={0}
          min={0}
          max={23}
          disabled={disabled}
          label="hour"
          className="w-8"
          padLength={2}
        />
        <span className="text-sm text-muted-foreground">:</span>
        <SpinnerNumField
          id="startup-minute"
          value={value.minute}
          onChange={(v) => update('minute', v)}
          defaultValue={0}
          min={0}
          max={59}
          disabled={disabled}
          label="minute"
          className="w-8"
          padLength={2}
        />
        <span className="text-sm text-muted-foreground">:</span>
        <SpinnerNumField
          id="startup-second"
          value={value.second}
          onChange={(v) => update('second', v)}
          defaultValue={0}
          min={0}
          max={59}
          disabled={disabled}
          label="second"
          className="w-8"
          padLength={2}
        />
      </div>
    </div>
  );
}

export { DatetimeInput, NumField, SpinnerNumField, DEFAULT_DATETIME };
export type { DatetimeInputProps, NumFieldProps, SpinnerNumFieldProps };
