import { useCallback, useRef } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast-state';
import { useProfile } from '@/hooks/use-profile';
import { validateProfileJson, PROFILE_SCHEMA } from '@/lib/validation';
import { downloadFile } from '@/services/export';

/** ファイル名に使えない文字をハイフンに置換 */
function sanitizeFilename(name: string): string {
  return name.replaceAll(/[^\w-]/g, '-').replaceAll(/-{2,}/g, '-');
}

function ProfileImportExport() {
  const { t } = useLingui();
  const { activeProfile, importProfile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- エクスポート ----
  // 保存済みプロファイルデータを出力する (未保存の変更は含めない)
  const handleExport = useCallback(() => {
    if (!activeProfile) return;
    const json = {
      $schema: PROFILE_SCHEMA,
      name: activeProfile.name,
      data: activeProfile.data,
    };
    const content = JSON.stringify(json, undefined, 2);
    const filename = `profile-${sanitizeFilename(activeProfile.name)}.json`;
    downloadFile(content, filename, 'application/json');
  }, [activeProfile]);

  // ---- インポート ----
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        const result = validateProfileJson(parsed);
        if (!result.ok) {
          toast.error(t`Invalid profile file`, { description: result.error });
          return;
        }
        importProfile({ name: result.name, data: result.data });
        toast.success(t`Profile imported`);
      } catch {
        toast.error(t`Invalid profile file`);
      } finally {
        // 同一ファイル再選択を許可
        e.target.value = '';
      }
    },
    [importProfile, t]
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleImportClick}
        aria-label={t`Import`}
        title={t`Import`}
      >
        <Download className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleExport}
        disabled={!activeProfile}
        aria-label={t`Export`}
        title={t`Export`}
      >
        <Upload className="size-3.5" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

export { ProfileImportExport };
