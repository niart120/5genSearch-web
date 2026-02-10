import { Trans, useLingui } from '@lingui/react/macro';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Timer0VCountRangeInput } from '@/components/forms/timer0-vcount-range-input';

function Timer0VCountSection() {
  const { t } = useLingui();
  const ranges = useDsConfigStore((s) => s.ranges);
  const setRanges = useDsConfigStore((s) => s.setRanges);
  const timer0Auto = useDsConfigStore((s) => s.timer0Auto);
  const setTimer0Auto = useDsConfigStore((s) => s.setTimer0Auto);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Timer0 / VCount</Label>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="timer0-auto" className="text-xs">
            <Trans>Auto</Trans>
          </Label>
          <Switch
            id="timer0-auto"
            checked={timer0Auto}
            onCheckedChange={(checked) => setTimer0Auto(checked === true)}
            aria-label={t`Auto`}
          />
        </div>
      </div>

      {ranges.map((range, i) => (
        <Timer0VCountRangeInput
          key={i}
          value={range}
          onChange={(updated) => {
            const next = [...ranges];
            next[i] = updated;
            setRanges(next);
          }}
          disabled={timer0Auto}
        />
      ))}
    </div>
  );
}

export { Timer0VCountSection };
