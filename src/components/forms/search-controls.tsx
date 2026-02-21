/**
 * 検索コントロール — PC / モバイルで共有する検索操作 UI
 *
 * 検索 / キャンセルボタン、GPU トグル (任意)、進捗表示、エラー表示を
 * layout に応じた並び順で描画する。
 *
 * - desktop: ボタン行 → 進捗 → エラー
 * - mobile:  進捗 → ボタン行 → エラー
 */

import { Trans } from '@lingui/react/macro';
import { SearchProgress, type SearchProgressData } from '@/components/data-display/search-progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SearchControlsProps {
  layout: 'desktop' | 'mobile';
  isLoading: boolean;
  isInitialized: boolean;
  isValid: boolean;
  progress: SearchProgressData | undefined;
  error: Error | undefined;
  onSearch: () => void;
  onCancel: () => void;
  /** GPU トグルの現在値。省略時は GPU トグルを表示しない。 */
  useGpu?: boolean;
  /** GPU トグル変更ハンドラ。useGpu と共に指定する。 */
  onGpuChange?: (checked: boolean) => void;
}

function SearchControls({
  layout,
  isLoading,
  isInitialized,
  isValid,
  progress,
  error,
  onSearch,
  onCancel,
  useGpu,
  onGpuChange,
}: SearchControlsProps) {
  const buttonSize = layout === 'mobile' ? 'sm' : 'default';
  const showGpuToggle = useGpu !== undefined && onGpuChange !== undefined;
  const gpuToggleId = layout === 'mobile' ? 'gpu-toggle-mobile' : 'gpu-toggle';

  const buttonRow = (
    <div className={cn('flex min-h-9 items-center gap-3', layout === 'mobile' && 'mt-2')}>
      {isLoading ? (
        <Button variant="outline" onClick={onCancel} className="flex-1" size={buttonSize}>
          <Trans>Cancel</Trans>
        </Button>
      ) : (
        <Button
          onClick={onSearch}
          disabled={!isValid || !isInitialized}
          className="flex-1"
          size={buttonSize}
        >
          <Trans>Search</Trans>
        </Button>
      )}
      {showGpuToggle && (
        <div className="flex items-center gap-1.5">
          <Switch
            id={gpuToggleId}
            checked={useGpu}
            onCheckedChange={onGpuChange}
            disabled={isLoading}
          />
          <Label htmlFor={gpuToggleId} className="text-xs">
            GPU
          </Label>
        </div>
      )}
    </div>
  );

  const progressElement = <SearchProgress progress={progress} />;
  const errorElement = error ? (
    <p className={cn('text-xs text-destructive', layout === 'mobile' && 'mt-1')}>{error.message}</p>
  ) : undefined;

  if (layout === 'mobile') {
    return (
      <>
        {progressElement}
        {buttonRow}
        {errorElement}
      </>
    );
  }

  return (
    <>
      {buttonRow}
      {progressElement}
      {errorElement}
    </>
  );
}

export { SearchControls };
