import * as React from 'react';
import { Trans } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/utils';
import type { TimeRangeParams } from '@/wasm/wasm_pkg';

interface TimeRangePickerProps {
  /** 現在の時刻範囲 */
  value: TimeRangeParams;
  /** 値変更コールバック */
  onChange: (value: TimeRangeParams) => void;
  /** 無効化 */
  disabled?: boolean;
}

interface TimeAxisFieldProps {
  label: React.ReactNode;
  startValue: number;
  endValue: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  startDefault: number;
  endDefault: number;
  min: number;
  max: number;
  disabled?: boolean;
  prefix: string;
}

function TimeAxisField({
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startDefault,
  endDefault,
  min,
  max,
  disabled,
  prefix,
}: TimeAxisFieldProps) {
  const [localStart, setLocalStart] = React.useState(String(startValue));
  const [localEnd, setLocalEnd] = React.useState(String(endValue));

  React.useEffect(() => setLocalStart(String(startValue)), [startValue]);
  React.useEffect(() => setLocalEnd(String(endValue)), [endValue]);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`${prefix}-start`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={`${prefix}-start`}
          className="w-12 px-1 text-center font-mono tabular-nums"
          inputMode="numeric"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          onFocus={handleFocusSelectAll}
          onBlur={() => {
            const v = clampOrDefault(localStart, { defaultValue: startDefault, min, max });
            setLocalStart(String(v));
            onStartChange(v);
          }}
          disabled={disabled}
          aria-label={`${prefix} start`}
        />
        <span className="text-sm text-muted-foreground">〜</span>
        <Input
          id={`${prefix}-end`}
          className="w-12 px-1 text-center font-mono tabular-nums"
          inputMode="numeric"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          onFocus={handleFocusSelectAll}
          onBlur={() => {
            const v = clampOrDefault(localEnd, { defaultValue: endDefault, min, max });
            setLocalEnd(String(v));
            onEndChange(v);
          }}
          disabled={disabled}
          aria-label={`${prefix} end`}
        />
      </div>
    </div>
  );
}

function TimeRangePicker({ value, onChange, disabled }: TimeRangePickerProps) {
  return (
    <div className={cn('flex flex-col gap-2 md:flex-row md:items-end md:gap-2')}>
      <TimeAxisField
        label={<Trans>時</Trans>}
        startValue={value.hour_start}
        endValue={value.hour_end}
        onStartChange={(v) => onChange({ ...value, hour_start: v })}
        onEndChange={(v) => onChange({ ...value, hour_end: v })}
        startDefault={0}
        endDefault={23}
        min={0}
        max={23}
        disabled={disabled}
        prefix="time-hour"
      />
      <span className="self-end pb-2 text-sm text-muted-foreground hidden md:block">:</span>
      <TimeAxisField
        label={<Trans>分</Trans>}
        startValue={value.minute_start}
        endValue={value.minute_end}
        onStartChange={(v) => onChange({ ...value, minute_start: v })}
        onEndChange={(v) => onChange({ ...value, minute_end: v })}
        startDefault={0}
        endDefault={59}
        min={0}
        max={59}
        disabled={disabled}
        prefix="time-minute"
      />
      <span className="self-end pb-2 text-sm text-muted-foreground hidden md:block">:</span>
      <TimeAxisField
        label={<Trans>秒</Trans>}
        startValue={value.second_start}
        endValue={value.second_end}
        onStartChange={(v) => onChange({ ...value, second_start: v })}
        onEndChange={(v) => onChange({ ...value, second_end: v })}
        startDefault={0}
        endDefault={59}
        min={0}
        max={59}
        disabled={disabled}
        prefix="time-second"
      />
    </div>
  );
}

export type { TimeRangePickerProps };
export { TimeRangePicker };
