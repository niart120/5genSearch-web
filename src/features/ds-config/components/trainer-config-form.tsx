import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTrainerStore } from '@/stores/settings/trainer';

function handleIdChange(setter: (v: number | undefined) => void, raw: string) {
  if (raw === '') {
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly set store value to undefined
    setter(undefined);
    return;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return;
  setter(Math.max(0, Math.min(65_535, n)));
}

function TrainerConfigForm() {
  const { t } = useLingui();
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);
  const setTid = useTrainerStore((s) => s.setTid);
  const setSid = useTrainerStore((s) => s.setSid);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tid" className="text-xs">
          <Trans>TID</Trans>
        </Label>
        <Input
          id="tid"
          type="number"
          min={0}
          max={65_535}
          placeholder={t`Trainer ID`}
          value={tid ?? ''}
          onChange={(e) => handleIdChange(setTid, e.target.value)}
          aria-label={t`Trainer ID`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sid" className="text-xs">
          <Trans>SID</Trans>
        </Label>
        <Input
          id="sid"
          type="number"
          min={0}
          max={65_535}
          placeholder={t`Secret ID`}
          value={sid ?? ''}
          onChange={(e) => handleIdChange(setSid, e.target.value)}
          aria-label={t`Secret ID`}
        />
      </div>
    </div>
  );
}

export { TrainerConfigForm };
