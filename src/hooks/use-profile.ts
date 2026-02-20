import { useMemo } from 'react';
import { useProfileStore } from '../stores/settings/profile';
import { useDsConfigStore } from '../stores/settings/ds-config';
import { useTrainerStore } from '../stores/settings/trainer';
import type { ProfileData, ProfileEntry } from '../stores/settings/profile';

export function collectCurrentData(): ProfileData {
  const { config, ranges, timer0Auto, gameStart } = useDsConfigStore.getState();
  const { tid, sid } = useTrainerStore.getState();
  return { config, ranges, timer0Auto, gameStart, tid, sid };
}

function isProfileDataEqual(a: ProfileData, b: ProfileData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useProfile() {
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  // 現在の Store 状態を購読 (ダーティ判定用)
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const timer0Auto = useDsConfigStore((s) => s.timer0Auto);
  const gameStart = useDsConfigStore((s) => s.gameStart);
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);

  const currentData: ProfileData = useMemo(
    () => ({ config, ranges, timer0Auto, gameStart, tid, sid }),
    [config, ranges, timer0Auto, gameStart, tid, sid]
  );

  const activeProfile: ProfileEntry | undefined = useMemo(
    () => profiles.find((p) => p.id === activeProfileId),
    [profiles, activeProfileId]
  );

  const isDirty = useMemo(() => {
    if (!activeProfile) return false;
    return !isProfileDataEqual(activeProfile.data, currentData);
  }, [activeProfile, currentData]);

  // Actions は参照安定のため getState() 経由で取得 (rerender-defer-reads)
  const {
    createProfile,
    saveActiveProfile,
    renameProfile,
    deleteProfile,
    setActiveProfileId,
    importProfile,
  } = useProfileStore.getState();

  return {
    profiles,
    activeProfileId,
    activeProfile,
    isDirty,
    currentData,
    createProfile,
    saveActiveProfile,
    renameProfile,
    deleteProfile,
    setActiveProfileId,
    importProfile,
    collectCurrentData,
  } as const;
}
