import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { DsConfig, GameStartConfig, Timer0VCountRange } from '../../wasm/wasm_pkg.js';

export interface ProfileData {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  timer0Auto: boolean;
  gameStart: GameStartConfig;
  tid: number | undefined;
  sid: number | undefined;
}

export interface ProfileEntry {
  id: string;
  name: string;
  data: ProfileData;
  createdAt: number;
  updatedAt: number;
}

interface ProfileState {
  profiles: ProfileEntry[];
  activeProfileId: string | undefined;
}

interface ProfileActions {
  /** 現在の設定から新規プロファイルを作成 */
  createProfile: (name: string, data: ProfileData) => string;
  /** アクティブプロファイルの内容を上書き保存 */
  saveActiveProfile: (data: ProfileData) => void;
  /** プロファイル名を変更 */
  renameProfile: (id: string, name: string) => void;
  /** プロファイルを削除 */
  deleteProfile: (id: string) => void;
  /** アクティブプロファイルを切替 */
  setActiveProfileId: (id: string | undefined) => void;
  /** インポートしたプロファイルを追加 */
  importProfile: (entry: Omit<ProfileEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  /** 全プロファイルをリセット */
  reset: () => void;
}

const DEFAULT_STATE: ProfileState = {
  profiles: [],
  activeProfileId: undefined,
};

export const useProfileStore = create<ProfileState & ProfileActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...DEFAULT_STATE,

        createProfile: (name, data) => {
          const id = crypto.randomUUID();
          const now = Date.now();
          const entry: ProfileEntry = { id, name, data, createdAt: now, updatedAt: now };
          set((state) => ({
            profiles: [...state.profiles, entry],
            activeProfileId: id,
          }));
          return id;
        },

        saveActiveProfile: (data) => {
          const { activeProfileId } = get();
          if (!activeProfileId) return;
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === activeProfileId ? { ...p, data, updatedAt: Date.now() } : p
            ),
          }));
        },

        renameProfile: (id, name) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === id ? { ...p, name, updatedAt: Date.now() } : p
            ),
          }));
        },

        deleteProfile: (id) => {
          set((state) => ({
            profiles: state.profiles.filter((p) => p.id !== id),
            activeProfileId: state.activeProfileId === id ? undefined : state.activeProfileId,
          }));
        },

        setActiveProfileId: (id) => set({ activeProfileId: id }),

        importProfile: (entry) => {
          const id = crypto.randomUUID();
          const now = Date.now();
          set((state) => ({
            profiles: [...state.profiles, { ...entry, id, createdAt: now, updatedAt: now }],
          }));
          return id;
        },

        reset: () => set(DEFAULT_STATE),
      }),
      {
        name: 'profiles',
        version: 1,
      }
    )
  )
);

export const getProfileInitialState = (): ProfileState => DEFAULT_STATE;
