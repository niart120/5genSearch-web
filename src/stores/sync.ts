import { useUiStore } from './settings/ui';
import { useProfileStore } from './settings/profile';
import { useDsConfigStore } from './settings/ds-config';
import { useTrainerStore } from './settings/trainer';
import { activateLocale } from '../i18n';
import type { SupportedLocale } from '../i18n';
import type { ProfileData } from './settings/profile';

export function applyProfileData(data: ProfileData): void {
  // ds-config Store を 1 回の setState でバッチ更新し、persist の書き込み回数を抑える
  useDsConfigStore.setState({
    config: data.config,
    ranges: data.ranges,
    timer0Auto: data.timer0Auto,
    gameStart: data.gameStart,
  });
  useTrainerStore.getState().setTrainer(data.tid, data.sid);
}

export function setupStoreSyncSubscriptions(): () => void {
  const cleanups: Array<() => void> = [];

  // language → i18n 同期
  const unsubLanguage = useUiStore.subscribe(
    (state) => state.language,
    async (language) => {
      await activateLocale(language as SupportedLocale);
    }
  );
  cleanups.push(unsubLanguage);

  // activeProfileId 変更 → ds-config / trainer Store に反映
  const unsubProfile = useProfileStore.subscribe(
    (state) => state.activeProfileId,
    (activeId, prevId) => {
      if (activeId === prevId) return;
      if (!activeId) return;
      const profile = useProfileStore.getState().profiles.find((p) => p.id === activeId);
      if (profile) {
        applyProfileData(profile.data);
      }
    }
  );
  cleanups.push(unsubProfile);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
