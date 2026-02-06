import { useTrainerStore } from '../stores/settings/trainer';

export function useTrainer() {
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);
  const setTid = useTrainerStore((s) => s.setTid);
  const setSid = useTrainerStore((s) => s.setSid);
  const setTrainer = useTrainerStore((s) => s.setTrainer);
  const reset = useTrainerStore((s) => s.reset);

  return { tid, sid, setTid, setSid, setTrainer, reset } as const;
}
