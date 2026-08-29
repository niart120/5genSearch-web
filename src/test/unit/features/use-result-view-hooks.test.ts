import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPokemonListInitialState, usePokemonListStore } from '@/features/pokemon-list/store';
import { getEggListInitialState, useEggListStore } from '@/features/egg-list/store';
import { createGeneratedEggData, createUiEggData } from '@/test/helpers/egg-result-view';
import type { UseSearchResult } from '@/hooks/use-search';
import type { SupportedLocale } from '@/i18n';
import type {
  GeneratedPokemonData,
  GenerationConfig,
  PokemonGenerationParams,
  SeedOrigin,
  UiPokemonData,
} from '@/wasm/wasm_pkg.js';

const mockStart = vi.fn();
const mockCancel = vi.fn();

function createMockSearchReturn(): UseSearchResult {
  return {
    isLoading: false,
    isInitialized: true,
    progress: undefined,
    results: [],
    error: undefined,
    workerCount: 4,
    start: mockStart,
    cancel: mockCancel,
  };
}

vi.mock('@/hooks/use-search', () => ({
  useSearch: () => createMockSearchReturn(),
  useSearchConfig: vi.fn(() => ({ useGpu: false })),
}));

vi.mock('@/services/search-tasks', () => ({
  createPokemonListTasks: vi.fn(() => []),
  createEggListTasks: vi.fn(() => []),
}));

vi.mock('@/wasm/wasm_pkg.js', () => ({
  resolve_pokemon_data_batch: vi.fn(),
  resolve_egg_data_batch: vi.fn(),
}));

import { usePokemonList } from '@/features/pokemon-list/hooks/use-pokemon-list';
import { useEggList } from '@/features/egg-list/hooks/use-egg-list';
import { resolve_egg_data_batch, resolve_pokemon_data_batch } from '@/wasm/wasm_pkg.js';

const mockedResolvePokemon = vi.mocked(resolve_pokemon_data_batch);
const mockedResolveEgg = vi.mocked(resolve_egg_data_batch);

const TEST_ORIGIN: SeedOrigin = {
  Seed: { base_seed: 0x01_23_45_67_89_ab_cd_efn, mt_seed: 0x12_34_56_78 },
};

const TEST_POKEMON_PARAMS: PokemonGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  encounter_type: 'StaticSymbol',
  encounter_method: 'Stationary',
  lead_ability: 'None',
  slots: [
    {
      species_id: 25,
      level_min: 5,
      level_max: 5,
      gender_ratio: 'F1M1',
      has_held_item: false,
      shiny_locked: false,
    },
  ],
};

function createGenerationConfig(version: GenerationConfig['version']): GenerationConfig {
  return {
    version,
    game_start: {
      start_mode: 'Continue',
      save: 'WithSave',
      memory_link: 'Disabled',
      shiny_charm: 'NotObtained',
    },
    user_offset: 0,
    max_advance: 30,
  };
}

function createGeneratedPokemonData(): GeneratedPokemonData {
  return {
    advance: 1,
    needle_direction: 'N',
    source: TEST_ORIGIN,
    core: {
      pid: 0,
      nature: 'Hardy',
      ability_slot: 'First',
      gender: 'Male',
      shiny_type: 'None',
      ivs: { hp: 31, atk: 30, def: 29, spa: 28, spd: 27, spe: 26 },
      stats: {
        hp: 20,
        attack: 11,
        defense: 10,
        special_attack: 10,
        special_defense: 10,
        speed: 15,
      },
      species_id: 25,
      level: 5,
    },
    sync_applied: false,
    held_item_slot: 'None',
    moving_encounter: undefined,
    special_encounter: undefined,
    encounter_result: { type: 'Pokemon' },
  };
}

function createUiPokemonData(): UiPokemonData {
  return {
    advance: 1,
    needle_direction: 0,
    base_seed: '0123456789ABCDEF',
    mt_seed: '12345678',
    datetime_iso: undefined,
    timer0: undefined,
    vcount: undefined,
    key_input: undefined,
    species_name: 'ピカチュウ',
    nature_name: 'がんばりや',
    ability_name: 'せいでんき',
    gender_symbol: '♂',
    shiny_symbol: '',
    level: 5,
    ivs: ['31', '30', '29', '28', '27', '26'],
    stats: ['20', '11', '10', '10', '10', '15'],
    hidden_power_type: 'むし',
    hidden_power_power: '64',
    pid: '00000000',
    sync_applied: false,
    held_item_name: undefined,
    moving_encounter_guaranteed: undefined,
    special_encounter_triggered: undefined,
    special_encounter_direction: undefined,
    encounter_result: 'ポケモン',
  };
}

describe('usePokemonList result resolution context', () => {
  beforeEach(() => {
    localStorage.clear();
    usePokemonListStore.setState(getPokemonListInitialState());
    mockStart.mockReset();
    mockCancel.mockReset();
    mockedResolvePokemon.mockReset();
    mockedResolveEgg.mockReset();
  });

  it('generate は生成設定の ROM バージョンを結果コンテキストに保存する', () => {
    const { result } = renderHook(() => usePokemonList('ja'));

    act(() => {
      result.current.generate([TEST_ORIGIN], TEST_POKEMON_PARAMS, createGenerationConfig('Black2'));
    });

    expect(usePokemonListStore.getState().resultVersion).toBe('Black2');
  });

  it('生成後に設定オブジェクトが変わっても保存済みバージョンと locale で解決する', () => {
    const raw = createGeneratedPokemonData();
    const ui = createUiPokemonData();
    const generationConfig = createGenerationConfig('Black2');
    mockedResolvePokemon.mockReturnValue([ui]);
    const { result } = renderHook(() => usePokemonList('ja'));

    act(() => {
      result.current.generate([TEST_ORIGIN], TEST_POKEMON_PARAMS, generationConfig);
    });
    generationConfig.version = 'White';
    act(() => {
      usePokemonListStore.getState().appendResults([raw]);
    });

    expect(mockedResolvePokemon).toHaveBeenCalledWith([raw], 'Black2', 'ja');
  });
});

describe('useEggList locale-dependent result resolution', () => {
  beforeEach(() => {
    localStorage.clear();
    useEggListStore.setState(getEggListInitialState());
    mockStart.mockReset();
    mockCancel.mockReset();
    mockedResolvePokemon.mockReset();
    mockedResolveEgg.mockReset();
  });

  it('locale 変更時に同じ raw を維持したまま UI 表現を再解決する', () => {
    const raw = createGeneratedEggData();
    useEggListStore.getState().setResults([raw]);
    mockedResolveEgg.mockImplementation((_rawResults, locale) => [
      {
        ...createUiEggData(),
        nature_name: locale === 'ja' ? 'がんばりや' : 'Hardy',
      },
    ]);
    const { result, rerender } = renderHook(
      ({ locale }: { locale: SupportedLocale }) => useEggList(locale),
      { initialProps: { locale: 'ja' } }
    );
    const initialRaw = result.current.results[0]?.raw;

    rerender({ locale: 'en' });

    expect(mockedResolveEgg).toHaveBeenNthCalledWith(2, [raw], 'en');
    expect(result.current.results[0]?.raw).toBe(initialRaw);
    expect(result.current.results[0]?.ui.nature_name).toBe('Hardy');
  });
});
