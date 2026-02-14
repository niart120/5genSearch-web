# ID調整 仕様書

## 1. 概要

### 1.1 目的

指定した TID / SID / 光らせたい PID の条件を満たす DS 起動日時 (SeedOrigin) を探索し、結果をテーブル表示する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| TID | トレーナー ID (Trainer ID)。0–65535 の整数 |
| SID | 裏 ID (Secret ID)。0–65535 の整数 |
| PID | ポケモンの個体識別子 (Personality ID)。32bit 整数 (0x00000000–0xFFFFFFFF) |
| ShinyType | 色違い種別。`None` / `Star` (星型) / `Square` (四角型) |
| GameStartConfig | ゲーム起動条件。`start_mode` / `save` / `memory_link` / `shiny_charm` の 4 項目 |
| DatetimeSearchContext | 日付範囲 / 時刻範囲 / Timer0VCount 範囲 / キー入力仕様を束ねた検索条件 |
| TrainerInfoFilter | 検索フィルタ。`tid` / `sid` / `shiny_pid` (全て optional) |

### 1.3 背景・問題

ポケモン BW/BW2 の乱数調整では、特定の TID/SID を得ることで色違いポケモンの出現を制御できる。目的の TID/SID を得るには、対応する DS 起動日時を逆引きする必要がある。

### 1.4 期待効果

- DS 起動日時・条件を指定して、目的の TID/SID を実現する起動タイミングを特定できる
- 任意の PID を光らせる TID/SID の組み合わせを検索できる

### 1.5 着手条件

| 条件 | 状態 |
|------|------|
| WASM API (`TrainerInfoSearcher`, `generate_trainer_info_search_tasks`) | 実装済み |
| Worker 層 (`runTrainerInfoSearch`) | 実装済み |
| タスク生成 (`createTrainerInfoSearchTasks`) | 実装済み |
| Worker メッセージ型 (`TrainerInfoSearchTask`, `TrainerInfoResultResponse`) | 定義済み |
| ナビゲーション (`'tid-adjust'` FeatureId) | 登録済み |
| GameStartConfig (Store + サイドバーフォーム) | 実装済み |
| `SearchContextForm` (共通フォーム部品) | 実装済み |
| `SearchControls` (検索ボタン + 進捗) | 実装済み |

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/tid-adjust/index.ts` | 新規 | 公開 API (re-export) |
| `src/features/tid-adjust/types.ts` | 新規 | フォーム状態型 + バリデーション + PID パーサー |
| `src/features/tid-adjust/hooks/use-tid-adjust.ts` | 新規 | 検索フック (タスク生成 → WorkerPool → 結果収集) |
| `src/features/tid-adjust/components/tid-adjust-page.tsx` | 新規 | ページコンポーネント (FeaturePageLayout) |
| `src/features/tid-adjust/components/tid-adjust-form.tsx` | 新規 | ID フィルタ入力フォーム (TID / SID / ShinyPID) |
| `src/features/tid-adjust/components/trainer-info-columns.tsx` | 新規 | DataTable 列定義 |
| `src/services/batch-utils.ts` | 修正 | `isTrainerInfoResult` 型ガード追加 |
| `src/components/layout/feature-content.tsx` | 修正 | `'tid-adjust'` → `TidAdjustPage` マッピング追加 |

## 3. 設計方針

### 3.1 レイヤー構成

既存 feature (`datetime-search`, `mtseed-search`, `egg-search`) と同一パターンを踏襲する。

```
UI (tid-adjust-page) → Hook (use-tid-adjust) → Service (search-tasks) → Worker → WASM
```

### 3.2 入出力

#### 入力

| 入力項目 | 型 | 提供元 | 説明 |
|----------|-----|--------|------|
| DS 設定 | `DsConfig` | `ds-config` Store (サイドバー) | MAC / Hardware / Version / Region |
| Timer0/VCount 範囲 | `Timer0VCountRange[]` | `ds-config` Store (サイドバー) | 個体差範囲 |
| GameStartConfig | `GameStartConfig` | Feature-local state (後述) | 起動条件。サイドバーの値は使用しない |
| 日付範囲 | `DateRangeParams` | フォーム (ローカル state) | 検索対象の日付範囲 |
| 時刻範囲 | `TimeRangeParams` | フォーム (ローカル state) | 検索対象の時刻範囲 |
| キー入力 | `KeySpec` | フォーム (ローカル state) | 検索対象のキー組み合わせ |
| TID | `number \| undefined` | フォーム (ローカル state) | 検索対象 TID (省略可) |
| SID | `number \| undefined` | フォーム (ローカル state) | 検索対象 SID (省略可) |
| Shiny PID | `Pid \| undefined` | フォーム (ローカル state) | 光らせたい PID (省略可、16 進数入力) |

#### GameStartConfig のドメイン制約

ID 調整は「ニューゲーム開始時の TID/SID 決定」を対象とするため、`GameStartConfig` の 4 フィールドに以下の制約がある:

| フィールド | 値 | 根拠 |
|---|---|---|
| `start_mode` | 固定 `NewGame` | `TrainerInfoSearcher` のドメイン制約 |
| `shiny_charm` | 固定 `NotObtained` | NewGame 開始時点では未取得 |
| `save` | ユーザ選択 (`NoSave` / `WithSave`) | セーブデータの有無で Timer0/VCount 分布が変わる |
| `memory_link` | ユーザ選択 (`Disabled` / `Enabled`) | BW2 かつ `WithSave` 時のみ有効。分布に影響する |

サイドバーの `GameStartConfig` は「つづきから」等の他用途向けの設定であり、ID 調整のドメイン制約と一致しない。状態の混同を避けるため、**サイドバーの `gameStart` は参照せず、Feature-local state で独立管理する**。

将来的に save/memory_link の UI 部品を他の Feature でも再利用する場合は、Presentational コンポーネントとして抽出し Controlled Props で接続する方針を検討する (dev-journal 2026-02-15 エントリ参照)。

#### 出力

`TrainerInfoSearchResult[]`:

| フィールド | 型 | 説明 |
|------------|-----|------|
| `trainer.tid` | `number` | 結果の TID |
| `trainer.sid` | `number` | 結果の SID |
| `seed_origin` | `SeedOrigin` | 起動日時・条件 (Startup variant のみ) |
| `shiny_type` | `ShinyType \| undefined` | 色違い種別 (shiny_pid 指定時のみ) |

### 3.3 WASM API 対応

| WASM API | 用途 |
|----------|------|
| `generate_trainer_info_search_tasks(context, filter, game_start, worker_count)` | タスク分割。`DatetimeSearchContext` + `TrainerInfoFilter` + `GameStartConfig` → `TrainerInfoSearchParams[]` |
| `TrainerInfoSearcher` class | Worker 内で検索実行。`next_batch(chunk_count)` → `TrainerInfoSearchBatch` |

### 3.4 既存 TS API 対応

| API | ファイル | 用途 |
|-----|----------|------|
| `createTrainerInfoSearchTasks()` | `services/search-tasks.ts` | タスク分割ラッパー (実装済み) |
| `useSearch()` / `useSearchConfig()` | `hooks/use-search.ts` | WorkerPool 実行フック (実装済み) |
| `useDsConfigReadonly()` | `hooks/use-ds-config.ts` | DS 設定取得 (実装済み) |
| `SearchContextForm` | `components/forms/search-context-form.tsx` | 日付・時刻・キー入力フォーム (実装済み) |
| `SearchControls` | `components/forms/search-controls.tsx` | 検索ボタン + 進捗バー (実装済み) |
| `DataTable` | `components/data-display/data-table.tsx` | 仮想スクロールテーブル (実装済み) |

### 3.5 GPU 対応

TrainerInfo 検索は CPU 専用。GPU バリアントは提供しない。`SearchControls` の `useGpu` / `onGpuChange` を省略して GPU トグルを非表示にする。

## 4. 実装仕様

### 4.1 `types.ts` — フォーム状態型 + バリデーション

```typescript
import type { DateRangeParams, TimeRangeParams, KeySpec, Pid } from '../../wasm/wasm_pkg.js';

/** PID パース用正規表現 */
const HEX_PREFIX_RE = /^0[xX]/;
const HEX_DIGITS_RE = /^[\da-fA-F]+$/;

/** バリデーションエラーコード */
export type TidAdjustValidationErrorCode =
  | 'DATE_RANGE_INVALID'
  | 'TIME_RANGE_INVALID'
  | 'TID_OUT_OF_RANGE'
  | 'SID_OUT_OF_RANGE'
  | 'SHINY_PID_INVALID';

/** ID 調整フォーム状態 */
export interface TidAdjustFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  tid: string;        // 検索フィルタ TID (空文字 = 未指定)
  sid: string;        // 検索フィルタ SID (空文字 = 未指定)
  shinyPidRaw: string; // 検索フィルタ Shiny PID (16 進数テキスト、空文字 = 未指定)
}

/** バリデーション結果 */
export interface TidAdjustValidationResult {
  errors: TidAdjustValidationErrorCode[];
  isValid: boolean;
}

/** PID パース結果 */
export interface ParsedPid {
  pid: Pid | undefined;
  isValid: boolean;
}
```

バリデーションルール:

| コード | 条件 |
|--------|------|
| `DATE_RANGE_INVALID` | `start > end` (日付の先後) |
| `TIME_RANGE_INVALID` | 時刻フィールドが範囲外 (時 0–23, 分秒 0–59) |
| `TID_OUT_OF_RANGE` | TID が 0–65535 の範囲外 |
| `SID_OUT_OF_RANGE` | SID が 0–65535 の範囲外 |
| `SHINY_PID_INVALID` | 16 進数として解釈不能、または 0x00000000–0xFFFFFFFF の範囲外 |

全フィルタ未指定での検索は許容する。検索範囲が狭い場合は有用性がある。結果件数が膨大になるリスクへの対策は本機能のスコープ外とし、検索系機能共通の課題として別途検討する (dev-journal 2026-02-14 エントリ参照)。

### 4.2 `use-tid-adjust.ts` — 検索フック

```typescript
import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createTrainerInfoSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isTrainerInfoResult } from '@/services/batch-utils';
import type {
  DatetimeSearchContext,
  TrainerInfoFilter,
  GameStartConfig,
  TrainerInfoSearchResult,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';

interface UseTidAdjustReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: TrainerInfoSearchResult[];
  error: Error | undefined;
  startSearch: (
    context: DatetimeSearchContext,
    filter: TrainerInfoFilter,
    gameStart: GameStartConfig,
  ) => void;
  cancel: () => void;
}

export function useTidAdjust(): UseTidAdjustReturn {
  const config = useSearchConfig(false); // CPU 専用
  const search = useSearch(config);

  const startSearch = useCallback(
    (
      context: DatetimeSearchContext,
      filter: TrainerInfoFilter,
      gameStart: GameStartConfig,
    ) => {
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      const tasks = createTrainerInfoSearchTasks(context, filter, gameStart, workerCount);
      search.start(tasks);
    },
    [config.workerCount, search],
  );

  const results = useMemo(
    () => flattenBatchResults<TrainerInfoSearchResult>(search.results, isTrainerInfoResult),
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

### 4.3 `tid-adjust-form.tsx` — ID フィルタ入力フォーム

機能固有の入力フォーム。TID / SID / Shiny PID の 3 項目を提供する。

```typescript
interface TidAdjustFormProps {
  tid: string;
  sid: string;
  shinyPidRaw: string;
  onTidChange: (tid: string) => void;
  onSidChange: (sid: string) => void;
  onShinyPidChange: (pid: string) => void;
  disabled?: boolean;
}
```

| 入力項目 | UI 部品 | 備考 |
|----------|---------|------|
| TID | `Input` (type="number", min=0, max=65535) | 空欄許可(未指定) |
| SID | `Input` (type="number", min=0, max=65535) | 空欄許可(未指定) |
| Shiny PID | `Input` (type="text", placeholder="0xABCD1234") | 16 進数入力。空欄許可(未指定) |

TID / SID はサイドバーの Trainer Store とは独立したローカル state。サイドバーの TID/SID は「現在のトレーナー ID」、フォームの TID/SID は「検索対象フィルタ」で用途が異なる。

### 4.4 `tid-adjust-page.tsx` — ページコンポーネント

`FeaturePageLayout` (Controls / Results 2 ペイン) を使用。構成は `datetime-search-page.tsx` / `mtseed-search-page.tsx` と同一パターン。

Controls 内の配置順:

1. `SearchControls` (PC 版、`hidden lg:flex`)
2. `SearchContextForm` (日付・時刻・キー入力)
3. セーブ状態コントロール (`save` / `memory_link` トグル、Feature-local state)
4. `TidAdjustForm` (TID / SID / Shiny PID)
5. バリデーションエラー表示

**注意**: サイドバーの `GameStartConfig` (save / memory_link / start_mode / shiny_charm) はこの Feature では使用しない。セーブ関連の状態は Feature パネル内のローカル state で独立管理する。

Results 内:

1. 結果件数表示
2. `DataTable<TrainerInfoSearchResult>` (仮想スクロール)

フッター (モバイル):

1. `SearchControls` (モバイル版、`fixed bottom-14 lg:hidden`)

GPU 非対応のため `SearchControls` に `useGpu` / `onGpuChange` を渡さない。

### 4.5 `trainer-info-columns.tsx` — テーブル列定義

| 列名 | ソース | フォーマット |
|------|--------|------------|
| Date | `seed_origin.Startup.datetime` | `YYYY/MM/DD` |
| Time | `seed_origin.Startup.datetime` | `HH:MM:SS` |
| Timer0 | `seed_origin.Startup.condition.timer0` | 16 進数大文字 4 桁 |
| VCount | `seed_origin.Startup.condition.vcount` | 16 進数大文字 2 桁 |
| TID | `trainer.tid` | 10 進数 |
| SID | `trainer.sid` | 10 進数 |
| Shiny | `shiny_type` | `Star` / `Square` / 空欄 (None or undefined) |

`shiny_type` 列は `shiny_pid` が指定された場合のみ実用的な値を持つ。未指定時でも列は表示し、空欄とする。

### 4.6 `batch-utils.ts` — 型ガード追加

```typescript
export function isTrainerInfoResult(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'trainer' in value &&
    'seed_origin' in value
  );
}
```

### 4.7 `feature-content.tsx` — ページマッピング追加

```typescript
import { TidAdjustPage } from '@/features/tid-adjust';

// renderFeature switch に追加
case 'tid-adjust': return <TidAdjustPage />;
```

### 4.8 状態管理

| 状態 | 管理場所 | 永続化 |
|------|----------|--------|
| DS 設定 (DsConfig, ranges) | `ds-config` Store | あり |
| GameStartConfig (save, memory_link) | `tid-adjust-page.tsx` ローカル state | なし |
| 日付範囲 / 時刻範囲 / キー入力 | `tid-adjust-page.tsx` ローカル state | なし |
| TID / SID / Shiny PID (検索フィルタ) | `tid-adjust-page.tsx` ローカル state | なし |
| 検索進捗 / Worker 状態 | `use-search.ts` 内部 state | なし |
| 検索結果 | `use-search.ts` 内部 state | なし |

新規 Store の追加は不要。サイドバーの `gameStart` は参照しない (`start_mode` / `shiny_charm` は固定値、`save` / `memory_link` は Feature-local)。

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 対象 | 検証内容 |
|--------|------|----------|
| PID パーサー | `parseShinyPid()` | 正常値 (`"0xABCD1234"`, `"abcd1234"`) → `Pid`、異常値 (`""`, `"xyz"`, `"1FFFFFFFF"`) → `undefined` |
| バリデーション | `validateTidAdjustForm()` | TID 範囲外 → `TID_OUT_OF_RANGE`、全フィルタ空 → `isValid: true`、正常入力 → `isValid: true` |
| 型ガード | `isTrainerInfoResult()` | `{ trainer: ..., seed_origin: ... }` → `true`、`{ seed: 0, ivs: ... }` → `false` |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 対象 | 検証内容 |
|--------|------|----------|
| Worker/WASM 連携 | `createTrainerInfoSearchTasks()` → WorkerPool 実行 | 既知の DS 設定 + TID フィルタで検索し、結果が `TrainerInfoSearchResult[]` 型であること。結果件数が 0 以上であること |

## 6. 実装チェックリスト

- [x] `src/features/tid-adjust/types.ts` — フォーム状態型 + `parseShinyPid` + `validateTidAdjustForm`
- [x] `src/features/tid-adjust/hooks/use-tid-adjust.ts` — 検索フック
- [x] `src/features/tid-adjust/components/tid-adjust-form.tsx` — ID フィルタフォーム
- [x] `src/features/tid-adjust/components/trainer-info-columns.tsx` — テーブル列定義
- [x] `src/features/tid-adjust/components/tid-adjust-page.tsx` — ページコンポーネント
- [x] `src/features/tid-adjust/index.ts` — re-export
- [x] `src/services/batch-utils.ts` — `isTrainerInfoResult` 型ガード追加
- [x] `src/components/layout/feature-content.tsx` — ページマッピング追加
- [x] `src/test/unit/tid-adjust-types.test.ts` — PID パーサー + バリデーション テスト
- [x] `src/test/unit/batch-utils.test.ts` — `isTrainerInfoResult` テスト (新規ファイル)
- [x] `src/test/integration/tid-adjust-search.test.ts` — Worker/WASM 統合テスト
- [x] 翻訳リソース更新 (`pnpm lingui:extract`)
