import { DEFAULT_ENCOUNTER_PARAMS } from '@/features/pokemon-list/types';
import {
  EMPTY_POKEMON_SEARCH_FILTER,
  type PokemonSearchRequest,
} from '@/features/pokemon-search/types';

export function createPokemonSearchRequest(): PokemonSearchRequest {
  return {
    context: {
      ds: { mac: [0, 9, 191, 18, 52, 86], hardware: 'DsLite', version: 'Black', region: 'Jpn' },
      date_range: {
        start_year: 2024,
        start_month: 1,
        start_day: 1,
        end_year: 2024,
        end_month: 1,
        end_day: 1,
      },
      time_range: {
        hour_start: 0,
        hour_end: 0,
        minute_start: 0,
        minute_end: 0,
        second_start: 0,
        second_end: 6,
      },
      key_spec: { available_buttons: [] },
      ranges: [{ timer0_min: 3193, timer0_max: 3193, vcount_min: 96, vcount_max: 96 }],
    },
    pokemonParams: {
      trainer: { tid: 0, sid: 0 },
      encounter_type: 'StaticSymbol',
      encounter_method: 'Stationary',
      lead_ability: 'None',
      slots: [
        {
          species_id: 638,
          level_min: 42,
          level_max: 42,
          gender_ratio: 'Genderless',
          has_held_item: false,
          shiny_locked: false,
        },
      ],
    },
    genConfig: {
      version: 'Black',
      game_start: {
        start_mode: 'Continue',
        save: 'WithSave',
        memory_link: 'Disabled',
        shiny_charm: 'NotObtained',
      },
      user_offset: 6,
      max_advance: 30,
    },
    filter: { ...EMPTY_POKEMON_SEARCH_FILTER },
    encounterParams: {
      ...structuredClone(DEFAULT_ENCOUNTER_PARAMS),
      encounterType: 'StaticSymbol',
      staticEntryId: 'cobalion',
      slots: [
        {
          species_id: 638,
          level_min: 42,
          level_max: 42,
          gender_ratio: 'Genderless',
          has_held_item: false,
          shiny_locked: false,
        },
      ],
      genConfig: { user_offset: 6, max_advance: 30 },
    },
  };
}
