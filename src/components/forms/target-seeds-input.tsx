/**
 * Target Seeds 入力コンポーネント
 *
 * MT Seed の直接入力フィールド。改行区切りの 16 進数を受け付ける。
 */

import { Trans } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import type { MtSeed } from '@/wasm/wasm_pkg';

interface TargetSeedsInputProps {
  /** 生テキスト */
  value: string;
  /** テキスト変更コールバック */
  onChange: (raw: string) => void;
  /** パース済み Seed 配列 */
  parsedSeeds: MtSeed[];
  /** パースエラー一覧 */
  errors: { line: number; value: string; message: string }[];
  /** 無効化 */
  disabled?: boolean;
}

function TargetSeedsInput({
  value,
  onChange,
  parsedSeeds,
  errors,
  disabled,
}: TargetSeedsInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="target-seeds" className="text-xs text-muted-foreground">
        <Trans>MT Seed</Trans>
      </Label>
      <textarea
        id="target-seeds"
        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm tabular-nums placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        rows={4}
        placeholder={`1A2B3C4D\n0x12345678`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        <Trans>Valid seeds</Trans>: {parsedSeeds.length}
      </p>
      {errors.length > 0 && (
        <ul className="text-xs text-destructive space-y-0.5">
          {errors.map((err) => (
            <li key={`${err.line}-${err.value}`}>
              <Trans>
                Line {err.line}: &quot;{err.value}&quot; — {err.message}
              </Trans>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { TargetSeedsInputProps };
export { TargetSeedsInput };
