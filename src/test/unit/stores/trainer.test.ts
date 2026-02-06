import { beforeEach, describe, expect, it } from 'vitest';
import { useTrainerStore, getTrainerInitialState } from '../../../stores/settings/trainer';

const resetStore = () => {
  localStorage.clear();
  useTrainerStore.setState(getTrainerInitialState(), true);
};

describe('trainer store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have undefined defaults', () => {
    const { tid, sid } = useTrainerStore.getState();
    expect(tid).toBeUndefined();
    expect(sid).toBeUndefined();
  });

  it('should set tid only', () => {
    useTrainerStore.getState().setTid(1234);
    const { tid, sid } = useTrainerStore.getState();
    expect(tid).toBe(1234);
    expect(sid).toBeUndefined();
  });

  it('should set sid only', () => {
    useTrainerStore.getState().setSid(5678);
    const { tid, sid } = useTrainerStore.getState();
    expect(tid).toBeUndefined();
    expect(sid).toBe(5678);
  });

  it('should set trainer values together', () => {
    useTrainerStore.getState().setTrainer(1111, 2222);
    const { tid, sid } = useTrainerStore.getState();
    expect(tid).toBe(1111);
    expect(sid).toBe(2222);
  });

  it('should reset to undefined', () => {
    useTrainerStore.getState().setTrainer(1111, 2222);
    useTrainerStore.getState().reset();
    const { tid, sid } = useTrainerStore.getState();
    expect(tid).toBeUndefined();
    expect(sid).toBeUndefined();
  });
});
