/**
 * KeySpec 入力コンポーネント
 *
 * DS コントローラ風レイアウトでボタン選択 UI を提供する。
 * 探索対象のボタン組み合わせ仕様 (`KeySpec`) を編集する。
 *
 * レイアウト:
 *   [L]                    [R]       ← Shoulder
 *   [↑]               [X]           ← Row 1
 *  [←] [→]            [Y] [A]       ← Row 2
 *   [↓]               [B]           ← Row 3
 *        [Select] [Start]            ← Bottom center
 */

import { useMemo, useCallback, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { DsButton, KeySpec } from '@/wasm/wasm_pkg';

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

/** D-Pad 3x3 グリッド配置 (null = 空セル) */
const DPAD_LAYOUT: (DsButton | undefined)[][] = [
  [undefined, 'Up', undefined],
  ['Left', undefined, 'Right'],
  [undefined, 'Down', undefined],
];

/** Face ボタン 3x3 グリッド配置 (null = 空セル) */
const FACE_LAYOUT: (DsButton | undefined)[][] = [
  [undefined, 'X', undefined],
  ['Y', undefined, 'A'],
  [undefined, 'B', undefined],
];

interface KeySpecInputProps {
  value: KeySpec;
  onChange: (value: KeySpec) => void;
  disabled?: boolean;
  /** WASM get_key_combination_count で計算した組み合わせ数 */
  combinationCount?: number;
}

/** トグルボタン (checkbox role を維持して既存テストとの互換性を保つ) */
function ToggleButton({
  pressed,
  onToggle,
  disabled,
  label,
  ariaLabel,
  className,
}: {
  pressed: boolean;
  onToggle: (pressed: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={pressed}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onToggle(!pressed)}
      className={cn(
        'inline-flex items-center justify-center rounded-sm text-xs font-medium transition-colors',
        'size-8 select-none',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        pressed
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      {label}
    </button>
  );
}

function KeySpecInput({ value, onChange, disabled, combinationCount }: KeySpecInputProps) {
  const { t } = useLingui();
  const selectedSet = useMemo(
    () => new Set<DsButton>(value.available_buttons),
    [value.available_buttons]
  );

  const handleToggle = useCallback(
    (button: DsButton, pressed: boolean) => {
      const next = pressed
        ? [...value.available_buttons, button]
        : value.available_buttons.filter((b) => b !== button);
      onChange({ available_buttons: next });
    },
    [value.available_buttons, onChange]
  );

  /** 3x3 グリッドを描画する */
  const renderGrid = (layout: (DsButton | undefined)[][]) => (
    <div className="grid grid-cols-3 gap-1">
      {layout
        .flat()
        .map((btn, idx) =>
          btn ? (
            <ToggleButton
              key={btn}
              pressed={selectedSet.has(btn)}
              onToggle={(pressed) => handleToggle(btn, pressed)}
              disabled={disabled}
              label={BUTTON_LABELS[btn]}
              ariaLabel={t`Button ${BUTTON_LABELS[btn]}`}
            />
          ) : (
            <div key={`empty-${idx.toString()}`} />
          )
        )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">
        <Trans>Key input</Trans>
      </Label>

      {/* Controller layout */}
      <div className="mx-auto flex max-w-72 flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
        {/* Shoulder: L ... R */}
        <div className="flex items-center justify-between px-1">
          <ToggleButton
            pressed={selectedSet.has('L')}
            onToggle={(pressed) => handleToggle('L', pressed)}
            disabled={disabled}
            label="L"
            ariaLabel={t`Button L`}
            className="h-7 w-12 rounded-t-lg text-xs"
          />
          <ToggleButton
            pressed={selectedSet.has('R')}
            onToggle={(pressed) => handleToggle('R', pressed)}
            disabled={disabled}
            label="R"
            ariaLabel={t`Button R`}
            className="h-7 w-12 rounded-t-lg text-xs"
          />
        </div>

        {/* Main body: D-Pad | Face */}
        <div className="flex items-center justify-center gap-8">
          {/* D-Pad */}
          {renderGrid(DPAD_LAYOUT)}

          {/* Face buttons: X Y A B */}
          {renderGrid(FACE_LAYOUT)}
        </div>

        {/* Bottom center: Select / Start */}
        <div className="flex items-center justify-center gap-3">
          <ToggleButton
            pressed={selectedSet.has('Select')}
            onToggle={(pressed) => handleToggle('Select', pressed)}
            disabled={disabled}
            label="Select"
            ariaLabel={t`Button Select`}
            className="h-6 w-14 rounded-full text-[10px]"
          />
          <ToggleButton
            pressed={selectedSet.has('Start')}
            onToggle={(pressed) => handleToggle('Start', pressed)}
            disabled={disabled}
            label="Start"
            ariaLabel={t`Button Start`}
            className="h-6 w-14 rounded-full text-[10px]"
          />
        </div>
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
