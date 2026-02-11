/**
 * 色違いフィルター選択コンポーネント
 *
 * ShinyFilter (Star / Square / Shiny) を Select UI で選択する。
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
import type { ShinyFilter } from '@/wasm/wasm_pkg.js';

interface ShinySelectProps {
  value: ShinyFilter | undefined;
  onChange: (value: ShinyFilter | undefined) => void;
  disabled?: boolean;
}

const SENTINEL = '__none__';

function ShinySelect({ value, onChange, disabled }: ShinySelectProps) {
  const { t } = useLingui();

  const handleChange = (v: string) => {
    onChange(v === SENTINEL ? undefined : (v as ShinyFilter));
  };

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        <Trans>Shiny</Trans>
      </Label>
      <Select value={value ?? SENTINEL} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL}>{t`Not specified`}</SelectItem>
          <SelectItem value="Star">☆</SelectItem>
          <SelectItem value="Square">◇</SelectItem>
          <SelectItem value="Shiny">☆ & ◇</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export { ShinySelect };
export type { ShinySelectProps };
