/**
 * ステータス固定値入力コンポーネント
 *
 * HP / Atk / Def / SpA / SpD / Spe の6ステータスを横並びで入力する。
 * 各値は 0–999 の整数または undefined (未指定)。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { handleFocusSelectAll } from './input-helpers';
import { getStatLabel, IV_STAT_KEYS } from '@/lib/game-data-names';
import type { IvStatKey } from '@/lib/game-data-names';
import { useUiStore } from '@/stores/settings/ui';

/** 6ステータスの固定値フィルター */
interface StatsFixedValues {
  hp: number | undefined;
  atk: number | undefined;
  def: number | undefined;
  spa: number | undefined;
  spd: number | undefined;
  spe: number | undefined;
}

interface StatsFixedInputProps {
  value: StatsFixedValues;
  onChange: (v: StatsFixedValues) => void;
  disabled?: boolean;
}

function StatsFixedInput({ value, onChange, disabled }: StatsFixedInputProps) {
  const language = useUiStore((s) => s.language);

  const [localValues, setLocalValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      IV_STAT_KEYS.map((stat) => [stat, value[stat] === undefined ? '' : String(value[stat])])
    )
  );

  const localValuesRef = useRef(localValues);
  useEffect(() => {
    localValuesRef.current = localValues;
  });

  const handleChange = useCallback((stat: (typeof IV_STAT_KEYS)[number], raw: string) => {
    setLocalValues((prev) => ({ ...prev, [stat]: raw }));
  }, []);

  const handleBlur = useCallback(
    (stat: (typeof IV_STAT_KEYS)[number]) => {
      const raw = (localValuesRef.current[stat] ?? '').trim();
      if (raw === '') {
        setLocalValues((prev) => ({ ...prev, [stat]: '' }));
        onChange({ ...value, [stat]: undefined });
        return;
      }
      const parsed = Number.parseInt(raw, 10);
      const clamped = Number.isNaN(parsed) ? undefined : Math.max(0, Math.min(999, parsed));
      setLocalValues((prev) => ({
        ...prev,
        [stat]: clamped === undefined ? '' : String(clamped),
      }));
      onChange({ ...value, [stat]: clamped });
    },
    [value, onChange]
  );

  return (
    <div className="grid grid-cols-6 gap-1">
      {IV_STAT_KEYS.map((stat) => (
        <div key={stat} className="flex flex-col items-center gap-0.5">
          <span className="text-[0.65rem] font-mono text-muted-foreground">
            {getStatLabel(stat as IvStatKey, language)}
          </span>
          <Input
            type="text"
            inputMode="numeric"
            className="h-7 w-full text-center text-xs tabular-nums px-1"
            value={localValues[stat]}
            onChange={(e) => handleChange(stat, e.target.value)}
            onBlur={() => handleBlur(stat)}
            onFocus={handleFocusSelectAll}
            disabled={disabled}
            placeholder="-"
            aria-label={`${getStatLabel(stat as IvStatKey, language)} stats`}
          />
        </div>
      ))}
    </div>
  );
}

export { StatsFixedInput };
export type { StatsFixedInputProps, StatsFixedValues };
