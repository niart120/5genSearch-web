import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TrainerState {
  tid: number | undefined;
  sid: number | undefined;
}

interface TrainerActions {
  setTid: (tid: number | undefined) => void;
  setSid: (sid: number | undefined) => void;
  setTrainer: (tid: number | undefined, sid: number | undefined) => void;
  reset: () => void;
}

const DEFAULT_STATE: TrainerState = {
  tid: undefined,
  sid: undefined,
};

export const useTrainerStore = create<TrainerState & TrainerActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setTid: (tid) => set({ tid }),
      setSid: (sid) => set({ sid }),
      setTrainer: (tid, sid) => set({ tid, sid }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'trainer',
      version: 1,
    }
  )
);

export const getTrainerInitialState = (): TrainerState => DEFAULT_STATE;
