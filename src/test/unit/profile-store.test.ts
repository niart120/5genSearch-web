import { beforeEach, describe, expect, it } from 'vitest';
import { useProfileStore, getProfileInitialState } from '@/stores/settings/profile';
import type { ProfileData } from '@/stores/settings/profile';

const MOCK_DATA: ProfileData = {
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

const MOCK_DATA_2: ProfileData = {
  ...MOCK_DATA,
  config: { ...MOCK_DATA.config, version: 'White' },
  tid: 99,
};

function resetStore() {
  localStorage.clear();
  useProfileStore.setState(getProfileInitialState());
}

describe('Profile Store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('createProfile', () => {
    it('プロファイル作成後、profiles 配列に追加され activeProfileId が新 ID になる', () => {
      const id = useProfileStore.getState().createProfile('Test', MOCK_DATA);

      const { profiles, activeProfileId } = useProfileStore.getState();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe(id);
      expect(profiles[0].name).toBe('Test');
      expect(profiles[0].data).toEqual(MOCK_DATA);
      expect(activeProfileId).toBe(id);
      expect(profiles[0].createdAt).toBeGreaterThan(0);
      expect(profiles[0].updatedAt).toBe(profiles[0].createdAt);
    });
  });

  describe('saveActiveProfile', () => {
    it('アクティブプロファイルの data が更新され updatedAt が更新される', () => {
      const id = useProfileStore.getState().createProfile('Test', MOCK_DATA);
      const beforeUpdate = useProfileStore.getState().profiles[0].updatedAt;

      // 少し時間をずらすため Date.now をリセット的に
      useProfileStore.getState().saveActiveProfile(MOCK_DATA_2);

      const updated = useProfileStore.getState().profiles.find((p) => p.id === id);
      expect(updated?.data).toEqual(MOCK_DATA_2);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('activeProfileId が undefined の場合は何もしない', () => {
      useProfileStore.getState().createProfile('Test', MOCK_DATA);
      useProfileStore.getState().setActiveProfileId(undefined);
      useProfileStore.getState().saveActiveProfile(MOCK_DATA_2);

      // data は変更されない
      expect(useProfileStore.getState().profiles[0].data).toEqual(MOCK_DATA);
    });
  });

  describe('renameProfile', () => {
    it('指定 ID のプロファイル名が変更される', () => {
      const id = useProfileStore.getState().createProfile('Old Name', MOCK_DATA);
      useProfileStore.getState().renameProfile(id, 'New Name');

      const profile = useProfileStore.getState().profiles.find((p) => p.id === id);
      expect(profile?.name).toBe('New Name');
    });
  });

  describe('deleteProfile', () => {
    it('アクティブプロファイル削除後、activeProfileId が undefined になる', () => {
      const id = useProfileStore.getState().createProfile('Test', MOCK_DATA);
      expect(useProfileStore.getState().activeProfileId).toBe(id);

      useProfileStore.getState().deleteProfile(id);

      expect(useProfileStore.getState().profiles).toHaveLength(0);
      expect(useProfileStore.getState().activeProfileId).toBeUndefined();
    });

    it('非アクティブプロファイル削除後、activeProfileId が維持される', () => {
      const id1 = useProfileStore.getState().createProfile('First', MOCK_DATA);
      const id2 = useProfileStore.getState().createProfile('Second', MOCK_DATA_2);
      // activeProfileId は id2 (直近作成分)
      expect(useProfileStore.getState().activeProfileId).toBe(id2);

      useProfileStore.getState().deleteProfile(id1);

      expect(useProfileStore.getState().profiles).toHaveLength(1);
      expect(useProfileStore.getState().activeProfileId).toBe(id2);
    });
  });

  describe('importProfile', () => {
    it('新規 ID が割り当てられてプロファイルリストに追加される', () => {
      const id = useProfileStore.getState().importProfile({
        name: 'Imported',
        data: MOCK_DATA,
      });

      const { profiles } = useProfileStore.getState();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe(id);
      expect(profiles[0].name).toBe('Imported');
      expect(profiles[0].data).toEqual(MOCK_DATA);
    });
  });

  describe('setActiveProfileId', () => {
    it('activeProfileId が更新される', () => {
      const id = useProfileStore.getState().createProfile('Test', MOCK_DATA);
      useProfileStore.getState().setActiveProfileId(undefined);
      expect(useProfileStore.getState().activeProfileId).toBeUndefined();

      useProfileStore.getState().setActiveProfileId(id);
      expect(useProfileStore.getState().activeProfileId).toBe(id);
    });
  });

  describe('reset', () => {
    it('初期状態に戻る', () => {
      useProfileStore.getState().createProfile('Test', MOCK_DATA);
      expect(useProfileStore.getState().profiles).toHaveLength(1);

      useProfileStore.getState().reset();

      expect(useProfileStore.getState().profiles).toHaveLength(0);
      expect(useProfileStore.getState().activeProfileId).toBeUndefined();
    });
  });
});
