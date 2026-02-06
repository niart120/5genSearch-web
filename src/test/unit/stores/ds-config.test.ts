import { beforeEach, describe, expect, it } from 'vitest';
import { useDsConfigStore, getDsConfigInitialState } from '../../../stores/settings/ds-config';

const resetStore = () => {
  localStorage.clear();
  useDsConfigStore.setState(getDsConfigInitialState(), true);
};

describe('ds-config store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have default config', () => {
    const { config, ranges } = useDsConfigStore.getState();
    expect(config.hardware).toBe('DsLite');
    expect(config.version).toBe('Black');
    expect(config.region).toBe('Jpn');
    expect(ranges.length).toBe(1);
  });

  it('should partially update config via setConfig', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    const { config } = useDsConfigStore.getState();
    expect(config.version).toBe('White2');
    expect(config.hardware).toBe('DsLite');
  });

  it('should replace config via replaceConfig', () => {
    useDsConfigStore.getState().replaceConfig({
      mac: [1, 2, 3, 4, 5, 6],
      hardware: 'Ds',
      version: 'White',
      region: 'Usa',
    });
    const { config } = useDsConfigStore.getState();
    expect(config.hardware).toBe('Ds');
    expect(config.version).toBe('White');
    expect(config.region).toBe('Usa');
  });

  it('should update ranges via setRanges', () => {
    useDsConfigStore.getState().setRanges([
      {
        timer0_min: 0x1111,
        timer0_max: 0x2222,
        vcount_min: 0x33,
        vcount_max: 0x44,
      },
    ]);
    const { ranges } = useDsConfigStore.getState();
    expect(ranges.length).toBe(1);
    expect(ranges[0].timer0_min).toBe(0x1111);
  });

  it('should reset to default', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    useDsConfigStore.getState().reset();
    const { config } = useDsConfigStore.getState();
    expect(config.version).toBe('Black');
  });

  it('should store mac address array', () => {
    const mac = [10, 11, 12, 13, 14, 15];
    useDsConfigStore.getState().setConfig({ mac });
    const { config } = useDsConfigStore.getState();
    expect(config.mac).toEqual(mac);
  });
});
