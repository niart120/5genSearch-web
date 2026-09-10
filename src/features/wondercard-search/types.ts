import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg.js';
import type { WonderCardRunSettings } from '@/features/wondercard-list/types';

export interface WonderCardSearchRange {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
}

export interface WonderCardSearchRequest extends WonderCardSearchRange {
  settings: WonderCardRunSettings;
}

export function getWonderCardSearchContext(
  request: WonderCardSearchRequest
): DatetimeSearchContext {
  return {
    ds: request.settings.ds,
    ranges: request.settings.ranges,
    date_range: request.dateRange,
    time_range: request.timeRange,
    key_spec: request.keySpec,
  };
}

export type WonderCardSearchValidationCode =
  | 'DATE_RANGE_INVALID'
  | 'TIME_RANGE_INVALID'
  | 'STARTUP_RANGE_INVALID';

function validDate(y: number, m: number, day: number) {
  const date = new Date(Date.UTC(y, m - 1, day));
  return (
    Number.isInteger(y) &&
    y >= 2000 &&
    y <= 2099 &&
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === day
  );
}

export function validateWonderCardSearchRange(
  form: WonderCardSearchRange,
  ranges: Timer0VCountRange[]
): WonderCardSearchValidationCode[] {
  const errors: WonderCardSearchValidationCode[] = [];
  const d = form.dateRange;
  if (
    !validDate(d.start_year, d.start_month, d.start_day) ||
    !validDate(d.end_year, d.end_month, d.end_day) ||
    Date.UTC(d.start_year, d.start_month - 1, d.start_day) >
      Date.UTC(d.end_year, d.end_month - 1, d.end_day)
  )
    errors.push('DATE_RANGE_INVALID');
  const t = form.timeRange;
  if (
    [
      [t.hour_start, t.hour_end, 23],
      [t.minute_start, t.minute_end, 59],
      [t.second_start, t.second_end, 59],
    ].some(
      ([min, max, limit]) =>
        !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || min > max || max > limit
    )
  )
    errors.push('TIME_RANGE_INVALID');
  if (
    ranges.length === 0 ||
    ranges.some(
      (r) =>
        Object.values(r).some((v) => !Number.isInteger(v) || v < 0 || v > 65_535) ||
        r.timer0_min > r.timer0_max ||
        r.vcount_min > r.vcount_max
    )
  )
    errors.push('STARTUP_RANGE_INVALID');
  return errors;
}
