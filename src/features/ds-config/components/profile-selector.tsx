import { useState, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast-state';
import { useProfile, collectCurrentData } from '@/hooks/use-profile';
import { ProfileNameDialog } from './profile-name-dialog';
import { ProfileConfirmDialog } from './profile-confirm-dialog';
import { ProfileImportExport } from './profile-import-export';

/** ドロップダウンが「プロファイルなし」を選択した際の値 */
const NO_PROFILE_VALUE = '__none__';

function ProfileSelector() {
  const { t } = useLingui();
  const {
    profiles,
    activeProfileId,
    isDirty,
    createProfile,
    saveActiveProfile,
    renameProfile,
    deleteProfile,
    setActiveProfileId,
  } = useProfile();

  // ダイアログ状態
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDialogMode, setNameDialogMode] = useState<'create' | 'rename'>('create');
  const [nameDialogDefault, setNameDialogDefault] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | undefined>();

  // ---- プロファイル切替 ----
  const handleSelect = useCallback(
    (value: string) => {
      const nextId = value === NO_PROFILE_VALUE ? undefined : value;
      if (nextId === activeProfileId) return;

      if (isDirty) {
        setPendingSwitchId(nextId);
        setConfirmDialogOpen(true);
        return;
      }
      setActiveProfileId(nextId);
    },
    [activeProfileId, isDirty, setActiveProfileId]
  );

  const handleConfirmSaveAndSwitch = useCallback(() => {
    saveActiveProfile(collectCurrentData());
    setActiveProfileId(pendingSwitchId);
    setConfirmDialogOpen(false);
    toast.success(t`Profile saved`);
  }, [saveActiveProfile, setActiveProfileId, pendingSwitchId, t]);

  const handleConfirmDiscard = useCallback(() => {
    setActiveProfileId(pendingSwitchId);
    setConfirmDialogOpen(false);
  }, [setActiveProfileId, pendingSwitchId]);

  // ---- 保存 ----
  const handleSave = useCallback(() => {
    if (!activeProfileId) return;
    saveActiveProfile(collectCurrentData());
    toast.success(t`Profile saved`);
  }, [activeProfileId, saveActiveProfile, t]);

  // ---- 新規作成 ----
  const handleNewClick = useCallback(() => {
    setNameDialogMode('create');
    setNameDialogDefault('');
    setNameDialogOpen(true);
  }, []);

  const handleNameSubmit = useCallback(
    (name: string) => {
      if (nameDialogMode === 'create') {
        createProfile(name, collectCurrentData());
        toast.success(t`Profile saved`);
      } else {
        if (activeProfileId) {
          renameProfile(activeProfileId, name);
        }
      }
      setNameDialogOpen(false);
    },
    [nameDialogMode, createProfile, renameProfile, activeProfileId, t]
  );

  // ---- リネーム ----
  const handleRename = useCallback(() => {
    const active = profiles.find((p) => p.id === activeProfileId);
    if (!active) return;
    setNameDialogMode('rename');
    setNameDialogDefault(active.name);
    setNameDialogOpen(true);
  }, [profiles, activeProfileId]);

  // ---- 削除 ----
  const handleDelete = useCallback(() => {
    if (!activeProfileId) return;
    deleteProfile(activeProfileId);
    toast.success(t`Profile deleted`);
  }, [activeProfileId, deleteProfile, t]);

  return (
    <div className="space-y-2">
      <Label className="text-xs">
        <Trans>Profile</Trans>
      </Label>

      <div className="flex items-center gap-1.5">
        <Select value={activeProfileId ?? NO_PROFILE_VALUE} onValueChange={handleSelect}>
          <SelectTrigger className="flex-1 min-w-0" aria-label={t`Profile`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PROFILE_VALUE}>
              <Trans>No profile</Trans>
            </SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.id === activeProfileId && isDirty ? ' *' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 上書き保存 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={!activeProfileId || !isDirty}
          aria-label={t`Save`}
          title={t`Save`}
        >
          <Save className="size-4" />
        </Button>

        {/* 新規作成 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewClick}
          aria-label={t`Save as new`}
          title={t`Save as new`}
        >
          <Plus className="size-4" />
        </Button>

        {/* リネーム */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRename}
          disabled={!activeProfileId}
          aria-label={t`Rename`}
          title={t`Rename`}
        >
          <Pencil className="size-4" />
        </Button>

        {/* 削除 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={!activeProfileId}
          aria-label={t`Delete`}
          title={t`Delete`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* インポート/エクスポート */}
      <ProfileImportExport />

      {/* 名前入力ダイアログ */}
      <ProfileNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onSubmit={handleNameSubmit}
        defaultName={nameDialogDefault}
        mode={nameDialogMode}
      />

      {/* 確認ダイアログ */}
      <ProfileConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onSaveAndSwitch={handleConfirmSaveAndSwitch}
        onDiscard={handleConfirmDiscard}
      />
    </div>
  );
}

export { ProfileSelector };
