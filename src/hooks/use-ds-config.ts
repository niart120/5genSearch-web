import { useDsConfigStore } from '../stores/settings/ds-config';
import type { DsConfig, GameStartConfig, Timer0VCountRange } from '../wasm/wasm_pkg.js';

export function useDsConfig() {
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const gameStart = useDsConfigStore((s) => s.gameStart);
  const timer0Auto = useDsConfigStore((s) => s.timer0Auto);
  const setConfig = useDsConfigStore((s) => s.setConfig);
  const replaceConfig = useDsConfigStore((s) => s.replaceConfig);
  const setRanges = useDsConfigStore((s) => s.setRanges);
  const setGameStart = useDsConfigStore((s) => s.setGameStart);
  const setTimer0Auto = useDsConfigStore((s) => s.setTimer0Auto);
  const reset = useDsConfigStore((s) => s.reset);

  return {
    config,
    ranges,
    gameStart,
    timer0Auto,
    setConfig,
    replaceConfig,
    setRanges,
    setGameStart,
    setTimer0Auto,
    reset,
  } as const;
}

export function useDsConfigReadonly(): {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  gameStart: GameStartConfig;
} {
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const gameStart = useDsConfigStore((s) => s.gameStart);

  return { config, ranges, gameStart };
}
