/**
 * ID 調整フィルタフォーム
 *
 * TID / SID / Shiny PID の入力を担う。
 */

import { type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';

interface TidAdjustFormProps {
  tid: string;
  sid: string;
  shinyPidRaw: string;
  onTidChange: (tid: string) => void;
  onSidChange: (sid: string) => void;
  onShinyPidChange: (pid: string) => void;
  disabled?: boolean;
}

function TidAdjustForm({
  tid,
  sid,
  shinyPidRaw,
  onTidChange,
  onSidChange,
  onShinyPidChange,
  disabled,
}: TidAdjustFormProps): ReactElement {
  const { t } = useLingui();

  return (
    <div className="flex items-start gap-4">
      {/* TID */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tid-filter">TID</Label>
        <Input
          id="tid-filter"
          type="number"
          min={0}
          max={65_535}
          value={tid}
          onChange={(e) => onTidChange(e.target.value)}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v === '') return;
            onTidChange(String(clampOrDefault(v, { defaultValue: 0, min: 0, max: 65_535 })));
          }}
          onFocus={handleFocusSelectAll}
          disabled={disabled}
          className="w-24"
          placeholder={t`Any`}
          aria-label="TID"
        />
      </div>

      {/* SID */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sid-filter">SID</Label>
        <Input
          id="sid-filter"
          type="number"
          min={0}
          max={65_535}
          value={sid}
          onChange={(e) => onSidChange(e.target.value)}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v === '') return;
            onSidChange(String(clampOrDefault(v, { defaultValue: 0, min: 0, max: 65_535 })));
          }}
          onFocus={handleFocusSelectAll}
          disabled={disabled}
          className="w-24"
          placeholder={t`Any`}
          aria-label="SID"
        />
      </div>

      {/* Shiny PID */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="shiny-pid">
          <Trans>Shiny PID</Trans>
        </Label>
        <Input
          id="shiny-pid"
          type="text"
          value={shinyPidRaw}
          onChange={(e) => onShinyPidChange(e.target.value)}
          onFocus={handleFocusSelectAll}
          disabled={disabled}
          className="min-w-0 flex-1 font-mono"
          placeholder="0xABCD1234"
          aria-label={t`Shiny PID`}
        />
      </div>
    </div>
  );
}

export { TidAdjustForm };
