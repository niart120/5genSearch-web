import { useUiStore } from './settings/ui';
import { useProfileStore } from './settings/profile';
import { useDsConfigStore } from './settings/ds-config';
import { useTrainerStore } from './settings/trainer';
import { activateLocale } from '../i18n';
import type { SupportedLocale } from '../i18n';
import type { ProfileData } from './settings/profile';

export function applyProfileData(data: ProfileData): void {
  useDsConfigStore.getState().replaceConfig(data.config);
  useDsConfigStore.getState().setRanges(data.ranges);
  useDsConfigStore.getState().setTimer0Auto(data.timer0Auto);
  useDsConfigStore.setState({ gameStart: data.gameStart });
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
