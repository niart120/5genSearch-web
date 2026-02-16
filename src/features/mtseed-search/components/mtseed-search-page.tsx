/**
 * MT Seed 検索ページコンポーネント
 *
 * IV フィルタ条件を満たす MT Seed を全空間から探索し、結果をテーブル表示する。
 * 検索結果から起動時刻検索へ Seed を引き渡す連携フローも提供する。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { DataTable } from '@/components/data-display/data-table';
import { Button } from '@/components/ui/button';
import { MtseedSearchForm } from './mtseed-search-form';
import { createMtseedResultColumns } from './mtseed-result-columns';
import { useMtseedSearch } from '../hooks/use-mtseed-search';
import { estimateMtseedSearchResults } from '@/services/search-estimation';
import {
  validateMtseedIvSearchForm,
  toMtseedSearchContext,
  type MtseedIvValidationErrorCode,
} from '../types';
import type { IvFilter, RomVersion } from '@/wasm/wasm_pkg.js';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { navigateToDatetimeSearch } from '@/lib/navigate';
import { getStandardContexts } from '@/lib/iv-tooltip';

/** IvFilter のデフォルト値 (全 31-31, めざパ条件なし) */
const DEFAULT_IV_FILTER: IvFilter = {
  hp: [31, 31],
  atk: [31, 31],
  def: [31, 31],
  spa: [31, 31],
  spd: [31, 31],
  spe: [31, 31],
};

/** DS Config の ROM バージョンから MT オフセットのデフォルト値を導出 */
function getDefaultMtOffset(version: RomVersion): number {
  return version === 'Black2' || version === 'White2' ? 2 : 0;
}

function MtseedSearchPage(): ReactElement {
  const { t } = useLingui();
  const { config } = useDsConfigReadonly();

  // フォーム状態
  const [ivFilter, setIvFilter] = useState<IvFilter>(DEFAULT_IV_FILTER);
  const [mtOffset, setMtOffset] = useState(() => getDefaultMtOffset(config.version));
  const [isRoamer, setIsRoamer] = useState(false);
  const [useGpu, setUseGpu] = useState(false);

  // 徘徊ポケモン ON → MT オフセットを 1 に自動設定
  const handleRoamerChange = useCallback((checked: boolean) => {
    setIsRoamer(checked);
    if (checked) {
      setMtOffset(1);
    }
  }, []);

  // 検索フック
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useMtseedSearch(useGpu);

  // バリデーション
  const validation = useMemo(
    () => validateMtseedIvSearchForm({ ivFilter, mtOffset, isRoamer }),
    [ivFilter, mtOffset, isRoamer]
  );

  const validationMessages = useMemo(
    (): Record<MtseedIvValidationErrorCode, string> => ({
      IV_RANGE_INVALID: t`Min IV must be less than or equal to max IV`,
      MT_OFFSET_NEGATIVE: t`MT Advances must be 0 or greater`,
    }),
    [t]
  );

  // コンテキスト・列定義
  const contexts = useMemo(() => getStandardContexts(config.version), [config.version]);
  const columns = useMemo(() => createMtseedResultColumns(contexts), [contexts]);

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    estimatedCount: number;
  }>({ open: false, estimatedCount: 0 });

  // 検索実行
  const handleSearchExecution = useCallback(() => {
    startSearch(toMtseedSearchContext({ ivFilter, mtOffset, isRoamer }));
  }, [ivFilter, mtOffset, isRoamer, startSearch]);

  // 見積もり → 確認 → 実行
  const handleSearch = useCallback(() => {
    const estimation = estimateMtseedSearchResults(ivFilter);
    if (estimation.exceedsThreshold) {
      setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount });
    } else {
      handleSearchExecution();
    }
  }, [ivFilter, handleSearchExecution]);

  // 起動時刻検索への連携
  const handleNavigateToDatetimeSearch = useCallback(() => {
    navigateToDatetimeSearch(results.map((r) => r.seed));
  }, [results]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索コントロール */}
          <div className="hidden lg:flex lg:flex-col lg:gap-2">
            <SearchControls
              layout="desktop"
              isLoading={isLoading}
              isInitialized={isInitialized}
              isValid={validation.isValid}
              progress={progress}
              error={error}
              onSearch={handleSearch}
              onCancel={cancel}
              useGpu={useGpu}
              onGpuChange={setUseGpu}
            />
          </div>

          {/* フォーム */}
          <MtseedSearchForm
            ivFilter={ivFilter}
            mtOffset={mtOffset}
            isRoamer={isRoamer}
            onIvFilterChange={setIvFilter}
            onMtOffsetChange={setMtOffset}
            onRoamerChange={handleRoamerChange}
            disabled={isLoading}
          />

          {/* バリデーションエラー */}
          {validation.errors.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-destructive">
              {validation.errors.map((code) => (
                <li key={code}>{validationMessages[code]}</li>
              ))}
            </ul>
          ) : undefined}
        </FeaturePageLayout.Controls>

        <FeaturePageLayout.Results>
          {/* 連携ボタン */}
          {results.length > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <Trans>{results.length} seeds found</Trans>
              </p>
              <Button variant="outline" size="sm" onClick={handleNavigateToDatetimeSearch}>
                <Trans>Search Boot Timing</Trans>
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Trans>Results</Trans>: 0
            </p>
          )}

          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results`}
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定 検索バー */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <SearchControls
          layout="mobile"
          isLoading={isLoading}
          isInitialized={isInitialized}
          isValid={validation.isValid}
          progress={progress}
          error={error}
          onSearch={handleSearch}
          onCancel={cancel}
          useGpu={useGpu}
          onGpuChange={setUseGpu}
        />
      </div>

      <SearchConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        estimatedCount={confirmDialog.estimatedCount}
        onConfirm={() => {
          setConfirmDialog({ open: false, estimatedCount: 0 });
          handleSearchExecution();
        }}
      />
    </>
  );
}

export { MtseedSearchPage };
