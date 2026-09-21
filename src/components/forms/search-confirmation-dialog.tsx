/**
 * 検索結果件数警告ダイアログ
 *
 * 推定結果件数が閾値を超過した場合に表示し、
 * ユーザーに検索を続行するか確認する。
 */

import { Trans } from '@lingui/react/macro';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SearchConfirmationDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 推定結果件数 */
  estimatedCount: number;
  /** 検索続行時のコールバック */
  onConfirm: () => void;
}

function SearchConfirmationDialog({
  open,
  onOpenChange,
  estimatedCount,
  onConfirm,
}: SearchConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans>Warning</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>
              About {estimatedCount.toLocaleString()} results are expected. Processing and
              displaying them may take time and make the browser less responsive. Run anyway?
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans>Cancel</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            <Trans>Run</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { SearchConfirmationDialogProps };
export { SearchConfirmationDialog };
