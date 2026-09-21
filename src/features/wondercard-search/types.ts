import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg.js';
import type { WonderCardRunSettings } from '@/features/wondercard-list/types';
import {
  isDateRangeValid,
  isTimeRangeValid,
  areTimer0VCountRangesValid,
} from '@/lib/range-validation';

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

export function validateWonderCardSearchRange(
  form: WonderCardSearchRange,
  ranges: Timer0VCountRange[]
): WonderCardSearchValidationCode[] {
  const errors: WonderCardSearchValidationCode[] = [];
  if (!isDateRangeValid(form.dateRange)) errors.push('DATE_RANGE_INVALID');
  if (!isTimeRangeValid(form.timeRange)) errors.push('TIME_RANGE_INVALID');
  if (!areTimer0VCountRangesValid(ranges)) errors.push('STARTUP_RANGE_INVALID');
  return errors;
}
