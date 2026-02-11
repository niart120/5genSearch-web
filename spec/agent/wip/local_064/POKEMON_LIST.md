# ポケモンリスト生成 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索で得た `SeedOrigin[]` (または手動指定した Seed) をもとに、
各 Seed + advance に対応するポケモン個体を一括生成し、一覧表示する。

ナビゲーション上は `generation` カテゴリの `pokemon-list` 機能に対応する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SeedOrigin | `Seed` (LcgSeed + MtSeed) または `Startup` (Datetime + StartupCondition) を含む生成元情報 |
| SeedSpec | `Seeds` (直接指定) または `Startup` (DS 設定 + 日時 + Timer0/VCount) から SeedOrigin を導出する仕様 |
| GeneratedPokemonData | WASM が生成する中間データ。advance, PID, IV, 性格, 色違い等を含む |
| UiPokemonData | WASM の `resolve_pokemon_data_batch` が返す表示用データ。種族名/性格名等は文字列解決済み |
| EncounterType | エンカウント種別 (Normal, ShakingGrass, Surfing, StaticSymbol 等) |
| EncounterMethod | エンカウント方法 (Stationary / Moving)。野生エンカウント時にユーザーが選択 |
| PokemonFilter | IV, 性格, 色違い, 種族, レベル範囲でのフィルタ条件 |

### 1.3 背景・問題

- 起動時刻検索の結果 (SeedOrigin[]) は Seed 情報のみであり、そこから実際にどのようなポケモンが生成されるかを確認するには追加のステップが必要
- ユーザーは Seed + エンカウント条件 + advance 範囲を指定して、目的の個体を特定する
- 参考実装 (niart120/pokemon-gen5-initseed) では Worker ベースのバッチ生成を採用しており、大量 advance 時のメインスレッド blocking を回避している

### 1.4 期待効果

| 指標 | 値 |
|------|-----|
| 典型的な生成時間 | < 200ms (SeedOrigin 数十件 × max_advance 100) |
| 大量生成時 | Worker 実行により UI blocking なし |
| 対応エンカウント種別 | 全 EncounterType (野生系 8 種 + 固定系 6 種) |

### 1.5 着手条件

- Phase 3 の `datetime-search` が完了していること (SeedOrigin 供給元)
- エンカウントデータサービス (local_062) が完了していること
- 固定エンカウントデータ (local_063) が完了していること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/pokemon-list/index.ts` | 新規 | re-export |
| `src/features/pokemon-list/types.ts` | 新規 | フォーム状態型 + バリデーション |
| `src/features/pokemon-list/hooks/use-pokemon-list.ts` | 新規 | 生成実行フック |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 新規 | ページコンポーネント |
| `src/features/pokemon-list/components/pokemon-params-form.tsx` | 新規 | エンカウント / 生成パラメータ入力フォーム |
| `src/features/pokemon-list/components/pokemon-filter-form.tsx` | 新規 | フィルタ入力フォーム |
| `src/features/pokemon-list/components/pokemon-result-columns.tsx` | 新規 | DataTable カラム定義 |
| `src/features/pokemon-list/components/result-detail-dialog.tsx` | 新規 | 結果詳細ダイアログ |
| `src/features/pokemon-list/components/seed-input-section.tsx` | 新規 | Seed 入力セクション (自動引継ぎ / 手動入力) |
| `src/workers/types.ts` | 変更 | `PokemonListTask` タスク型追加 |
| `src/workers/search.worker.ts` | 変更 | `pokemon-list` タスク処理追加 |
| `src/services/search-tasks.ts` | 変更 | `createPokemonListTask` 追加 |
| `src/stores/search/results.ts` | 変更 | `GeneratedPokemonData[]` を結果型に追加 |
| `src/test/unit/pokemon-list-validation.test.ts` | 新規 | バリデーションのユニットテスト |
| `src/test/integration/pokemon-list-worker.test.ts` | 新規 | Worker/WASM 統合テスト |

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
    [エンカウント / 生成パラメータ] │
                                   ▼
              Worker: generate_pokemon_list()
                                   │
                                   ▼
                         GeneratedPokemonData[]
                                   │
              resolve_pokemon_data_batch()  (メインスレッド)
                                   │
                                   ▼
                           UiPokemonData[]  → DataTable 表示
```

### 3.2 Worker 実行方式

`generate_pokemon_list` は同期 API だが、大量データ時のメインスレッド blocking を回避するため
**Worker で実行**する。既存の `search.worker.ts` に `pokemon-list` タスク種別を追加する。

- Worker 内で `generate_pokemon_list(origins, params, config, filter)` を一括実行
- 結果は `GeneratedPokemonData[]` として一括返却
- タスク分割はしない (単一 Worker で十分)
- `resolve_pokemon_data_batch` はメインスレッドで実行 (軽量 + ロケール依存)

### 3.3 Seed 入力方式

2 つの入力モードを提供する:

| モード | 説明 | 入力元 |
|--------|------|--------|
| **起動時刻検索結果** | 直前の datetime-search 結果を引き継ぐ | `useSearchResultsStore` |
| **手動入力** | SeedSpec を直接入力し `resolve_seeds()` で変換 | ユーザー入力 |

手動入力の SeedSpec は以下の 2 パターン:

1. **Seeds**: LCG Seed (16 進 64bit) を改行区切りで入力
2. **Startup**: DS 設定 + 日時 + Timer0/VCount + キー入力 → `resolve_seeds()` で SeedOrigin[] に展開

### 3.4 エンカウント選択の UI フロー

```
① エンカウント種別  EncounterType (Select)
   ├── ロケーションベース (Normal, ShakingGrass, DustCloud, ...):
   │   ├── ② ロケーション (Select)
   │   └── → スロット自動決定 (toEncounterSlotConfigs)
   └── 固定エンカウント (StaticSymbol, StaticStarter, ...):
       ├── ② ポケモン選択 (Select)
       └── → スロット自動決定 (toEncounterSlotConfigFromEntry)
```

- `EncounterMethod` (Stationary / Moving) はロケーションベースの場合にユーザーが選択する
- 固定エンカウントの場合は `Stationary` 固定
- `EncounterType` から `EncounterMethod` の選択可否を自動判定

### 3.5 状態管理

| 状態 | 管理方式 | 永続化 | 理由 |
|------|----------|--------|------|
| Seed 入力モード | ローカル state | 不要 | セッション依存 |
| SeedOrigin[] | ローカル state | 不要 | 検索結果から都度導出 |
| エンカウント種別 / ロケーション | ローカル state | 不要 | フォーム入力中の一時値 |
| 生成パラメータ (PokemonGenerationParams) | ローカル state | 不要 | フォーム入力中の一時値 |
| GenerationConfig (user_offset, max_advance) | ローカル state | 不要 | フォーム入力中の一時値 |
| フィルタ (PokemonFilter) | ローカル state | 不要 | フォーム入力中の一時値 |
| 生成結果 (UiPokemonData[]) | ローカル state | 不要 | 表示のみ |
| 検索結果 Store (引継ぎ元) | `stores/search/results.ts` | 不要 | 既存 Store を参照のみ |

DS 設定 / トレーナー情報は既存の永続化 Store (`useDsConfigReadonly`, `useTrainer`) から取得する。

---

## 4. 実装仕様

### 4.1 types.ts — フォーム状態型 + バリデーション

```typescript
import type {
  PokemonGenerationParams,
  GenerationConfig,
  PokemonFilter,
  SeedOrigin,
  EncounterType,
  EncounterMethod,
} from '../../wasm/wasm_pkg.js';
import type { EncounterMethodKey, StaticEncounterTypeKey } from '../../data/encounters/schema';

/** Seed 入力モード */
export type SeedInputMode = 'search-results' | 'manual-seeds' | 'manual-startup';

/** ポケモンリスト生成フォーム状態 */
export interface PokemonListFormState {
  seedInputMode: SeedInputMode;
  seedOrigins: SeedOrigin[];
  encounterType: EncounterType;
  encounterMethod: EncounterMethod;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: PokemonFilter | undefined;
}

/** バリデーションエラーコード */
export type PokemonListValidationErrorCode =
  | 'SEEDS_EMPTY'
  | 'ENCOUNTER_SLOTS_EMPTY'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'SEEDS_INVALID';

/** バリデーション結果 */
export interface PokemonListValidationResult {
  errors: PokemonListValidationErrorCode[];
  isValid: boolean;
}

export function validatePokemonListForm(
  form: PokemonListFormState,
  hasSlots: boolean
): PokemonListValidationResult {
  const errors: PokemonListValidationErrorCode[] = [];

  if (form.seedOrigins.length === 0) {
    errors.push('SEEDS_EMPTY');
  }
  if (!hasSlots) {
    errors.push('ENCOUNTER_SLOTS_EMPTY');
  }
  if (form.genConfig.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (form.genConfig.max_advance < form.genConfig.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  return { errors, isValid: errors.length === 0 };
}
```

### 4.2 Worker タスク型追加 — workers/types.ts

既存の `SearchTask` union に `PokemonListTask` を追加する。

```typescript
import type {
  SeedOrigin,
  PokemonGenerationParams,
  GenerationConfig,
  PokemonFilter,
  GeneratedPokemonData,
} from '../wasm/wasm_pkg.js';

/** ポケモンリスト生成タスク */
export interface PokemonListTask {
  kind: 'pokemon-list';
  origins: SeedOrigin[];
  params: PokemonGenerationParams;
  config: GenerationConfig;
  filter: PokemonFilter | undefined;
}

/** ポケモンリスト結果レスポンス */
export interface PokemonListResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'pokemon-list';
  results: GeneratedPokemonData[];
}

// SearchTask に PokemonListTask を追加
export type SearchTask =
  | EggDatetimeSearchTask
  | MtseedDatetimeSearchTask
  | GpuMtseedSearchTask
  | MtseedSearchTask
  | TrainerInfoSearchTask
  | PokemonListTask;
```

### 4.3 Worker 処理追加 — search.worker.ts

```typescript
import { generate_pokemon_list } from '../wasm/wasm_pkg.js';

async function runPokemonListGeneration(
  taskId: string,
  task: PokemonListTask,
  startTime: number
): Promise<void> {
  // generate_pokemon_list は同期 API
  const results = generate_pokemon_list(
    task.origins,
    task.params,
    task.config,
    task.filter ?? null
  );

  postResponse({
    type: 'result',
    taskId,
    resultType: 'pokemon-list',
    results,
  });

  postResponse({ type: 'done', taskId });
}
```

進捗報告は不要 (同期 API のため中間進捗を取れない)。
呼び出し元の `use-pokemon-list.ts` でローディング状態を管理する。

### 4.4 タスク生成 — services/search-tasks.ts

```typescript
import type {
  SeedOrigin,
  PokemonGenerationParams,
  GenerationConfig,
  PokemonFilter,
} from '../wasm/wasm_pkg.js';
import type { PokemonListTask } from '../workers/types';

export function createPokemonListTask(
  origins: SeedOrigin[],
  params: PokemonGenerationParams,
  config: GenerationConfig,
  filter: PokemonFilter | undefined
): PokemonListTask {
  return {
    kind: 'pokemon-list',
    origins,
    params,
    config,
    filter,
  };
}
```

### 4.5 use-pokemon-list.ts — 生成実行フック

```typescript
import { useCallback, useMemo, useState } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { initMainThreadWasm } from '@/services/wasm-init';
import { createPokemonListTask } from '@/services/search-tasks';
import {
  resolve_pokemon_data_batch,
  resolve_seeds,
} from '@/wasm/wasm_pkg.js';
import type {
  SeedOrigin,
  SeedSpec,
  PokemonGenerationParams,
  GenerationConfig,
  PokemonFilter,
  GeneratedPokemonData,
  UiPokemonData,
  RomVersion,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';

interface UsePokemonListReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  rawResults: GeneratedPokemonData[];
  uiResults: UiPokemonData[];
  error: Error | undefined;
  generate: (
    origins: SeedOrigin[],
    params: PokemonGenerationParams,
    config: GenerationConfig,
    filter: PokemonFilter | undefined
  ) => void;
  cancel: () => void;
}

export function usePokemonList(
  version: RomVersion,
  locale: SupportedLocale
): UsePokemonListReturn {
  const config = useSearchConfig(false);
  const search = useSearch(config);

  // 生成結果 (GeneratedPokemonData[])
  const rawResults = useMemo(() => {
    const flat: GeneratedPokemonData[] = [];
    for (const batch of search.results) {
      if (Array.isArray(batch) && batch.length > 0) {
        const first = batch[0];
        if (first && 'core' in first && 'advance' in first) {
          flat.push(...(batch as GeneratedPokemonData[]));
        }
      }
    }
    return flat;
  }, [search.results]);

  // 表示用データに変換 (メインスレッド)
  const uiResults = useMemo(() => {
    if (rawResults.length === 0) return [];
    return resolve_pokemon_data_batch(rawResults, version, locale);
  }, [rawResults, version, locale]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: PokemonGenerationParams,
      genConfig: GenerationConfig,
      filter: PokemonFilter | undefined
    ) => {
      const task = createPokemonListTask(origins, params, genConfig, filter);
      search.start([task]);
    },
    [search]
  );

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    rawResults,
    uiResults,
    error: search.error,
    generate,
    cancel: search.cancel,
  };
}

/**
 * SeedSpec を SeedOrigin[] に変換するヘルパー
 *
 * メインスレッドの WASM 初期化が必要。
 */
export async function resolveSeedOrigins(spec: SeedSpec): Promise<SeedOrigin[]> {
  await initMainThreadWasm();
  return resolve_seeds(spec);
}
```

### 4.6 pokemon-list-page.tsx — ページコンポーネント構成

```
FeaturePageLayout
├── Controls
│   ├── SearchControls (PC)
│   ├── SeedInputSection
│   │   ├── モード切替 (search-results / manual-seeds / manual-startup)
│   │   ├── [search-results] Store から SeedOrigin[] を表示
│   │   ├── [manual-seeds] LCG Seed テキスト入力 → resolve_seeds
│   │   └── [manual-startup] DS 日時 + 条件入力 → resolve_seeds
│   ├── PokemonParamsForm
│   │   ├── エンカウント種別 (EncounterType Select)
│   │   ├── ロケーション / 固定ポケモン (条件付き Select)
│   │   ├── エンカウント方法 (Stationary / Moving) ※ロケーションベースのみ
│   │   ├── 先頭特性 (LeadAbilityEffect: None / Synchronize / CompoundEyes)
│   │   ├── user_offset / max_advance
│   │   └── (トレーナー情報は DS 設定 / Trainer Store から自動取得)
│   ├── PokemonFilterForm
│   │   ├── IV 範囲 (IvRangeInput)
│   │   ├── 性格 (NatureSelect)
│   │   ├── めざパタイプ (HiddenPowerSelect)
│   │   ├── 色違い (ShinyFilter)
│   │   ├── 性別 (Gender)
│   │   └── 特性スロット (AbilitySlot)
│   └── バリデーションエラー表示
├── Results
│   ├── 件数表示
│   ├── DataTable (UiPokemonData[])
│   └── ResultDetailDialog
└── モバイル固定検索バー
```

### 4.7 PokemonParamsForm — エンカウント選択フォーム

エンカウント種別の選択 UI は以下のフローで動作する:

```typescript
// エンカウント種別の分類
const LOCATION_BASED_TYPES: EncounterType[] = [
  'Normal', 'ShakingGrass', 'DustCloud', 'PokemonShadow',
  'Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble',
];

const STATIC_TYPES: EncounterType[] = [
  'StaticSymbol', 'StaticStarter', 'StaticFossil', 'StaticEvent',
  'Roamer', 'HiddenGrotto',
];
```

- `isLocationBasedEncounter()` (既存ヘルパー) で判定
- ロケーションベース: `listLocations()` → `listSpecies()` でスロット情報を取得 → `toEncounterSlotConfigs()` で WASM 型に変換
- 固定エンカウント: `listSpecies()` で static エントリ取得 → `toEncounterSlotConfigFromEntry()` で WASM 型に変換

EncounterMethod の自動判定:

| EncounterType | EncounterMethod 選択 |
|---------------|---------------------|
| 固定系 (StaticSymbol, StaticStarter, ...) | `Stationary` 固定 (非表示) |
| 野生系 (Normal, Surfing, ...) | ユーザー選択 (デフォルト: `Stationary`) |

### 4.8 pokemon-result-columns.tsx — テーブルカラム定義

`UiPokemonData` のフィールドを DataTable のカラムとして定義する。

| カラム | フィールド | 説明 |
|--------|-----------|------|
| Advance | `advance` | フレーム消費数 |
| 種族 | `species_name` | ポケモン名 |
| 性格 | `nature_name` | 性格名 |
| 特性 | `ability_name` | 特性名 |
| 性別 | `gender_symbol` | ♂/♀/- |
| 色違い | `shiny_symbol` | ◇/☆/空 |
| IV | `ivs` | H-A-B-C-D-S |
| めざパ | `hidden_power_type` | タイプ名 |
| Lv | `level` | レベル |
| PID | `pid` | 性格値 (hex) |
| 同期 | `sync_applied` | 〇/× |
| 持ち物 | `held_item_name` | 持ち物名 (あれば) |
| 詳細 | — | ダイアログ表示ボタン |

モバイル表示では ResultCardList へ自動切替 (既存の DataTable/ResultCardList 機構)。

### 4.9 result-detail-dialog.tsx — 結果詳細ダイアログ

`UiPokemonData` の全フィールドを表示するダイアログ。

- Seed 情報 (base_seed, mt_seed, datetime_iso, timer0, vcount, key_input)
- 個体情報 (種族, 性格, 特性, 性別, 色違い, IV, ステータス, めざパ, PID)
- エンカウント情報 (移動エンカウント判定, 特殊エンカウント判定)

egg-search の `result-detail-dialog.tsx` を参考に実装する。

### 4.10 stores/search/results.ts — 結果型拡張

```typescript
import type { GeneratedPokemonData } from '../../wasm/wasm_pkg.js';

export type SearchResult =
  | SeedOrigin[]
  | MtseedResult[]
  | EggDatetimeSearchResult[]
  | TrainerInfoSearchResult[]
  | GeneratedPokemonData[];  // 追加
```

---

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|----------|
| `validatePokemonListForm` — 正常系 | SeedOrigin あり + スロットあり + 正常な advance 範囲で isValid = true |
| `validatePokemonListForm` — 異常系 | SEEDS_EMPTY, ENCOUNTER_SLOTS_EMPTY, ADVANCE_RANGE_INVALID, OFFSET_NEGATIVE の各条件 |
| エンカウントスロット構築 | `toEncounterSlotConfigs`, `toEncounterSlotConfigFromEntry` の変換 (既存テスト確認) |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| Worker 経由 pokemon-list 生成 | Worker 起動 → `pokemon-list` タスク → `GeneratedPokemonData[]` 返却。結果 1 件以上 |

### 5.3 コンポーネントテスト (想定)

コンポーネントテストは本仕様のスコープ外とする。
最低限、以下のスモークテストを手動確認する:

- エンカウント種別変更でロケーション/固定ポケモンのセレクトが切り替わること
- Seed 入力モード切替で入力 UI が切り替わること
- 生成ボタン押下で DataTable に結果が表示されること

---

## 6. 翻訳方針

- UI ラベルは `<Trans>` / `t` で Lingui を使用する
- エンカウント種別名やロケーション名は `game-data-names.ts` および encounter データの `displayNameKey` を使用する
- バリデーションエラーメッセージは `useMemo` + `t` テンプレートリテラルで翻訳済み Record を生成する (既存パターンに準拠)

---

## 7. 実装チェックリスト

- [ ] `src/features/pokemon-list/types.ts` — フォーム状態型 + バリデーション
- [ ] `src/features/pokemon-list/index.ts` — re-export
- [ ] `src/workers/types.ts` — `PokemonListTask` + `PokemonListResultResponse` 追加
- [ ] `src/workers/search.worker.ts` — `pokemon-list` タスク処理追加
- [ ] `src/services/search-tasks.ts` — `createPokemonListTask` 追加
- [ ] `src/stores/search/results.ts` — `GeneratedPokemonData[]` を SearchResult に追加
- [ ] `src/features/pokemon-list/hooks/use-pokemon-list.ts` — 生成フック
- [ ] `src/features/pokemon-list/components/seed-input-section.tsx` — Seed 入力セクション
- [ ] `src/features/pokemon-list/components/pokemon-params-form.tsx` — エンカウント / 生成パラメータ
- [ ] `src/features/pokemon-list/components/pokemon-filter-form.tsx` — フィルタ入力
- [ ] `src/features/pokemon-list/components/pokemon-result-columns.tsx` — カラム定義
- [ ] `src/features/pokemon-list/components/result-detail-dialog.tsx` — 詳細ダイアログ
- [ ] `src/features/pokemon-list/components/pokemon-list-page.tsx` — ページ統合
- [ ] `src/test/unit/pokemon-list-validation.test.ts` — バリデーションテスト
- [ ] `src/test/integration/pokemon-list-worker.test.ts` — Worker 統合テスト
- [ ] `app.tsx` — `pokemon-list` ルートにページコンポーネントを登録
