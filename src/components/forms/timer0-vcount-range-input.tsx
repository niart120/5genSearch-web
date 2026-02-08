import * as React from 'react';
import { useLingui } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { parseHexByte, toHexString, parseHexWord, toHexWordString } from '@/lib/hex';
import { handleFocusSelectAll } from '@/components/forms/input-helpers';
import type { Timer0VCountRange } from '@/wasm/wasm_pkg';

interface Timer0VCountRangeInputProps {
  /** 現在の Timer0/VCount 範囲 */
  value: Timer0VCountRange;
  /** 値変更コールバック */
  onChange: (value: Timer0VCountRange) => void;
  /** 無効化 (Auto モード時に使用) */
  disabled?: boolean;
}

function Timer0VCountRangeInput({ value, onChange, disabled }: Timer0VCountRangeInputProps) {
  const { t } = useLingui();

  const [timer0Min, setTimer0Min] = React.useState(() => toHexWordString(value.timer0_min));
  const [timer0Max, setTimer0Max] = React.useState(() => toHexWordString(value.timer0_max));
  const [vcountMin, setVcountMin] = React.useState(() => toHexString(value.vcount_min));
  const [vcountMax, setVcountMax] = React.useState(() => toHexString(value.vcount_max));

  React.useEffect(() => {
    setTimer0Min(toHexWordString(value.timer0_min));
    setTimer0Max(toHexWordString(value.timer0_max));
    setVcountMin(toHexString(value.vcount_min));
    setVcountMax(toHexString(value.vcount_max));
  }, [value.timer0_min, value.timer0_max, value.vcount_min, value.vcount_max]);

  const filterHex = (raw: string, maxLen: number): string => {
    return raw.replace(/[^0-9a-fA-F]/g, '').slice(0, maxLen);
  };

  const handleTimer0MinBlur = () => {
    const parsed = parseHexWord(timer0Min, value.timer0_min);
    setTimer0Min(toHexWordString(parsed));
    onChange({ ...value, timer0_min: parsed });
  };

  const handleTimer0MaxBlur = () => {
    const parsed = parseHexWord(timer0Max, value.timer0_max);
    setTimer0Max(toHexWordString(parsed));
    onChange({ ...value, timer0_max: parsed });
  };

  const handleVcountMinBlur = () => {
    const parsed = parseHexByte(vcountMin, value.vcount_min);
    setVcountMin(toHexString(parsed));
    onChange({ ...value, vcount_min: parsed });
  };

  const handleVcountMaxBlur = () => {
    const parsed = parseHexByte(vcountMax, value.vcount_max);
    setVcountMax(toHexString(parsed));
    onChange({ ...value, vcount_max: parsed });
  };

  const inputClass = cn('w-16 px-1 text-center font-mono tabular-nums uppercase');

  return (
    <div className="flex flex-col gap-2">
      {/* Timer0 行 */}
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-medium">Timer0</Label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="timer0-min" className="text-xs text-muted-foreground">
              {t`Min`}
            </Label>
            <Input
              id="timer0-min"
              className={inputClass}
              value={timer0Min}
              onChange={(e) => setTimer0Min(filterHex(e.target.value, 4))}
              onFocus={handleFocusSelectAll}
              onBlur={handleTimer0MinBlur}
              maxLength={4}
              disabled={disabled}
              aria-label={t`Timer0最小値`}
            />
          </div>
          <span className="text-sm text-muted-foreground">–</span>
          <div className="flex items-center gap-1">
            <Label htmlFor="timer0-max" className="text-xs text-muted-foreground">
              {t`Max`}
            </Label>
            <Input
              id="timer0-max"
              className={inputClass}
              value={timer0Max}
              onChange={(e) => setTimer0Max(filterHex(e.target.value, 4))}
              onFocus={handleFocusSelectAll}
              onBlur={handleTimer0MaxBlur}
              maxLength={4}
              disabled={disabled}
              aria-label={t`Timer0最大値`}
            />
          </div>
        </div>
      </div>

      {/* VCount 行 */}
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-medium">VCount</Label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="vcount-min" className="text-xs text-muted-foreground">
              {t`Min`}
            </Label>
            <Input
              id="vcount-min"
              className={cn(inputClass, 'w-12')}
              value={vcountMin}
              onChange={(e) => setVcountMin(filterHex(e.target.value, 2))}
              onFocus={handleFocusSelectAll}
              onBlur={handleVcountMinBlur}
              maxLength={2}
              disabled={disabled}
              aria-label={t`VCount最小値`}
            />
          </div>
          <span className="text-sm text-muted-foreground">–</span>
          <div className="flex items-center gap-1">
            <Label htmlFor="vcount-max" className="text-xs text-muted-foreground">
              {t`Max`}
            </Label>
            <Input
              id="vcount-max"
              className={cn(inputClass, 'w-12')}
              value={vcountMax}
              onChange={(e) => setVcountMax(filterHex(e.target.value, 2))}
              onFocus={handleFocusSelectAll}
              onBlur={handleVcountMaxBlur}
              maxLength={2}
              disabled={disabled}
              aria-label={t`VCount最大値`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Timer0VCountRangeInputProps };
export { Timer0VCountRangeInput };
