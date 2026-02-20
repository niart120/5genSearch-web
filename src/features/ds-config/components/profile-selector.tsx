import { useReducer, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { i18n } from '@lingui/core';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ProfileDeleteDialog } from './profile-delete-dialog';
import { ProfileImportExport } from './profile-import-export';

/** ドロップダウンが「プロファイルなし」を選択した際の値 */
const NO_PROFILE_VALUE = '__none__';

// ---- ダイアログ状態 (discriminated union) ----
type DialogState =
  | { kind: 'closed' }
  | { kind: 'name'; mode: 'create' | 'rename'; defaultName: string }
  | { kind: 'confirm-switch'; pendingSwitchId: string | undefined }
  | { kind: 'delete' };

type DialogAction =
  | { type: 'open-name'; mode: 'create' | 'rename'; defaultName: string }
  | { type: 'open-confirm-switch'; pendingSwitchId: string | undefined }
  | { type: 'open-delete' }
  | { type: 'close' };

function dialogReducer(_state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'open-name': {
      return { kind: 'name', mode: action.mode, defaultName: action.defaultName };
    }
    case 'open-confirm-switch': {
      return { kind: 'confirm-switch', pendingSwitchId: action.pendingSwitchId };
    }
    case 'open-delete': {
      return { kind: 'delete' };
    }
    case 'close': {
      return { kind: 'closed' };
    }
  }
}

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

  const [dialog, dispatch] = useReducer(dialogReducer, { kind: 'closed' });

  // ---- プロファイル切替 ----
  const handleSelect = useCallback(
    (value: string) => {
      const nextId = value === NO_PROFILE_VALUE ? undefined : value;
      if (nextId === activeProfileId) return;

      if (isDirty) {
        dispatch({ type: 'open-confirm-switch', pendingSwitchId: nextId });
        return;
      }
      setActiveProfileId(nextId);
    },
    [activeProfileId, isDirty, setActiveProfileId]
  );

  const handleConfirmSaveAndSwitch = useCallback(() => {
    if (dialog.kind !== 'confirm-switch') return;
    saveActiveProfile(collectCurrentData());
    setActiveProfileId(dialog.pendingSwitchId);
    dispatch({ type: 'close' });
    toast.success(i18n._(msg`Profile saved`));
  }, [dialog, saveActiveProfile, setActiveProfileId]);

  const handleConfirmDiscard = useCallback(() => {
    if (dialog.kind !== 'confirm-switch') return;
    setActiveProfileId(dialog.pendingSwitchId);
    dispatch({ type: 'close' });
  }, [dialog, setActiveProfileId]);

  // ---- 保存 ----
  const handleSave = useCallback(() => {
    if (!activeProfileId) return;
    saveActiveProfile(collectCurrentData());
    toast.success(i18n._(msg`Profile saved`));
  }, [activeProfileId, saveActiveProfile]);

  // ---- 新規作成 ----
  const handleNewClick = useCallback(() => {
    dispatch({ type: 'open-name', mode: 'create', defaultName: '' });
  }, []);

  const handleNameSubmit = useCallback(
    (name: string) => {
      if (dialog.kind !== 'name') return;
      if (dialog.mode === 'create') {
        createProfile(name, collectCurrentData());
        toast.success(i18n._(msg`Profile saved`));
      } else {
        if (activeProfileId) {
          renameProfile(activeProfileId, name);
        }
      }
      dispatch({ type: 'close' });
    },
    [dialog, createProfile, renameProfile, activeProfileId]
  );

  // ---- リネーム ----
  const handleRename = useCallback(() => {
    const active = profiles.find((p) => p.id === activeProfileId);
    if (!active) return;
    dispatch({ type: 'open-name', mode: 'rename', defaultName: active.name });
  }, [profiles, activeProfileId]);

  // ---- 削除 ----
  const handleDeleteClick = useCallback(() => {
    if (!activeProfileId) return;
    dispatch({ type: 'open-delete' });
  }, [activeProfileId]);

  const handleDeleteConfirm = useCallback(() => {
    if (!activeProfileId) return;
    deleteProfile(activeProfileId);
    dispatch({ type: 'close' });
    toast.success(i18n._(msg`Profile deleted`));
  }, [activeProfileId, deleteProfile]);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-6">
        {/* 新規作成 */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleNewClick}
          aria-label={t`Save as new`}
          title={t`Save as new`}
        >
          <Plus className="size-3.5" />
        </Button>

        {/* 上書き保存 */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleSave}
          disabled={!activeProfileId || !isDirty}
          aria-label={t`Save`}
          title={t`Save`}
        >
          <Save className="size-3.5" />
        </Button>

        {/* リネーム */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleRename}
          disabled={!activeProfileId}
          aria-label={t`Rename`}
          title={t`Rename`}
        >
          <Pencil className="size-3.5" />
        </Button>

        {/* 削除 */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleDeleteClick}
          disabled={!activeProfileId}
          aria-label={t`Delete`}
          title={t`Delete`}
        >
          <Trash2 className="size-3.5" />
        </Button>

        {/* インポート/エクスポート */}
        <ProfileImportExport />
      </div>

      <Select value={activeProfileId ?? NO_PROFILE_VALUE} onValueChange={handleSelect}>
        <SelectTrigger aria-label={t`Profile`}>
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

      {/* 名前入力ダイアログ */}
      <ProfileNameDialog
        open={dialog.kind === 'name'}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'close' });
        }}
        onSubmit={handleNameSubmit}
        defaultName={dialog.kind === 'name' ? dialog.defaultName : ''}
        mode={dialog.kind === 'name' ? dialog.mode : 'create'}
      />

      {/* 切替確認ダイアログ */}
      <ProfileConfirmDialog
        open={dialog.kind === 'confirm-switch'}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'close' });
        }}
        onSaveAndSwitch={handleConfirmSaveAndSwitch}
        onDiscard={handleConfirmDiscard}
      />

      {/* 削除確認ダイアログ */}
      <ProfileDeleteDialog
        open={dialog.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'close' });
        }}
        onConfirm={handleDeleteConfirm}
        profileName={profiles.find((p) => p.id === activeProfileId)?.name ?? ''}
      />
    </div>
  );
}

export { ProfileSelector };
