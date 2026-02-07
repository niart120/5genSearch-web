import * as React from 'react';
import { Trans } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import type { DateRangeParams } from '@/wasm/wasm_pkg';

interface DateRangePickerProps {
  /** 現在の日付範囲 */
  value: DateRangeParams;
  /** 値変更コールバック */
  onChange: (value: DateRangeParams) => void;
  /** 無効化 */
  disabled?: boolean;
}

interface DateFieldProps {
  yearValue: number;
  monthValue: number;
  dayValue: number;
  onYearChange: (v: number) => void;
  onMonthChange: (v: number) => void;
  onDayChange: (v: number) => void;
  yearDefault: number;
  monthDefault: number;
  dayDefault: number;
  disabled?: boolean;
  prefix: string;
}

function DateField({
  yearValue,
  monthValue,
  dayValue,
  onYearChange,
  onMonthChange,
  onDayChange,
  yearDefault,
  monthDefault,
  dayDefault,
  disabled,
  prefix,
}: DateFieldProps) {
  const [localYear, setLocalYear] = React.useState(String(yearValue));
  const [localMonth, setLocalMonth] = React.useState(String(monthValue));
  const [localDay, setLocalDay] = React.useState(String(dayValue));

  React.useEffect(() => setLocalYear(String(yearValue)), [yearValue]);
  React.useEffect(() => setLocalMonth(String(monthValue)), [monthValue]);
  React.useEffect(() => setLocalDay(String(dayValue)), [dayValue]);

  return (
    <div className="flex items-center gap-1">
      <Input
        id={`${prefix}-year`}
        className="w-16 px-1 text-center font-mono tabular-nums"
        inputMode="numeric"
        value={localYear}
        onChange={(e) => setLocalYear(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={() => {
          const v = clampOrDefault(localYear, { defaultValue: yearDefault, min: 2000, max: 2099 });
          setLocalYear(String(v));
          onYearChange(v);
        }}
        disabled={disabled}
        aria-label={`${prefix} year`}
      />
      <span className="text-sm text-muted-foreground">/</span>
      <Input
        id={`${prefix}-month`}
        className="w-12 px-1 text-center font-mono tabular-nums"
        inputMode="numeric"
        value={localMonth}
        onChange={(e) => setLocalMonth(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={() => {
          const v = clampOrDefault(localMonth, { defaultValue: monthDefault, min: 1, max: 12 });
          setLocalMonth(String(v));
          onMonthChange(v);
        }}
        disabled={disabled}
        aria-label={`${prefix} month`}
      />
      <span className="text-sm text-muted-foreground">/</span>
      <Input
        id={`${prefix}-day`}
        className="w-12 px-1 text-center font-mono tabular-nums"
        inputMode="numeric"
        value={localDay}
        onChange={(e) => setLocalDay(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={() => {
          const v = clampOrDefault(localDay, { defaultValue: dayDefault, min: 1, max: 31 });
          setLocalDay(String(v));
          onDayChange(v);
        }}
        disabled={disabled}
        aria-label={`${prefix} day`}
      />
    </div>
  );
}

function DateRangePicker({ value, onChange, disabled }: DateRangePickerProps) {
  return (
    <div className={cn('flex flex-col gap-2 md:flex-row md:items-end md:gap-3')}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="date-start-year" className="text-xs text-muted-foreground">
          <Trans>開始日</Trans>
        </Label>
        <DateField
          yearValue={value.start_year}
          monthValue={value.start_month}
          dayValue={value.start_day}
          onYearChange={(v) => onChange({ ...value, start_year: v })}
          onMonthChange={(v) => onChange({ ...value, start_month: v })}
          onDayChange={(v) => onChange({ ...value, start_day: v })}
          yearDefault={2000}
          monthDefault={1}
          dayDefault={1}
          disabled={disabled}
          prefix="date-start"
        />
      </div>
      <span className="self-center text-sm text-muted-foreground">〜</span>
      <div className="flex flex-col gap-1">
        <Label htmlFor="date-end-year" className="text-xs text-muted-foreground">
          <Trans>終了日</Trans>
        </Label>
        <DateField
          yearValue={value.end_year}
          monthValue={value.end_month}
          dayValue={value.end_day}
          onYearChange={(v) => onChange({ ...value, end_year: v })}
          onMonthChange={(v) => onChange({ ...value, end_month: v })}
          onDayChange={(v) => onChange({ ...value, end_day: v })}
          yearDefault={2099}
          monthDefault={12}
          dayDefault={31}
          disabled={disabled}
          prefix="date-end"
        />
      </div>
    </div>
  );
}

export type { DateRangePickerProps };
export { DateRangePicker };
