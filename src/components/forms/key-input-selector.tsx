/**
 * KeyInputSelector: DS コントローラ風キー入力選択
 *
 * D-pad / Face ボタン / ショルダー / Start / Select を
 * トグルボタンで選択するレイアウトコンポーネント。
 */

import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { KeyInput, DsButton } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const DPAD_LAYOUT: (DsButton | undefined)[][] = [
  [undefined, 'Up', undefined],
  ['Left', undefined, 'Right'],
  [undefined, 'Down', undefined],
];

const FACE_LAYOUT: (DsButton | undefined)[][] = [
  [undefined, 'X', undefined],
  ['Y', undefined, 'A'],
  [undefined, 'B', undefined],
];

// ---------------------------------------------------------------------------
// ToggleBtn
// ---------------------------------------------------------------------------

interface ToggleBtnProps {
  pressed: boolean;
  onToggle: (pressed: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  ariaLabel: string;
  className?: string;
}

/** DS コントローラ風トグルボタン */
function ToggleBtn({
  pressed,
  onToggle,
  disabled,
  label,
  ariaLabel,
  className,
}: ToggleBtnProps): ReactElement {
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

// ---------------------------------------------------------------------------
// KeyInputSelector
// ---------------------------------------------------------------------------

interface KeyInputSelectorProps {
  value: KeyInput;
  onChange: (value: KeyInput) => void;
  disabled?: boolean;
}

/** KeyInput ボタン選択 (DS コントローラ風レイアウト) */
function KeyInputSelector({ value, onChange, disabled }: KeyInputSelectorProps): ReactElement {
  const { t } = useLingui();
  const selectedSet = useMemo(() => new Set<DsButton>(value.buttons), [value.buttons]);

  const handleToggle = useCallback(
    (button: DsButton, pressed: boolean) => {
      const next = pressed ? [...value.buttons, button] : value.buttons.filter((b) => b !== button);
      onChange({ buttons: next });
    },
    [value.buttons, onChange]
  );

  const renderGrid = (layout: (DsButton | undefined)[][]) => (
    <div className="grid grid-cols-3 gap-1">
      {layout
        .flat()
        .map((btn, idx) =>
          btn ? (
            <ToggleBtn
              key={btn}
              pressed={selectedSet.has(btn)}
              onToggle={(p) => handleToggle(btn, p)}
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
        <Trans>Key input (buttons held)</Trans>
      </Label>
      <div className="mx-auto flex max-w-72 flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
        {/* Shoulder: L ... R */}
        <div className="flex items-center justify-between px-1">
          <ToggleBtn
            pressed={selectedSet.has('L')}
            onToggle={(p) => handleToggle('L', p)}
            disabled={disabled}
            label="L"
            ariaLabel={t`Button L`}
            className="h-7 w-12 rounded-t-lg text-xs"
          />
          <ToggleBtn
            pressed={selectedSet.has('R')}
            onToggle={(p) => handleToggle('R', p)}
            disabled={disabled}
            label="R"
            ariaLabel={t`Button R`}
            className="h-7 w-12 rounded-t-lg text-xs"
          />
        </div>
        {/* Main body: D-Pad | Face */}
        <div className="flex items-center justify-center gap-8">
          {renderGrid(DPAD_LAYOUT)}
          {renderGrid(FACE_LAYOUT)}
        </div>
        {/* Bottom: Select / Start */}
        <div className="flex items-center justify-center gap-3">
          <ToggleBtn
            pressed={selectedSet.has('Select')}
            onToggle={(p) => handleToggle('Select', p)}
            disabled={disabled}
            label="Select"
            ariaLabel={t`Button Select`}
            className="h-6 w-14 rounded-full text-[10px]"
          />
          <ToggleBtn
            pressed={selectedSet.has('Start')}
            onToggle={(p) => handleToggle('Start', p)}
            disabled={disabled}
            label="Start"
            ariaLabel={t`Button Start`}
            className="h-6 w-14 rounded-full text-[10px]"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        <Trans>Selected buttons</Trans>: {value.buttons.length}
      </p>
    </div>
  );
}

export { KeyInputSelector, ToggleBtn };
export type { KeyInputSelectorProps, ToggleBtnProps };
