/**
 * 性別選択コンポーネント
 *
 * Gender (Male / Female / Genderless) を Select UI で選択する。
 * value が undefined の場合「指定なし」を表示する。
 * showGenderless prop で「性別不明」選択肢の表示を制御する。
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
import type { Gender } from '@/wasm/wasm_pkg.js';

interface GenderSelectProps {
  value: Gender | undefined;
  onChange: (value: Gender | undefined) => void;
  /** Genderless 選択肢を表示する (デフォルト: true) */
  showGenderless?: boolean;
  disabled?: boolean;
}

const SENTINEL = '__none__';

function GenderSelect({ value, onChange, showGenderless = true, disabled }: GenderSelectProps) {
  const { t } = useLingui();

  const handleChange = (v: string) => {
    onChange(v === SENTINEL ? undefined : (v as Gender));
  };

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        <Trans>Gender</Trans>
      </Label>
      <Select value={value ?? SENTINEL} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL}>{t`Not specified`}</SelectItem>
          <SelectItem value="Male">♂</SelectItem>
          <SelectItem value="Female">♀</SelectItem>
          {showGenderless && <SelectItem value="Genderless">-</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

export { GenderSelect };
export type { GenderSelectProps };
