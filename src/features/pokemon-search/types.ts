import { normalizePokemonSearchFilter } from '@/lib/search-filter-context';
import {
  isDateRangeValid,
  isTimeRangeValid,
  areTimer0VCountRangesValid,
  isIntegerRangeValid,
} from '@/lib/range-validation';
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

export function validatePokemonSearchForm(
  form: PokemonSearchForm,
  trainer: { tid?: number; sid?: number },
  ranges: Timer0VCountRange[]
): PokemonSearchValidationCode[] {
  const errors: PokemonSearchValidationCode[] = [];
  if (!isDateRangeValid(form.dateRange)) errors.push('DATE_RANGE_INVALID');
  if (!isTimeRangeValid(form.timeRange)) errors.push('TIME_RANGE_INVALID');
  if (!areTimer0VCountRangesValid(ranges)) errors.push('STARTUP_RANGE_INVALID');
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
  if (level && !isIntegerRangeValid(level[0], level[1], 1, 100)) errors.push('LEVEL_RANGE_INVALID');
  if (appliedFilter.shiny !== undefined) {
    if (trainer.tid === undefined) errors.push('TID_REQUIRED');
    if (trainer.sid === undefined) errors.push('SID_REQUIRED');
  }
  return errors;
}
