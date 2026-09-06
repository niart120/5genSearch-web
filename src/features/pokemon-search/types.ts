import { normalizePokemonSearchFilter } from '@/lib/search-filter-context';
import type { PokemonSearchFilterInput as PokemonDatetimeSearchFilter } from '@/lib/search-filter-context';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  PokemonGenerationParams,
  GenerationConfig,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg.js';
import type { EncounterParamsOutput } from '@/features/pokemon-list/types';

export const EMPTY_POKEMON_SEARCH_FILTER: PokemonDatetimeSearchFilter = {
  shiny: undefined,
  natures: undefined,
  species_ids: undefined,
  gender: undefined,
  ability_slot: undefined,
  level_range: undefined,
};

export interface PokemonSearchForm {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  encounterParams: EncounterParamsOutput;
  filter: PokemonDatetimeSearchFilter;
}

/** 確認ダイアログ・検索結果・転記が同じ開始時設定を参照する。 */
export interface PokemonSearchRequest {
  context: DatetimeSearchContext;
  pokemonParams: PokemonGenerationParams;
  genConfig: GenerationConfig;
  filter: PokemonDatetimeSearchFilter;
  encounterParams: EncounterParamsOutput;
}

export type PokemonSearchValidationCode =
  | 'DATE_RANGE_INVALID'
  | 'TIME_RANGE_INVALID'
  | 'STARTUP_RANGE_INVALID'
  | 'ADVANCE_RANGE_INVALID'
  | 'ENCOUNTER_SLOTS_EMPTY'
  | 'ENCOUNTER_UNSUPPORTED'
  | 'LEVEL_RANGE_INVALID'
  | 'TID_REQUIRED'
  | 'SID_REQUIRED';

const validDate = (year: number, month: number, day: number) => {
  const value = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 2000 &&
    year <= 2099 &&
    value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
  );
};

export function validatePokemonSearchForm(
  form: PokemonSearchForm,
  trainer: { tid?: number; sid?: number },
  ranges: Timer0VCountRange[]
): PokemonSearchValidationCode[] {
  const errors: PokemonSearchValidationCode[] = [];
  const date = form.dateRange;

  if (
    !validDate(date.start_year, date.start_month, date.start_day) ||
    !validDate(date.end_year, date.end_month, date.end_day) ||
    Date.UTC(date.start_year, date.start_month - 1, date.start_day) >
      Date.UTC(date.end_year, date.end_month - 1, date.end_day)
  )
    errors.push('DATE_RANGE_INVALID');
  const time = form.timeRange;
  if (
    [
      [time.hour_start, time.hour_end, 23],
      [time.minute_start, time.minute_end, 59],
      [time.second_start, time.second_end, 59],
    ].some(
      ([min, max, limit]) =>
        !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || min > max || max > limit
    )
  )
    errors.push('TIME_RANGE_INVALID');
  if (
    ranges.length === 0 ||
    ranges.some(
      (range) => range.timer0_min > range.timer0_max || range.vcount_min > range.vcount_max
    )
  )
    errors.push('STARTUP_RANGE_INVALID');
  const config = form.encounterParams.genConfig;
  if (
    !Number.isInteger(config.user_offset) ||
    !Number.isInteger(config.max_advance) ||
    config.user_offset < 0 ||
    config.max_advance < config.user_offset ||
    config.max_advance >= 0xff_ff_ff_ff
  )
    errors.push('ADVANCE_RANGE_INVALID');
  if (form.encounterParams.slots.length === 0) errors.push('ENCOUNTER_SLOTS_EMPTY');
  if (
    form.encounterParams.encounterType === 'HiddenGrotto' ||
    form.encounterParams.encounterType === 'Egg'
  )
    errors.push('ENCOUNTER_UNSUPPORTED');
  const appliedFilter = normalizePokemonSearchFilter(form.filter, form.encounterParams);
  const level = appliedFilter.level_range;
  if (
    level &&
    (!level.every((value) => Number.isInteger(value)) ||
      level[0] < 1 ||
      level[1] > 100 ||
      level[0] > level[1])
  )
    errors.push('LEVEL_RANGE_INVALID');
  if (appliedFilter.shiny !== undefined) {
    if (trainer.tid === undefined) errors.push('TID_REQUIRED');
    if (trainer.sid === undefined) errors.push('SID_REQUIRED');
  }
  return errors;
}
