/**
 * SeedOrigin テーブル
 *
 * SeedOrigin[] のテーブル表示・手入力コンポーネント。
 * Import タブ内で使用される。
 */

import { useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toBigintHex, toHex, formatDatetime } from '@/lib/format';
import type { SeedOrigin, Datetime } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedOriginTableProps {
  origins: SeedOrigin[];
  onOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
  /** テーブル編集 (行追加/削除) を許可するか。false の場合は表示のみ */
  editable?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseSeed(origin: SeedOrigin): bigint {
  return 'Startup' in origin ? origin.Startup.base_seed : origin.Seed.base_seed;
}

function getMtSeed(origin: SeedOrigin): number {
  return 'Startup' in origin ? origin.Startup.mt_seed : origin.Seed.mt_seed;
}

function getDatetime(origin: SeedOrigin): Datetime | undefined {
  return 'Startup' in origin ? origin.Startup.datetime : undefined;
}

function getTimer0(origin: SeedOrigin): number | undefined {
  return 'Startup' in origin ? origin.Startup.condition.timer0 : undefined;
}

function getVcount(origin: SeedOrigin): number | undefined {
  return 'Startup' in origin ? origin.Startup.condition.vcount : undefined;
}

function getKeyCode(origin: SeedOrigin): number | undefined {
  return 'Startup' in origin ? origin.Startup.condition.key_code : undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SeedOriginTable({
  origins,
  onOriginsChange,
  disabled,
  editable = true,
}: SeedOriginTableProps): ReactElement {
  const { t } = useLingui();

  const handleRemoveRow = useCallback(
    (index: number) => {
      onOriginsChange(origins.filter((_, i) => i !== index));
    },
    [origins, onOriginsChange]
  );

  const handleClearAll = useCallback(() => {
    onOriginsChange([]);
  }, [onOriginsChange]);

  const hasStartupOrigins = origins.some((o) => 'Startup' in o);

  return (
    <div className="flex flex-col gap-2">
      {/* テーブル */}
      {origins.length > 0 ? (
        <div className="max-h-64 overflow-auto rounded-sm border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/50">
                {hasStartupOrigins && (
                  <>
                    <th className="px-2 py-1 text-left font-medium">
                      <Trans>Date/Time</Trans>
                    </th>
                    <th className="px-2 py-1 text-left font-medium">Timer0</th>
                    <th className="px-2 py-1 text-left font-medium">VCount</th>
                    <th className="px-2 py-1 text-left font-medium">
                      <Trans>Key</Trans>
                    </th>
                  </>
                )}
                <th className="px-2 py-1 text-left font-medium">Base Seed</th>
                <th className="px-2 py-1 text-left font-medium">MT Seed</th>
                {editable && !disabled && (
                  <th className="w-8 px-1 py-1">
                    <span className="sr-only">{t`Delete`}</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {origins.map((origin, index) => {
                const dt = getDatetime(origin);
                const timer0 = getTimer0(origin);
                const vcount = getVcount(origin);
                const keyCode = getKeyCode(origin);

                return (
                  <tr
                    key={`${index}-${getBaseSeed(origin).toString(16)}`}
                    className="border-b border-border last:border-b-0"
                  >
                    {hasStartupOrigins && (
                      <>
                        <td className="px-2 py-1 font-mono">{dt ? formatDatetime(dt) : '-'}</td>
                        <td className="px-2 py-1 font-mono">
                          {timer0 === undefined ? '-' : toHex(timer0, 4)}
                        </td>
                        <td className="px-2 py-1 font-mono">
                          {vcount === undefined ? '-' : toHex(vcount, 2)}
                        </td>
                        <td className="px-2 py-1 font-mono">
                          {keyCode === undefined ? '-' : toHex(keyCode, 4)}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-1 font-mono">{toBigintHex(getBaseSeed(origin), 16)}</td>
                    <td className="px-2 py-1 font-mono">{toHex(getMtSeed(origin), 8)}</td>
                    {editable && !disabled && (
                      <td className="px-1 py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => handleRemoveRow(index)}
                          aria-label={t`Delete row ${String(index + 1)}`}
                        >
                          <X className="size-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Trans>No seeds loaded</Trans>
        </p>
      )}

      {/* 操作ボタン */}
      {editable && !disabled && origins.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            <Trash2 className="mr-1 size-3" />
            <Trans>Clear all</Trans>
          </Button>
        </div>
      )}
    </div>
  );
}

export { SeedOriginTable };
export type { SeedOriginTableProps };
