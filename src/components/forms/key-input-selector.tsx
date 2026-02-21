/**
 * KeyInputSelector: KeyInput 用の DS ボタン選択ラッパー
 *
 * 確定した1組のボタン入力 (`KeyInput`) を編集する。
 * インジケータ行 (1行) + ダイアログで省スペース化。
 * 共通 UI は `DsButtonToggleGroup` に委譲する。
 *
 * ダイアログ内ではローカル draft 状態で編集し、
 * OK ボタンで確定時のみ親に反映する。
 */

import { useState, useCallback } from 'react';
import { Trans } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DsButtonToggleGroup } from './ds-button-toggle-group';
import { formatDsButtons, DISPLAY_ORDER } from '@/lib/format';
import type { KeyInput, DsButton } from '@/wasm/wasm_pkg.js';

interface KeyInputSelectorProps {
  value: KeyInput;
  onChange: (value: KeyInput) => void;
  disabled?: boolean;
}

function KeyInputSelector({ value, onChange, disabled }: KeyInputSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DsButton[]>([]);

  const handleOpen = useCallback(() => {
    setDraft(value.buttons);
    setDialogOpen(true);
  }, [value.buttons]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        handleOpen();
      } else {
        // ×ボタン・オーバーレイクリック → 変更破棄
        setDialogOpen(false);
      }
    },
    [handleOpen]
  );

  const handleConfirm = useCallback(() => {
    onChange({ buttons: draft });
    setDialogOpen(false);
  }, [onChange, draft]);

  const handleSelectAll = useCallback(() => {
    setDraft([...DISPLAY_ORDER]);
  }, []);

  const handleDeselectAll = useCallback(() => {
    setDraft([]);
  }, []);

  const displayText = formatDsButtons(value.buttons);

  return (
    <>
      {/* インジケータ行 */}
      <div className="flex items-center gap-2">
        <Label className="shrink-0 text-xs text-muted-foreground">
          <Trans>Key input</Trans>
        </Label>
        <span className="min-w-0 flex-1 truncate text-xs font-mono">
          {displayText || <Trans>None</Trans>}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handleOpen}>
          <Trans>Edit</Trans>
        </Button>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Key input</Trans>
            </DialogTitle>
          </DialogHeader>
          <DsButtonToggleGroup selected={draft} onToggle={setDraft} disabled={disabled} />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              <Trans>Select all</Trans>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              <Trans>Deselect all</Trans>
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { KeyInputSelector };
export type { KeyInputSelectorProps };
