/**
 * 針パターン入力 UI
 *
 * 数字テキスト入力 (0-7) + 方向ボタン (入力補助) + read-only 矢印表示の 3 層構成。
 */

import { useMemo, type ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { parseNeedlePattern, directionsToArrows } from '../types';

/** 方向ボタン配置 (3×3 グリッド、中央空き) */
const DIRECTION_GRID: readonly ({ digit: number; arrow: string } | undefined)[] = [
  { digit: 7, arrow: '↖' },
  { digit: 0, arrow: '↑' },
  { digit: 1, arrow: '↗' },
  { digit: 6, arrow: '←' },
  undefined, // 中央空き
  { digit: 2, arrow: '→' },
  { digit: 5, arrow: '↙' },
  { digit: 4, arrow: '↓' },
  { digit: 3, arrow: '↘' },
];

interface NeedleInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function NeedleInput({ value, onChange, disabled }: NeedleInputProps): ReactElement {
  const arrowDisplay = useMemo(() => {
    const parsed = parseNeedlePattern(value);
    return parsed ? directionsToArrows(parsed) : '';
  }, [value]);

  return (
    <div className="flex items-start gap-4">
      {/* 左列: 方向ボタン 3×3 グリッド */}
      <div className="grid shrink-0 grid-cols-3 gap-1">
        {DIRECTION_GRID.map((item, i) =>
          item ? (
            <Button
              key={item.digit}
              type="button"
              variant="outline"
              size="icon"
              className="size-9 text-base"
              disabled={disabled}
              onClick={() => onChange(value + String(item.digit))}
              aria-label={`Direction ${item.arrow}`}
            >
              {item.arrow}
            </Button>
          ) : (
            <div key={`empty-${String(i)}`} className="size-9" />
          )
        )}
      </div>

      {/* 右列: テキスト入力 + 矢印表示 + 操作ボタン */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <Label htmlFor="needle-numeric" className="text-xs text-muted-foreground">
            <Trans>Needle Direction (Numeric)</Trans>
          </Label>
          <Input
            id="needle-numeric"
            value={value}
            onChange={(e) => {
              // 0-7 の数字のみ許可
              const filtered = e.target.value.replaceAll(/[^0-7]/g, '');
              onChange(filtered);
            }}
            inputMode="numeric"
            placeholder=""
            disabled={disabled}
            className="font-mono"
          />
        </div>

        <div>
          <Label htmlFor="needle-arrows" className="text-xs text-muted-foreground">
            <Trans>Needle Direction (Arrow)</Trans>
          </Label>
          <Input
            id="needle-arrows"
            value={arrowDisplay}
            readOnly
            tabIndex={-1}
            className={cn('cursor-default bg-muted text-muted-foreground')}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || value.length === 0}
            onClick={() => onChange(value.slice(0, -1))}
          >
            <Trans>Back</Trans>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || value.length === 0}
            onClick={() => onChange('')}
          >
            <Trans>Clear</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}

export { NeedleInput };
