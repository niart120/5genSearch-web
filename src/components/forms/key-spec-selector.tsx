/**
 * KeySpecSelector: KeySpec 用の DS ボタン選択ラッパー
 *
 * 探索対象のボタン組み合わせ仕様 (`KeySpec`) を編集する。
 * インジケータ行 (1行) + ダイアログで省スペース化。
 * 共通 UI は `DsButtonToggleGroup` に委譲する。
 */

import { useState, useCallback } from 'react';
import { Trans } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DsButtonToggleGroup } from './ds-button-toggle-group';
import { formatDsButtons } from '@/lib/format';
import type { KeySpec, DsButton } from '@/wasm/wasm_pkg';

interface KeySpecSelectorProps {
  value: KeySpec;
  onChange: (value: KeySpec) => void;
  disabled?: boolean;
  /** countKeyCombinations で計算した組み合わせ数 */
  combinationCount?: number;
}

function KeySpecSelector({ value, onChange, disabled, combinationCount }: KeySpecSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggle = useCallback(
    (next: DsButton[]) => {
      onChange({ available_buttons: next });
    },
    [onChange]
  );

  const displayText = formatDsButtons(value.available_buttons);
  const countText =
    combinationCount === undefined
      ? value.available_buttons.length
      : combinationCount.toLocaleString();

  return (
    <>
      {/* インジケータ行 */}
      <div className="flex items-center gap-2">
        <Label className="shrink-0 text-xs text-muted-foreground">
          <Trans>Key input</Trans>
        </Label>
        <span className="min-w-0 flex-1 truncate text-xs font-mono">{displayText}</span>
        <span className="shrink-0 text-xs text-muted-foreground">({countText})</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
        >
          <Trans>Key input</Trans>
        </Button>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Key input</Trans>
            </DialogTitle>
          </DialogHeader>
          <DsButtonToggleGroup
            selected={value.available_buttons}
            onToggle={handleToggle}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            <Trans>Combinations</Trans>: {countText}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { KeySpecSelector };
export type { KeySpecSelectorProps };
