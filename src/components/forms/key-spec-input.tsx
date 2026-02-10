/**
 * KeySpec 入力コンポーネント
 *
 * DS ボタンの選択 UI。探索対象のボタン組み合わせ仕様 (`KeySpec`) を編集する。
 * ボタンごとのチェックボックスを表示し、選択状態に応じた組み合わせ数を表示する。
 */

import { useMemo, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DsButton, KeySpec } from '@/wasm/wasm_pkg';

const ALL_BUTTONS: readonly DsButton[] = [
  'A',
  'B',
  'X',
  'Y',
  'L',
  'R',
  'Start',
  'Select',
  'Up',
  'Down',
  'Left',
  'Right',
];

/** ボタンの表示ラベル */
const BUTTON_LABELS: Record<DsButton, string> = {
  A: 'A',
  B: 'B',
  X: 'X',
  Y: 'Y',
  L: 'L',
  R: 'R',
  Start: 'Start',
  Select: 'Select',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
};

interface KeySpecInputProps {
  value: KeySpec;
  onChange: (value: KeySpec) => void;
  disabled?: boolean;
  /** WASM get_key_combination_count で計算した組み合わせ数 */
  combinationCount?: number;
}

function KeySpecInput({ value, onChange, disabled, combinationCount }: KeySpecInputProps) {
  const { t } = useLingui();
  const selectedSet = useMemo(
    () => new Set<DsButton>(value.available_buttons),
    [value.available_buttons]
  );

  const handleToggle = useCallback(
    (button: DsButton, checked: boolean) => {
      const next = checked
        ? [...value.available_buttons, button]
        : value.available_buttons.filter((b) => b !== button);
      onChange({ available_buttons: next });
    },
    [value.available_buttons, onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">
        <Trans>Key input</Trans>
      </Label>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
        {ALL_BUTTONS.map((button) => (
          <label
            key={button}
            className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
          >
            <Checkbox
              checked={selectedSet.has(button)}
              onCheckedChange={(checked) => handleToggle(button, checked === true)}
              disabled={disabled}
              aria-label={t`Button ${BUTTON_LABELS[button]}`}
            />
            <span className="text-xs">{BUTTON_LABELS[button]}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <Trans>Combinations</Trans>:{' '}
        {combinationCount === undefined
          ? value.available_buttons.length
          : combinationCount.toLocaleString()}
      </p>
    </div>
  );
}

export type { KeySpecInputProps };
export { KeySpecInput };
