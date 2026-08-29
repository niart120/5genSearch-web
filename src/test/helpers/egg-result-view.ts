import type { EggListResultView, EggSearchResultView } from '@/lib/result-view';
import type { GeneratedEggData, SeedOrigin, UiEggData } from '@/wasm/wasm_pkg.js';

interface EggResultFixtureOptions {
  rawHp?: number;
  uiHp?: string;
}

function createGeneratedEggData(options: EggResultFixtureOptions = {}): GeneratedEggData {
  const { rawHp = 32 } = options;
  const source: SeedOrigin = {
    Startup: {
      base_seed: 0x01_23_45_67_89_ab_cd_efn,
      mt_seed: 0x12_34_56_78,
      datetime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
      condition: { timer0: 0x12_34, vcount: 0x56, key_mask: 1 },
    },
  };

  return {
    advance: 7,
    needle_direction: 'N',
    source,
    core: {
      pid: 0x12_34_56_78,
      nature: 'Hardy',
      ability_slot: 'First',
      gender: 'Male',
      shiny_type: 'None',
      ivs: { hp: rawHp, atk: 31, def: 30, spa: 29, spd: 28, spe: 27 },
      stats: {
        hp: undefined,
        attack: undefined,
        defense: undefined,
        special_attack: undefined,
        special_defense: undefined,
        speed: undefined,
      },
      species_id: 0,
      level: 1,
    },
    inheritance: [
      { stat: 0, parent: 0 },
      { stat: 1, parent: 1 },
      { stat: 2, parent: 0 },
    ],
    margin_frames: 3,
  };
}

function createUiEggData(options: EggResultFixtureOptions = {}): UiEggData {
  const { uiHp = '?' } = options;
  return {
    advance: 7,
    needle_direction: 0,
    base_seed: '0123456789ABCDEF',
    mt_seed: '12345678',
    datetime_iso: '2025-01-02T03:04:05',
    timer0: '1234',
    vcount: '56',
    key_input: '[A]',
    species_name: undefined,
    nature_name: 'がんばりや',
    ability_name: '特性1',
    gender_symbol: '♂',
    shiny_symbol: '',
    level: 1,
    ivs: [uiHp, '31', '30', '29', '28', '27'],
    stats: ['?', '?', '?', '?', '?', '?'],
    hidden_power_type: '?',
    hidden_power_power: '?',
    pid: '12345678',
    margin_frames: 3,
  };
}

function createEggListResultView(options: EggResultFixtureOptions = {}): EggListResultView {
  return {
    raw: createGeneratedEggData(options),
    ui: createUiEggData(options),
  };
}

function createEggSearchResultView(options: EggResultFixtureOptions = {}): EggSearchResultView {
  return {
    raw: { egg: createGeneratedEggData(options) },
    ui: createUiEggData(options),
  };
}

export {
  createGeneratedEggData,
  createUiEggData,
  createEggListResultView,
  createEggSearchResultView,
};
