/**
 * Seed 入力 UI — 日時モード / LCG Seed 直接指定モード
 *
 * 針読みでは単一の起動条件を指定すれば十分なため、
 * 既存の SeedInputSection (3 モード) は再利用せず軽量な専用コンポーネントとする。
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatetimeInput, DEFAULT_DATETIME } from '@/components/forms/datetime-input';
import { KeySpecSelector } from '@/components/forms/key-spec-selector';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { resolveSeedOrigins } from '@/services/seed-resolve';
import type { Datetime, KeyInput, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { SeedMode } from '../types';

interface SeedInputProps {
  mode: SeedMode;
  onModeChange: (mode: SeedMode) => void;
  seedOrigin: SeedOrigin | undefined;
  onSeedOriginChange: (origin?: SeedOrigin | undefined) => void;
  disabled?: boolean;
}

/** Hex パターン (最大 16 桁) */
const LCG_SEED_RE = /^[\da-fA-F]{1,16}$/;

function SeedInput({
  mode,
  onModeChange,
  seedOrigin,
  onSeedOriginChange,
  disabled,
}: SeedInputProps): ReactElement {
  const { t } = useLingui();
  const { config: dsConfig, ranges } = useDsConfigReadonly();

  // datetime モード用ローカル state
  const [datetime, setDatetime] = useState<Datetime>(DEFAULT_DATETIME);
  const [keyInput, setKeyInput] = useState<KeyInput>({ buttons: [] });

  // seed モード用ローカル state
  const [seedHex, setSeedHex] = useState('');

  // datetime 変更時に SeedOrigin を再計算
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
        onSeedOriginChange(origins.at(0));
      } catch {
        onSeedOriginChange();
      }
    },
    [dsConfig, ranges, keyInput, onSeedOriginChange]
  );

  // keyInput 変更時に SeedOrigin を再計算
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
        onSeedOriginChange(origins.at(0));
      } catch {
        onSeedOriginChange();
      }
    },
    [dsConfig, ranges, datetime, onSeedOriginChange]
  );

  // seed hex 変更時に SeedOrigin を構築
  const handleSeedHexChange = useCallback(
    (raw: string) => {
      const hex = raw.replaceAll(/[^\da-fA-F]/g, '').slice(0, 16);
      setSeedHex(hex);
      if (hex.length === 0) {
        onSeedOriginChange();
        return;
      }
      if (!LCG_SEED_RE.test(hex)) {
        onSeedOriginChange();
        return;
      }
      const value = BigInt('0x' + hex);
      // SeedOrigin.Seed variant: base_seed = value, mt_seed = lower 32 bits
      onSeedOriginChange({
        Seed: {
          base_seed: value as never,
          mt_seed: Number(value & 0xff_ff_ff_ffn) as never,
        },
      });
    },
    [onSeedOriginChange]
  );

  // モード切替
  const handleModeChange = useCallback(
    (v: string) => {
      const newMode = v as SeedMode;
      onModeChange(newMode);
      onSeedOriginChange();

      // モード切替後、既存入力から再計算
      if (newMode === 'datetime') {
        handleDatetimeChange(datetime);
      } else {
        handleSeedHexChange(seedHex);
      }
    },
    [onModeChange, onSeedOriginChange, handleDatetimeChange, handleSeedHexChange, datetime, seedHex]
  );

  // 現在の Seed 表示 (確認用)
  const seedDisplay = useMemo(() => {
    if (!seedOrigin) return '';
    if ('Seed' in seedOrigin) {
      return (seedOrigin.Seed.base_seed as bigint).toString(16).toUpperCase().padStart(16, '0');
    }
    if ('Startup' in seedOrigin) {
      return (seedOrigin.Startup.base_seed as bigint).toString(16).toUpperCase().padStart(16, '0');
    }
    return '';
  }, [seedOrigin]);

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
        </p>
      ) : undefined}
    </section>
  );
}

export { SeedInput };
