import type { WonderCardEntry } from '@/data/wondercards/schema';
import type { CoreDataFilter, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { WonderCardResultView } from '@/lib/result-view';

export const UI_CARD: WonderCardEntry = {
  id: 'ui-pikachu',
  language: 'ja',
  cardTitle: 'Pikachu',
  kind: 'pokemon',
  versions: ['Black', 'White', 'Black2', 'White2'],
  speciesId: 25,
  level: 50,
  fixedIvs: {},
  shinyPolicy: 'Random',
  trainer: { tid: 12_345, sid: 54_321 },
};
export const UI_EGG_CARD: WonderCardEntry = {
  id: 'ui-egg',
  language: 'ja',
  cardTitle: 'Egg',
  kind: 'egg',
  versions: ['Black', 'White', 'Black2', 'White2'],
  speciesId: 25,
  level: 1,
  fixedIvs: {},
  shinyPolicy: 'Random',
};
export const EMPTY_CORE_FILTER: CoreDataFilter = {
  iv: undefined,
  stats: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
};
export const UI_ORIGIN: SeedOrigin = {
  Startup: {
    base_seed: 0x12_34_56_78_9a_bc_de_f0n,
    mt_seed: 123,
    datetime: { year: 2010, month: 9, day: 18, hour: 12, minute: 0, second: 0 },
    condition: { timer0: 0xc_79, vcount: 0x60, key_mask: 1 },
  },
};

export function createWonderCardView(): WonderCardResultView {
  return {
    raw: {
      advance: 5,
      needle_direction: 'N',
      source: structuredClone(UI_ORIGIN),
      core: {
        pid: 123,
        nature: 'Hardy',
        ability_slot: 'First',
        gender: 'Male',
        shiny_type: 'None',
        ivs: { hp: 9, atk: 2, def: 3, spa: 4, spd: 5, spe: 6 },
        stats: {
          hp: 109,
          attack: 52,
          defense: 53,
          special_attack: 54,
          special_defense: 55,
          speed: 56,
        },
        species_id: 25,
        level: 50,
      },
    },
    ui: {
      advance: 5,
      needle_direction: 0,
      base_seed: '123456789ABCDEF0',
      datetime_iso: '2010-09-18T12:00:00',
      timer0: '0C79',
      vcount: '60',
      key_input: 'A',
      species_name: 'Pikachu',
      nature_name: 'Hardy',
      ability_name: 'Static',
      gender_symbol: '♂',
      shiny_symbol: '',
      level: 50,
      ivs: ['9', '2', '3', '4', '5', '6'],
      stats: ['109', '52', '53', '54', '55', '56'],
      hidden_power_type: 'Fire',
      hidden_power_power: '40',
      pid: '0000007B',
    },
  };
}
