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
            <Trans>Large number of results expected</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>
              Estimated results: {estimatedCount.toLocaleString()}. This may cause high memory usage
              or slow rendering. Do you want to continue?
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans>Cancel</Trans>
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            <Trans>Continue search</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { SearchConfirmationDialogProps };
export { SearchConfirmationDialog };
