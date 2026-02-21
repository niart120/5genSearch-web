/**
 * SpinnerNumField — 上下ボタン付き数値入力フィールド
 *
 * clamp-on-blur 数値入力 (NumField) に ChevronUp/Down スピナーボタンを追加。
 */

import { useState, useCallback, type ReactElement } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clampOrDefault } from '@/components/forms/input-helpers';

// ---------------------------------------------------------------------------
// NumField
// ---------------------------------------------------------------------------

interface NumFieldProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  min: number;
  max: number;
  disabled?: boolean;
  label: string;
  className?: string;
  /** ゼロ埋め桁数 (0 = 埋めなし) */
  padLength?: number;
}

/** clamp-on-blur 付き数値入力フィールド */
function NumField({
  id,
  value,
  onChange,
  defaultValue,
  min,
  max,
  disabled,
  label,
  className,
  padLength = 0,
}: NumFieldProps): ReactElement {
  // undefined = 未編集 (prop 値を表示)、string = 編集中 (ローカルバッファ)
  const [localInput, setLocalInput] = useState<string | undefined>();
  const formatValue = (v: number): string =>
    padLength > 0 ? String(v).padStart(padLength, '0') : String(v);
  const displayValue = localInput ?? formatValue(value);

  return (
    <Input
      id={id}
      className={cn('h-7 px-0 text-center font-mono tabular-nums', className)}
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => setLocalInput(e.target.value)}
      onFocus={(e) => {
        // フォーマット済みの表示値をそのままローカルバッファに移行し、
        // value 属性が変化しないようにして全選択が解除されるのを防ぐ
        setLocalInput(formatValue(value));
        // React の再レンダリング後に全選択を適用
        const input = e.target;
        requestAnimationFrame(() => input.select());
      }}
      onBlur={() => {
        if (localInput !== undefined) {
          const v = clampOrDefault(localInput, { defaultValue, min, max });
          onChange(v);
        }
        setLocalInput(undefined);
      }}
      disabled={disabled}
      aria-label={label}
    />
  );
}

// ---------------------------------------------------------------------------
// SpinnerNumField
// ---------------------------------------------------------------------------

interface SpinnerNumFieldProps extends NumFieldProps {
  step?: number;
}

/** スピナー (上下ボタン) 付き NumField */
function SpinnerNumField({ step = 1, ...props }: SpinnerNumFieldProps): ReactElement {
  const { value, onChange, min, max, disabled } = props;

  const increment = useCallback(() => {
    const next = Math.min(value + step, max);
    onChange(next);
  }, [value, step, max, onChange]);

  const decrement = useCallback(() => {
    const next = Math.max(value - step, min);
    onChange(next);
  }, [value, step, min, onChange]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5"
        disabled={disabled || value >= max}
        onClick={increment}
        tabIndex={-1}
        aria-label={`Increase ${props.label}`}
      >
        <ChevronUp className="size-3" />
      </Button>
      <NumField {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5"
        disabled={disabled || value <= min}
        onClick={decrement}
        tabIndex={-1}
        aria-label={`Decrease ${props.label}`}
      >
        <ChevronDown className="size-3" />
      </Button>
    </div>
  );
}

export { NumField, SpinnerNumField };
export type { NumFieldProps, SpinnerNumFieldProps };
