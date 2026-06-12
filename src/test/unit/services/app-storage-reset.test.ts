import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAppStorageKeys,
  resetAppStorage,
  resetAppStorageAndReload,
} from '@/services/app-storage-reset';

const PROFILE_STORAGE = {
  state: {
    profiles: [{ id: 'profile-1', name: 'Main DS' }],
    activeProfileId: 'profile-1',
  },
  version: 1,
};

function writeProfileStorage(): void {
  localStorage.setItem('profiles', JSON.stringify(PROFILE_STORAGE));
}

function readProfileStorage(): unknown {
  const raw = localStorage.getItem('profiles');
  if (raw === null) return undefined;
  return JSON.parse(raw);
}

describe('app-storage-reset', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('settings mode では設定・入力系キーだけを削除対象にする', () => {
    localStorage.setItem('ds-config', 'ds');
    localStorage.setItem('trainer', 'trainer');
    localStorage.setItem('ui-settings', 'ui');
    localStorage.setItem('feature:datetime-search', 'datetime');
    localStorage.setItem('feature:new-feature', 'future');
    localStorage.setItem('profiles', 'profiles');
    localStorage.setItem('third-party', 'external');

    expect(getAppStorageKeys('settings', localStorage)).toEqual([
      'ds-config',
      'trainer',
      'ui-settings',
      'feature:datetime-search',
      'feature:new-feature',
    ]);
  });

  it('通常初期化ではプロファイル一覧を保持し、選択中プロファイルを解除する', () => {
    localStorage.setItem('ds-config', 'ds');
    localStorage.setItem('feature:needle', 'needle');
    localStorage.setItem('third-party', 'external');
    writeProfileStorage();

    const result = resetAppStorage('settings', localStorage);

    expect(result).toEqual({
      ok: true,
      removedKeys: ['ds-config', 'feature:needle'],
      activeProfileCleared: true,
    });
    expect(localStorage.getItem('ds-config')).toBeNull();
    expect(localStorage.getItem('feature:needle')).toBeNull();
    expect(localStorage.getItem('third-party')).toBe('external');
    expect(readProfileStorage()).toEqual({
      state: {
        profiles: PROFILE_STORAGE.state.profiles,
      },
      version: 1,
    });
  });

  it('完全初期化では profiles も削除する', () => {
    localStorage.setItem('ds-config', 'ds');
    localStorage.setItem('feature:egg-list', 'egg-list');
    localStorage.setItem('third-party', 'external');
    writeProfileStorage();

    const result = resetAppStorage('all', localStorage);

    expect(result).toEqual({
      ok: true,
      removedKeys: ['ds-config', 'feature:egg-list', 'profiles'],
      activeProfileCleared: false,
    });
    expect(localStorage.getItem('ds-config')).toBeNull();
    expect(localStorage.getItem('feature:egg-list')).toBeNull();
    expect(localStorage.getItem('profiles')).toBeNull();
    expect(localStorage.getItem('third-party')).toBe('external');
  });

  it('通常初期化で profiles が不正な場合は削除を中断する', () => {
    localStorage.setItem('ds-config', 'ds');
    localStorage.setItem('profiles', '{invalid');

    const result = resetAppStorage('settings', localStorage);

    expect(result).toEqual({ ok: false, reason: 'profile-state-invalid' });
    expect(localStorage.getItem('ds-config')).toBe('ds');
    expect(localStorage.getItem('profiles')).toBe('{invalid');
  });

  it('storage 操作が例外になった場合は失敗を返す', () => {
    const storage = createThrowingStorage();

    expect(resetAppStorage('settings', storage)).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
  });

  it('resetAppStorageAndReload は成功時だけ reload する', () => {
    localStorage.setItem('ds-config', 'ds');
    const reload = vi.fn();

    const success = resetAppStorageAndReload('settings', { storage: localStorage, reload });
    const failure = resetAppStorageAndReload('settings', {
      storage: createThrowingStorage(),
      reload,
    });

    expect(success.ok).toBe(true);
    expect(failure).toEqual({ ok: false, reason: 'storage-unavailable' });
    expect(reload).toHaveBeenCalledOnce();
  });
});

function createThrowingStorage(): Storage {
  return {
    get length(): number {
      throw new Error('storage unavailable');
    },
    clear: vi.fn(),
    getItem: vi.fn(() => {
      throw new Error('storage unavailable');
    }),
    key: vi.fn(() => {
      throw new Error('storage unavailable');
    }),
    removeItem: vi.fn(() => {
      throw new Error('storage unavailable');
    }),
    setItem: vi.fn(() => {
      throw new Error('storage unavailable');
    }),
  };
}
