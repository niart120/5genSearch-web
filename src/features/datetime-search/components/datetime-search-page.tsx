/**
 * 起動時刻検索ページコンポーネント
 *
 * MT Seed から DS 起動日時・条件を逆引きする。
 * FeaturePageLayout による Controls / Results 2 ペイン構成。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { TargetSeedsInput } from '@/components/forms/target-seeds-input';
import { DataTable } from '@/components/data-display/data-table';
import { SearchProgress } from '@/components/data-display/search-progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useDatetimeSearch } from '../hooks/use-datetime-search';
import { parseTargetSeeds, validateMtseedSearchForm } from '../types';
import { createSeedOriginColumns } from './seed-origin-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  SeedOrigin,
} from '@/wasm/wasm_pkg.js';

const DEFAULT_DATE_RANGE: DateRangeParams = {
  start_year: 2000,
  start_month: 1,
  start_day: 1,
  end_year: 2000,
  end_month: 1,
  end_day: 1,
};

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

function DatetimeSearchPage(): ReactElement {
  const { t } = useLingui();

  // DS 設定 (サイドバーで管理済み)
  const { config: dsConfig, ranges } = useDsConfigReadonly();

  // GPU トグル
  const [useGpu, setUseGpu] = useState(false);

  // フォーム状態
  const [dateRange, setDateRange] = useState<DateRangeParams>(DEFAULT_DATE_RANGE);
  const [timeRange, setTimeRange] = useState<TimeRangeParams>(DEFAULT_TIME_RANGE);
  const [keySpec, setKeySpec] = useState<KeySpec>(DEFAULT_KEY_SPEC);
  const [targetSeedsRaw, setTargetSeedsRaw] = useState('');

  // 検索フック
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useDatetimeSearch(useGpu);

  // パース + バリデーション
  const parsedSeeds = useMemo(() => parseTargetSeeds(targetSeedsRaw), [targetSeedsRaw]);
  const validation = useMemo(
    () => validateMtseedSearchForm({ dateRange, timeRange, keySpec, targetSeedsRaw }, parsedSeeds),
    [dateRange, timeRange, keySpec, targetSeedsRaw, parsedSeeds]
  );

  // 詳細ダイアログ
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<SeedOrigin | undefined>();

  const handleSelectOrigin = useCallback((origin: SeedOrigin) => {
    setSelectedOrigin(origin);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(() => createSeedOriginColumns(handleSelectOrigin), [handleSelectOrigin]);

  // 検索開始
  const handleSearch = useCallback(() => {
    const context: DatetimeSearchContext = {
      ds: dsConfig,
      date_range: dateRange,
      time_range: timeRange,
      ranges,
      key_spec: keySpec,
    };
    startSearch(context, parsedSeeds.seeds);
  }, [dsConfig, dateRange, timeRange, ranges, keySpec, parsedSeeds.seeds, startSearch]);

  return (
    <FeaturePageLayout>
      <FeaturePageLayout.Controls>
        <SearchContextForm
          dateRange={dateRange}
          timeRange={timeRange}
          keySpec={keySpec}
          onDateRangeChange={setDateRange}
          onTimeRangeChange={setTimeRange}
          onKeySpecChange={setKeySpec}
          disabled={isLoading}
        />

        <TargetSeedsInput
          value={targetSeedsRaw}
          onChange={setTargetSeedsRaw}
          parsedSeeds={parsedSeeds.seeds}
          errors={parsedSeeds.errors}
          disabled={isLoading}
        />

        {/* バリデーションエラー */}
        {validation.errors.length > 0 && (
          <ul className="text-xs text-destructive space-y-0.5">
            {validation.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        {/* 検索ボタン + GPU トグル */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Button variant="outline" onClick={cancel} className="flex-1">
              <Trans>Cancel</Trans>
            </Button>
          ) : (
            <Button
              onClick={handleSearch}
              disabled={!validation.isValid || !isInitialized}
              className="flex-1"
            >
              <Trans>Search</Trans>
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            <Switch
              id="gpu-toggle"
              checked={useGpu}
              onCheckedChange={setUseGpu}
              disabled={isLoading}
            />
            <Label htmlFor="gpu-toggle" className="text-xs">
              GPU
            </Label>
          </div>
        </div>

        {/* 進捗 */}
        {progress && <SearchProgress progress={progress} />}

        {/* エラー */}
        {error && <p className="text-xs text-destructive">{error.message}</p>}
      </FeaturePageLayout.Controls>

      <FeaturePageLayout.Results>
        <p className="text-xs text-muted-foreground">
          <Trans>Results</Trans>: {results.length.toLocaleString()}
        </p>
        <DataTable
          columns={columns}
          data={results}
          className="flex-1"
          emptyMessage={t`No results found. Please enter MT Seeds and start searching.`}
          getRowId={(_row, index) => String(index)}
        />
        <ResultDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          seedOrigin={selectedOrigin}
        />
      </FeaturePageLayout.Results>
    </FeaturePageLayout>
  );
}

export { DatetimeSearchPage };
