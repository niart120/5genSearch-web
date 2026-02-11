/**
 * Seed 入力セクション
 *
 * タブ切り替えで 3 つの Seed 入力モードを提供する:
 * - search-results: 直前の datetime-search 結果から SeedOrigin[] を引き継ぐ
 * - manual-seeds: LCG Seed を直接入力
 * - manual-startup: DS 設定 + 日時 + キー入力から resolve_seeds で変換
 */

import { useState, useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clampOrDefault } from '@/components/forms/input-helpers';
import { useSearchResultsReadonly } from '@/hooks/use-search-results';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { resolveSeedOrigins } from '../hooks/use-pokemon-list';
import type { SeedInputMode } from '../types';
import type { SeedOrigin, LcgSeed, Datetime, KeyInput, DsButton } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DATETIME: Datetime = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
};

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
// Internal: NumField
// ---------------------------------------------------------------------------

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
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  min: number;
  max: number;
  disabled?: boolean;
  label: string;
  className?: string;
}): ReactElement {
  // undefined = 未編集 (prop 値を表示)、string = 編集中 (ローカルバッファ)
  const [localInput, setLocalInput] = useState<string | undefined>();
  const displayValue = localInput ?? String(value);

  return (
    <Input
      id={id}
      className={cn('h-7 px-0 text-center font-mono tabular-nums', className)}
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => setLocalInput(e.target.value)}
      onFocus={(e) => {
        setLocalInput(String(value));
        e.target.select();
      }}
      onBlur={() => {
        if (localInput !== null) {
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
// Internal: DatetimeInput
// ---------------------------------------------------------------------------

interface DatetimeInputProps {
  value: Datetime;
  onChange: (value: Datetime) => void;
  disabled?: boolean;
}

/** 単一日時入力 (YYYY/MM/DD HH:MM:SS) */
function DatetimeInput({ value, onChange, disabled }: DatetimeInputProps): ReactElement {
  const update = useCallback(
    (field: keyof Datetime, v: number) => {
      onChange({ ...value, [field]: v });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      {/* Date: YYYY / MM / DD */}
      <div className="flex items-center gap-1">
        <NumField
          id="startup-year"
          value={value.year}
          onChange={(v) => update('year', v)}
          defaultValue={2000}
          min={2000}
          max={2099}
          disabled={disabled}
          label="year"
          className="w-12"
        />
        <span className="text-sm text-muted-foreground">/</span>
        <NumField
          id="startup-month"
          value={value.month}
          onChange={(v) => update('month', v)}
          defaultValue={1}
          min={1}
          max={12}
          disabled={disabled}
          label="month"
          className="w-8"
        />
        <span className="text-sm text-muted-foreground">/</span>
        <NumField
          id="startup-day"
          value={value.day}
          onChange={(v) => update('day', v)}
          defaultValue={1}
          min={1}
          max={31}
          disabled={disabled}
          label="day"
          className="w-8"
        />
      </div>
      {/* Time: HH : MM : SS */}
      <div className="flex items-center gap-1">
        <NumField
          id="startup-hour"
          value={value.hour}
          onChange={(v) => update('hour', v)}
          defaultValue={0}
          min={0}
          max={23}
          disabled={disabled}
          label="hour"
          className="w-8"
        />
        <span className="text-sm text-muted-foreground">:</span>
        <NumField
          id="startup-minute"
          value={value.minute}
          onChange={(v) => update('minute', v)}
          defaultValue={0}
          min={0}
          max={59}
          disabled={disabled}
          label="minute"
          className="w-8"
        />
        <span className="text-sm text-muted-foreground">:</span>
        <NumField
          id="startup-second"
          value={value.second}
          onChange={(v) => update('second', v)}
          defaultValue={0}
          min={0}
          max={59}
          disabled={disabled}
          label="second"
          className="w-8"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: KeyInputSelector
// ---------------------------------------------------------------------------

interface KeyInputSelectorProps {
  value: KeyInput;
  onChange: (value: KeyInput) => void;
  disabled?: boolean;
}

/** DS コントローラ風トグルボタン */
function ToggleBtn({
  pressed,
  onToggle,
  disabled,
  label,
  ariaLabel,
  className,
}: {
  pressed: boolean;
  onToggle: (pressed: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  ariaLabel: string;
  className?: string;
}): ReactElement {
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

  // Tab 変更
  const handleTabChange = useCallback(
    (newTab: string) => {
      const m = newTab as SeedInputMode;
      onModeChange(m);
      setResolveError(undefined);
      if (m === 'search-results') {
        onOriginsChange(storeOrigins);
      }
    },
    [onModeChange, onOriginsChange, storeOrigins]
  );

  // search-results: Store 結果を反映
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

  // manual-startup: DS 設定 + 日時 + キー入力から SeedOrigin[] を生成
  const handleResolveSeedsStartup = useCallback(() => {
    setResolveError(undefined);
    void resolveSeedOrigins({
      type: 'Startup',
      ds: dsConfig,
      datetime,
      ranges,
      key_input: keyInput,
    })
      .then((resolved) => {
        onOriginsChange(resolved);
      })
      .catch((error: unknown) => {
        setResolveError(error instanceof Error ? error.message : String(error));
      });
  }, [dsConfig, datetime, ranges, keyInput, onOriginsChange]);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        <Trans>Seed input</Trans>
      </h3>

      <Tabs value={mode} onValueChange={handleTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="search-results" className="flex-1 text-xs" disabled={disabled}>
            {t`Search results`}
          </TabsTrigger>
          <TabsTrigger value="manual-seeds" className="flex-1 text-xs" disabled={disabled}>
            {t`Manual seeds`}
          </TabsTrigger>
          <TabsTrigger value="manual-startup" className="flex-1 text-xs" disabled={disabled}>
            {t`Startup`}
          </TabsTrigger>
        </TabsList>

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
              <Trans>Loaded seeds</Trans>: {origins.length}
            </p>
          </div>
        </TabsContent>

        {/* Manual Seeds */}
        <TabsContent value="manual-seeds">
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
        </TabsContent>

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
                <Trans>Date & Time</Trans>
              </Label>
              <DatetimeInput value={datetime} onChange={setDatetime} disabled={disabled} />
            </div>

            {/* Key Input */}
            <KeyInputSelector value={keyInput} onChange={setKeyInput} disabled={disabled} />

            <Button
              variant="outline"
              size="sm"
              onClick={handleResolveSeedsStartup}
              disabled={disabled}
            >
              <Trans>Resolve seeds</Trans>
            </Button>
            {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
            <p className="text-xs text-muted-foreground">
              <Trans>Loaded seeds</Trans>: {origins.length}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

export { SeedInputSection };
export type { SeedInputSectionProps };
