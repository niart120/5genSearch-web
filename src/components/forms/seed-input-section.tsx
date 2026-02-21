/**
 * Seed 入力セクション
 *
 * タブ切り替えで 3 つの Seed 入力モードを提供する:
 * - manual-startup: DS 設定 + 日時 + キー入力から resolve_seeds で変換
 * - manual-seeds: LCG Seed を直接入力
 * - import: JSON ファイル読み込み / Store 転記データの自動取り込み
 */

import { useState, useCallback, useEffect, useRef, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DatetimeInput, DEFAULT_DATETIME } from '@/components/ui/datetime-input';
import { KeyInputSelector } from '@/components/forms/key-input-selector';
import { SeedOriginTable } from '@/components/forms/seed-origin-table';
import { useSearchResultsStore } from '@/stores/search/results';
import type { DetailOriginConsumer } from '@/stores/search/results';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { resolveSeedOrigins } from '@/services/seed-resolve';
import { parseSerializedSeedOrigins } from '@/services/seed-origin-serde';
import { keyCodeToKeyInput } from '@/lib/format';
import type { SeedOrigin, LcgSeed, Datetime, KeyInput } from '@/wasm/wasm_pkg.js';

/** Seed 入力モード */
export type SeedInputMode = 'import' | 'manual-seeds' | 'manual-startup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** lazy initializer で消費した pending データのスナップショット (不変) */
type InitialPending =
  | { type: 'startup'; detail: Extract<SeedOrigin, { Startup: unknown }> }
  | { type: 'seed'; detail: Extract<SeedOrigin, { Seed: unknown }> }
  | { type: 'seeds'; seeds: SeedOrigin[] }
  | { type: 'default-startup' };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SeedInputSectionProps {
  /** この SeedInputSection が属する feature ID (pendingDetailOrigin 消費用) */
  featureId: DetailOriginConsumer;
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

/** アクティブタブの origins を取得 */
function getActiveOrigins(
  mode: SeedInputMode,
  startupOrigins: SeedOrigin[],
  seedsOrigins: SeedOrigin[],
  importOrigins: SeedOrigin[]
): SeedOrigin[] {
  switch (mode) {
    case 'manual-startup': {
      return startupOrigins;
    }
    case 'manual-seeds': {
      return seedsOrigins;
    }
    case 'import': {
      return importOrigins;
    }
  }
}

function SeedInputSection({
  featureId,
  mode,
  onModeChange,
  origins,
  onOriginsChange,
  disabled,
}: SeedInputSectionProps): ReactElement {
  const { t } = useLingui();
  const { config: dsConfig, ranges } = useDsConfigReadonly();

  // ---------------------------------------------------------------------------
  // pending データの同期消費 (lazy initializer)
  // ---------------------------------------------------------------------------

  /** mount 時に確定する pending データのスナップショット (不変) */
  const [initialPending] = useState<InitialPending | undefined>(() => {
    const store = useSearchResultsStore.getState();
    const detail = store.consumePendingDetailOrigin(featureId);
    if (detail && 'Startup' in detail) return { type: 'startup', detail };
    if (detail && 'Seed' in detail) return { type: 'seed', detail };
    const seeds = store.consumePendingSeedOrigins();
    if (seeds.length > 0) return { type: 'seeds', seeds };
    if (mode === 'manual-startup') return { type: 'default-startup' };
  });

  // ---------------------------------------------------------------------------
  // 内部 state (lazy initializer で initialPending から導出)
  // ---------------------------------------------------------------------------

  const [seedText, setSeedText] = useState(() => {
    if (initialPending?.type === 'startup') {
      return initialPending.detail.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
    }
    if (initialPending?.type === 'seed') {
      return initialPending.detail.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
    }
    return '';
  });
  const [resolveError, setResolveError] = useState<string | undefined>();

  // Import state
  const [importError, setImportError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Startup state
  const [datetime, setDatetime] = useState<Datetime>(() => {
    if (initialPending?.type === 'startup') {
      return initialPending.detail.Startup.datetime;
    }
    return DEFAULT_DATETIME;
  });
  const [keyInput, setKeyInput] = useState<KeyInput>(() => {
    if (initialPending?.type === 'startup') {
      return keyCodeToKeyInput(initialPending.detail.Startup.condition.key_code);
    }
    return { buttons: [] };
  });

  // タブ別 独立 origins state (lazy init)
  const [startupOrigins, setStartupOrigins] = useState<SeedOrigin[]>(() => {
    if (initialPending?.type === 'startup') {
      const ki = keyCodeToKeyInput(initialPending.detail.Startup.condition.key_code);
      try {
        return resolveSeedOrigins({
          type: 'Startup',
          ds: dsConfig,
          datetime: initialPending.detail.Startup.datetime,
          ranges,
          key_input: ki,
        });
      } catch {
        return [];
      }
    }
    if (initialPending?.type === 'default-startup') {
      try {
        return resolveSeedOrigins({
          type: 'Startup',
          ds: dsConfig,
          datetime: DEFAULT_DATETIME,
          ranges,
          key_input: { buttons: [] },
        });
      } catch {
        return [];
      }
    }
    return [];
  });
  const [seedsOrigins, setSeedsOrigins] = useState<SeedOrigin[]>(() => {
    if (initialPending?.type === 'seed') {
      try {
        return resolveSeedOrigins({
          type: 'Seeds',
          seeds: [initialPending.detail.Seed.base_seed],
        });
      } catch {
        return [];
      }
    }
    return [];
  });
  const [importOrigins, setImportOrigins] = useState<SeedOrigin[]>(() => {
    if (initialPending?.type === 'seeds') {
      return initialPending.seeds;
    }
    return [];
  });

  // 解決要求カウンタ (最新のリクエストのみ結果を適用する)
  const resolveIdRef = useRef(0);

  // 親コールバックの安定参照 (mount effect で unstable lambda による再実行を防ぐ)
  const onModeChangeRef = useRef(onModeChange);
  const onOriginsChangeRef = useRef(onOriginsChange);
  useEffect(() => {
    onModeChangeRef.current = onModeChange;
    onOriginsChangeRef.current = onOriginsChange;
  });

  // ---------------------------------------------------------------------------
  // Mount effect: mode 通知 + 初回 origins 親通知
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!initialPending) return;
    switch (initialPending.type) {
      case 'startup': {
        onModeChangeRef.current('manual-startup');
        const ki = keyCodeToKeyInput(initialPending.detail.Startup.condition.key_code);
        try {
          onOriginsChangeRef.current(
            resolveSeedOrigins({
              type: 'Startup',
              ds: dsConfig,
              datetime: initialPending.detail.Startup.datetime,
              ranges,
              key_input: ki,
            })
          );
        } catch {
          onOriginsChangeRef.current([]);
        }
        break;
      }
      case 'seed': {
        onModeChangeRef.current('manual-seeds');
        try {
          onOriginsChangeRef.current(
            resolveSeedOrigins({
              type: 'Seeds',
              seeds: [initialPending.detail.Seed.base_seed],
            })
          );
        } catch {
          onOriginsChangeRef.current([]);
        }
        break;
      }
      case 'seeds': {
        onModeChangeRef.current('import');
        onOriginsChangeRef.current(initialPending.seeds);
        break;
      }
      case 'default-startup': {
        try {
          onOriginsChangeRef.current(
            resolveSeedOrigins({
              type: 'Startup',
              ds: dsConfig,
              datetime: DEFAULT_DATETIME,
              ranges,
              key_input: { buttons: [] },
            })
          );
        } catch {
          onOriginsChangeRef.current([]);
        }
        break;
      }
    }
  }, [initialPending, dsConfig, ranges]);

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
        setSeedsOrigins([]);
        onOriginsChange([]);
        return;
      }
      const seeds: LcgSeed[] = [];
      for (const line of lines) {
        const seed = parseLcgSeed(line);
        if (seed === undefined) {
          // 入力途中: 解決せず origins はクリア
          setSeedsOrigins([]);
          onOriginsChange([]);
          return;
        }
        seeds.push(seed);
      }
      const id = ++resolveIdRef.current;
      try {
        const resolved = resolveSeedOrigins({ type: 'Seeds', seeds });
        if (resolveIdRef.current === id) {
          setSeedsOrigins(resolved);
          onOriginsChange(resolved);
        }
      } catch (error: unknown) {
        if (resolveIdRef.current === id) {
          setResolveError(error instanceof Error ? error.message : String(error));
        }
      }
    },
    [onOriginsChange]
  );

  /** manual-startup: DS 設定 + 日時 + キー入力から自動解決 */
  const autoResolveStartup = useCallback(
    (dt: Datetime, ki: KeyInput) => {
      setResolveError(undefined);
      const id = ++resolveIdRef.current;
      try {
        const resolved = resolveSeedOrigins({
          type: 'Startup',
          ds: dsConfig,
          datetime: dt,
          ranges,
          key_input: ki,
        });
        if (resolveIdRef.current === id) {
          setStartupOrigins(resolved);
          onOriginsChange(resolved);
        }
      } catch (error: unknown) {
        if (resolveIdRef.current === id) {
          setResolveError(error instanceof Error ? error.message : String(error));
        }
      }
    },
    [dsConfig, ranges, onOriginsChange]
  );

  // Tab 変更
  const handleTabChange = useCallback(
    (newTab: string) => {
      const m = newTab as SeedInputMode;
      onModeChange(m);
      setResolveError(undefined);
      setImportError(undefined);

      // 切り替え先タブの既存 origins を親に通知
      const nextOrigins = getActiveOrigins(m, startupOrigins, seedsOrigins, importOrigins);
      onOriginsChange(nextOrigins);
    },
    [onModeChange, onOriginsChange, startupOrigins, seedsOrigins, importOrigins]
  );

  // ---------------------------------------------------------------------------
  // Import: JSON ファイル読み込み
  // ---------------------------------------------------------------------------

  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImportError(undefined);
      file
        .text()
        .then((text) => {
          const parsed = parseSerializedSeedOrigins(text);
          setImportOrigins(parsed);
          onOriginsChange(parsed);
        })
        .catch((error: unknown) => {
          setImportError(error instanceof Error ? error.message : String(error));
        });

      // 同じファイルの再選択を可能にする
      event.target.value = '';
    },
    [onOriginsChange]
  );

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
          <TabsTrigger value="import" className="flex-1 text-xs" disabled={disabled}>
            {t`Import`}
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

        {/* Import */}
        <TabsContent value="import">
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="mr-1 size-3" />
              <Trans>Import JSON file</Trans>
            </Button>

            {importError && <p className="text-xs text-destructive">{importError}</p>}

            <SeedOriginTable
              origins={origins}
              onOriginsChange={(o) => {
                setImportOrigins(o);
                onOriginsChange(o);
              }}
              disabled={disabled}
              editable={true}
            />

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
