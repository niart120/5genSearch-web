/**
 * Seed 入力セクション
 *
 * タブ切り替えで 3 つの Seed 入力モードを提供する:
 * - manual-startup: DS 設定 + 日時 + キー入力から resolve_seeds で変換
 * - manual-seeds: LCG Seed を直接入力
 * - search-results: 直前の datetime-search 結果から SeedOrigin[] を引き継ぐ
 */

import { useState, useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DatetimeInput, DEFAULT_DATETIME } from '@/components/forms/datetime-input';
import { KeyInputSelector } from '@/components/forms/key-input-selector';
import { useSearchResultsReadonly } from '@/hooks/use-search-results';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { resolveSeedOrigins } from '../hooks/use-pokemon-list';
import type { SeedInputMode } from '../types';
import type { SeedOrigin, LcgSeed, Datetime, KeyInput } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SeedInputSectionProps {
  mode: SeedInputMode;
  onModeChange: (mode: SeedInputMode) => void;
  origins: SeedOrigin[];
  onOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 16 進文字列を LcgSeed (bigint) にパース。無効な場合は undefined */
function parseLcgSeed(hex: string): LcgSeed | undefined {
  const trimmed = hex.trim().replace(/^0x/i, '');
  if (trimmed.length === 0 || trimmed.length > 16) return undefined;
  if (!/^[\da-f]+$/i.test(trimmed)) return undefined;
  return BigInt(`0x${trimmed}`);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function SeedInputSection({
  mode,
  onModeChange,
  origins,
  onOriginsChange,
  disabled,
}: SeedInputSectionProps): ReactElement {
  const { t } = useLingui();
  const { results } = useSearchResultsReadonly();
  const { config: dsConfig, ranges } = useDsConfigReadonly();

  // Manual seeds state
  const [seedText, setSeedText] = useState('');
  const [resolveError, setResolveError] = useState<string | undefined>();

  // Startup state
  const [datetime, setDatetime] = useState<Datetime>(DEFAULT_DATETIME);
  const [keyInput, setKeyInput] = useState<KeyInput>({ buttons: [] });

  // 解決要求カウンタ (最新のリクエストのみ結果を適用する)
  const resolveIdRef = useRef(0);

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

  // ---------------------------------------------------------------------------
  // Auto-resolve helpers
  // ---------------------------------------------------------------------------

  /** manual-seeds: テキストから SeedOrigin[] を自動解決 */
  const autoResolveSeeds = useCallback(
    (text: string) => {
      setResolveError(undefined);
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) {
        onOriginsChange([]);
        return;
      }
      const seeds: LcgSeed[] = [];
      for (const line of lines) {
        const seed = parseLcgSeed(line);
        if (seed === undefined) {
          // 入力途中: 解決せず origins はクリア
          onOriginsChange([]);
          return;
        }
        seeds.push(seed);
      }
      const id = ++resolveIdRef.current;
      void resolveSeedOrigins({ type: 'Seeds', seeds })
        .then((resolved) => {
          if (resolveIdRef.current === id) onOriginsChange(resolved);
        })
        .catch((error: unknown) => {
          if (resolveIdRef.current === id) {
            setResolveError(error instanceof Error ? error.message : String(error));
          }
        });
    },
    [onOriginsChange]
  );

  /** manual-startup: DS 設定 + 日時 + キー入力から自動解決 */
  const autoResolveStartup = useCallback(
    (dt: Datetime, ki: KeyInput) => {
      setResolveError(undefined);
      const id = ++resolveIdRef.current;
      void resolveSeedOrigins({
        type: 'Startup',
        ds: dsConfig,
        datetime: dt,
        ranges,
        key_input: ki,
      })
        .then((resolved) => {
          if (resolveIdRef.current === id) onOriginsChange(resolved);
        })
        .catch((error: unknown) => {
          if (resolveIdRef.current === id) {
            setResolveError(error instanceof Error ? error.message : String(error));
          }
        });
    },
    [dsConfig, ranges, onOriginsChange]
  );

  // Tab 変更
  const handleTabChange = useCallback(
    (newTab: string) => {
      const m = newTab as SeedInputMode;
      onModeChange(m);
      setResolveError(undefined);
      switch (m) {
        case 'search-results': {
          onOriginsChange(storeOrigins);
          break;
        }
        case 'manual-startup': {
          autoResolveStartup(datetime, keyInput);
          break;
        }
        case 'manual-seeds': {
          autoResolveSeeds(seedText);
          break;
        }
      }
    },
    [
      onModeChange,
      onOriginsChange,
      storeOrigins,
      autoResolveStartup,
      autoResolveSeeds,
      datetime,
      keyInput,
      seedText,
    ]
  );

  // search-results: Store 結果を反映
  const handleUseStoreResults = useCallback(() => {
    onOriginsChange(storeOrigins);
  }, [onOriginsChange, storeOrigins]);

  /** manual-seeds: テキスト変更ハンドラ */
  const handleSeedTextChange = useCallback(
    (text: string) => {
      setSeedText(text);
      autoResolveSeeds(text);
    },
    [autoResolveSeeds]
  );

  /** Startup datetime 変更 */
  const handleDatetimeChange = useCallback(
    (dt: Datetime) => {
      setDatetime(dt);
      autoResolveStartup(dt, keyInput);
    },
    [keyInput, autoResolveStartup]
  );

  /** Startup key input 変更 */
  const handleKeyInputChange = useCallback(
    (ki: KeyInput) => {
      setKeyInput(ki);
      autoResolveStartup(datetime, ki);
    },
    [datetime, autoResolveStartup]
  );

  // 初回マウント時: Startup タブが初期選択なら自動解決
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (mode === 'manual-startup') {
      autoResolveStartup(datetime, keyInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        <Trans>Seed input</Trans>
      </h3>

      <Tabs value={mode} onValueChange={handleTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="manual-startup" className="flex-1 text-xs" disabled={disabled}>
            {t`Startup`}
          </TabsTrigger>
          <TabsTrigger value="manual-seeds" className="flex-1 text-xs" disabled={disabled}>
            {t`Seeds`}
          </TabsTrigger>
          <TabsTrigger value="search-results" className="flex-1 text-xs" disabled={disabled}>
            {t`Search results`}
          </TabsTrigger>
        </TabsList>

        {/* Startup */}
        <TabsContent value="manual-startup">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              <Trans>
                DS config and Timer0/VCount ranges are loaded from the sidebar settings.
              </Trans>
            </p>

            {/* Datetime */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs">
                <Trans>Date & time</Trans>
              </Label>
              <DatetimeInput value={datetime} onChange={handleDatetimeChange} disabled={disabled} />
            </div>

            {/* Key Input */}
            <KeyInputSelector
              value={keyInput}
              onChange={handleKeyInputChange}
              disabled={disabled}
            />

            {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
            <p className="text-xs text-muted-foreground">
              <Trans>Resolved seeds</Trans>: {origins.length}
            </p>
          </div>
        </TabsContent>

        {/* Seeds */}
        <TabsContent value="manual-seeds">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              <Trans>LCG Seeds (hex, one per line)</Trans>
            </Label>
            <textarea
              className="h-24 w-full rounded-sm border border-input bg-background px-2 py-1 font-mono text-xs"
              placeholder="0123456789ABCDEF"
              value={seedText}
              onChange={(e) => handleSeedTextChange(e.target.value)}
              disabled={disabled}
            />
            {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
            <p className="text-xs text-muted-foreground">
              <Trans>Resolved seeds</Trans>: {origins.length}
            </p>
          </div>
        </TabsContent>

        {/* Search Results */}
        <TabsContent value="search-results">
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
              <Trans>Resolved seeds</Trans>: {origins.length}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

export { SeedInputSection };
export type { SeedInputSectionProps };
