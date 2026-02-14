/**
 * Seed 入力 UI — 日時モード / LCG Seed 直接指定モード
 *
 * 日時モードでは timer0×vcount の組み合わせ数に応じて複数の SeedOrigin を生成する。
 * 全入力状態は親コンポーネント (NeedlePage) が所有し、
 * seedOrigins は useMemo で導出されるため、本コンポーネントは純粋な制御コンポーネントとして動作する。
 */

import { useCallback, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatetimeInput } from '@/components/ui/datetime-input';
import { KeySpecSelector } from '@/components/forms/key-spec-selector';
import type { Datetime, KeyInput, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { SeedMode } from '../types';

interface SeedInputProps {
  mode: SeedMode;
  onModeChange: (mode: SeedMode) => void;
  datetime: Datetime;
  onDatetimeChange: (dt: Datetime) => void;
  keyInput: KeyInput;
  onKeyInputChange: (ki: KeyInput) => void;
  seedHex: string;
  onSeedHexChange: (hex: string) => void;
  /** 親で useMemo 導出された SeedOrigin[] (表示専用) */
  seedOrigins: SeedOrigin[];
  disabled?: boolean;
}

function SeedInput({
  mode,
  onModeChange,
  datetime,
  onDatetimeChange,
  keyInput,
  onKeyInputChange,
  seedHex,
  onSeedHexChange,
  seedOrigins,
  disabled,
}: SeedInputProps): ReactElement {
  const { t } = useLingui();

  // seed hex フィールドの入力フィルタリング
  const handleSeedHexInput = useCallback(
    (raw: string) => {
      const hex = raw.replaceAll(/[^\da-fA-F]/g, '').slice(0, 16);
      onSeedHexChange(hex);
    },
    [onSeedHexChange]
  );

  // モード切替 (導出は親の useMemo が自動で行うため副作用不要)
  const handleModeChange = useCallback((v: string) => onModeChange(v as SeedMode), [onModeChange]);

  // 現在の Seed 表示 (確認用 — 先頭 1 件を表示)
  const seedDisplay = useMemo(() => {
    const first = seedOrigins.at(0);
    if (!first) return '';
    if ('Seed' in first) {
      return first.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
    }
    if ('Startup' in first) {
      return first.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
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
          <DatetimeInput value={datetime} onChange={onDatetimeChange} disabled={disabled} />
          <KeySpecSelector
            value={{ available_buttons: keyInput.buttons }}
            onChange={(spec) => onKeyInputChange({ buttons: spec.available_buttons })}
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
              onChange={(e) => handleSeedHexInput(e.target.value)}
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
