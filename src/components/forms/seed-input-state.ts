import { DEFAULT_DATETIME } from '@/components/ui/datetime-input';
import type { Datetime, KeyInput } from '@/wasm/wasm_pkg.js';

/** Seed 入力モード */
type SeedInputMode = 'import' | 'manual-seeds' | 'manual-startup';

/** 永続化可能な Seed 入力ソース */
interface SeedInputState {
  datetime: Datetime;
  keyInput: KeyInput;
  seedText: string;
  importText: string;
}

type SeedInputStateAction = SeedInputState | ((current: SeedInputState) => SeedInputState);

function createDefaultSeedInputState(): SeedInputState {
  return {
    datetime: { ...DEFAULT_DATETIME },
    keyInput: { buttons: [] },
    seedText: '',
    importText: '',
  };
}

export { createDefaultSeedInputState };
export type { SeedInputMode, SeedInputState, SeedInputStateAction };
