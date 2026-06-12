type AppStorageResetMode = 'settings' | 'all';
type AppStorageResetFailureReason = 'storage-unavailable' | 'profile-state-invalid';

type AppStorageResetResult =
  | { ok: true; removedKeys: string[]; activeProfileCleared: boolean }
  | { ok: false; reason: AppStorageResetFailureReason };

interface ProfileStorageState {
  profiles: unknown[];
  activeProfileId?: string | null;
  [key: string]: unknown;
}

interface ProfileStorageSnapshot {
  state: ProfileStorageState;
  [key: string]: unknown;
}

type ActiveProfileClearResult = { ok: true; cleared: boolean } | { ok: false };

const SETTINGS_STORAGE_KEYS = [
  'ds-config',
  'trainer',
  'ui-settings',
  'feature:datetime-search',
  'feature:mtseed-search',
  'feature:egg-search',
  'feature:tid-adjust',
  'feature:needle',
  'feature:pokemon-list',
  'feature:egg-list',
] as const;

const SETTINGS_STORAGE_KEY_SET: ReadonlySet<string> = new Set(SETTINGS_STORAGE_KEYS);
const PROFILE_STORAGE_KEY = 'profiles';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProfileStorageState(value: unknown): value is ProfileStorageState {
  if (!isRecord(value) || !Array.isArray(value.profiles)) {
    return false;
  }

  const activeProfileId = value.activeProfileId;
  return (
    activeProfileId === undefined || activeProfileId === null || typeof activeProfileId === 'string'
  );
}

function isProfileStorageSnapshot(value: unknown): value is ProfileStorageSnapshot {
  return isRecord(value) && isProfileStorageState(value.state);
}

function parseProfileStorage(raw: string): ProfileStorageSnapshot | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProfileStorageSnapshot(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isSettingsStorageKey(key: string): boolean {
  return SETTINGS_STORAGE_KEY_SET.has(key) || key.startsWith('feature:');
}

function isAppStorageKey(key: string, mode: AppStorageResetMode): boolean {
  if (isSettingsStorageKey(key)) {
    return true;
  }
  return mode === 'all' && key === PROFILE_STORAGE_KEY;
}

function getAppStorageKeys(mode: AppStorageResetMode, storage: Storage = localStorage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && isAppStorageKey(key, mode)) {
      keys.push(key);
    }
  }
  return keys;
}

function clearActiveProfileSelection(storage: Storage): ActiveProfileClearResult {
  const raw = storage.getItem(PROFILE_STORAGE_KEY);
  if (raw === null) {
    return { ok: true, cleared: false };
  }

  const parsed = parseProfileStorage(raw);
  if (parsed === undefined) {
    return { ok: false };
  }

  const cleared = Object.hasOwn(parsed.state, 'activeProfileId');
  storage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({
      ...parsed,
      state: {
        ...parsed.state,
        activeProfileId: undefined,
      },
    })
  );

  return { ok: true, cleared };
}

function removeStorageKeys(keys: readonly string[], storage: Storage): void {
  for (const key of keys) {
    storage.removeItem(key);
  }
}

function resetAppStorage(
  mode: AppStorageResetMode,
  storage: Storage = localStorage
): AppStorageResetResult {
  try {
    const keys = getAppStorageKeys(mode, storage);
    const profileClearResult =
      mode === 'settings' ? clearActiveProfileSelection(storage) : { ok: true, cleared: false };

    if (!profileClearResult.ok) {
      return { ok: false, reason: 'profile-state-invalid' };
    }

    removeStorageKeys(keys, storage);
    return {
      ok: true,
      removedKeys: keys,
      activeProfileCleared: profileClearResult.cleared,
    };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

function resetAppStorageAndReload(
  mode: AppStorageResetMode,
  options: { storage?: Storage; reload?: () => void } = {}
): AppStorageResetResult {
  const result = resetAppStorage(mode, options.storage);
  if (result.ok) {
    const reload = options.reload ?? (() => globalThis.location.reload());
    reload();
  }
  return result;
}

export {
  getAppStorageKeys,
  resetAppStorage,
  resetAppStorageAndReload,
  SETTINGS_STORAGE_KEYS,
  PROFILE_STORAGE_KEY,
};
export type { AppStorageResetMode, AppStorageResetFailureReason, AppStorageResetResult };
