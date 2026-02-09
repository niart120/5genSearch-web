import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DsConfig, GameStartConfig, Timer0VCountRange } from '../../wasm/wasm_pkg.js';

interface DsConfigState {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  gameStart: GameStartConfig;
  timer0Auto: boolean;
}

interface DsConfigActions {
  setConfig: (partial: Partial<DsConfig>) => void;
  replaceConfig: (config: DsConfig) => void;
  setRanges: (ranges: Timer0VCountRange[]) => void;
  setGameStart: (partial: Partial<GameStartConfig>) => void;
  setTimer0Auto: (auto: boolean) => void;
  reset: () => void;
}

const DEFAULT_DS_CONFIG: DsConfig = {
  mac: [0, 0, 0, 0, 0, 0],
  hardware: 'DsLite',
  version: 'Black',
  region: 'Jpn',
};

const DEFAULT_RANGES: Timer0VCountRange[] = [
  {
    timer0_min: 0x0c_79,
    timer0_max: 0x0c_7a,
    vcount_min: 0x60,
    vcount_max: 0x60,
  },
];

const DEFAULT_GAME_START: GameStartConfig = {
  start_mode: 'Continue',
  save_state: 'WithSave',
  shiny_charm: false,
};

const DEFAULT_STATE: DsConfigState = {
  config: DEFAULT_DS_CONFIG,
  ranges: DEFAULT_RANGES,
  gameStart: DEFAULT_GAME_START,
  timer0Auto: true,
};

function isBw2(version: DsConfig['version']): boolean {
  return version === 'Black2' || version === 'White2';
}

export const useDsConfigStore = create<DsConfigState & DsConfigActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setConfig: (partial) =>
        set((state) => {
          const newConfig = { ...state.config, ...partial };
          // BW2 → BW 切替時に GameStartConfig の不整合を防ぐ
          const prevIsBw2 = isBw2(state.config.version);
          const nextIsBw2 = isBw2(newConfig.version);
          const gameStart =
            prevIsBw2 && !nextIsBw2
              ? {
                  ...state.gameStart,
                  save_state:
                    state.gameStart.save_state === 'WithMemoryLink'
                      ? ('WithSave' as const)
                      : state.gameStart.save_state,
                  shiny_charm: false,
                }
              : state.gameStart;
          return { config: newConfig, gameStart };
        }),
      replaceConfig: (config) => set({ config }),
      setRanges: (ranges) => set({ ranges }),
      setGameStart: (partial) =>
        set((state) => ({
          gameStart: { ...state.gameStart, ...partial },
        })),
      setTimer0Auto: (timer0Auto) => set({ timer0Auto }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'ds-config',
      version: 1,
    }
  )
);

export const getDsConfigInitialState = (): DsConfigState => DEFAULT_STATE;
