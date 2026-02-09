import { beforeEach, describe, expect, it } from 'vitest';
import { useDsConfigStore, getDsConfigInitialState } from '../../../stores/settings/ds-config';

const resetStore = () => {
  localStorage.clear();
  useDsConfigStore.setState(getDsConfigInitialState());
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
        timer0_min: 0x11_11,
        timer0_max: 0x22_22,
        vcount_min: 0x33,
        vcount_max: 0x44,
      },
    ]);
    const { ranges } = useDsConfigStore.getState();
    expect(ranges.length).toBe(1);
    expect(ranges[0].timer0_min).toBe(0x11_11);
  });

  it('should reset to default', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    useDsConfigStore.getState().reset();
    const { config } = useDsConfigStore.getState();
    expect(config.version).toBe('Black');
  });

  it('should store mac address array', () => {
    const mac = [10, 11, 12, 13, 14, 15] as const;
    useDsConfigStore.getState().setConfig({ mac: [...mac] });
    const { config } = useDsConfigStore.getState();
    expect(config.mac).toEqual([...mac]);
  });

  it('should have default gameStart', () => {
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.start_mode).toBe('Continue');
    expect(gameStart.save).toBe('WithSave');
    expect(gameStart.memory_link).toBe('Disabled');
    expect(gameStart.shiny_charm).toBe('NotObtained');
  });

  it('should partially update gameStart via setGameStart', () => {
    useDsConfigStore.getState().setGameStart({ shiny_charm: 'Obtained' });
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.shiny_charm).toBe('Obtained');
    expect(gameStart.start_mode).toBe('Continue');
    expect(gameStart.save).toBe('WithSave');
  });

  it('should reset gameStart to default', () => {
    useDsConfigStore.getState().setGameStart({ shiny_charm: 'Obtained', start_mode: 'NewGame' });
    useDsConfigStore.getState().reset();
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.start_mode).toBe('Continue');
    expect(gameStart.save).toBe('WithSave');
    expect(gameStart.memory_link).toBe('Disabled');
    expect(gameStart.shiny_charm).toBe('NotObtained');
  });

  it('should have timer0Auto default to true', () => {
    const { timer0Auto } = useDsConfigStore.getState();
    expect(timer0Auto).toBe(true);
  });

  it('should update timer0Auto via setTimer0Auto', () => {
    useDsConfigStore.getState().setTimer0Auto(false);
    expect(useDsConfigStore.getState().timer0Auto).toBe(false);
    useDsConfigStore.getState().setTimer0Auto(true);
    expect(useDsConfigStore.getState().timer0Auto).toBe(true);
  });

  it('should have DEFAULT_RANGES with VCount 0x60 (DsLite/Black/Jpn)', () => {
    const { ranges } = useDsConfigStore.getState();
    expect(ranges[0].vcount_min).toBe(0x60);
    expect(ranges[0].vcount_max).toBe(0x60);
  });

  it('should reset memory_link to Disabled on BW2→BW switch', () => {
    useDsConfigStore.getState().setConfig({ version: 'Black2' });
    useDsConfigStore.getState().setGameStart({ memory_link: 'Enabled' });
    useDsConfigStore.getState().setConfig({ version: 'Black' });
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.memory_link).toBe('Disabled');
  });

  it('should reset shiny_charm to NotObtained on BW2→BW switch', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    useDsConfigStore.getState().setGameStart({ shiny_charm: 'Obtained' });
    useDsConfigStore.getState().setConfig({ version: 'White' });
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.shiny_charm).toBe('NotObtained');
  });

  it('should not reset gameStart on BW→BW2 switch', () => {
    useDsConfigStore.getState().setGameStart({ shiny_charm: 'NotObtained', save: 'WithSave' });
    useDsConfigStore.getState().setConfig({ version: 'Black2' });
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.save).toBe('WithSave');
  });

  it('should preserve save on BW2→BW switch', () => {
    useDsConfigStore.getState().setConfig({ version: 'Black2' });
    useDsConfigStore.getState().setGameStart({ save: 'WithSave', shiny_charm: 'Obtained' });
    useDsConfigStore.getState().setConfig({ version: 'Black' });
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.save).toBe('WithSave');
    expect(gameStart.shiny_charm).toBe('NotObtained');
  });

  describe('auto-lookup on setConfig', () => {
    it('should auto-update ranges when timer0Auto=true and version changes', () => {
      // 初期: DsLite/Black/Jpn → ranges は DEFAULT_RANGES (0x0C79-0x0C7A)
      const result = useDsConfigStore.getState().setConfig({ version: 'White' });
      expect(result).toBeUndefined();
      const { ranges } = useDsConfigStore.getState();
      // DsLite/White/Jpn → 0x0C67-0x0C69
      expect(ranges[0].timer0_min).toBe(0x0c_67);
      expect(ranges[0].timer0_max).toBe(0x0c_69);
    });

    it('should auto-update ranges when timer0Auto=true and hardware changes', () => {
      const result = useDsConfigStore.getState().setConfig({ hardware: 'Dsi' });
      expect(result).toBeUndefined();
      const { ranges } = useDsConfigStore.getState();
      // Dsi/Black/Jpn → 0x1237-0x1238
      expect(ranges[0].timer0_min).toBe(0x12_37);
    });

    it('should auto-update ranges when timer0Auto=true and region changes', () => {
      const result = useDsConfigStore.getState().setConfig({ region: 'Usa' });
      expect(result).toBeUndefined();
      const { ranges } = useDsConfigStore.getState();
      // DsLite/Black/Usa → 0x0C7B-0x0C7C
      expect(ranges[0].timer0_min).toBe(0x0c_7b);
    });

    it('should fallback to manual when auto-lookup fails', () => {
      // DSi + Usa は未収集
      const result = useDsConfigStore.getState().setConfig({ hardware: 'Dsi', region: 'Usa' });
      expect(result).toBe('auto-fallback');
      expect(useDsConfigStore.getState().timer0Auto).toBe(false);
    });

    it('should not auto-update ranges when timer0Auto=false', () => {
      useDsConfigStore.getState().setTimer0Auto(false);
      const rangesBefore = useDsConfigStore.getState().ranges;
      useDsConfigStore.getState().setConfig({ version: 'White' });
      const rangesAfter = useDsConfigStore.getState().ranges;
      expect(rangesAfter).toEqual(rangesBefore);
    });

    it('should not auto-update ranges when only mac changes', () => {
      const rangesBefore = useDsConfigStore.getState().ranges;
      useDsConfigStore.getState().setConfig({ mac: [1, 2, 3, 4, 5, 6] });
      const rangesAfter = useDsConfigStore.getState().ranges;
      expect(rangesAfter).toEqual(rangesBefore);
    });
  });
});
