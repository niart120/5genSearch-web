/**
 * ID 調整ページコンポーネント
 *
 * 指定した TID / SID / 光らせたい PID の条件を満たす DS 起動日時を探索し、
 * 結果をテーブル表示する。
 *
 * GameStartConfig はサイドバーの値を使用せず、Feature-local state で独立管理する。
 * - start_mode: 固定 NewGame (TrainerInfoSearcher のドメイン制約)
 * - shiny_charm: 固定 NotObtained (NewGame 開始時点では未取得)
 * - save / memory_link: ユーザ選択 (Timer0/VCount 分布に影響)
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchControls } from '@/components/forms/search-controls';
import { DataTable } from '@/components/data-display/data-table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { TidAdjustForm } from './tid-adjust-form';
import { createTrainerInfoColumns } from './trainer-info-columns';
import { useTidAdjust } from '../hooks/use-tid-adjust';
import {
  validateTidAdjustForm,
  toTrainerInfoFilter,
  type TidAdjustValidationErrorCode,
} from '../types';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  GameStartConfig,
  SavePresence,
  MemoryLinkState,
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

function TidAdjustPage(): ReactElement {
  const { t } = useLingui();
  const dsConfig = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const isBw2 = useDsConfigStore(
    (s) => s.config.version === 'Black2' || s.config.version === 'White2'
  );

  // フォーム状態
  const [dateRange, setDateRange] = useState<DateRangeParams>(DEFAULT_DATE_RANGE);
  const [timeRange, setTimeRange] = useState<TimeRangeParams>(DEFAULT_TIME_RANGE);
  const [keySpec, setKeySpec] = useState<KeySpec>(DEFAULT_KEY_SPEC);
  const [tid, setTid] = useState('');
  const [sid, setSid] = useState('');
  const [shinyPidRaw, setShinyPidRaw] = useState('');

  // GameStartConfig: サイドバーの値は使用しない (Feature-local state)
  const [save, setSave] = useState<SavePresence>('NoSave');
  const [memoryLink, setMemoryLink] = useState<MemoryLinkState>('Disabled');

  const tidGameStart = useMemo<GameStartConfig>(
    () => ({
      start_mode: 'NewGame',
      shiny_charm: 'NotObtained',
      save,
      memory_link: save === 'WithSave' ? memoryLink : 'Disabled',
    }),
    [save, memoryLink]
  );

  // 検索フック (CPU 専用)
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useTidAdjust();

  // バリデーション
  const validation = useMemo(
    () => validateTidAdjustForm({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw }),
    [dateRange, timeRange, keySpec, tid, sid, shinyPidRaw]
  );

  const validationMessages = useMemo(
    (): Record<TidAdjustValidationErrorCode, string> => ({
      DATE_RANGE_INVALID: t`Start date must be on or before end date`,
      TIME_RANGE_INVALID: t`Time range is invalid`,
      TID_OUT_OF_RANGE: t`TID must be between 0 and 65535`,
      SID_OUT_OF_RANGE: t`SID must be between 0 and 65535`,
      SHINY_PID_INVALID: t`Shiny PID must be a hex value (0 to FFFFFFFF)`,
    }),
    [t]
  );

  // 列定義
  const columns = useMemo(() => createTrainerInfoColumns(), []);

  // 検索開始
  const handleSearch = useCallback(() => {
    const context: DatetimeSearchContext = {
      ds: dsConfig,
      date_range: dateRange,
      time_range: timeRange,
      ranges,
      key_spec: keySpec,
    };
    const filter = toTrainerInfoFilter({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw });
    startSearch(context, filter, tidGameStart);
  }, [
    dsConfig,
    dateRange,
    timeRange,
    ranges,
    keySpec,
    tid,
    sid,
    shinyPidRaw,
    tidGameStart,
    startSearch,
  ]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索コントロール (GPU 非対応 — useGpu/onGpuChange 省略) */}
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
            />
          </div>

          <SearchContextForm
            dateRange={dateRange}
            timeRange={timeRange}
            keySpec={keySpec}
            onDateRangeChange={setDateRange}
            onTimeRangeChange={setTimeRange}
            onKeySpecChange={setKeySpec}
            disabled={isLoading}
          />

          {/* セーブ状態 (サイドバーの値は使用しない) */}
          <div className="space-y-3">
            <Tabs
              value={save}
              onValueChange={(v) => {
                const next = v as SavePresence;
                setSave(next);
                if (next === 'NoSave') setMemoryLink('Disabled');
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="NoSave" disabled={isLoading} className="flex-1">
                  <Trans>No save</Trans>
                </TabsTrigger>
                <TabsTrigger value="WithSave" disabled={isLoading} className="flex-1">
                  <Trans>With save</Trans>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center justify-between">
              <Label htmlFor="tid-memory-link" className="text-xs">
                <Trans>Memory Link</Trans>
              </Label>
              <Switch
                id="tid-memory-link"
                checked={memoryLink === 'Enabled'}
                onCheckedChange={(checked) => setMemoryLink(checked ? 'Enabled' : 'Disabled')}
                disabled={isLoading || !isBw2 || save === 'NoSave'}
                aria-label={t`Memory Link`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <Trans>This setting is independent of the sidebar.</Trans>
            </p>
          </div>

          <TidAdjustForm
            tid={tid}
            sid={sid}
            shinyPidRaw={shinyPidRaw}
            onTidChange={setTid}
            onSidChange={setSid}
            onShinyPidChange={setShinyPidRaw}
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
          <p className="text-xs text-muted-foreground">
            <Trans>Results</Trans>: {results.length.toLocaleString()}
          </p>
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results`}
            getRowId={(_row, index) => String(index)}
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定 検索バー (GPU 非対応) */}
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
        />
      </div>
    </>
  );
}

export { TidAdjustPage };
