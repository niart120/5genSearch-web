/**
 * KeyInputSelector: KeyInput 用の DS ボタン選択ラッパー
 *
 * 確定した1組のボタン入力 (`KeyInput`) を編集する。
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
import type { KeyInput, DsButton } from '@/wasm/wasm_pkg.js';

interface KeyInputSelectorProps {
  value: KeyInput;
  onChange: (value: KeyInput) => void;
  disabled?: boolean;
}

function KeyInputSelector({ value, onChange, disabled }: KeyInputSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggle = useCallback(
    (next: DsButton[]) => {
      onChange({ buttons: next });
    },
    [onChange]
  );

  const displayText = formatDsButtons(value.buttons);

  return (
    <>
      {/* インジケータ行 */}
      <div className="flex items-center gap-2">
        <Label className="shrink-0 text-xs text-muted-foreground">
          <Trans>Key input (buttons held)</Trans>
        </Label>
        <span className="min-w-0 flex-1 truncate text-xs font-mono">
          {displayText || <Trans>None</Trans>}
        </span>
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
              <Trans>Key input (buttons held)</Trans>
            </DialogTitle>
          </DialogHeader>
          <DsButtonToggleGroup
            selected={value.buttons}
            onToggle={handleToggle}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            <Trans>Selected buttons</Trans>: {value.buttons.length}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { KeyInputSelector };
export type { KeyInputSelectorProps };
