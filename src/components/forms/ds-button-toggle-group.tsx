/**
 * DS コントローラ風ボタントグルグループ
 *
 * D-pad / Face ボタン / ショルダー / Start / Select を
 * トグルボタンで選択するコントローラ風レイアウト。
 * `KeyInputSelector` と `KeySpecSelector` の共通 UI 基盤。
 *
 * レイアウト:
 *   [L]                    [R]       ← Shoulder
 *   [↑]               [X]           ← Row 1
 *  [←] [→]            [Y] [A]       ← Row 2
 *   [↓]               [B]           ← Row 3
 *        [Select] [Start]            ← Bottom center
 */

import { useMemo, useCallback, type ReactNode } from 'react';
import { useLingui } from '@lingui/react/macro';
import { cn } from '@/lib/utils';
import type { DsButton } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

/** D-Pad 3x3 グリッド配置 (undefined = 空セル) */
const DPAD_LAYOUT: (DsButton | undefined)[][] = [
  [undefined, 'Up', undefined],
  ['Left', undefined, 'Right'],
  [undefined, 'Down', undefined],
];

/** Face ボタン 3x3 グリッド配置 (undefined = 空セル) */
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
function ToggleBtn({ pressed, onToggle, disabled, label, ariaLabel, className }: ToggleBtnProps) {
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
// DsButtonToggleGroup
// ---------------------------------------------------------------------------

interface DsButtonToggleGroupProps {
  /** 選択中のボタンリスト */
  selected: DsButton[];
  /** トグル時のコールバック (更新後の全選択リストを返す) */
  onToggle: (next: DsButton[]) => void;
  disabled?: boolean;
  /** コントローラ上部に表示するラベル (ReactNode) */
  label?: ReactNode;
  /** コントローラ下部に表示するフッター (ReactNode) */
  footer?: ReactNode;
}

/**
 * DS コントローラ風ボタン選択 UI
 *
 * 12 個の DS ボタンをトグル形式で選択する。
 */
function DsButtonToggleGroup({
  selected,
  onToggle,
  disabled,
  label,
  footer,
}: DsButtonToggleGroupProps) {
  const { t } = useLingui();
  const selectedSet = useMemo(() => new Set<DsButton>(selected), [selected]);

  const handleToggle = useCallback(
    (button: DsButton, pressed: boolean) => {
      const next = pressed ? [...selected, button] : selected.filter((b) => b !== button);
      onToggle(next);
    },
    [selected, onToggle]
  );

  /** 3x3 グリッドを描画する */
  const renderGrid = (layout: (DsButton | undefined)[][]) => (
    <div className="grid grid-cols-3 gap-1">
      {layout
        .flat()
        .map((btn, idx) =>
          btn ? (
            <ToggleBtn
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
      {label}

      {/* Controller layout */}
      <div className="mx-auto flex max-w-72 flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
        {/* Shoulder: L ... R */}
        <div className="flex items-center justify-between px-1">
          <ToggleBtn
            pressed={selectedSet.has('L')}
            onToggle={(pressed) => handleToggle('L', pressed)}
            disabled={disabled}
            label="L"
            ariaLabel={t`Button ${BUTTON_LABELS['L']}`}
            className="h-7 w-12 rounded-t-lg text-xs"
          />
          <ToggleBtn
            pressed={selectedSet.has('R')}
            onToggle={(pressed) => handleToggle('R', pressed)}
            disabled={disabled}
            label="R"
            ariaLabel={t`Button ${BUTTON_LABELS['R']}`}
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
            onToggle={(pressed) => handleToggle('Select', pressed)}
            disabled={disabled}
            label="Select"
            ariaLabel={t`Button ${BUTTON_LABELS['Select']}`}
            className="h-6 w-14 rounded-full text-[10px]"
          />
          <ToggleBtn
            pressed={selectedSet.has('Start')}
            onToggle={(pressed) => handleToggle('Start', pressed)}
            disabled={disabled}
            label="Start"
            ariaLabel={t`Button ${BUTTON_LABELS['Start']}`}
            className="h-6 w-14 rounded-full text-[10px]"
          />
        </div>
      </div>

      {footer}
    </div>
  );
}

export { DsButtonToggleGroup, ToggleBtn, BUTTON_LABELS };
export type { DsButtonToggleGroupProps, ToggleBtnProps };
