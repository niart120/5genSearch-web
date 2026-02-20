import { useState, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAX_NAME_LENGTH = 50;

interface ProfileNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  defaultName: string;
  mode: 'create' | 'rename';
}

function ProfileNameDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultName,
  mode,
}: ProfileNameDialogProps) {
  const { t } = useLingui();
  const [name, setName] = useState(defaultName);

  // open が切り替わった際に defaultName でリセットする
  // useEffect を使わず onOpenChange 経由でハンドリングする
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setName(defaultName);
      onOpenChange(nextOpen);
    },
    [defaultName, onOpenChange]
  );

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValid) onSubmit(trimmed);
    },
    [isValid, onSubmit, trimmed]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? <Trans>Save as new</Trans> : <Trans>Rename</Trans>}
            </DialogTitle>
            <DialogDescription>
              <Trans>Enter a profile name.</Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="profile-name" className="text-xs">
              <Trans>Profile name</Trans>
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              aria-label={t`Profile name`}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={!isValid}>
              {mode === 'create' ? <Trans>Save</Trans> : <Trans>Rename</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ProfileNameDialog };
