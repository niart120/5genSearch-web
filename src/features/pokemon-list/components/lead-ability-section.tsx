/**
 * 先頭特性 + シンクロ性格 選択セクション
 *
 * pokemon-params-form.tsx から分離したサブコンポーネント。
 */

import { useState, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getNatureName, NATURE_ORDER } from '@/lib/game-data-names';
import type { LeadAbilityEffect, Nature } from '@/wasm/wasm_pkg.js';
import type { SupportedLocale } from '@/i18n';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeadAbilitySectionProps {
  leadAbility: LeadAbilityEffect;
  onChange: (ability: LeadAbilityEffect) => void;
  language: SupportedLocale;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LeadAbilitySection({
  leadAbility,
  onChange,
  language,
  disabled,
}: LeadAbilitySectionProps): ReactElement {
  const { t } = useLingui();

  // シンクロ性格 (内部状態: Synchronize 以外選択時も保持)
  const [syncNature, setSyncNature] = useState<Nature>('Adamant');

  const leadAbilityValue =
    typeof leadAbility === 'object' && 'Synchronize' in leadAbility
      ? 'Synchronize'
      : (leadAbility as string);

  const handleLeadAbilityChange = useCallback(
    (newValue: string) => {
      let newAbility: LeadAbilityEffect;
      switch (newValue) {
        case 'CompoundEyes': {
          newAbility = 'CompoundEyes';
          break;
        }
        case 'Synchronize': {
          newAbility = { Synchronize: syncNature };
          break;
        }
        default: {
          newAbility = 'None';
        }
      }
      onChange(newAbility);
    },
    [onChange, syncNature]
  );

  const handleSyncNatureChange = useCallback(
    (newValue: string) => {
      const nature = newValue as Nature;
      setSyncNature(nature);
      if (typeof leadAbility === 'object' && 'Synchronize' in leadAbility) {
        onChange({ Synchronize: nature });
      }
    },
    [onChange, leadAbility]
  );

  return (
    <>
      {/* 先頭特性 */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          <Trans>Lead ability</Trans>
        </Label>
        <Select
          value={leadAbilityValue}
          onValueChange={handleLeadAbilityChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">{t`None`}</SelectItem>
            <SelectItem value="Synchronize">{t`Synchronize`}</SelectItem>
            <SelectItem value="CompoundEyes">{t`Compound Eyes`}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* シンクロ性格 (Synchronize 選択時のみ) */}
      {leadAbilityValue === 'Synchronize' && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Synchronize nature</Trans>
          </Label>
          <Select value={syncNature} onValueChange={handleSyncNatureChange} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NATURE_ORDER.map((n) => (
                <SelectItem key={n} value={n}>
                  {getNatureName(n, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

export { LeadAbilitySection };
export type { LeadAbilitySectionProps };
