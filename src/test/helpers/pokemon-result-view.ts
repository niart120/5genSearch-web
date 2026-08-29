import type { PokemonListResultView } from '@/lib/result-view';
import type { GeneratedPokemonData, UiPokemonData } from '@/wasm/wasm_pkg.js';

interface PokemonResultFixtureOptions {
  rawHp?: number;
  rawStatHp?: number;
  uiHp?: string;
  uiStatHp?: string;
}

function createPokemonListResultView(
  options: PokemonResultFixtureOptions = {}
): PokemonListResultView {
  const { rawHp = 32, rawStatHp = 101, uiHp = '?', uiStatHp = '101' } = options;
  const raw: GeneratedPokemonData = {
    advance: 1,
    needle_direction: 'N',
    source: { Seed: { base_seed: 0n, mt_seed: 0 } },
    core: {
      pid: 0,
      nature: 'Hardy',
      ability_slot: 'First',
      gender: 'Male',
      shiny_type: 'None',
      ivs: { hp: rawHp, atk: 2, def: 3, spa: 4, spd: 5, spe: 6 },
      stats: {
        hp: rawStatHp,
        attack: 12,
        defense: 13,
        special_attack: 14,
        special_defense: 15,
        speed: 16,
      },
      species_id: 1,
      level: 5,
    },
    sync_applied: false,
    held_item_slot: 'None',
    moving_encounter: undefined,
    special_encounter: {
      triggered: true,
      direction: 'Right',
      trigger_rand: 0,
      direction_rand: 0,
    },
    encounter_result: { type: 'Pokemon' },
  };
  const ui: UiPokemonData = {
    advance: 1,
    needle_direction: 0,
    base_seed: '0000000000000000',
    mt_seed: '00000000',
    datetime_iso: undefined,
    timer0: undefined,
    vcount: undefined,
    key_input: undefined,
    species_name: 'フシギダネ',
    nature_name: 'がんばりや',
    ability_name: 'しんりょく',
    gender_symbol: '♂',
    shiny_symbol: '',
    level: 5,
    ivs: [uiHp, '2', '3', '4', '5', '6'],
    stats: [uiStatHp, '12', '13', '14', '15', '16'],
    hidden_power_type: '?',
    hidden_power_power: '?',
    pid: '00000000',
    sync_applied: false,
    held_item_name: undefined,
    moving_encounter_guaranteed: undefined,
    special_encounter_triggered: '〇',
    special_encounter_direction: '右',
    encounter_result: 'ポケモン',
  };

  return { raw, ui };
}

export { createPokemonListResultView };
