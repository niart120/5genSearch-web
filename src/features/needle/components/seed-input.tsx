/**
 * Seed 入力 UI — 日時モード / LCG Seed 直接指定モード
 *
 * 日時モードでは timer0×vcount の組み合わせ数に応じて複数の SeedOrigin を生成する。
 * 全入力状態は親コンポーネント (NeedlePage) が所有する制御コンポーネント。
 */

import { useCallback, type ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatetimeInput } from '@/components/ui/datetime-input';
import { KeySpecSelector } from '@/components/forms/key-spec-selector';
import type { Datetime, KeyInput } from '@/wasm/wasm_pkg.js';
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
  disabled,
}: SeedInputProps): ReactElement {
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
    </section>
  );
}

export { SeedInput };
