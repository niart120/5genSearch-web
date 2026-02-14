/**
 * DatetimeInput — 単一日時入力 (YYYY/MM/DD HH:MM:SS)
 *
 * 全フィールドが SpinnerNumField で構成される。
 * 年月変更時に day を自動 clamp し、不正な日付を防ぐ。
 */

import { useCallback, type ReactElement } from 'react';
import { SpinnerNumField } from '@/components/ui/spinner-num-field';
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
// Helpers
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

// ---------------------------------------------------------------------------
// DatetimeInput
// ---------------------------------------------------------------------------

interface DatetimeInputProps {
  value: Datetime;
  onChange: (value: Datetime) => void;
  disabled?: boolean;
}

/**
 * 単一日時入力 (YYYY / MM / DD  HH : MM : SS)
 *
 * 全フィールドが SpinnerNumField (上下ボタン) で構成される。
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

export { DatetimeInput, DEFAULT_DATETIME };
export type { DatetimeInputProps };
