/**
 * Seed 入力セクション
 *
 * 3 つの Seed 入力モードを切り替える:
 * - search-results: 直前の datetime-search 結果から SeedOrigin[] を引き継ぐ
 * - manual-seeds: LCG Seed を直接入力
 * - manual-startup: DS 設定 + 日時から resolve_seeds で変換
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSearchResultsReadonly } from '@/hooks/use-search-results';
import { resolveSeedOrigins } from '../hooks/use-pokemon-list';
import type { SeedInputMode } from '../types';
import type { SeedOrigin, LcgSeed } from '@/wasm/wasm_pkg.js';

interface SeedInputSectionProps {
  mode: SeedInputMode;
  onModeChange: (mode: SeedInputMode) => void;
  origins: SeedOrigin[];
  onOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
}

/** 16 進文字列を LcgSeed (bigint) にパース。無効な場合は undefined */
function parseLcgSeed(hex: string): LcgSeed | undefined {
  const trimmed = hex.trim().replace(/^0x/i, '');
  if (trimmed.length === 0 || trimmed.length > 16) return undefined;
  if (!/^[\da-f]+$/i.test(trimmed)) return undefined;
  return BigInt(`0x${trimmed}`);
}

function SeedInputSection({
  mode,
  onModeChange,
  origins,
  onOriginsChange,
  disabled,
}: SeedInputSectionProps): ReactElement {
  const { t } = useLingui();
  const { results } = useSearchResultsReadonly();
  const [seedText, setSeedText] = useState('');
  const [resolveError, setResolveError] = useState<string | undefined>();

  // Store から SeedOrigin[] を抽出
  const storeOrigins = useMemo(() => {
    const flat: SeedOrigin[] = [];
    for (const batch of results) {
      if (Array.isArray(batch) && batch.length > 0) {
        const first = batch[0];
        if (first && ('Seed' in first || 'Startup' in first)) {
          flat.push(...(batch as SeedOrigin[]));
        }
      }
    }
    return flat;
  }, [results]);

  // モード変更
  const handleModeChange = useCallback(
    (newMode: string) => {
      const m = newMode as SeedInputMode;
      onModeChange(m);
      if (m === 'search-results') {
        onOriginsChange(storeOrigins);
      }
    },
    [onModeChange, onOriginsChange, storeOrigins]
  );

  // search-results モード: Store 変更時に自動反映
  const handleUseStoreResults = useCallback(() => {
    onOriginsChange(storeOrigins);
  }, [onOriginsChange, storeOrigins]);

  // manual-seeds: テキストから SeedOrigin[] を生成
  const handleResolveSeedsManual = useCallback(() => {
    setResolveError(undefined);
    const lines = seedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const seeds: LcgSeed[] = [];
    for (const line of lines) {
      const seed = parseLcgSeed(line);
      if (seed === undefined) {
        setResolveError(t`Invalid seed format: ${line}`);
        return;
      }
      seeds.push(seed);
    }
    if (seeds.length === 0) {
      setResolveError(t`Enter at least one seed`);
      return;
    }
    void resolveSeedOrigins({ type: 'Seeds', seeds })
      .then((resolved) => {
        onOriginsChange(resolved);
      })
      .catch((error: unknown) => {
        setResolveError(error instanceof Error ? error.message : String(error));
      });
  }, [seedText, onOriginsChange, t]);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        <Trans>Seed input</Trans>
      </h3>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          <Trans>Input mode</Trans>
        </Label>
        <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="search-results">{t`Search results`}</SelectItem>
            <SelectItem value="manual-seeds">{t`Manual seeds`}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'search-results' && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            <Trans>Seeds from search results</Trans>: {storeOrigins.length}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseStoreResults}
            disabled={disabled || storeOrigins.length === 0}
          >
            <Trans>Load search results</Trans>
          </Button>
          <p className="text-xs text-muted-foreground">
            <Trans>Loaded seeds</Trans>: {origins.length}
          </p>
        </div>
      )}

      {mode === 'manual-seeds' && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>LCG Seeds (hex, one per line)</Trans>
          </Label>
          <textarea
            className="h-24 w-full rounded-sm border border-input bg-background px-2 py-1 font-mono text-xs"
            placeholder="0123456789ABCDEF"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            disabled={disabled}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolveSeedsManual}
            disabled={disabled}
          >
            <Trans>Resolve seeds</Trans>
          </Button>
          {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
          <p className="text-xs text-muted-foreground">
            <Trans>Loaded seeds</Trans>: {origins.length}
          </p>
        </div>
      )}
    </section>
  );
}

export { SeedInputSection };
export type { SeedInputSectionProps };
