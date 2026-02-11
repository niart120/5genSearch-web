/**
 * 特性スロット選択コンポーネント
 *
 * AbilitySlot (First / Second / Hidden) を Select UI で選択する。
 * value が undefined の場合「指定なし」を表示する。
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AbilitySlot } from '@/wasm/wasm_pkg.js';

interface AbilitySlotSelectProps {
  value: AbilitySlot | undefined;
  onChange: (value: AbilitySlot | undefined) => void;
  disabled?: boolean;
}

const SENTINEL = '__none__';

function AbilitySlotSelect({ value, onChange, disabled }: AbilitySlotSelectProps) {
  const { t } = useLingui();

  const handleChange = (v: string) => {
    onChange(v === SENTINEL ? undefined : (v as AbilitySlot));
  };

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        <Trans>Ability slot</Trans>
      </Label>
      <Select value={value ?? SENTINEL} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL}>{t`Not specified`}</SelectItem>
          <SelectItem value="First">{t`Ability 1`}</SelectItem>
          <SelectItem value="Second">{t`Ability 2`}</SelectItem>
          <SelectItem value="Hidden">{t`Hidden Ability`}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export { AbilitySlotSelect };
export type { AbilitySlotSelectProps };
