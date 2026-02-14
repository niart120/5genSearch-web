/**
 * DatetimeInput: 単一日時入力 (YYYY/MM/DD HH:MM:SS)
 *
 * 全フィールドが SpinnerNumField で構成される。
 * スピナーはボタン操作に加え、ホイールスクロールと ArrowUp/Down キーにも対応。
 */

import { useState, useCallback, useRef, useEffect, type ReactElement } from 'react';
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

/** スピナー (上下ボタン + ホイール + ArrowUp/Down) 付き NumField */
function SpinnerNumField({ step = 1, ...props }: SpinnerNumFieldProps): ReactElement {
  const { value, onChange, min, max, disabled } = props;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const increment = useCallback(() => {
    const next = Math.min(value + step, max);
    onChange(next);
  }, [value, step, max, onChange]);

  const decrement = useCallback(() => {
    const next = Math.max(value - step, min);
    onChange(next);
  }, [value, step, min, onChange]);

  // ホイールスクロールによるスピン
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || disabled) return;

    function handleWheel(e: WheelEvent) {
      // input にフォーカスがある場合のみ反応
      if (document.activeElement?.tagName !== 'INPUT') return;
      if (!el!.contains(document.activeElement)) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        const next = Math.min(value + step, max);
        onChange(next);
      } else if (e.deltaY > 0) {
        const next = Math.max(value - step, min);
        onChange(next);
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [value, step, min, max, onChange, disabled]);

  // ArrowUp / ArrowDown キーによるスピン
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        increment();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        decrement();
      }
    },
    [increment, decrement]
  );

  return (
    <div ref={wrapperRef} className="flex flex-col items-center gap-0.5" onKeyDown={handleKeyDown}>
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

/** 指定年月の日数を返す */
function getDaysInMonth(year: number, month: number): number {
  // month: 1-12
  const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return DAYS[month];
}

interface DatetimeInputProps {
  value: Datetime;
  onChange: (value: Datetime) => void;
  disabled?: boolean;
}

/**
 * 単一日時入力 (YYYY / MM / DD  HH : MM : SS)
 *
 * 全フィールドが SpinnerNumField (上下ボタン + ホイール + ArrowKey) で構成される。
 * 年月変更時に day を自動 clamp し、不正な日付を防ぐ。
 */
function DatetimeInput({ value, onChange, disabled }: DatetimeInputProps): ReactElement {
  /** day を clamp しつつ更新 */
  const updateWithDayClamp = useCallback(
    (patch: Partial<Datetime>) => {
      const next = { ...value, ...patch };
      const maxDay = getDaysInMonth(next.year, next.month);
      if (next.day > maxDay) next.day = maxDay;
      onChange(next);
    },
    [value, onChange]
  );

  const update = useCallback(
    (field: keyof Datetime, v: number) => {
      if (field === 'year' || field === 'month') {
        updateWithDayClamp({ [field]: v });
      } else {
        onChange({ ...value, [field]: v });
      }
    },
    [value, onChange, updateWithDayClamp]
  );

  const maxDay = getDaysInMonth(value.year, value.month);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 日付: スピナー付き Year / Month / Day */}
      <div className="flex items-center gap-0.5">
        <SpinnerNumField
          id="startup-year"
          value={value.year}
          onChange={(v) => update('year', v)}
          defaultValue={2000}
          min={2000}
          max={2099}
          disabled={disabled}
          label="year"
          className="w-12"
          padLength={4}
        />
        <span className="text-sm text-muted-foreground">/</span>
        <SpinnerNumField
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
        <SpinnerNumField
          id="startup-day"
          value={value.day}
          onChange={(v) => update('day', v)}
          defaultValue={1}
          min={1}
          max={maxDay}
          disabled={disabled}
          label="day"
          className="w-8"
          padLength={2}
        />
      </div>

      {/* 時刻: スピナー付き HH : MM : SS */}
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
