/**
 * エンカウント結果選択コンポーネント
 *
 * EncounterResultFilter (PokemonOnly / ItemOnly) を Select UI で選択する。
 * encounterType が Fishing の場合は ItemOnly を選択肢から除外する。
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
import type { EncounterResultFilter, EncounterType } from '@/wasm/wasm_pkg.js';

interface EncounterResultSelectProps {
  value: EncounterResultFilter | undefined;
  onChange: (filter?: EncounterResultFilter) => void;
  encounterType: EncounterType;
  disabled?: boolean;
}

const SENTINEL = '__none__';

function EncounterResultSelect({
  value,
  onChange,
  encounterType,
  disabled,
}: EncounterResultSelectProps) {
  const { t } = useLingui();

  const handleChange = (v: string) => {
    onChange(v === SENTINEL ? undefined : (v as EncounterResultFilter));
  };

  const showItemOnly = encounterType !== 'Fishing';

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        <Trans>Encounter result</Trans>
      </Label>
      <Select value={value ?? SENTINEL} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL}>{t`Not specified`}</SelectItem>
          <SelectItem value="PokemonOnly">{t`Pokémon only`}</SelectItem>
          {showItemOnly && <SelectItem value="ItemOnly">{t`Item only`}</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

export { EncounterResultSelect };
export type { EncounterResultSelectProps };
