import { beforeEach, describe, expect, it } from 'vitest';
import { applyProfileData, setupStoreSyncSubscriptions } from '../../../stores/sync';
import { useDsConfigStore, getDsConfigInitialState } from '../../../stores/settings/ds-config';
import { useTrainerStore, getTrainerInitialState } from '../../../stores/settings/trainer';
import type { ProfileData } from '../../../stores/settings/profile';

const MOCK_PROFILE_DATA: ProfileData = {
  config: {
    mac: [0, 9, 191, 42, 78, 210],
    hardware: 'DsLite',
    version: 'Black',
    region: 'Jpn',
  },
  ranges: [{ timer0_min: 3193, timer0_max: 3194, vcount_min: 96, vcount_max: 96 }],
  timer0Auto: true,
  gameStart: {
    start_mode: 'Continue',
    save: 'WithSave',
    memory_link: 'Disabled',
    shiny_charm: 'NotObtained',
  },
  tid: 12_345,
  sid: 54_321,
};

function resetStores() {
  localStorage.clear();
  useDsConfigStore.setState(getDsConfigInitialState());
  useTrainerStore.setState(getTrainerInitialState());
}

describe('store sync setup', () => {
  it('should setup and cleanup without errors', () => {
    const cleanup = setupStoreSyncSubscriptions();
    expect(() => cleanup()).not.toThrow();
  });
});

describe('applyProfileData', () => {
  beforeEach(() => {
    resetStores();
  });

  it('ds-config Store に config / ranges / timer0Auto / gameStart が反映される', () => {
    applyProfileData(MOCK_PROFILE_DATA);

    const state = useDsConfigStore.getState();
    expect(state.config).toEqual(MOCK_PROFILE_DATA.config);
    expect(state.ranges).toEqual(MOCK_PROFILE_DATA.ranges);
    expect(state.timer0Auto).toBe(true);
    expect(state.gameStart).toEqual(MOCK_PROFILE_DATA.gameStart);
  });

  it('trainer Store に tid / sid が反映される', () => {
    applyProfileData(MOCK_PROFILE_DATA);

    const state = useTrainerStore.getState();
    expect(state.tid).toBe(12_345);
    expect(state.sid).toBe(54_321);
  });

  it('tid / sid が undefined の場合でも正常に反映される', () => {
    applyProfileData({ ...MOCK_PROFILE_DATA, tid: undefined, sid: undefined });

    const state = useTrainerStore.getState();
    expect(state.tid).toBeUndefined();
    expect(state.sid).toBeUndefined();
  });
});
