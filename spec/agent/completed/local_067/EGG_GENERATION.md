# 個体生成(タマゴ) 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索で得た `SeedOrigin[]` (または手動指定した Seed) をもとに、各 Seed + advance に対応するタマゴ個体を一括生成し、一覧表示する。

ナビゲーション上は `generation` カテゴリの `egg-list` 機能に対応する (`src/lib/navigation.ts` の `FeatureId: 'egg-list'`)。ディレクトリ名 `egg-list` は FeatureId と一致する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SeedOrigin | `Seed` (LcgSeed + MtSeed) または `Startup` (Datetime + StartupCondition) を含む生成元情報 |
| SeedSpec | `Seeds` (直接指定) または `Startup` (DS 設定 + 日時 + Timer0/VCount) から SeedOrigin を導出する仕様 |
| GeneratedEggData | WASM が生成する中間データ。advance, PID, IV, 性格, 色違い等を含む |
| UiEggData | WASM の `resolve_egg_data_batch` が返す表示用データ。性格名等は文字列解決済み |
| EggGenerationParams | 孵化生成パラメータ (親個体値、特性、かわらずのいし、性別比、種族ID等) |
| EggFilter | IV, 性格, 色違い, 性別, 特性, 猶予フレームでのフィルタ条件 (WASM 側) |
| StatsFilter | 実ステータス固定値フィルタ (クライアントサイド post-filter) |

### 1.3 背景・問題

- 起動時刻検索の結果 (SeedOrigin[]) は Seed 情報のみであり、そこから実際にどのようなタマゴが生成されるかを確認するには追加のステップが必要
- ユーザーは Seed + 親個体値 + advance 範囲を指定して、目的の個体を特定する
- 参考実装 (niart120/pokemon-gen5-initseed) および既存の個体生成(ポケモン) (local_064) では Worker ベースのバッチ生成を採用しており、大量 advance 時のメインスレッド blocking を回避している

### 1.4 期待効果

| 指標 | 値 |
|------|-----|
| 典型的な生成時間 | < 200ms (SeedOrigin 数十件 × max_advance 100) |
| 大量生成時 | Worker 実行により UI blocking なし |
| 対応種族 | 全649種 (種族ID指定による任意ポケモン孵化対応) |

### 1.5 着手条件

- Phase 3 の `datetime-search` が完了していること (SeedOrigin 供給元)
- 孵化検索 (egg-search) が実装されていること (既存のEggParamsForm等を再利用)
- 個体生成(ポケモン) (local_064) が実装されていること (SeedInputSection等を再利用)
- トレーナー情報設定 UI (TID/SID) がサイドバーに実装されていること
- WASM: `generate_egg_list(origins, params, config, filter)` が wasm-bindgen で export されていること

---

## 2. 対象ファイル

### 2.1 事前共通化 (本機能の前提として実施)

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/data-display/detail-row.tsx` | 新規 | `DetailRow` コンポーネントを共通化 (pokemon-list, egg-search から抽出) |
| `src/services/seed-resolve.ts` | 新規 | `resolveSeedOrigins` を共通ユーティリティとして抽出 |
| `src/components/forms/seed-input-section.tsx` | 移動 | `src/features/pokemon-list/components/` から移動。import を `seed-resolve.ts` に変更 |
| `src/components/forms/egg-params-form.tsx` | 移動 | `src/features/egg-search/components/` から移動・共通化 |
| `src/lib/game-data-names.ts` | 変更 | `STAT_HEADERS_JA` / `STAT_HEADERS_EN` 定数を追加、`StatDisplayMode` 型を集約 |
| `src/lib/validation.ts` | 新規 | `validateGenConfig` / `isIvValid` 共通バリデーションヘルパー |
| `src/features/pokemon-list/components/seed-input-section.tsx` | 削除 | 共通化に伴い削除 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更 | import パス更新 |
| `src/features/pokemon-list/components/pokemon-result-columns.tsx` | 変更 | `STAT_HEADERS_*` を `game-data-names.ts` からの import に変更 |
| `src/features/pokemon-list/components/result-detail-dialog.tsx` | 変更 | `DetailRow` を共通コンポーネントからの import に変更 |
| `src/features/pokemon-list/hooks/use-pokemon-list.ts` | 変更 | `resolveSeedOrigins` を削除 (共通化済み) |
| `src/features/pokemon-list/index.ts` | 変更 | re-export パス更新 |
| `src/features/pokemon-list/types.ts` | 変更 | `StatsFilter` 削除、`StatsFixedValues` の再利用に統一 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更 | import パス更新 + `filterByStats` 使用 |
| `src/lib/stats-filter.ts` | 新規 | `filterByStats` 共通ユーティリティ |
| `src/features/egg-search/components/egg-search-page.tsx` | 変更 | `EggParamsForm` の import パス更新 |
| `src/features/egg-search/components/result-detail-dialog.tsx` | 変更 | `DetailRow` を共通コンポーネントからの import に変更 |

### 2.2 本機能の新規・変更ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/egg-list/index.ts` | 新規 | re-export |
| `src/features/egg-list/types.ts` | 新規 | フォーム状態型 + バリデーション (`StatsFixedValues` import、`validateGenConfig` / `isIvValid` 使用) |
| `src/features/egg-list/hooks/use-egg-list.ts` | 新規 | 生成実行フック |
| `src/features/egg-list/components/egg-list-page.tsx` | 新規 | ページコンポーネント |
| `src/components/forms/egg-filter-form.tsx` | 新規→共通化 | フィルタ入力フォーム (egg-list / egg-search 両方で共用、めざパフィルター付き) |
| `src/features/egg-list/components/egg-result-columns.tsx` | 新規 | DataTable カラム定義 |
| `src/features/egg-list/components/result-detail-dialog.tsx` | 新規 | 結果詳細ダイアログ |
| `src/workers/types.ts` | 変更 | `EggListTask` タスク型追加 |
| `src/workers/search.worker.ts` | 変更 | `egg-list` タスク処理追加 |
| `src/services/search-tasks.ts` | 変更 | `createEggListTask` 追加 |
| `src/stores/search/results.ts` | 変更 | `GeneratedEggData[]` を結果型に追加 (既存) |
| `wasm-pkg/src/types/filter.rs` | 変更 | `IvFilter::matches()` に Unknown IV ハンドリング追加 |
| `src/test/unit/egg-list-validation.test.ts` | 新規 | バリデーションのユニットテスト |
| `src/test/integration/egg-list-worker.test.ts` | 新規 | Worker/WASM 統合テスト |

---

## 3. 設計方針

### 3.1 データフロー

```
[Seed 入力] ─────────────────►  SeedSpec
                                   │
                                   ▼
             resolve_seeds()  (メインスレッド)
                                   │
                                   ▼
                              SeedOrigin[]
                                   │
    [孵化パラメータ + 種族指定]      │
                                   ▼
              Worker: generate_egg_list()
                                   │
                                   ▼
                         GeneratedEggData[]
                                   │
              resolve_egg_data_batch(data, locale, species_id)  (メインスレッド)
                                   │
                                   ▼
                           UiEggData[]
                                   │
              クライアントサイド StatsFilter 適用
                                   │
                                   ▼
                       filteredResults[]  → DataTable 表示
```

### 3.2 Worker 実行方式

`generate_egg_list` は同期 API だが、大量データ時のメインスレッド blocking を回避するため **Worker で実行**する。既存の `search.worker.ts` に `egg-list` タスク種別を追加する。

- Worker 内で `generate_egg_list(origins, params, config, filter)` を一括実行
- 結果は `GeneratedEggData[]` として一括返却
- タスク分割はしない (単一 Worker で十分)
- `resolve_egg_data_batch` はメインスレッドで実行 (軽量 + ロケール依存)
- 実ステータスフィルタ (`StatsFilter`) は `UiEggData[]` に対するクライアントサイド post-filter として適用 (pokemon-list と同一方式)

### 3.3 Seed 入力方式

**共通化済みの `src/components/forms/seed-input-section.tsx` を使用**する。Tabs (Radix UI) で 3 つのタブを切り替える:

| タブ順 | SeedInputMode | 説明 | 入力元 |
|--------|---------------|------|--------|
| 1 | `manual-startup` | DS 設定 + 日時 + キー入力から `resolve_seeds()` で変換 | ユーザー入力 |
| 2 | `manual-seeds` | LCG Seed (16 進 64bit) を改行区切りで入力 | ユーザー入力 |
| 3 | `search-results` | 直前の datetime-search 結果を引き継ぐ | `useSearchResultsStore` |

#### 自動 Seed 解決

各入力モードで **入力変更時** および **タブ遷移時** に `resolveSeedOrigins()` (共通ユーティリティ `src/services/seed-resolve.ts`) を自動呼び出しする。既存実装に準拠。

### 3.4 種族指定の実装

`EggGenerationParams.species_id: Option<u16>` フィールドを利用する。

- UI 側で種族セレクタ (`SpeciesSelect`) を配置
- `species_id` に None または 種族ID (1-649) を設定
- None の場合: 従来通り species_id = 0 (未指定)
- ニドラン♀ (#29) / イルミーゼ (#314) を指定した場合、性別に応じて自動的にニドラン♂ (#32) / バルビート (#313) に変換される (WASM側で自動処理)

種族名の表示には `get_species_name(species_id, locale)` を使用。

### 3.5 状態管理

| 状態 | 管理方式 | 永続化 | 理由 |
|------|----------|--------|------|
| Seed 入力モード | ローカル state | 不要 | セッション依存 |
| SeedOrigin[] | ローカル state | 不要 | 検索結果から都度導出 |
| EggGenerationParams | ローカル state | 不要 | フォーム入力中の一時値 |
| GenerationConfig (user_offset, max_advance) | ローカル state | 不要 | フォーム入力中の一時値 |
| EggFilter | ローカル state | 不要 | フォーム入力中の一時値 |
| StatsFilter | ローカル state | 不要 | クライアントサイド post-filter (型は `StatsFixedValues`) |
| StatDisplayMode | ローカル state | 不要 | IV/ステータス表示切替 |
| 生成結果 (UiEggData[]) | ローカル state | 不要 | 表示のみ |
| 検索結果 Store (引継ぎ元) | `stores/search/results.ts` | 不要 | 既存 Store を参照のみ |

DS 設定 / トレーナー情報は既存の永続化 Store (`useDsConfigReadonly`, `useTrainer`) から取得する。

---

## 4. 実装仕様

### 4.1 types.ts — フォーム状態型 + バリデーション + StatsFilter

```typescript
import type {
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  SeedOrigin,
} from '../../wasm/wasm_pkg.js';
import type { SeedInputMode } from '@/components/forms/seed-input-section';
import type { StatsFixedValues } from '@/components/forms/stats-fixed-input';
import { validateGenConfig, isIvValid } from '@/lib/validation';

// StatDisplayMode は src/lib/game-data-names.ts に一元化済み
// import type { StatDisplayMode } from '@/lib/game-data-names';

/** タマゴ生成フォーム状態 */
export interface EggListFormState {
  seedInputMode: SeedInputMode;
  seedOrigins: SeedOrigin[];
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
  statsFilter: StatsFixedValues | undefined;
  speciesId: number | undefined;
}

/** バリデーションエラーコード */
export type EggListValidationErrorCode =
  | 'SEEDS_EMPTY'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface EggListValidationResult {
  errors: EggListValidationErrorCode[];
  isValid: boolean;
}

/**
 * IV 値が有効範囲内か判定 — src/lib/validation.ts の isIvValid を使用
 */

export function validateEggListForm(
  form: EggListFormState
): EggListValidationResult {
  const errors: EggListValidationErrorCode[] = [];

  if (form.seedOrigins.length === 0) {
    errors.push('SEEDS_EMPTY');
  }
  errors.push(...validateGenConfig(form.genConfig));

  // 親個体値の範囲チェック
  const maleIvs = Object.values(form.eggParams.parent_male);
  const femaleIvs = Object.values(form.eggParams.parent_female);
  if (!maleIvs.every((v) => isIvValid(v)) || !femaleIvs.every((v) => isIvValid(v))) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
```

`StatsFilter` 型は定義せず、`StatsFixedInput` が export する `StatsFixedValues` をそのまま使用する。pokemon-list 側の `StatsFilter` も `StatsFixedValues` の再利用に統一する (Phase 0 で実施)。

### 4.2 Worker タスク型追加 — workers/types.ts

既存の `SearchTask` union に `EggListTask` を追加する。

```typescript
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  GeneratedEggData,
} from '../wasm/wasm_pkg.js';

/** タマゴ生成タスク */
export interface EggListTask {
  kind: 'egg-list';
  origins: SeedOrigin[];
  params: EggGenerationParams;
  config: GenerationConfig;
  filter: EggFilter | undefined;
}

/** タマゴ生成結果レスポンス */
export interface EggListResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'egg-list';
  results: GeneratedEggData[];
}

// SearchTask に EggListTask を追加
export type SearchTask =
  | EggDatetimeSearchTask
  | MtseedDatetimeSearchTask
  | GpuMtseedSearchTask
  | MtseedSearchTask
  | TrainerInfoSearchTask
  | PokemonListTask
  | EggListTask;
```

### 4.3 Worker 処理追加 — search.worker.ts

```typescript
import { generate_egg_list } from '../wasm/wasm_pkg.js';

async function runEggList(
  taskId: string,
  task: EggListTask,
  startTime: number
): Promise<void> {
  // generate_egg_list は同期 API
  const results = generate_egg_list(
    task.origins,
    task.params,
    task.config,
    task.filter ?? null
  );

  postResponse({
    type: 'result',
    taskId,
    resultType: 'egg-list',
    results,
  });

  postResponse({ type: 'done', taskId });
}
```

進捗報告は不要 (同期 API のため中間進捗を取れない)。呼び出し元の `use-egg-list.ts` でローディング状態を管理する。

### 4.4 タスク生成 — services/search-tasks.ts

```typescript
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
} from '../wasm/wasm_pkg.js';
import type { EggListTask } from '../workers/types';

export function createEggListTask(
  origins: SeedOrigin[],
  params: EggGenerationParams,
  config: GenerationConfig,
  filter: EggFilter | undefined
): EggListTask {
  return {
    kind: 'egg-list',
    origins,
    params,
    config,
    filter,
  };
}
```

### 4.5 use-egg-list.ts — 生成実行フック

```typescript
import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createEggListTask } from '@/services/search-tasks';
import { resolve_egg_data_batch } from '@/wasm/wasm_pkg.js';
import { flattenBatchResults } from '@/services/batch-utils';
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  GeneratedEggData,
  UiEggData,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';

interface UseEggListReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  rawResults: GeneratedEggData[];
  uiResults: UiEggData[];
  error: Error | undefined;
  generate: (
    origins: SeedOrigin[],
    params: EggGenerationParams,
    config: GenerationConfig,
    filter: EggFilter | undefined
  ) => void;
  cancel: () => void;
}

export function useEggList(
  locale: SupportedLocale,
  speciesId: number | undefined
): UseEggListReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, start, cancel } = useSearch(config);

  // バッチ結果の flat 化 (共通ユーティリティ使用)
  const rawResults = useMemo(
    () => flattenBatchResults<GeneratedEggData>(results),
    [results]
  );

  const uiResults = useMemo(() => {
    if (rawResults.length === 0) return [];
    return resolve_egg_data_batch(rawResults, locale, speciesId ?? null);
  }, [rawResults, locale, speciesId]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: EggGenerationParams,
      genConfig: GenerationConfig,
      filter: EggFilter | undefined
    ) => {
      const task = createEggListTask(origins, params, genConfig, filter);
      start([task]);
    },
    [start]
  );

  return {
    isLoading,
    isInitialized,
    progress,
    rawResults,
    uiResults,
    error,
    generate,
    cancel,
  };
}
```

#### species_id のレイヤー別役割

| レイヤー | 関数 | species_id の役割 |
|---------|--------|-------------------|
| UI (EggListPage) | フォーム state | ユーザーが種族セレクタで選択。`EggParamsForm` の `species_id` として保持 |
| Hook (useEggList) | `useEggList(locale, speciesId)` | `resolve_egg_data_batch` に渡すために受け取る |
| WASM 生成 | `generate_egg_list(origins, params, config, filter)` | `EggGenerationParams.species_id` 経由。生成時に `core.species_id` へ設定 (種族依存の計算なし、デフォルト 0) |
| WASM 解決 | `resolve_egg_data_batch(data, locale, species_id?)` | `species_id` が `Some` の場合: 種族名・特性名・実ステータスを解決。`None` の場合: それらは `undefined` / `"?"` |

`resolve_egg_data_batch` の第3引数は `species_id?: number | null` であり、`version: RomVersion` ではない。`resolve_pokemon_data_batch(data, version, locale)` とはシグネチャが異なる点に注意。

#### バッチ結果 flat 化の共通ユーティリティ

`use-pokemon-list.ts` と `use-egg-list.ts` で同一のバッチ flat 化ロジックが必要になる。コードクローンを避けるため、共通ユーティリティ `src/services/batch-utils.ts` として抽出する:

```typescript
// src/services/batch-utils.ts
export function flattenBatchResults<T extends { core: unknown; advance: number }>(
  results: unknown[][]
): T[] {
  const flat: T[] = [];
  for (const batch of results) {
    if (Array.isArray(batch) && batch.length > 0) {
      const first = batch[0];
      if (first && typeof first === 'object' && 'core' in first && 'advance' in first) {
        flat.push(...(batch as unknown as T[]));
      }
    }
  }
  return flat;
}
```

### 4.6 egg-list-page.tsx — ページコンポーネント構成

```
FeaturePageLayout
├── Controls
│   ├── SearchControls (PC)
│   ├── SeedInputSection (src/components/forms/ 共通コンポーネント)
│   │   ├── Tabs: manual-startup / manual-seeds / search-results
│   │   ├── [manual-startup] DatetimeInput + KeyInputSelector → autoResolveStartup
│   │   ├── [manual-seeds] LCG Seed テキスト入力 → autoResolveSeeds
│   │   └── [search-results] Store から SeedOrigin[] を表示 + "Load" ボタン
│   ├── EggParamsForm (src/components/forms/ 共通コンポーネント)
│   │   ├── 種族セレクタ (SpeciesCombobox: cmdk + Radix Popover による検索付き)
│   │   ├── 親個体値 (オス・メス)
│   │   ├── メス親特性 (AbilitySlot)
│   │   ├── かわらずのいし (EverstonePlan: None / Male / Female)
│   │   ├── 性別比率 (GenderRatio)
│   │   ├── フラグ群 (メタモン使用, ニドラン♀, 国際孵化, NPC考慮)
│   │   ├── user_offset / max_advance
│   │   └── (トレーナー情報は DS 設定 / Trainer Store から自動取得)
│   ├── EggFilterForm (src/components/forms/ 共通コンポーネント, 折りたたみ可)
│   │   ├── 実ステータス固定値 (StatsFixedInput, statMode=stats 時)
│   │   ├── IV 範囲 (IvRangeInput, statMode≠stats 時)
│   │   ├── めざパタイプ + 威力下限 (HiddenPowerSelect, statMode≠stats 時)
│   │   ├── 性格 (NatureSelect)
│   │   ├── 性別 (GenderSelect)
│   │   ├── 特性スロット (AbilitySlotSelect)
│   │   ├── 色違い (ShinySelect)
│   │   └── 猶予フレーム最小値 (min_margin_frames)
│   ├── IV/ステータス表示切替 Switch (statMode)
│   └── バリデーションエラー表示
├── Results
│   ├── 件数表示
│   ├── DataTable (UiEggData[], statModeに応じて IV/ステータス切替)
│   └── ResultDetailDialog (共通 DetailRow 使用)
└── モバイル固定検索バー
```

#### 実ステータスフィルタの適用

pokemon-list と同一の方式で、`UiEggData[]` に対するクライアントサイド post-filter として適用する。フィルタロジックは共通ユーティリティ `filterByStats` (`src/lib/stats-filter.ts`) を使用する:

```typescript
// src/lib/stats-filter.ts
import type { StatsFixedValues } from '@/components/forms/stats-fixed-input';

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

export function filterByStats<T extends { stats: string[] }>(
  results: T[],
  filter: StatsFixedValues | undefined
): T[] {
  if (!filter) return results;
  return results.filter((r) =>
    STAT_KEYS.every((key, i) => {
      const expected = filter[key];
      if (expected === undefined) return true; // 未指定は任意の値にマッチ
      const v = Number(r.stats[i]);
      if (Number.isNaN(v)) return true; // '?' は常に通過
      return v === expected;
    })
  );
}
```

ページコンポーネントでの使用:

```typescript
const filteredResults = useMemo(
  () => filterByStats(uiResults, statsFilter),
  [uiResults, statsFilter]
);
```

pokemon-list 側もインライン実装を `filterByStats` の呼び出しに置き換える (Phase 0 で実施)。

`r.stats[i]` が `"?"` の場合 (`species_id` 未指定または IV が Unknown) は `Number.isNaN` で検出され、常にマッチする。これにより「不明な値はフィルタで除外しない」という原則を満たす。

#### 種族セレクタの実装

種族リストは649件と長いため、`cmdk` + Radix Popover による検索付き Combobox (`SpeciesCombobox`) として実装する。

実装ファイル:
- `src/components/ui/popover.tsx` — Radix Popover ラッパー
- `src/components/ui/command.tsx` — cmdk ラッパー (CommandInput, CommandList, CommandEmpty, CommandItem)
- `src/components/forms/species-combobox.tsx` — 種族選択 Combobox 本体

```typescript
// src/components/forms/species-combobox.tsx (概要)

const SPECIES_COUNT = 649;

interface SpeciesOption {
  readonly id: number;
  readonly label: string;      // "#001 フシギダネ" 形式
  readonly searchValue: string; // "001 1 フシギダネ" (検索用)
}

function SpeciesCombobox({ value, onChange, disabled }: SpeciesComboboxProps) {
  const language = useUiStore((s) => s.language);
  const [options, setOptions] = useState<SpeciesOption[]>([]);

  useEffect(() => {
    void initMainThreadWasm().then(() => {
      const list = Array.from({ length: SPECIES_COUNT }, (_, i) => {
        const id = i + 1;
        const name = get_species_name(id, language);
        const idStr = id.toString().padStart(3, '0');
        return { id, label: `#${idStr} ${name}`, searchValue: `${idStr} ${id} ${name}` };
      });
      setOptions(list);
    });
  }, [language]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox">
          {selectedLabel ?? t`Not specified`}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandInput placeholder={t`Search species...`} />
          <CommandList>
            <CommandEmpty>{t`No species found`}</CommandEmpty>
            <CommandItem value="__none__" onSelect={() => onChange(undefined)}>
              {t`Not specified`}
            </CommandItem>
            {options.map((opt) => (
              <CommandItem key={opt.id} value={opt.searchValue}
                onSelect={() => onChange(opt.id)}>
                {opt.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

`EggParamsForm` 内で `<SpeciesCombobox value={speciesId} onChange={onSpeciesIdChange} />` として使用する。

### 4.7 EggFilterForm — フィルタ入力フォーム

**配置**: `src/components/forms/egg-filter-form.tsx` (egg-list / egg-search 共用)

```typescript
interface EggFilterFormProps {
  value: EggFilter | undefined;
  onChange: (filter?: EggFilter) => void;
  /** Stats 表示モード。指定時に IV / Stats フィルタを切替表示する */
  statMode?: StatDisplayMode;
  statsFilter?: StatsFixedValues | undefined;
  onStatsFilterChange?: (filter?: StatsFixedValues) => void;
  disabled?: boolean;
  /** フィルター有効/無効 Switch を表示する。内部状態を保持したまま切り替える */
  showToggle?: boolean;
  /** リセットボタンを表示する */
  showReset?: boolean;
}
```

ヘッダーには折りたたみ (ChevronDown) に加え、`showToggle` で有効/無効 Switch、`showReset` でリセットボタン (RotateCcw) を表示する。

- **egg-list**: `showToggle` + `showReset` — PokemonFilterForm と同様のフィルター有効/無効トグル + リセット
- **egg-search**: `showReset` のみ — リセットボタンだけ表示 (トグルなし)

Toggle OFF 時は内部状態を保持したまま `onChange()` で親に `undefined` を伝播する。Toggle ON で内部保持値を復元する。リセットは全フィルター値をデフォルトに戻し、Toggle がある場合は OFF にする。

フィルター項目 (上からの表示順序):

| # | フィールド | 型 | UI 部品 | 備考 |
|---|-----------|-----|---------|------|
| 1 | 実ステータス固定値 | `StatsFixedValues` | StatsFixedInput | `statMode === 'stats'` の時のみ表示 |
| 2 | IV 範囲 | `IvFilter` | IvRangeInput | `statMode !== 'stats'` の時。`allowUnknown` 有効 |
| 3 | めざパタイプ + 威力下限 | `HiddenPowerType[]` + `number?` | HiddenPowerSelect (Popover 4×4 グリッド) | `statMode !== 'stats'` の時のみ表示。`IvFilter.hidden_power_types` / `hidden_power_min_power` に格納 |
| 4 | 性格 | `Nature[]` | NatureSelect (Popover) | Popover式 5×5 グリッド選択 |
| 5 | 性別 | `Gender \| undefined` | GenderSelect | ♂ / ♀ / 指定なし |
| 6 | 特性スロット | `AbilitySlot \| undefined` | AbilitySlotSelect | 第1 / 第2 / 夢 / 指定なし |
| 7 | 色違い | `ShinyFilter \| undefined` | ShinySelect | 指定なし / ☆ / ◇ / ☆&◇ |
| 8 | 猶予フレーム最小値 | `number \| undefined` | Input (0-) | NPC消費考慮時に有効 |

**めざパフィルターの実装詳細**:
- `HiddenPowerSelect` コンポーネント (`src/components/forms/hidden-power-select.tsx`) を使用
- めざパタイプ・威力下限は `IvFilter.hidden_power_types` / `IvFilter.hidden_power_min_power` に格納
- IV 範囲スライダー変更時、既存の `hidden_power` 設定を保持する (リセットされない)
- `statMode === 'stats'` の場合は IV フィルタもめざパフィルタも非表示 (ステータスからめざパは計算不能)

#### IV フィルタと Unknown (?) のハンドリング方針

タマゴでは親の IV が不明 (`IV_VALUE_UNKNOWN = 32`) の場合、遺伝により子の IV も `32` (不明) になる。現行の `IvFilter::matches()` は単純な範囲比較のため、Unknown に対する明示的なハンドリングが必要。

**方針**: WASM 側 `IvFilter::matches()` を以下のルールで改修する:

| フィルタ設定 | 対象 IV 値 | 結果 | 理由 |
|------------|------------|------|------|
| 任意 (any): `(0, 31)` または `(0, 32)` | Unknown (32) | 通過 | 任意指定なので不明も含めて全通過 |
| 範囲指定: `(min, max)` where `min > 0` or `max < 31` | Unknown (32) | 不通過 | 特定範囲を指定しているため、不明な値は除外 |
| 任意 | 通常値 (0-31) | 通過 | 従来通り |
| 範囲指定 | 通常値 (0-31) | 範囲内なら通過 | 従来通り |

判定ロジック: 「そのステータスのフィルタが `(0, 31)` または `(0, 32)` (実質的に任意) の場合は Unknown を通過、それ以外の範囲指定では Unknown を不通過」とする。

```rust
// wasm-pkg/src/types/filter.rs IvFilter::matches()
pub fn matches(&self, ivs: &Ivs) -> bool {
    // ステータスごとの範囲チェック (Unknown 考慮)
    if !Self::check_stat(ivs.hp, self.hp) { return false; }
    if !Self::check_stat(ivs.atk, self.atk) { return false; }
    if !Self::check_stat(ivs.def, self.def) { return false; }
    if !Self::check_stat(ivs.spa, self.spa) { return false; }
    if !Self::check_stat(ivs.spd, self.spd) { return false; }
    if !Self::check_stat(ivs.spe, self.spe) { return false; }

    // Unknown を含む場合、めざパの計算は不能なのでスキップ
    if ivs.has_unknown() {
        return true;
    }

    // めざパタイプチェック
    if let Some(ref types) = self.hidden_power_types
        && !types.is_empty()
        && !types.contains(&ivs.hidden_power_type())
    { return false; }

    // めざパ威力チェック
    if let Some(min_power) = self.hidden_power_min_power
        && ivs.hidden_power_power() < min_power
    { return false; }

    true
}

/// 単一ステータスのフィルタ判定
/// - フィルタが任意 (0..31 or 0..32) の場合: Unknown も含めて全通過
/// - フィルタが範囲指定の場合: Unknown は不通過、通常値は範囲内なら通過
#[inline]
fn check_stat(value: u8, range: (u8, u8)) -> bool {
    if value == IV_VALUE_UNKNOWN {
        // 任意指定 (min=0 かつ max>=31) なら通過、それ以外は不通過
        return range.0 == 0 && range.1 >= 31;
    }
    value >= range.0 && value <= range.1
}
```

この変更は `IvFilter` 共通なので、`PokemonFilter` 経由でも同じ動作になるが、ポケモン個体生成では Unknown IV は発生しないため影響なし。

#### 実ステータスフィルタと Unknown (?) のハンドリング方針

`StatsFilter` はクライアントサイド post-filter であり、`UiEggData.stats[]` の文字列値に対して比較する。値が `"?"` の場合 (種族未指定または IV が Unknown) は `Number()` が `NaN` を返すため、常にマッチする。これは pokemon-list と同一の方針。

### 4.8 egg-result-columns.tsx — テーブルカラム定義

`UiEggData` のフィールドを DataTable のカラムとして定義する。

```typescript
import { getNeedleArrow, STAT_HEADERS_JA, STAT_HEADERS_EN } from '@/lib/game-data-names';

interface EggResultColumnsOptions {
  onSelect?: (result: UiEggData) => void;
  locale?: string;
  statMode?: StatDisplayMode;
}
```

`getNeedleArrow` および `STAT_HEADERS_JA` / `STAT_HEADERS_EN` は `src/lib/game-data-names.ts` から import する (新規定義不要)。

| カラム | フィールド | 説明 |
|--------|-----------|------|
| 詳細 | — | ダイアログ表示ボタン |
| Advance | `advance` | フレーム消費数 |
| 針 | `needle_direction` | `getNeedleArrow()` で矢印変換 |
| 種族 | `species_name` | ポケモン名 (species_id 指定時のみ意味を持つ) |
| 性格 | `nature_name` | 性格名 |
| 特性 | `ability_name` | 特性名 |
| 性別 | `gender_symbol` | ♂/♀/- |
| 色違い | `shiny_symbol` | ◇/☆/空 |
| H/A/B/C/D/S | `ivs[i]` or `stats[i]` | `statMode` に応じて IV / 実ステータスを切替 |
| めざパ | `hidden_power_type` | タイプ名 |
| PID | `pid` | 性格値 (hex) |
| 猶予F | `margin_frames` | 猶予フレーム数 (NPC考慮時) |

`statMode` による切替:

```typescript
const dataKey = statMode === 'stats' ? 'stats' : 'ivs';
const headers = locale === 'ja' ? STAT_HEADERS_JA : STAT_HEADERS_EN;

...headers.map((header, i) =>
  columnHelper.accessor((row) => row[dataKey][i], {
    id: `${dataKey}_${i}`,
    header: () => header,
    size: 40,
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  })
),
```

モバイル表示では ResultCardList へ自動切替 (既存の DataTable/ResultCardList 機構)。

### 4.9 result-detail-dialog.tsx — 結果詳細ダイアログ

`UiEggData` の全フィールドを表示するダイアログ。`DetailRow` は共通コンポーネント `src/components/data-display/detail-row.tsx` から import する。

- Seed 情報 (base_seed, mt_seed, datetime_iso, timer0, vcount, key_input)
- 針方向 (needle_direction → `getNeedleArrow()` で矢印記号に変換)
- 個体情報 (種族, 性格, 特性, 性別, 色違い, IV, めざパ, PID)
- 孵化情報 (猶予フレーム, 継承スロット)

IV は `H:31 A:31 B:31 C:31 D:31 S:31` 形式で H/A/B/C/D/S ラベル付きで表示する。

### 4.10 事前共通化の詳細

本機能の実装前に以下の共通化を実施する。コードクローンの抑制が目的。

#### 4.10.1 DetailRow の共通化

`src/components/data-display/detail-row.tsx` として抽出。現在 `pokemon-list/components/result-detail-dialog.tsx` と `egg-search/components/result-detail-dialog.tsx` に同一実装が存在する。

移動後、両ファイルの `DetailRow` を削除し、共通コンポーネントから import する。

#### 4.10.2 resolveSeedOrigins の共通化

`src/services/seed-resolve.ts` として抽出。現在 `pokemon-list/hooks/use-pokemon-list.ts` に定義されており、`SeedInputSection` が内部 import している。

```typescript
// src/services/seed-resolve.ts
import { initMainThreadWasm } from './wasm-init';
import { resolve_seeds } from '@/wasm/wasm_pkg.js';
import type { SeedSpec, SeedOrigin } from '@/wasm/wasm_pkg.js';

export async function resolveSeedOrigins(spec: SeedSpec): Promise<SeedOrigin[]> {
  await initMainThreadWasm();
  return resolve_seeds(spec);
}
```

#### 4.10.3 SeedInputSection の共通化

`src/components/forms/seed-input-section.tsx` へ移動。`resolveSeedOrigins` の import を `src/services/seed-resolve.ts` に変更。

移動後、`pokemon-list` 側の import パスを更新:

```typescript
// src/features/pokemon-list/components/pokemon-list-page.tsx
- import { SeedInputSection } from './seed-input-section';
+ import { SeedInputSection } from '@/components/forms/seed-input-section';
```

#### 4.10.4 EggParamsForm の共通化

`src/features/egg-search/components/egg-params-form.tsx` を `src/components/forms/egg-params-form.tsx` へ移動。種族セレクタ (`species_id`) を追加。

`egg-search` 側の import パスを更新:

```typescript
// src/features/egg-search/components/egg-search-page.tsx
- import { EggParamsForm } from './egg-params-form';
+ import { EggParamsForm } from '@/components/forms/egg-params-form';
```

#### 4.10.5 STAT_HEADERS 定数の共通化

`STAT_HEADERS_JA` / `STAT_HEADERS_EN` を `src/lib/game-data-names.ts` に追加。現在 `pokemon-result-columns.tsx` に feature-local で定義されている。

```typescript
// src/lib/game-data-names.ts に追加
export const STAT_HEADERS_JA = ['H', 'A', 'B', 'C', 'D', 'S'] as const;
export const STAT_HEADERS_EN = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'] as const;
```

#### 4.10.6 バッチ結果 flat 化ユーティリティ

`src/services/batch-utils.ts` として抽出。`use-pokemon-list.ts` と `use-egg-list.ts` で同一の flat 化ロジックが必要なため。詳細は §4.5 参照。

---

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|----------|
| `validateEggListForm` — 正常系 | SeedOrigin あり + 正常な advance 範囲で isValid = true |
| `validateEggListForm` — 異常系 | SEEDS_EMPTY, ADVANCE_RANGE_INVALID, OFFSET_NEGATIVE, IV_OUT_OF_RANGE の各条件 |

### 5.2 Rust ユニットテスト (`wasm-pkg/src/types/filter.rs`)

| テスト | 検証内容 |
|--------|----------|
| `IvFilter::matches()` — Unknown + 任意範囲 | IV=32, filter=(0,31) → 通過 |
| `IvFilter::matches()` — Unknown + 特定範囲 | IV=32, filter=(31,31) → 不通過 |
| `IvFilter::matches()` — 通常値 + 範囲内 | IV=31, filter=(25,31) → 通過 |
| `IvFilter::matches()` — Unknown + めざパフィルタ | IVにUnknown含む, めざパ指定あり → めざパスキップで通過 |

### 5.3 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| Worker 経由 egg-list 生成 | Worker 起動 → `egg-list` タスク → `GeneratedEggData[]` 返却。結果 1 件以上 |
| species_id 指定時の種族反映 | species_id を指定した場合、UiEggData.species_name が正しく解決されること |
| species_id 指定時の実ステータス | species_id を指定した場合、UiEggData.stats が数値文字列であること |
| species_id 未指定時の実ステータス | species_id 未指定の場合、UiEggData.stats が全て `"?"` であること |

### 5.4 コンポーネントテスト (想定)

コンポーネントテストは本仕様のスコープ外とする。最低限、以下のスモークテストを手動確認する:

- 種族セレクタで種族を選択・変更できること
- Seed 入力モード切替で入力 UI が切り替わること
- 生成ボタン押下で DataTable に結果が表示されること

---

## 6. 翻訳方針

- UI ラベルは `<Trans>` / `t` で Lingui を使用する
- 種族名は WASM の `get_species_name(species_id, locale)` で取得
- 性格名・特性名等は `resolve_egg_data_batch` で解決済み
- バリデーションエラーメッセージは `useMemo` + `t` テンプレートリテラルで翻訳済み Record を生成する (既存パターンに準拠)

---

## 7. 実装チェックリスト

### Phase 0: 事前共通化

- [x] `src/components/data-display/detail-row.tsx` — DetailRow 抽出
- [x] `src/features/pokemon-list/components/result-detail-dialog.tsx` — DetailRow import 更新
- [x] `src/features/egg-search/components/result-detail-dialog.tsx` — DetailRow import 更新
- [x] `src/services/seed-resolve.ts` — `resolveSeedOrigins` 抽出
- [x] `src/components/forms/seed-input-section.tsx` — SeedInputSection 移動 + import 更新
- [x] `src/features/pokemon-list/hooks/use-pokemon-list.ts` — `resolveSeedOrigins` 削除 (re-export は seed-resolve から)
- [x] `src/features/pokemon-list/index.ts` — re-export パス更新
- [x] `src/features/pokemon-list/components/pokemon-list-page.tsx` — SeedInputSection import 更新
- [x] `src/components/forms/egg-params-form.tsx` — EggParamsForm 移動 + 種族セレクタ (SpeciesCombobox) 追加
- [x] `src/features/egg-search/components/egg-search-page.tsx` — EggParamsForm import 更新
- [x] `src/lib/game-data-names.ts` — `STAT_HEADERS_JA` / `STAT_HEADERS_EN` 追加 + `StatDisplayMode` 一元化
- [x] `src/features/pokemon-list/components/pokemon-result-columns.tsx` — STAT_HEADERS import 更新 + `StatDisplayMode` ローカル定義削除
- [x] `src/services/batch-utils.ts` — `flattenBatchResults` 抽出
- [x] `src/features/pokemon-list/hooks/use-pokemon-list.ts` — `flattenBatchResults` 使用に変更
- [x] `src/lib/stats-filter.ts` — `filterByStats` 共通ユーティリティ抽出
- [x] `src/features/pokemon-list/types.ts` — `StatsFilter` 削除、`StatsFixedValues` の import に統一
- [x] `src/features/pokemon-list/components/pokemon-list-page.tsx` — `filterByStats` 使用に変更

### Phase 0.5: 追加共通化 (実装中に実施)

- [x] `src/lib/validation.ts` — `validateGenConfig` / `isIvValid` 共通バリデーションヘルパー抽出
- [x] `src/features/pokemon-list/types.ts` — `validateGenConfig` 使用に変更
- [x] `src/features/egg-search/types.ts` — `validateGenConfig` / `isIvValid` 使用に変更
- [x] `src/components/forms/egg-filter-form.tsx` — egg-list / egg-search 共通化 + `StatDisplayMode` 一元化
- [x] `src/features/egg-list/components/egg-result-columns.tsx` — `StatDisplayMode` import を `@/lib/game-data-names` に変更
- [x] `src/features/pokemon-list/components/pokemon-filter-form.tsx` — `StatDisplayMode` import を `@/lib/game-data-names` に変更
- [x] `src/features/pokemon-list/components/pokemon-list-page.tsx` — `StatDisplayMode` import を `@/lib/game-data-names` に変更
- [x] `src/features/egg-list/index.ts` — `StatDisplayMode` re-export 削除 (game-data-names から直接 import)
- [x] `src/features/egg-search/components/egg-result-columns.tsx` — IV 表示を個別 H/A/B/C/D/S カラムに変更

### Phase 1: WASM 側変更

- [x] `wasm-pkg/src/types/filter.rs` — `IvFilter::matches()` に Unknown IV ハンドリング追加
- [x] `wasm-pkg/src/types/filter.rs` — `IvFilter::check_stat()` ヘルパー追加
- [x] Rust ユニットテスト追加 (Unknown IV フィルタテスト)

### Phase 2: 本機能実装

- [x] `src/features/egg-list/types.ts` — フォーム状態型 + バリデーション (`validateGenConfig` / `isIvValid` 使用)
- [x] `src/features/egg-list/index.ts` — re-export
- [x] `src/workers/types.ts` — `EggListTask` + `EggListResultResponse` 追加
- [x] `src/workers/search.worker.ts` — `egg-list` タスク処理追加
- [x] `src/services/search-tasks.ts` — `createEggListTask` 追加
- [x] `src/features/egg-list/hooks/use-egg-list.ts` — 生成フック
- [x] `src/components/forms/egg-filter-form.tsx` — 共通フィルタ入力 (IV/Stats 切替 + めざパフィルター対応)
- [x] `src/features/egg-list/components/egg-result-columns.tsx` — カラム定義 (IV/Stats 切替対応)
- [x] `src/features/egg-list/components/result-detail-dialog.tsx` — 詳細ダイアログ (共通 DetailRow 使用)
- [x] `src/features/egg-list/components/egg-list-page.tsx` — ページ統合 (StatsFilter + statMode 対応)
- [x] `src/test/unit/egg-list-validation.test.ts` — バリデーションテスト
- [x] `src/test/integration/egg-list-worker.test.ts` — Worker 統合テスト
- [x] `feature-content.tsx` — `egg-list` ルートにページコンポーネントを登録
- [x] 翻訳カタログ更新 (`pnpm lingui:extract`)

---

## 8. コンポーネント再利用マトリクス

| コンポーネント | 再利用元 | 新規実装 | 変更内容 |
|--------------|---------|---------|---------|
| SeedInputSection | pokemon-list | - | `src/components/forms/` へ移動して共通化 |
| DatetimeInput | 共通 (forms/) | - | そのまま再利用 |
| KeyInputSelector | 共通 (forms/) | - | そのまま再利用 |
| EggParamsForm | egg-search | - | `src/components/forms/` へ移動 + SpeciesCombobox 追加 |
| SpeciesCombobox | - | ✓ | 新規実装 (cmdk + Radix Popover, `src/components/forms/species-combobox.tsx`) |
| Popover (UI) | - | ✓ | 新規実装 (Radix Popover ラッパー, `src/components/ui/popover.tsx`) |
| Command (UI) | - | ✓ | 新規実装 (cmdk ラッパー, `src/components/ui/command.tsx`) |
| DetailRow | pokemon-list, egg-search | - | `src/components/data-display/` へ抽出して共通化 |
| StatsFixedInput | 共通 (forms/) | - | そのまま再利用 |
| StatsFixedValues (型) | 共通 (forms/) | - | `StatsFilter` を廃止し `StatsFixedValues` に統一 |
| StatDisplayMode (型) | - | - | `src/lib/game-data-names.ts` に一元化 (4箇所のローカル定義を統合) |
| validateGenConfig | - | - | `src/lib/validation.ts` に抽出 (3 feature の共通バリデーション) |
| isIvValid | - | - | `src/lib/validation.ts` に抽出 (IV 値の有効範囲判定) |
| filterByStats | - | - | `src/lib/stats-filter.ts` へ新規抽出 (pokemon-list のインライン実装を共通化) |
| IvRangeInput | 共通 (forms/) | - | そのまま再利用 (`allowUnknown` 有効) |
| NatureSelect | 共通 (forms/) | - | そのまま再利用 |
| HiddenPowerSelect | 共通 (forms/) | - | そのまま再利用 (egg-filter-form に追加) |
| SearchControls | 共通 (forms/) | - | そのまま再利用 |
| getNeedleArrow | 共通 (game-data-names.ts) | - | そのまま再利用 |
| STAT_HEADERS_* | pokemon-list | - | `game-data-names.ts` へ移動して共通化 |
| flattenBatchResults | pokemon-list | - | `src/services/batch-utils.ts` へ抽出 |
| resolveSeedOrigins | pokemon-list | - | `src/services/seed-resolve.ts` へ抽出 |
| EggFilterForm | - | ✓ | 新規実装 → `src/components/forms/` へ共通化 (egg-list / egg-search 共用、めざパフィルター付き) |
| EggResultColumns | - | ✓ | 新規実装 (PokemonResultColumns を参考 + statMode 対応) |
| ResultDetailDialog | - | ✓ | 新規実装 (UiEggData 用、共通 DetailRow 使用) |

---

## 9. 関連ドキュメント

- [個体生成(ポケモン) 仕様書](../../completed/local_064/POKEMON_LIST.md)
- [フロントエンド構成](../../architecture/frontend-structure.md)
- [Worker 設計](../../architecture/worker-design.md)
- [状態管理方針](../../architecture/state-management.md)
