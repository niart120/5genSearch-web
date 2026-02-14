# MT Seed 検索 仕様書

## 1. 概要

### 1.1 目的

MT Seed 検索機能 (`mtseed-search`) を実装する。ユーザーが指定した IV フィルタ条件を満たす MT Seed を $2^{32}$ の全 Seed 空間から探索し、結果を DataTable で表示する。見つかった Seed を起動時刻検索 (`datetime-search`) に引き渡す連携フローも提供する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MT Seed | MT19937 乱数生成器の初期化 Seed (32bit 整数, 0〜$2^{32}-1$) |
| MT19937 | Mersenne Twister 乱数生成器。ポケモン第 5 世代で個体値生成に使用される |
| MT オフセット | MT19937 初期化後、IV 生成開始までに消費される乱数の回数。デフォルトは BW: 0, BW2: 2 |
| IV | 個体値 (Individual Values)。HP/Atk/Def/SpA/SpD/Spe の 6 ステータス、各 0-31 |
| 徘徊ポケモン | IV 生成順が通常 (HABDSC) と異なる (HABCDS) 特殊モード |
| めざパ | めざめるパワー。IV から算出されるタイプ・威力を持つ技 |
| `MtseedSearcher` | WASM 側の CPU 版 MT Seed 全探索クラス |
| `GpuMtseedSearchIterator` | WASM 側の GPU 版 MT Seed 全探索イテレータ |
| `IvFilter` | IV 範囲条件 + めざパ条件を表すフィルタ型 |

### 1.3 背景・問題

ポケモン BW/BW2 の乱数調整では、目的の個体値を持つポケモンを得るために、まず条件を満たす MT Seed を特定し、次にその Seed が生成される DS の起動日時を逆引きするという 2 段階の手順を踏む。

本アプリでは起動時刻検索 (`datetime-search`) は実装済みだが、前段の MT Seed 検索が未実装のため、ユーザーは外部ツールで Seed を特定する必要がある。本機能の実装により、Seed 特定から起動時刻逆引きまでの一連のワークフローがアプリ内で完結する。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| ワークフロー完結 | MT Seed 特定 → 起動時刻検索の一連の操作がアプリ内で完結する |
| GPU 活用 | WebGPU 利用可能環境では全探索時間を大幅に短縮できる (CPU: ~700 秒 → GPU: ~40 秒以下) |
| 連携フロー | 検索結果から起動時刻検索への Seed 引き渡しを UI で提供する |

### 1.5 着手条件

- `MtseedSearcher` (CPU) および `GpuMtseedSearchIterator` (GPU) が WASM 側に実装済みであること → 完了
- Worker 基盤 (`WorkerPool`, `search.worker.ts`, `gpu.worker.ts`) が動作すること → 完了
- 共通コンポーネント (`IvRangeInput`, `HiddenPowerSelect`, `SearchControls`, `DataTable`, `FeaturePageLayout`) が実装済みであること → 完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/mtseed-search/index.ts` | 新規 | 公開 API (re-export) |
| `src/features/mtseed-search/types.ts` | 新規 | フォーム状態型、バリデーション |
| `src/features/mtseed-search/hooks/use-mtseed-search.ts` | 新規 | 検索フック (useSearch ラッパー) |
| `src/features/mtseed-search/components/mtseed-search-page.tsx` | 新規 | ページコンポーネント |
| `src/features/mtseed-search/components/mtseed-search-form.tsx` | 新規 | IV フィルタ入力フォーム |
| `src/features/mtseed-search/components/mtseed-result-columns.tsx` | 新規 | DataTable 列定義 |
| `src/components/layout/feature-content.tsx` | 修正 | `mtseed-search` case 追加 (PlaceholderPage → MtseedSearchPage) |
| `src/services/batch-utils.ts` | 修正 | `isMtseedResult` 型ガード追加 |
| `src/stores/search/results.ts` | 修正 | `pendingTargetSeeds` 状態追加 (Seed 連携用) |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 修正 | `pendingTargetSeeds` 受信ロジック追加 |
| `src/test/components/layout/feature-content.test.tsx` | 修正 | PlaceholderPage → MtseedSearchPage のテスト更新 |

### 変更不要のファイル (既存インフラ再利用)

| ファイル | 理由 |
|----------|------|
| `src/workers/types.ts` | `MtseedSearchTask`, `GpuMtseedIvSearchTask` 定義済み |
| `src/workers/search.worker.ts` | `mtseed` kind のハンドリング実装済み |
| `src/workers/gpu.worker.ts` | `gpu-mtseed-iv` kind のハンドリング実装済み |
| `src/services/search-tasks.ts` | `createMtseedIvSearchTasks` 実装済み |
| `src/lib/navigation.ts` | `mtseed-search` の FeatureId・Category 定義済み |
| `src/stores/search/results.ts` | 汎用結果 Store — `pendingTargetSeeds` を追加するため対象ファイルに移動 |

## 3. 設計方針

### 3.1 機能概要

- 探索範囲: 0〜$2^{32}-1$ (全 Seed 空間、固定)
- 入力: IV フィルタ (`IvFilter`) + MT オフセット + 徘徊フラグ
- 出力: `MtseedResult[]` (Seed + IV)
- CPU/GPU 切り替え: `SearchControls` の GPU トグルで選択
- 連携: 結果から起動時刻検索へ Seed を引き渡す遷移ボタン

### 3.2 レイヤー構成

```
┌─────────────────────────────────────────────────────────────┐
│ MtseedSearchPage                                             │
│  ├── MtseedSearchForm (IV フィルタ + オフセット + 徘徊)       │
│  ├── SearchControls (検索/キャンセルボタン + GPU トグル)       │
│  └── DataTable (MtseedResult 表示 + 連携ボタン)              │
├─────────────────────────────────────────────────────────────┤
│ useMtseedSearch (feature hook)                               │
│  └── useSearch (shared hook) → WorkerPool                    │
├─────────────────────────────────────────────────────────────┤
│ createMtseedIvSearchTasks (service, 既存)                     │
│  └── generate_mtseed_iv_search_tasks (WASM)                   │
├─────────────────────────────────────────────────────────────┤
│ search.worker.ts: MtseedSearcher (CPU, 既存)                  │
│ gpu.worker.ts: GpuMtseedSearchIterator (GPU, 既存)            │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 データフロー

```
UI (MtseedSearchContext)
  │
  ▼  useMtseedSearch.startSearch()
generate_mtseed_iv_search_tasks(context, workerCount)
  │  全 Seed 空間を workerCount 個に分割
  ▼
MtseedSearchParams[]
  │
  ▼  WorkerPool が各 Worker に配布
CPU: MtseedSearcher.next_batch()  /  GPU: GpuMtseedSearchIterator.next()
  │
  ▼  MtseedResult[] を Main に返送
useMtseedSearch.results (フラット化)
  │
  ▼  DataTable で表示
ユーザーが Seed を選択 → 起動時刻検索へ遷移
```

### 3.4 状態管理

| 状態 | 管理方式 | 永続化 | 理由 |
|------|----------|--------|------|
| IV フィルタ値 | ローカル state (`useState`) | 不要 | フォーム入力中の一時値 |
| MT オフセット | ローカル state (`useState`) | 不要 | デフォルトは `useDsConfigReadonly()` の `config.version` から導出 (BW: 0, BW2: 2) |
| 徘徊フラグ | ローカル state (`useState`) | 不要 | boolean トグル |
| GPU 使用フラグ | ローカル state (`useState`) | 不要 | セッション内の選択 |
| 検索進捗 | `useSearch` 内 state | 不要 | `useSearch` が管理 |
| 検索結果 | `useSearch` 内 state | 不要 | `useSearch` が管理 |

フォーム状態はすべてページコンポーネントのローカル state で完結する。

ただし、結果の Seed を起動時刻検索へ引き渡す連携のため、`stores/search/results.ts` に `pendingTargetSeeds: MtSeed[]` を追加する (詳細は §3.5)。

### 3.5 結果連携フロー

検索結果テーブルに「起動時刻検索へ」ボタンを配置する。Store 経由で Seed を引き渡す。

#### 送信側 (mtseed-search)

1. ボタン押下時、結果の `MtseedResult[]` から Seed 一覧を抽出
2. `useSearchResultStore.getState().setPendingTargetSeeds(seeds)` で Store に書き込み
3. `useUiStore.getState().setActiveFeature('datetime-search')` でタブ遷移

#### 受信側 (datetime-search)

`datetime-search-page.tsx` の `useEffect` で `pendingTargetSeeds` を監視する。

```typescript
const pendingSeeds = useSearchResultStore((s) => s.pendingTargetSeeds);
const clearPendingSeeds = useSearchResultStore((s) => s.clearPendingTargetSeeds);

useEffect(() => {
  if (pendingSeeds.length > 0) {
    const text = pendingSeeds.map((s) => toHex(s, 8)).join('\n');
    setTargetSeedsRaw(text);
    clearPendingSeeds();
  }
}, [pendingSeeds, clearPendingSeeds]);
```

#### Store 拡張 (`stores/search/results.ts`)

```typescript
// 既存の SearchResultStore に追加
pendingTargetSeeds: MtSeed[];
setPendingTargetSeeds: (seeds: MtSeed[]) => void;
clearPendingTargetSeeds: () => void;
```

初期値 `pendingTargetSeeds: []`。`setPendingTargetSeeds` は `set({ pendingTargetSeeds: seeds })`、`clearPendingTargetSeeds` は `set({ pendingTargetSeeds: [] })` で実装する。永続化不要。

## 4. 実装仕様

### 4.1 型定義 (`types.ts`)

```typescript
import type { IvFilter, MtseedSearchContext } from '@/wasm/wasm_pkg.js';

/** MT Seed 検索フォーム状態 */
export interface MtseedIvSearchFormState {
  ivFilter: IvFilter;
  mtOffset: number;
  isRoamer: boolean;
}

/** バリデーションエラーコード */
export type MtseedIvValidationErrorCode =
  | 'IV_RANGE_INVALID'
  | 'MT_OFFSET_NEGATIVE';

/** バリデーション結果 */
export interface MtseedIvValidationResult {
  errors: MtseedIvValidationErrorCode[];
  isValid: boolean;
}

/** フォーム状態 → WASM コンテキスト変換 */
export function toMtseedSearchContext(form: MtseedIvSearchFormState): MtseedSearchContext {
  return {
    iv_filter: form.ivFilter,
    mt_offset: form.mtOffset,
    is_roamer: form.isRoamer,
  };
}

/**
 * IV 範囲の妥当性チェック (各ステータスの min ≤ max)
 */
function isIvFilterValid(filter: IvFilter): boolean {
  const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
  return stats.every((s) => filter[s][0] <= filter[s][1]);
}

/**
 * MT Seed IV 検索フォームのバリデーション
 */
export function validateMtseedIvSearchForm(
  form: MtseedIvSearchFormState,
): MtseedIvValidationResult {
  const errors: MtseedIvValidationErrorCode[] = [];

  if (!isIvFilterValid(form.ivFilter)) {
    errors.push('IV_RANGE_INVALID');
  }

  if (form.mtOffset < 0) {
    errors.push('MT_OFFSET_NEGATIVE');
  }

  return { errors, isValid: errors.length === 0 };
}
```

### 4.2 検索フック (`hooks/use-mtseed-search.ts`)

```typescript
import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createMtseedIvSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isMtseedResult } from '@/services/batch-utils';
import type { MtseedSearchContext, MtseedResult } from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { GpuMtseedIvSearchTask } from '@/workers/types';

interface UseMtseedSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: MtseedResult[];
  error: Error | undefined;
  startSearch: (context: MtseedSearchContext) => void;
  cancel: () => void;
}

/**
 * MT Seed IV 全探索を実行するカスタムフック
 *
 * @param useGpu GPU Worker を使用するか
 */
export function useMtseedSearch(useGpu: boolean): UseMtseedSearchReturn {
  const config = useSearchConfig(useGpu);
  const search = useSearch(config);

  const startSearch = useCallback(
    (context: MtseedSearchContext) => {
      if (useGpu) {
        const gpuTask: GpuMtseedIvSearchTask = {
          kind: 'gpu-mtseed-iv',
          context,
        };
        search.start([gpuTask]);
      } else {
        const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
        const tasks = createMtseedIvSearchTasks(context, workerCount);
        search.start(tasks);
      }
    },
    [useGpu, config.workerCount, search],
  );

  const results = useMemo(
    () => flattenBatchResults(search.results, isMtseedResult),
    [search.results],
  );

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    results,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
```

### 4.3 フォームコンポーネント (`components/mtseed-search-form.tsx`)

```tsx
import { type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { HiddenPowerSelect } from '@/components/forms/hidden-power-select';
import type { IvFilter, HiddenPowerType } from '@/wasm/wasm_pkg.js';

interface MtseedSearchFormProps {
  ivFilter: IvFilter;
  mtOffset: number;
  isRoamer: boolean;
  onIvFilterChange: (filter: IvFilter) => void;
  onMtOffsetChange: (offset: number) => void;
  onRoamerChange: (isRoamer: boolean) => void;
  disabled?: boolean;
}

function MtseedSearchForm(props: MtseedSearchFormProps): ReactElement {
  const { t } = useLingui();

  const handleIvRangeChange = (value: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>) => {
    props.onIvFilterChange({
      ...props.ivFilter,
      ...value,
    });
  };

  const handleHiddenPowerTypesChange = (types: HiddenPowerType[]) => {
    props.onIvFilterChange({
      ...props.ivFilter,
      hidden_power_types: types.length > 0 ? types : undefined,
    });
  };

  const handleMinPowerChange = (minPower: number | undefined) => {
    props.onIvFilterChange({
      ...props.ivFilter,
      hidden_power_min_power: minPower,
    });
  };

  return (
    <div className="space-y-4">
      {/* MT オフセット + 徘徊ポケモン */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mt-offset">
            <Trans>MT Advances</Trans>
          </Label>
          <Input
            id="mt-offset"
            type="number"
            min={0}
            value={props.mtOffset}
            onChange={(e) => props.onMtOffsetChange(Math.max(0, Number(e.target.value) || 0))}
            disabled={props.disabled}
            className="w-20"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch
            id="roamer"
            checked={props.isRoamer}
            onCheckedChange={props.onRoamerChange}
            disabled={props.disabled}
          />
          <Label htmlFor="roamer">
            <Trans>Roamer</Trans>
          </Label>
        </div>
      </div>

      {/* IV 範囲入力 */}
      <div className="space-y-1.5">
        <Label>
          <Trans>IV Range</Trans>
        </Label>
        <IvRangeInput
          value={props.ivFilter}
          onChange={handleIvRangeChange}
          disabled={props.disabled}
        />
      </div>

      {/* めざパ条件 */}
      <div className="space-y-1.5">
        <Label>
          <Trans>Hidden Power</Trans>
        </Label>
        <HiddenPowerSelect
          value={props.ivFilter.hidden_power_types ?? []}
          onChange={handleHiddenPowerTypesChange}
          minPower={props.ivFilter.hidden_power_min_power}
          onMinPowerChange={handleMinPowerChange}
          disabled={props.disabled}
        />
      </div>
    </div>
  );
}

export { MtseedSearchForm };
```

### 4.4 列定義 (`components/mtseed-result-columns.tsx`)

```tsx
import { type ColumnDef } from '@tanstack/react-table';
import { Trans } from '@lingui/react/macro';
import { toHex } from '@/lib/format';
import type { MtseedResult } from '@/wasm/wasm_pkg.js';

export function createMtseedResultColumns(): ColumnDef<MtseedResult>[] {
  return [
    {
      accessorFn: (row) => toHex(row.seed, 8),
      id: 'seed',
      header: () => <Trans>MT Seed</Trans>,
      cell: ({ getValue }) => (
        <span className="font-mono">{getValue<string>()}</span>
      ),
    },
    {
      accessorFn: (row) => row.ivs.hp,
      id: 'hp',
      header: () => <Trans>HP</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.atk,
      id: 'atk',
      header: () => <Trans>Atk</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.def,
      id: 'def',
      header: () => <Trans>Def</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.spa,
      id: 'spa',
      header: () => <Trans>SpA</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.spd,
      id: 'spd',
      header: () => <Trans>SpD</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorFn: (row) => row.ivs.spe,
      id: 'spe',
      header: () => <Trans>Spe</Trans>,
      cell: ({ getValue }) => getValue<number>(),
    },
  ];
}
```

### 4.5 ページコンポーネント (`components/mtseed-search-page.tsx`)

```tsx
import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { DataTable } from '@/components/data-display/data-table';
import { Button } from '@/components/ui/button';
import { MtseedSearchForm } from './mtseed-search-form';
import { createMtseedResultColumns } from './mtseed-result-columns';
import { useMtseedSearch } from '../hooks/use-mtseed-search';
import {
  validateMtseedIvSearchForm,
  toMtseedSearchContext,
  type MtseedIvSearchFormState,
  type MtseedIvValidationErrorCode,
} from '../types';
import type { IvFilter, MtseedResult, RomVersion } from '@/wasm/wasm_pkg.js';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useSearchResultStore } from '@/stores/search/results';
import { useUiStore } from '@/stores/settings/ui';

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
  const formState: MtseedIvSearchFormState = { ivFilter, mtOffset, isRoamer };
  const validation = useMemo(
    () => validateMtseedIvSearchForm(formState),
    [ivFilter, mtOffset, isRoamer],
  );

  const validationMessages = useMemo(
    (): Record<MtseedIvValidationErrorCode, string> => ({
      IV_RANGE_INVALID: t`Min IV must be less than or equal to max IV`,
      MT_OFFSET_NEGATIVE: t`MT Advances must be 0 or greater`,
    }),
    [t],
  );

  // 列定義
  const columns = useMemo(() => createMtseedResultColumns(), []);

  // 検索開始
  const handleSearch = useCallback(() => {
    const context = toMtseedSearchContext(formState);
    startSearch(context);
  }, [formState, startSearch]);

  // 起動時刻検索への連携
  const handleNavigateToDatetimeSearch = useCallback(() => {
    const seeds = results.map((r) => r.seed);
    useSearchResultStore.getState().setPendingTargetSeeds(seeds);
    useUiStore.getState().setActiveFeature('datetime-search');
  }, [results]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索コントロール */}
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
          {!validation.isValid && (
            <div className="space-y-1 text-sm text-destructive" role="alert">
              {validation.errors.map((code) => (
                <p key={code}>{validationMessages[code]}</p>
              ))}
            </div>
          )}
        </FeaturePageLayout.Controls>

        <FeaturePageLayout.Results>
          {/* 連携ボタン */}
          {results.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <Trans>{results.length} seeds found</Trans>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToDatetimeSearch}
              >
                <Trans>Search Boot Timing</Trans>
              </Button>
            </div>
          )}

          <DataTable
            columns={columns}
            data={results}
            emptyMessage={t`No results`}
            enableVirtualScroll
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定 検索バー */}
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
    </>
  );
}

export { MtseedSearchPage };
```

### 4.6 feature-content.tsx への統合

```tsx
// 変更前
import { PlaceholderPage } from './placeholder-page';

// 変更後: import 追加
import { MtseedSearchPage } from '@/features/mtseed-search';

// renderFeature() に case 追加
case 'mtseed-search': {
  return <MtseedSearchPage />;
}
```

### 4.7 batch-utils.ts 拡張

`src/services/batch-utils.ts` に `isMtseedResult` 型ガードを追加する。既存の `isGeneratedPokemonData` / `isGeneratedEggData` と同じパターンに従う。

```typescript
import type { MtseedResult } from '@/wasm/wasm_pkg.js';

export function isMtseedResult(value: unknown): value is MtseedResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seed' in value &&
    'ivs' in value
  );
}
```

### 4.8 datetime-search 受信側 (`datetime-search-page.tsx` 修正)

既存の `datetime-search-page.tsx` に以下を追加する。

```typescript
import { useSearchResultStore } from '@/stores/search/results';
import { toHex } from '@/lib/format';

// コンポーネント内
const pendingSeeds = useSearchResultStore((s) => s.pendingTargetSeeds);
const clearPendingSeeds = useSearchResultStore((s) => s.clearPendingTargetSeeds);

useEffect(() => {
  if (pendingSeeds.length > 0) {
    const text = pendingSeeds.map((s) => toHex(s, 8)).join('\n');
    setTargetSeedsRaw(text);
    clearPendingSeeds();
  }
}, [pendingSeeds, clearPendingSeeds]);
```

`targetSeedsRaw` は既存の `useState('')` で管理されている。`pendingSeeds` が空でないとき、hex 文字列に変換してフォームに反映し、Store をクリアする。ユーザーは手動で上書き可能。

### 4.9 公開 API (`index.ts`)

```typescript
export { MtseedSearchPage } from './components/mtseed-search-page';
export { useMtseedSearch } from './hooks/use-mtseed-search';
export type {
  MtseedIvSearchFormState,
  MtseedIvValidationResult,
  MtseedIvValidationErrorCode,
} from './types';
export { validateMtseedIvSearchForm, toMtseedSearchContext } from './types';
```

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 | ファイル |
|--------|----------|----------|
| `validateMtseedIvSearchForm` — 有効な入力 | 全フィールドが範囲内のとき `isValid: true` | `mtseed-search-types.test.ts` |
| `validateMtseedIvSearchForm` — IV 範囲不正 | min > max のとき `IV_RANGE_INVALID` | 同上 |
| `validateMtseedIvSearchForm` — MT オフセット負値 | 負値のとき `MT_OFFSET_NEGATIVE` | 同上 |
| `toMtseedSearchContext` — 変換 | フォーム状態が WASM 型に正しく変換されること | 同上 |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 | ファイル |
|--------|----------|----------|
| CPU MT Seed 検索 E2E | `useMtseedSearch(false)` → Worker → WASM → 結果取得 | `mtseed-search.test.ts` |

既知の Seed (例: Seed=0x00000000, offset=0, isRoamer=false の IV) を入力として、正しい結果が返ることを検証する。GPU テストは `describe.skipIf(!navigator.gpu)` でスキップ。

### 5.3 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 | ファイル |
|--------|----------|----------|
| `feature-content.test.tsx` 更新 | `mtseed-search` で MtseedSearchPage が描画されること | 既存ファイル修正 |

## 6. 実装チェックリスト

- [x] `src/features/mtseed-search/types.ts` — 型定義・バリデーション・変換関数
- [x] `src/features/mtseed-search/hooks/use-mtseed-search.ts` — 検索フック
- [x] `src/features/mtseed-search/components/mtseed-search-form.tsx` — IV フィルタフォーム
- [x] `src/features/mtseed-search/components/mtseed-result-columns.tsx` — DataTable 列定義
- [x] `src/features/mtseed-search/components/mtseed-search-page.tsx` — ページコンポーネント
- [x] `src/features/mtseed-search/index.ts` — 公開 API
- [x] `src/components/layout/feature-content.tsx` — `mtseed-search` case 追加
- [x] `src/services/batch-utils.ts` — `isMtseedResult` 型ガード追加
- [x] `src/stores/search/results.ts` — `pendingTargetSeeds` / `setPendingTargetSeeds` / `clearPendingTargetSeeds` 追加
- [x] `src/features/datetime-search/components/datetime-search-page.tsx` — `pendingTargetSeeds` 受信ロジック追加
- [x] `src/test/unit/mtseed-search-types.test.ts` — バリデーション・変換テスト
- [ ] `src/test/integration/mtseed-search.test.ts` — CPU Worker 統合テスト (WASM ビルド環境依存のため後続対応)
- [x] `src/test/components/layout/feature-content.test.tsx` — コンポーネントテスト更新
- [x] 翻訳カタログ更新 (`pnpm lingui:extract`)
