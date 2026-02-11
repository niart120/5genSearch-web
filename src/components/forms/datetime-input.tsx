/**
 * DatetimeInput: 単一日時入力 (YYYY/MM/DD HH:MM:SS)
 *
 * clamp-on-blur 付き数値入力 NumField と、それを 6 フィールド並べた
 * 1 行レイアウトを提供する。
 */

import { useState, useCallback, type ReactElement } from 'react';
import { Input } from '@/components/ui/input';
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
// DatetimeInput
// ---------------------------------------------------------------------------

interface DatetimeInputProps {
  value: Datetime;
  onChange: (value: Datetime) => void;
  disabled?: boolean;
}

/** 単一日時入力 (YYYY/MM/DD HH:MM:SS) — 1 行レイアウト */
function DatetimeInput({ value, onChange, disabled }: DatetimeInputProps): ReactElement {
  const update = useCallback(
    (field: keyof Datetime, v: number) => {
      onChange({ ...value, [field]: v });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      <NumField
        id="startup-year"
        value={value.year}
        onChange={(v) => update('year', v)}
        defaultValue={2000}
        min={2000}
        max={2099}
        disabled={disabled}
        label="year"
        className="w-12"
      />
      <span className="text-sm text-muted-foreground">/</span>
      <NumField
        id="startup-month"
        value={value.month}
        onChange={(v) => update('month', v)}
        defaultValue={1}
        min={1}
        max={12}
        disabled={disabled}
        label="month"
        className="w-8"
        padLength={2}
      />
      <span className="text-sm text-muted-foreground">/</span>
      <NumField
        id="startup-day"
        value={value.day}
        onChange={(v) => update('day', v)}
        defaultValue={1}
        min={1}
        max={31}
        disabled={disabled}
        label="day"
        className="w-8"
        padLength={2}
      />
      <span className="mx-0.5 text-sm text-muted-foreground" />
      <NumField
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
      <NumField
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
      <NumField
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
  );
}

export { DatetimeInput, NumField, DEFAULT_DATETIME };
export type { DatetimeInputProps, NumFieldProps };
