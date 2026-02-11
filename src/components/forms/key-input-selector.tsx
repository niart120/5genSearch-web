/**
 * KeyInputSelector: KeyInput 用の DS ボタン選択ラッパー
 *
 * 確定した1組のボタン入力 (`KeyInput`) を編集する。
 * 共通 UI は `DsButtonToggleGroup` に委譲する。
 */

import { useCallback } from 'react';
import { Trans } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { DsButtonToggleGroup } from './ds-button-toggle-group';
import type { KeyInput, DsButton } from '@/wasm/wasm_pkg.js';

interface KeyInputSelectorProps {
  value: KeyInput;
  onChange: (value: KeyInput) => void;
  disabled?: boolean;
}

function KeyInputSelector({ value, onChange, disabled }: KeyInputSelectorProps) {
  const handleToggle = useCallback(
    (next: DsButton[]) => {
      onChange({ buttons: next });
    },
    [onChange]
  );

  return (
    <DsButtonToggleGroup
      selected={value.buttons}
      onToggle={handleToggle}
      disabled={disabled}
      label={
        <Label className="text-xs text-muted-foreground">
          <Trans>Key input (buttons held)</Trans>
        </Label>
      }
      footer={
        <p className="text-xs text-muted-foreground">
          <Trans>Selected buttons</Trans>: {value.buttons.length}
        </p>
      }
    />
  );
}

export { KeyInputSelector };
export type { KeyInputSelectorProps };
