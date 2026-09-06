import { useEffect, useId, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { AdvanceRangeTooltip } from '@/components/data-display/rng-tooltips';
import { clampOrDefault, handleFocusSelectAll } from './input-helpers';
import type { GenerationConfig } from '@/wasm/wasm_pkg';

type AdvanceRange = Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
interface AdvanceRangeInputProps {
  value: AdvanceRange;
  onChange: (value: Partial<AdvanceRange>) => void;
  disabled?: boolean;
  limit?: number;
  defaultMax?: number;
  syncKey?: number;
}

export function AdvanceRangeInput({
  value,
  onChange,
  disabled,
  limit = 999_999,
  defaultMax = 30,
  syncKey,
}: AdvanceRangeInputProps) {
  const { t } = useLingui();
  const id = useId();
  const [min, setMin] = useState(String(value.user_offset));
  const [max, setMax] = useState(String(value.max_advance));
  useEffect(() => {
    setMin(String(value.user_offset));
  }, [value.user_offset, syncKey]);
  useEffect(() => {
    setMax(String(value.max_advance));
  }, [value.max_advance, syncKey]);
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1">
      <h3 className="inline-flex items-center gap-1 text-xs font-medium">
        <span id={id}>
          <Trans>Advance</Trans>
        </span>
        <AdvanceRangeTooltip />
      </h3>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          aria-label={t`Min advance`}
          min={0}
          max={limit}
          className="h-7 min-w-0 text-xs tabular-nums"
          disabled={disabled}
          value={min}
          onChange={(event) => setMin(event.target.value)}
          onFocus={handleFocusSelectAll}
          onBlur={() => {
            const next = clampOrDefault(min, { defaultValue: 0, min: 0, max: limit });
            setMin(String(next));
            onChange({ user_offset: next });
          }}
        />
        <span aria-hidden="true">〜</span>
        <Input
          type="number"
          inputMode="numeric"
          aria-label={t`Max advance`}
          min={0}
          max={limit}
          className="h-7 min-w-0 text-xs tabular-nums"
          disabled={disabled}
          value={max}
          onChange={(event) => setMax(event.target.value)}
          onFocus={handleFocusSelectAll}
          onBlur={() => {
            const next = clampOrDefault(max, { defaultValue: defaultMax, min: 0, max: limit });
            setMax(String(next));
            onChange({ max_advance: next });
          }}
        />
      </div>
    </div>
  );
}
