import { Trans } from '@lingui/react/macro';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProfileConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndSwitch: () => void;
  onDiscard: () => void;
}

function ProfileConfirmDialog({
  open,
  onOpenChange,
  onSaveAndSwitch,
  onDiscard,
}: ProfileConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Unsaved changes</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>The current profile has unsaved changes. What would you like to do?</Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button variant="secondary" onClick={onDiscard}>
            <Trans>Discard and switch</Trans>
          </Button>
          <Button onClick={onSaveAndSwitch}>
            <Trans>Save and switch</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ProfileConfirmDialog };
