import { IV_STAT_KEYS } from '@/lib/game-data-names';
import type {
  DateRangeParams,
  IvFilter,
  TimeRangeParams,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg';

/** 入力順には手を加えず、確定した両端を検証する。 */
export function isIntegerRangeValid(
  min: number,
  max: number,
  lower: number,
  upper: number
): boolean {
  return (
    Number.isInteger(min) && Number.isInteger(max) && lower <= min && min <= max && max <= upper
  );
}

/** UI の任意/OFF/非表示条件を取り除いた後のフィルターを受け取る。 */
export function isIvFilterRangeValid(iv: IvFilter | undefined): boolean {
  return !iv || IV_STAT_KEYS.every((key) => isIntegerRangeValid(iv[key][0], iv[key][1], 0, 31));
}

function isDateValid(year: number, month: number, day: number): boolean {
  if (![year, month, day].every((value) => Number.isInteger(value)) || year < 2000 || year > 2099)
    return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isDateRangeValid(range: DateRangeParams): boolean {
  return (
    isDateValid(range.start_year, range.start_month, range.start_day) &&
    isDateValid(range.end_year, range.end_month, range.end_day) &&
    Date.UTC(range.start_year, range.start_month - 1, range.start_day) <=
      Date.UTC(range.end_year, range.end_month - 1, range.end_day)
  );
}

export function isTimeRangeValid(range: TimeRangeParams): boolean {
  return (
    isIntegerRangeValid(range.hour_start, range.hour_end, 0, 23) &&
    isIntegerRangeValid(range.minute_start, range.minute_end, 0, 59) &&
    isIntegerRangeValid(range.second_start, range.second_end, 0, 59)
  );
}

export function isTimer0VCountRangeValid(range: Timer0VCountRange): boolean {
  return (
    isIntegerRangeValid(range.timer0_min, range.timer0_max, 0, 0xff_ff) &&
    isIntegerRangeValid(range.vcount_min, range.vcount_max, 0, 0xff)
  );
}

export function areTimer0VCountRangesValid(ranges: Timer0VCountRange[]): boolean {
  return ranges.length > 0 && ranges.every((range) => isTimer0VCountRangeValid(range));
}
