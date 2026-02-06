import { useDsConfigStore } from '../stores/settings/ds-config';
import type { DsConfig, Timer0VCountRange } from '../wasm/wasm_pkg.js';

export function useDsConfig() {
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const setConfig = useDsConfigStore((s) => s.setConfig);
  const replaceConfig = useDsConfigStore((s) => s.replaceConfig);
  const setRanges = useDsConfigStore((s) => s.setRanges);
  const reset = useDsConfigStore((s) => s.reset);

  return { config, ranges, setConfig, replaceConfig, setRanges, reset } as const;
}

export function useDsConfigReadonly(): {
  config: DsConfig;
  ranges: Timer0VCountRange[];
} {
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);

  return { config, ranges };
}
