import type { WonderCardEntry } from '@/data/wondercards/schema';
import type { CoreDataFilter, SeedOrigin } from '@/wasm/wasm_pkg.js';

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
