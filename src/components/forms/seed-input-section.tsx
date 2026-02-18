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

  // Manual seeds state
  const [seedText, setSeedText] = useState('');
  const [resolveError, setResolveError] = useState<string | undefined>();

  // Import state
  const [importError, setImportError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Startup state
  const [datetime, setDatetime] = useState<Datetime>(DEFAULT_DATETIME);
  const [keyInput, setKeyInput] = useState<KeyInput>({ buttons: [] });

  // 解決要求カウンタ (最新のリクエストのみ結果を適用する)
  const resolveIdRef = useRef(0);

  // ---------------------------------------------------------------------------
  // pending データの自動消費 (Store 転記)
  // ---------------------------------------------------------------------------

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const store = useSearchResultsStore.getState();

    // 1) pendingDetailOrigins: 詳細ダイアログからの単一転記 (ページ別)
    //    Startup → 起動条件タブに datetime + key_code、Seeds タブに base_seed hex を埋める
    //    Seed → Seeds タブに base_seed hex を埋める
    const detail = store.pendingDetailOrigins[featureId];
    if (detail) {
      store.clearPendingDetailOrigin(featureId);
      if ('Startup' in detail) {
        const ki = keyCodeToKeyInput(detail.Startup.condition.key_code);
        const hex = detail.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
        setDatetime(detail.Startup.datetime);
        setKeyInput(ki);
        setSeedText(hex);
        onModeChange('manual-startup');
        autoResolveStartup(detail.Startup.datetime, ki);
      } else {
        const hex = detail.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
        setSeedText(hex);
        onModeChange('manual-seeds');
        autoResolveSeeds(hex);
      }
      return;
    }

    // 2) pendingSeedOrigins: 全結果一括転記 → Import タブ
    const pending = store.pendingSeedOrigins;
    if (pending.length > 0) {
      store.clearPendingSeedOrigins();
      onModeChange('import');
      onOriginsChange(pending);
      return;
    }

    // どちらもなく、Startup タブが初期選択なら自動解決
    if (mode === 'manual-startup') {
      autoResolveStartup(datetime, keyInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      try {
        const resolved = resolveSeedOrigins({ type: 'Seeds', seeds });
        if (resolveIdRef.current === id) onOriginsChange(resolved);
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
        if (resolveIdRef.current === id) onOriginsChange(resolved);
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
      switch (m) {
        case 'import': {
          // Import タブ切り替え時は origins を維持 (クリアしない)
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
    [onModeChange, autoResolveStartup, autoResolveSeeds, datetime, keyInput, seedText]
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
              onOriginsChange={onOriginsChange}
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
