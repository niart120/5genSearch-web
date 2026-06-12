import { useState, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { RotateCcw } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { toast } from '@/components/ui/toast-state';
import { resetAppStorageAndReload, type AppStorageResetMode } from '@/services/app-storage-reset';

function AppStorageResetSection(): ReactElement {
  const { t } = useLingui();
  const [pendingMode, setPendingMode] = useState<AppStorageResetMode>();

  const handleConfirm = (): void => {
    if (pendingMode === undefined) return;

    const result = resetAppStorageAndReload(pendingMode);
    if (!result.ok) {
      const description =
        result.reason === 'profile-state-invalid'
          ? t`Could not reset while keeping profiles. Reset all saved data if needed.`
          : t`Could not access browser storage. Check browser settings.`;
      toast.error(t`Could not reset saved data`, {
        description,
      });
    }
  };

  return (
    <section className="space-y-3 border-t pt-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Trans>Reset saved data</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>Reset settings and inputs saved in this browser.</Trans>
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={() => setPendingMode('settings')}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <Trans>Reset settings and inputs</Trans>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
          onClick={() => setPendingMode('all')}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <Trans>Reset all saved data</Trans>
        </Button>
      </div>

      <AlertDialog
        open={pendingMode !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingMode(undefined);
        }}
      >
        {pendingMode !== undefined && (
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{getDialogTitle(pendingMode)}</AlertDialogTitle>
              <AlertDialogDescription>{getDialogDescription(pendingMode)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Trans>Cancel</Trans>
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: 'destructive' })}
                onClick={handleConfirm}
              >
                {getConfirmLabel(pendingMode)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </section>
  );
}

function getDialogTitle(mode: AppStorageResetMode): ReactElement {
  if (mode === 'settings') {
    return <Trans>Reset settings and inputs?</Trans>;
  }
  return <Trans>Reset all saved data?</Trans>;
}

function getDialogDescription(mode: AppStorageResetMode): ReactElement {
  if (mode === 'settings') {
    return (
      <Trans>
        Profiles will be kept and the active profile selection will be cleared. Settings and feature
        inputs will be deleted, then the page will reload.
      </Trans>
    );
  }
  return (
    <Trans>
      Profiles and all saved data will be deleted. This cannot be undone. The page will reload after
      deletion.
    </Trans>
  );
}

function getConfirmLabel(mode: AppStorageResetMode): ReactElement {
  if (mode === 'settings') {
    return <Trans>Reset settings and inputs</Trans>;
  }
  return <Trans>Reset all</Trans>;
}

export { AppStorageResetSection };
