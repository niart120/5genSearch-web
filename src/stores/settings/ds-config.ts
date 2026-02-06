import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DsConfig, Timer0VCountRange } from '../../wasm/wasm_pkg.js';

interface DsConfigState {
  config: DsConfig;
  ranges: Timer0VCountRange[];
}

interface DsConfigActions {
  setConfig: (partial: Partial<DsConfig>) => void;
  replaceConfig: (config: DsConfig) => void;
  setRanges: (ranges: Timer0VCountRange[]) => void;
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
    timer0_min: 0x0c79,
    timer0_max: 0x0c7a,
    vcount_min: 0x5e,
    vcount_max: 0x5e,
  },
];

const DEFAULT_STATE: DsConfigState = {
  config: DEFAULT_DS_CONFIG,
  ranges: DEFAULT_RANGES,
};

export const useDsConfigStore = create<DsConfigState & DsConfigActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setConfig: (partial) =>
        set((state) => ({
          config: { ...state.config, ...partial },
        })),
      replaceConfig: (config) => set({ config }),
      setRanges: (ranges) => set({ ranges }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'ds-config',
      version: 1,
    }
  )
);

export const getDsConfigInitialState = (): DsConfigState => DEFAULT_STATE;
