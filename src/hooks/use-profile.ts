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
  // フィールド単位で比較する (JSON.stringify はプロパティ順序依存・undefined 除外の問題がある)
  if (a.timer0Auto !== b.timer0Auto) return false;
  if (a.tid !== b.tid || a.sid !== b.sid) return false;
  if (
    a.config.hardware !== b.config.hardware ||
    a.config.version !== b.config.version ||
    a.config.region !== b.config.region
  ) {
    return false;
  }
  if (a.config.mac.length !== b.config.mac.length) return false;
  for (let i = 0; i < a.config.mac.length; i++) {
    if (a.config.mac[i] !== b.config.mac[i]) return false;
  }
  if (
    a.gameStart.start_mode !== b.gameStart.start_mode ||
    a.gameStart.save !== b.gameStart.save ||
    a.gameStart.memory_link !== b.gameStart.memory_link ||
    a.gameStart.shiny_charm !== b.gameStart.shiny_charm
  ) {
    return false;
  }
  if (a.ranges.length !== b.ranges.length) return false;
  for (let i = 0; i < a.ranges.length; i++) {
    const ra = a.ranges[i];
    const rb = b.ranges[i];
    if (
      ra.timer0_min !== rb.timer0_min ||
      ra.timer0_max !== rb.timer0_max ||
      ra.vcount_min !== rb.vcount_min ||
      ra.vcount_max !== rb.vcount_max
    ) {
      return false;
    }
  }
  return true;
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
