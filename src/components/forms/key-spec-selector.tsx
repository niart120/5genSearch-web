/**
 * KeySpecSelector: KeySpec 用の DS ボタン選択ラッパー
 *
 * 探索対象のボタン組み合わせ仕様 (`KeySpec`) を編集する。
 * 共通 UI は `DsButtonToggleGroup` に委譲する。
 */

import { useCallback } from 'react';
import { Trans } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { DsButtonToggleGroup } from './ds-button-toggle-group';
import type { KeySpec, DsButton } from '@/wasm/wasm_pkg';

interface KeySpecSelectorProps {
  value: KeySpec;
  onChange: (value: KeySpec) => void;
  disabled?: boolean;
  /** WASM get_key_combination_count で計算した組み合わせ数 */
  combinationCount?: number;
}

function KeySpecSelector({ value, onChange, disabled, combinationCount }: KeySpecSelectorProps) {
  const handleToggle = useCallback(
    (next: DsButton[]) => {
      onChange({ available_buttons: next });
    },
    [onChange]
  );

  return (
    <DsButtonToggleGroup
      selected={value.available_buttons}
      onToggle={handleToggle}
      disabled={disabled}
      label={
        <Label className="text-xs text-muted-foreground">
          <Trans>Key input</Trans>
        </Label>
      }
      footer={
        <p className="text-xs text-muted-foreground">
          <Trans>Combinations</Trans>:{' '}
          {combinationCount === undefined
            ? value.available_buttons.length
            : combinationCount.toLocaleString()}
        </p>
      }
    />
  );
}

export { KeySpecSelector };
export type { KeySpecSelectorProps };
