/**
 * Seed 入力 UI — 日時モード / LCG Seed 直接指定モード
 *
 * 日時モードでは timer0×vcount の組み合わせ数に応じて複数の SeedOrigin を生成する。
 * 既存の SeedInputSection (3 モード) は再利用せず軽量な専用コンポーネントとする。
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatetimeInput, DEFAULT_DATETIME } from '@/components/ui/datetime-input';
import { KeySpecSelector } from '@/components/forms/key-spec-selector';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { resolveSeedOrigins } from '@/services/seed-resolve';
import type { Datetime, KeyInput, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { SeedMode } from '../types';

interface SeedInputProps {
  mode: SeedMode;
  onModeChange: (mode: SeedMode) => void;
  seedOrigins: SeedOrigin[];
  onSeedOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
}

/** Hex パターン (最大 16 桁) */
const LCG_SEED_RE = /^[\da-fA-F]{1,16}$/;

function SeedInput({
  mode,
  onModeChange,
  seedOrigins,
  onSeedOriginsChange,
  disabled,
}: SeedInputProps): ReactElement {
  const { t } = useLingui();
  const { config: dsConfig, ranges } = useDsConfigReadonly();

  // datetime モード用ローカル state
  const [datetime, setDatetime] = useState<Datetime>(DEFAULT_DATETIME);
  const [keyInput, setKeyInput] = useState<KeyInput>({ buttons: [] });

  // seed モード用ローカル state
  const [seedHex, setSeedHex] = useState('');

  // datetime 変更時に SeedOrigin[] を再計算
  const handleDatetimeChange = useCallback(
    (dt: Datetime) => {
      setDatetime(dt);
      try {
        const origins = resolveSeedOrigins({
          type: 'Startup',
          ds: dsConfig,
          datetime: dt,
          ranges,
          key_input: keyInput,
        });
        onSeedOriginsChange(origins);
      } catch {
        onSeedOriginsChange([]);
      }
    },
    [dsConfig, ranges, keyInput, onSeedOriginsChange]
  );

  // keyInput 変更時に SeedOrigin[] を再計算
  const handleKeyInputChange = useCallback(
    (ki: KeyInput) => {
      setKeyInput(ki);
      try {
        const origins = resolveSeedOrigins({
          type: 'Startup',
          ds: dsConfig,
          datetime,
          ranges,
          key_input: ki,
        });
        onSeedOriginsChange(origins);
      } catch {
        onSeedOriginsChange([]);
      }
    },
    [dsConfig, ranges, datetime, onSeedOriginsChange]
  );

  // seed hex 変更時に SeedOrigin を構築 (seed モードは常に 1 件)
  const handleSeedHexChange = useCallback(
    (raw: string) => {
      const hex = raw.replaceAll(/[^\da-fA-F]/g, '').slice(0, 16);
      setSeedHex(hex);
      if (hex.length === 0 || !LCG_SEED_RE.test(hex)) {
        onSeedOriginsChange([]);
        return;
      }
      const value = BigInt('0x' + hex);
      onSeedOriginsChange([
        {
          Seed: {
            base_seed: value as never,
            mt_seed: Number(value & 0xff_ff_ff_ffn) as never,
          },
        },
      ]);
    },
    [onSeedOriginsChange]
  );

  // モード切替
  const handleModeChange = useCallback(
    (v: string) => {
      const newMode = v as SeedMode;
      onModeChange(newMode);
      onSeedOriginsChange([]);

      // モード切替後、既存入力から再計算
      if (newMode === 'datetime') {
        handleDatetimeChange(datetime);
      } else {
        handleSeedHexChange(seedHex);
      }
    },
    [
      onModeChange,
      onSeedOriginsChange,
      handleDatetimeChange,
      handleSeedHexChange,
      datetime,
      seedHex,
    ]
  );

  // 現在の Seed 表示 (確認用 — 先頭 1 件を表示)
  const seedDisplay = useMemo(() => {
    const first = seedOrigins.at(0);
    if (!first) return '';
    if ('Seed' in first) {
      return (first.Seed.base_seed as bigint).toString(16).toUpperCase().padStart(16, '0');
    }
    if ('Startup' in first) {
      return (first.Startup.base_seed as bigint).toString(16).toUpperCase().padStart(16, '0');
    }
    return '';
  }, [seedOrigins]);

  const originCount = seedOrigins.length;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        <Trans>Seed</Trans>
      </h3>
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="w-full">
          <TabsTrigger value="datetime" disabled={disabled} className="flex-1">
            <Trans>Datetime</Trans>
          </TabsTrigger>
          <TabsTrigger value="seed" disabled={disabled} className="flex-1">
            <Trans>LCG Seed</Trans>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datetime" className="flex flex-col gap-2">
          <DatetimeInput value={datetime} onChange={handleDatetimeChange} disabled={disabled} />
          <KeySpecSelector
            value={{ available_buttons: keyInput.buttons }}
            onChange={(spec) => handleKeyInputChange({ buttons: spec.available_buttons })}
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="seed" className="flex flex-col gap-2">
          <div>
            <Label htmlFor="lcg-seed-input" className="text-xs text-muted-foreground">
              <Trans>LCG Seed (Hex)</Trans>
            </Label>
            <Input
              id="lcg-seed-input"
              value={seedHex}
              onChange={(e) => handleSeedHexChange(e.target.value)}
              placeholder="0123456789ABCDEF"
              disabled={disabled}
              className="font-mono"
              maxLength={16}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* 現在の Seed 値表示 */}
      {seedDisplay ? (
        <p className="text-xs text-muted-foreground">
          {t`Initial Seed`}: <span className="font-mono">{seedDisplay}</span>
          {originCount > 1 ? ` (+${String(originCount - 1)})` : ''}
        </p>
      ) : undefined}
    </section>
  );
}

export { SeedInput };
