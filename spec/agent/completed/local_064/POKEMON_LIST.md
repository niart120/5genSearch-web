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
- トレーナー情報設定 UI (TID/SID) がサイドバーに実装されていること (別チケット)
- WASM: `get_species_name(species_id, locale)` が wasm-bindgen で export されていること (種族フィルタ UI に必要)

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

Tabs (Radix UI) で 3 つのタブを切り替える:

| タブ順 | SeedInputMode | 説明 | 入力元 |
|--------|---------------|------|--------|
| 1 | `manual-startup` | DS 設定 + 日時 + キー入力から `resolve_seeds()` で変換 | ユーザー入力 |
| 2 | `manual-seeds` | LCG Seed (16 進 64bit) を改行区切りで入力 | ユーザー入力 |
| 3 | `search-results` | 直前の datetime-search 結果を引き継ぐ | `useSearchResultsStore` |

#### 自動 Seed 解決

各入力モードで **入力変更時** および **タブ遷移時** に `resolve_seeds()` を自動呼び出しする。Resolve ボタンは設けない。

- `manual-startup`: `DatetimeInput` / `KeyInputSelector` の変更時に `autoResolveStartup(datetime, keyInput)` 呼び出し
- `manual-seeds`: テキスト変更時に `autoResolveSeeds(text)` 呼び出し (hex パース失敗行があれば origins クリア)
- `search-results`: タブ遷移時に `storeOrigins` を即時反映
- **初回マウント時**: `manual-startup` が選択済みなら自動解決を実行 (`mountedRef` で 1 回のみ)
- **重複防止**: `resolvingRef` (useRef) で非同期解決の二重呼び出しを抑制

#### 日時入力 (`DatetimeInput`)

- 日時 (YYYY/MM/DD HH:MM:SS) を 1 行レイアウトで表示
- 月・日・時・分・秒はゼロ埋め 2 桁表示 (`padLength` prop)
- `NumField` コンポーネント (clamp-on-blur + フォーカス時全選択)

#### キー入力 (`KeyInputSelector`)

- DS コントローラ風レイアウト (十字キー + ABXY + L/R + Start/Select)
- トグルボタンで複数ボタン同時選択可能

### 3.4 エンカウント選択の UI フロー

2 段階セレクト方式を1 行レイアウトで採用する:

```
① エンカウント大分類 + 中分類 (1 行に並ぶ 2 つの Select)
   [野生 ▼] [草むら・洞窟 ▼]      ← サブタイプが 2 つ以上の場合のみ中分類表示
   [御三家 ▼]                     ← サブタイプが 1 つの場合は大分類のみ
      │
      ├── ロケーションベース (Normal, ShakingGrass, ...):
      │   ├── ② ロケーション (Select)
      │   └── → スロット自動決定 (toEncounterSlotConfigs)
      └── 固定エンカウント (StaticSymbol, StaticStarter, ...):
          ├── ② ポケモン選択 (Select) — 種族名を WASM `get_species_name` で解決して表示
          └── → スロット自動決定 (toEncounterSlotConfigFromEntry)
```

- `EncounterMethod` (Stationary / Moving) はロケーションベースの場合にユーザーが選択する
- 固定エンカウントの場合は `Stationary` 固定
- `EncounterType` から `EncounterMethod` の選択可否を自動判定
- 固定ポケモン選択肢の表示名は `get_species_name(speciesId, locale)` で解決 (`displayNameKey` はフォールバック)

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
│   │   ├── Tabs: manual-startup / manual-seeds / search-results
│   │   ├── [manual-startup] DatetimeInput (1 行) + KeyInputSelector (DS 風) → autoResolveStartup
│   │   ├── [manual-seeds] LCG Seed テキスト入力 → autoResolveSeeds
│   │   └── [search-results] Store から SeedOrigin[] を表示 + "Load" ボタン
│   ├── PokemonParamsForm
│   │   ├── エンカウント大分類 (ENCOUNTER_CATEGORIES Select)
│   │   ├── エンカウント中分類 (サブタイプ Select) ※ 2 種以上のカテゴリのみ表示
│   │   ├── ロケーション / 固定ポケモン (条件付き Select)
│   │   ├── エンカウント方法 (Stationary / Moving) ※ロケーションベースのみ
│   │   ├── 先頭特性 (LeadAbilityEffect: None / Synchronize / CompoundEyes)
│   │   ├── user_offset / max_advance
│   │   └── (トレーナー情報は DS 設定 / Trainer Store から自動取得)
│   ├── PokemonFilterForm (折りたたみ可)
│   │   ├── 種族 (SpeciesMultiSelect)
│   │   ├── IV 範囲 (IvRangeInput)
│   │   ├── 性格 (NatureSelect)
│   │   ├── めざパタイプ (HiddenPowerSelect)
│   │   ├── 色違い (ShinyFilter)
│   │   ├── 性別 (Gender)
│   │   └── 特性スロット (AbilitySlot)
│   └── バリデーションエラー表示
├── Results
│   ├── 件数表示 + Stats/IV トグルスイッチ
│   ├── DataTable (UiPokemonData[], H/A/B/C/D/S 個別列)
│   └── ResultDetailDialog
└── モバイル固定検索バー
```

#### Stats/IV トグルスイッチ

- デフォルト: 実ステータス (`stats`) 表示
- Switch (Radix UI) で IV 表示に切替可能
- `StatDisplayMode = 'stats' | 'ivs'` で管理
- DataTable のカラム定義を `statMode` に応じて動的に切り替え

### 4.7 PokemonParamsForm — エンカウント選択フォーム

2 段階セレクト方式でエンカウントを選択する。

```typescript
/** エンカウントタイプのカテゴリ定義 */
interface EncounterCategory {
  labelKey: string;
  labels: Record<SupportedLocale, string>;
  types: (EncounterMethodKey | StaticEncounterTypeKey)[];
}

const ENCOUNTER_CATEGORIES: EncounterCategory[] = [
  { labelKey: 'wild', labels: { ja: '野生', en: 'Wild' },
    types: ['Normal', 'ShakingGrass', 'DustCloud', 'PokemonShadow', 'Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble'] },
  { labelKey: 'legendary', labels: { ja: '伝説・準伝説', en: 'Legendary / Mythical' },
    types: ['StaticSymbol', 'StaticEvent'] },
  { labelKey: 'roamer', labels: { ja: '徘徊', en: 'Roamer' }, types: ['Roamer'] },
  { labelKey: 'starter', labels: { ja: '御三家', en: 'Starter' }, types: ['StaticStarter'] },
  { labelKey: 'fossil', labels: { ja: '化石', en: 'Fossil' }, types: ['StaticFossil'] },
  { labelKey: 'hidden-grotto', labels: { ja: 'かくしあな', en: 'Hidden Grotto' }, types: ['HiddenGrotto'] },
];
```

- `isLocationBasedEncounter()` (既存ヘルパー) で判定
- ロケーションベース: `listLocations()` → `listSpecies()` でスロット情報を取得 → `toEncounterSlotConfigs()` で WASM 型に変換
- 固定エンカウント: `listSpecies()` で static エントリ取得 → `toEncounterSlotConfigFromEntry()` で WASM 型に変換
- 固定ポケモン選択肢の表示名: `get_species_name(speciesId, locale)` で WASM から解決 (`useEffect` + `initMainThreadWasm`)
- カテゴリ変更時: サブタイプが 1 つなら自動選択、2 つ以上なら先頭を初期選択

EncounterMethod の自動判定:

| EncounterType | EncounterMethod 選択 |
|---------------|---------------------|
| 固定系 (StaticSymbol, StaticStarter, ...) | `Stationary` 固定 (非表示) |
| 野生系 (Normal, Surfing, ...) | ユーザー選択 (デフォルト: `Stationary`) |

### 4.8 PokemonFilterForm — フィルタ入力フォーム

```typescript
interface PokemonFilterFormProps {
  value: PokemonFilter | undefined;
  onChange: (filter?: PokemonFilter) => void;
  statsFilter: StatsFilter | undefined;
  onStatsFilterChange: (filter?: StatsFilter) => void;
  statMode: StatDisplayMode;  // 'stats' | 'ivs' — 表示モードに応じたフィルタ切替
  availableSpecies: EncounterSpeciesOption[];
  disabled?: boolean;
}
```

フィルター有効/無効トグル (`Switch`) とリセットボタン (`RotateCcw`) をヘッダーに配置。
トグル OFF 時は内部状態を保持したまま `onChange(undefined)` でフィルタ解除。

フィルター項目 (上からの表示順序):

| # | フィールド | 型 | UI 部品 | 備考 |
|---|-----------|-----|---------|------|
| 1 | 特性スロット | `AbilitySlot \| undefined` | Select | 第1 / 第2 / 夢 / 指定なし |
| 2 | 性別 | `Gender \| undefined` | Select | ♂ / ♀ / - (性別不明) / 指定なし |
| 3 | 性格 | `Nature[]` | NatureSelect (Popover) | Popover式 5×5 グリッド選択 |
| 4 | 色違い | `ShinyFilter \| undefined` | Select | 指定なし / ☆ / ◇ / ☆&◇ |
| 5a | 実ステータス | `StatsFilter` | StatsRangeInput | `statMode === 'stats'` 時のみ表示。クライアントサイド post-filter |
| 5b | IV 範囲 | `IvFilter` | IvRangeInput (既存) | `statMode === 'ivs'` 時のみ表示。WASM 側フィルタ |
| 6 | めざパタイプ | `HiddenPowerType[]` | Popover 4×4 グリッド | IV モード時のみ有効 |
| 7 | めざパ威力下限 | `number \| undefined` | Input (30-70) | IV モード時のみ有効 |
| 8 | 種族 | `number[]` | SpeciesSelect (Popover) | Popover式開閉チェックボックスリスト |

StatsFilter は WASM ではなくクライアントサイド post-filter として適用:

```typescript
// types.ts
export interface StatsFilter {
  hp: [number, number];   // 0-999
  atk: [number, number];
  def: [number, number];
  spa: [number, number];
  spd: [number, number];
  spe: [number, number];
}
```

`pokemon-list-page.tsx` 内で `useMemo` によるフィルタリング:

```typescript
const filteredResults = useMemo(() => {
  if (!statsFilter) return uiResults;
  return uiResults.filter(r =>
    keys.every((key, i) => {
      const v = Number(r.stats[i]);
      if (Number.isNaN(v)) return true;  // '?' は通過
      return v >= statsFilter[key][0] && v <= statsFilter[key][1];
    })
  );
}, [uiResults, statsFilter]);
```

### 4.9 pokemon-result-columns.tsx — テーブルカラム定義

`UiPokemonData` のフィールドを DataTable のカラムとして定義する。
`createPokemonResultColumns(options)` は `StatDisplayMode` と `locale` を受け取り、
ステータス/IV 表示を動的に切り替える。

```typescript
type StatDisplayMode = 'stats' | 'ivs';
interface PokemonResultColumnsOptions {
  onSelect?: (result: UiPokemonData) => void;
  statMode?: StatDisplayMode;  // default: 'stats'
  locale?: string;             // default: 'ja'
}
```

| カラム | フィールド | 説明 |
|--------|-----------|------|
| 詳細 | — | ダイアログ表示ボタン |
| Advance | `advance` | フレーム消費数 |
| 針 | `needle_direction` | レポート針方向 (0-7 → ↑↗→↘↓↙←↖) |
| 種族 | `species_name` | ポケモン名 |
| 性格 | `nature_name` | 性格名 |
| 特性 | `ability_name` | 特性名 |
| 性別 | `gender_symbol` | ♂/♀/- |
| 色違い | `shiny_symbol` | ◇/☆/空 |
| H | `stats[0]` or `ivs[0]` | HP |
| A | `stats[1]` or `ivs[1]` | こうげき |
| B | `stats[2]` or `ivs[2]` | ぼうぎょ |
| C | `stats[3]` or `ivs[3]` | とくこう |
| D | `stats[4]` or `ivs[4]` | とくぼう |
| S | `stats[5]` or `ivs[5]` | すばやさ |
| めざパ | `hidden_power_type` | タイプ名 |
| Lv | `level` | レベル |
| PID | `pid` | 性格値 (hex) |
| シンクロ | `sync_applied` | 〇/× |
| 持ち物 | `held_item_name` | 持ち物名 (あれば) |

針方向の矢印マッピング:

```typescript
const NEEDLE_ARROWS = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'];
// 0=N(↑), 1=NE(↗), 2=E(→), 3=SE(↘), 4=S(↓), 5=SW(↙), 6=W(←), 7=NW(↖)
```

ヘッダー表記はロケールに応じて切替:
- ja: `H / A / B / C / D / S`
- en: `HP / Atk / Def / SpA / SpD / Spe`

モバイル表示では ResultCardList へ自動切替 (既存の DataTable/ResultCardList 機構)。

### 4.10 result-detail-dialog.tsx — 結果詳細ダイアログ

`UiPokemonData` の全フィールドを表示するダイアログ。

- Seed 情報 (base_seed, mt_seed, datetime_iso, timer0, vcount, key_input)
- 針方向 (needle_direction → 矢印記号)
- 個体情報 (種族, 性格, 特性, 性別, 色違い, IV, ステータス, めざパ, PID)
- エンカウント情報 (移動エンカウント判定, 特殊エンカウント判定)

IV/ステータスは `H:31 A:31 B:31 C:31 D:31 S:31` 形式で H/A/B/C/D/S ラベル付きで表示する。

### 4.11 stores/search/results.ts — 結果型拡張

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

- [x] `src/features/pokemon-list/types.ts` — フォーム状態型 + バリデーション
- [x] `src/features/pokemon-list/index.ts` — re-export
- [x] `src/workers/types.ts` — `PokemonListTask` + `PokemonListResultResponse` 追加
- [x] `src/workers/search.worker.ts` — `pokemon-list` タスク処理追加
- [x] `src/services/search-tasks.ts` — `createPokemonListTask` 追加
- [x] `src/stores/search/results.ts` — `GeneratedPokemonData[]` を SearchResult に追加
- [x] `src/features/pokemon-list/hooks/use-pokemon-list.ts` — 生成フック
- [x] `src/features/pokemon-list/components/seed-input-section.tsx` — Seed 入力セクション
- [x] `src/features/pokemon-list/components/pokemon-params-form.tsx` — エンカウント / 生成パラメータ
- [x] `src/features/pokemon-list/components/pokemon-filter-form.tsx` — フィルタ入力
- [x] `src/features/pokemon-list/components/pokemon-result-columns.tsx` — カラム定義
- [x] `src/features/pokemon-list/components/result-detail-dialog.tsx` — 詳細ダイアログ
- [x] `src/features/pokemon-list/components/pokemon-list-page.tsx` — ページ統合
- [x] `src/test/unit/pokemon-list-validation.test.ts` — バリデーションテスト
- [x] `src/test/integration/pokemon-list-worker.test.ts` — Worker 統合テスト
- [x] `feature-content.tsx` — `pokemon-list` ルートにページコンポーネントを登録
