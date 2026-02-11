# 個体生成(タマゴ) 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索で得た `SeedOrigin[]` (または手動指定した Seed) をもとに、各 Seed + advance に対応するタマゴ個体を一括生成し、一覧表示する。

ナビゲーション上は `generation` カテゴリの `egg-generation` 機能に対応する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SeedOrigin | `Seed` (LcgSeed + MtSeed) または `Startup` (Datetime + StartupCondition) を含む生成元情報 |
| SeedSpec | `Seeds` (直接指定) または `Startup` (DS 設定 + 日時 + Timer0/VCount) から SeedOrigin を導出する仕様 |
| GeneratedEggData | WASM が生成する中間データ。advance, PID, IV, 性格, 色違い等を含む |
| UiEggData | WASM の `resolve_egg_data_batch` が返す表示用データ。性格名等は文字列解決済み |
| EggGenerationParams | 孵化生成パラメータ (親個体値、特性、かわらずのいし、性別比、種族ID等) |
| EggFilter | IV, 性格, 色違い, 性別, 特性, 猶予フレームでのフィルタ条件 |

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

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/egg-generation/index.ts` | 新規 | re-export |
| `src/features/egg-generation/types.ts` | 新規 | フォーム状態型 + バリデーション |
| `src/features/egg-generation/hooks/use-egg-generation.ts` | 新規 | 生成実行フック |
| `src/features/egg-generation/components/egg-generation-page.tsx` | 新規 | ページコンポーネント |
| `src/features/egg-generation/components/egg-filter-form.tsx` | 新規 | フィルタ入力フォーム |
| `src/features/egg-generation/components/egg-result-columns.tsx` | 新規 | DataTable カラム定義 |
| `src/features/egg-generation/components/result-detail-dialog.tsx` | 新規 | 結果詳細ダイアログ |
| `src/components/forms/egg-params-form.tsx` | 移動 | `src/features/egg-search/components/` から移動・共通化 |
| `src/workers/types.ts` | 変更 | `EggGenerationTask` タスク型追加 |
| `src/workers/search.worker.ts` | 変更 | `egg-generation` タスク処理追加 |
| `src/services/search-tasks.ts` | 変更 | `createEggGenerationTask` 追加 |
| `src/stores/search/results.ts` | 変更 | `GeneratedEggData[]` を結果型に追加 (既存) |
| `src/test/unit/egg-generation-validation.test.ts` | 新規 | バリデーションのユニットテスト |
| `src/test/integration/egg-generation-worker.test.ts` | 新規 | Worker/WASM 統合テスト |
| `src/features/egg-search/components/egg-search-page.tsx` | 変更 | EggParamsForm の import パス更新 |

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
              resolve_egg_data_batch()  (メインスレッド)
                                   │
                                   ▼
                           UiEggData[]  → DataTable 表示
```

### 3.2 Worker 実行方式

`generate_egg_list` は同期 API だが、大量データ時のメインスレッド blocking を回避するため **Worker で実行**する。既存の `search.worker.ts` に `egg-generation` タスク種別を追加する。

- Worker 内で `generate_egg_list(origins, params, config, filter)` を一括実行
- 結果は `GeneratedEggData[]` として一括返却
- タスク分割はしない (単一 Worker で十分)
- `resolve_egg_data_batch` はメインスレッドで実行 (軽量 + ロケール依存)

### 3.3 Seed 入力方式

**個体生成(ポケモン)の `seed-input-section.tsx` を再利用**する。Tabs (Radix UI) で 3 つのタブを切り替える:

| タブ順 | SeedInputMode | 説明 | 入力元 |
|--------|---------------|------|--------|
| 1 | `manual-startup` | DS 設定 + 日時 + キー入力から `resolve_seeds()` で変換 | ユーザー入力 |
| 2 | `manual-seeds` | LCG Seed (16 進 64bit) を改行区切りで入力 | ユーザー入力 |
| 3 | `search-results` | 直前の datetime-search 結果を引き継ぐ | `useSearchResultsStore` |

#### 自動 Seed 解決

各入力モードで **入力変更時** および **タブ遷移時** に `resolve_seeds()` を自動呼び出しする。既存実装に準拠。

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
| 生成結果 (UiEggData[]) | ローカル state | 不要 | 表示のみ |
| 検索結果 Store (引継ぎ元) | `stores/search/results.ts` | 不要 | 既存 Store を参照のみ |

DS 設定 / トレーナー情報は既存の永続化 Store (`useDsConfigReadonly`, `useTrainer`) から取得する。

---

## 4. 実装仕様

### 4.1 types.ts — フォーム状態型 + バリデーション

```typescript
import type {
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  SeedOrigin,
} from '../../wasm/wasm_pkg.js';

/** Seed 入力モード */
export type SeedInputMode = 'search-results' | 'manual-seeds' | 'manual-startup';

/** タマゴ生成フォーム状態 */
export interface EggGenerationFormState {
  seedInputMode: SeedInputMode;
  seedOrigins: SeedOrigin[];
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
}

/** バリデーションエラーコード */
export type EggGenerationValidationErrorCode =
  | 'SEEDS_EMPTY'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface EggGenerationValidationResult {
  errors: EggGenerationValidationErrorCode[];
  isValid: boolean;
}

/**
 * IV 値が範囲内か検証 (0-31 または 32 = 不明)
 */
function isIvValid(value: number): boolean {
  return (value >= 0 && value <= 31) || value === 32;
}

export function validateEggGenerationForm(
  form: EggGenerationFormState
): EggGenerationValidationResult {
  const errors: EggGenerationValidationErrorCode[] = [];

  if (form.seedOrigins.length === 0) {
    errors.push('SEEDS_EMPTY');
  }
  if (form.genConfig.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (form.genConfig.max_advance < form.genConfig.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  // 親個体値の範囲チェック
  const maleIvs = Object.values(form.eggParams.parent_male);
  const femaleIvs = Object.values(form.eggParams.parent_female);
  if (!maleIvs.every(isIvValid) || !femaleIvs.every(isIvValid)) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
```

### 4.2 Worker タスク型追加 — workers/types.ts

既存の `SearchTask` union に `EggGenerationTask` を追加する。

```typescript
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  GeneratedEggData,
} from '../wasm/wasm_pkg.js';

/** タマゴ生成タスク */
export interface EggGenerationTask {
  kind: 'egg-generation';
  origins: SeedOrigin[];
  params: EggGenerationParams;
  config: GenerationConfig;
  filter: EggFilter | undefined;
}

/** タマゴ生成結果レスポンス */
export interface EggGenerationResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'egg-generation';
  results: GeneratedEggData[];
}

// SearchTask に EggGenerationTask を追加
export type SearchTask =
  | EggDatetimeSearchTask
  | MtseedDatetimeSearchTask
  | GpuMtseedSearchTask
  | MtseedSearchTask
  | TrainerInfoSearchTask
  | PokemonListTask
  | EggGenerationTask;
```

### 4.3 Worker 処理追加 — search.worker.ts

```typescript
import { generate_egg_list } from '../wasm/wasm_pkg.js';

async function runEggGeneration(
  taskId: string,
  task: EggGenerationTask,
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
    resultType: 'egg-generation',
    results,
  });

  postResponse({ type: 'done', taskId });
}
```

進捗報告は不要 (同期 API のため中間進捗を取れない)。呼び出し元の `use-egg-generation.ts` でローディング状態を管理する。

### 4.4 タスク生成 — services/search-tasks.ts

```typescript
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
} from '../wasm/wasm_pkg.js';
import type { EggGenerationTask } from '../workers/types';

export function createEggGenerationTask(
  origins: SeedOrigin[],
  params: EggGenerationParams,
  config: GenerationConfig,
  filter: EggFilter | undefined
): EggGenerationTask {
  return {
    kind: 'egg-generation',
    origins,
    params,
    config,
    filter,
  };
}
```

### 4.5 use-egg-generation.ts — 生成実行フック

```typescript
import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { initMainThreadWasm } from '@/services/wasm-init';
import { createEggGenerationTask } from '@/services/search-tasks';
import { resolve_egg_data_batch, resolve_seeds } from '@/wasm/wasm_pkg.js';
import type {
  SeedOrigin,
  SeedSpec,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  GeneratedEggData,
  UiEggData,
  RomVersion,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';

interface UseEggGenerationReturn {
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

export function useEggGeneration(
  version: RomVersion,
  locale: SupportedLocale
): UseEggGenerationReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, start, cancel } = useSearch(config);

  const rawResults = useMemo(() => {
    const flat: GeneratedEggData[] = [];
    for (const batch of results) {
      if (Array.isArray(batch) && batch.length > 0) {
        const first = batch[0];
        if (first && typeof first === 'object' && 'core' in first && 'advance' in first) {
          flat.push(...(batch as unknown as GeneratedEggData[]));
        }
      }
    }
    return flat;
  }, [results]);

  const uiResults = useMemo(() => {
    if (rawResults.length === 0) return [];
    return resolve_egg_data_batch(rawResults, version, locale);
  }, [rawResults, version, locale]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: EggGenerationParams,
      genConfig: GenerationConfig,
      filter: EggFilter | undefined
    ) => {
      const task = createEggGenerationTask(origins, params, genConfig, filter);
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

### 4.6 egg-generation-page.tsx — ページコンポーネント構成

```
FeaturePageLayout
├── Controls
│   ├── SearchControls (PC)
│   ├── SeedInputSection (pokemon-list から再利用)
│   │   ├── Tabs: manual-startup / manual-seeds / search-results
│   │   ├── [manual-startup] DatetimeInput + KeyInputSelector → autoResolveStartup
│   │   ├── [manual-seeds] LCG Seed テキスト入力 → autoResolveSeeds
│   │   └── [search-results] Store から SeedOrigin[] を表示 + "Load" ボタン
│   ├── EggParamsForm (src/components/forms/ へ移動・共通化)
│   │   ├── 種族セレクタ (新規追加: species_id 指定)
│   │   ├── 親個体値 (オス・メス)
│   │   ├── メス親特性 (AbilitySlot)
│   │   ├── かわらずのいし (EverstonePlan: None / Male / Female)
│   │   ├── 性別比率 (GenderRatio)
│   │   ├── フラグ群 (メタモン使用, ニドラン♀, 国際孵化, NPC考慮)
│   │   ├── user_offset / max_advance
│   │   └── (トレーナー情報は DS 設定 / Trainer Store から自動取得)
│   ├── EggFilterForm (折りたたみ可)
│   │   ├── IV 範囲 (IvRangeInput)
│   │   ├── 性格 (NatureSelect)
│   │   ├── めざパタイプ (HiddenPowerSelect)
│   │   ├── 色違い (ShinyFilter)
│   │   ├── 性別 (Gender)
│   │   ├── 特性スロット (AbilitySlot)
│   │   └── 猶予フレーム最小値 (min_margin_frames)
│   └── バリデーションエラー表示
├── Results
│   ├── 件数表示
│   ├── DataTable (UiEggData[], H/A/B/C/D/S 個別列)
│   └── ResultDetailDialog
└── モバイル固定検索バー
```

#### 種族セレクタの実装

```typescript
// egg-generation-page.tsx 内部または egg-params-form.tsx に追加

const [speciesOptions, setSpeciesOptions] = useState<Array<{id: number, name: string}>>([]);

useEffect(() => {
  // 全種族名を取得 (1-649)
  void initMainThreadWasm().then(() => {
    const options = Array.from({ length: 649 }, (_, i) => {
      const id = i + 1;
      return {
        id,
        name: get_species_name(id, locale),
      };
    });
    setSpeciesOptions(options);
  });
}, [locale]);

// Select UI
<Select
  value={eggParams.species_id?.toString() ?? 'none'}
  onValueChange={(value) => {
    const speciesId = value === 'none' ? undefined : Number(value);
    onEggParamsChange({ ...eggParams, species_id: speciesId });
  }}
>
  <SelectTrigger>
    <SelectValue placeholder={t`種族を選択`} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">{t`指定なし`}</SelectItem>
    {speciesOptions.map((opt) => (
      <SelectItem key={opt.id} value={opt.id.toString()}>
        #{opt.id.toString().padStart(3, '0')} {opt.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

種族リストが長いため、Combobox (検索機能付き) への変更を検討してもよい。

### 4.7 EggFilterForm — フィルタ入力フォーム

```typescript
interface EggFilterFormProps {
  value: EggFilter | undefined;
  onChange: (filter?: EggFilter) => void;
  disabled?: boolean;
}
```

フィルター有効/無効トグル (`Switch`) とリセットボタン (`RotateCcw`) をヘッダーに配置。トグル OFF 時は内部状態を保持したまま `onChange(undefined)` でフィルタ解除。

フィルター項目 (上からの表示順序):

| # | フィールド | 型 | UI 部品 | 備考 |
|---|-----------|-----|---------|------|
| 1 | 特性スロット | `AbilitySlot \| undefined` | Select | 第1 / 第2 / 夢 / 指定なし |
| 2 | 性別 | `Gender \| undefined` | Select | ♂ / ♀ / - (性別不明) / 指定なし |
| 3 | 性格 | `Nature[]` | NatureSelect (Popover) | Popover式 5×5 グリッド選択 |
| 4 | 色違い | `ShinyFilter \| undefined` | Select | 指定なし / ☆ / ◇ / ☆&◇ |
| 5 | IV 範囲 | `IvFilter` | IvRangeInput (既存) | WASM 側フィルタ |
| 6 | めざパタイプ | `HiddenPowerType[]` | Popover 4×4 グリッド | |
| 7 | めざパ威力下限 | `number \| undefined` | Input (30-70) | |
| 8 | 猶予フレーム最小値 | `number \| undefined` | Input (0-) | NPC消費考慮時に有効 |

### 4.8 egg-result-columns.tsx — テーブルカラム定義

`UiEggData` のフィールドを DataTable のカラムとして定義する。

```typescript
interface EggResultColumnsOptions {
  onSelect?: (result: UiEggData) => void;
  locale?: string;
}
```

| カラム | フィールド | 説明 |
|--------|-----------|------|
| 詳細 | — | ダイアログ表示ボタン |
| Advance | `advance` | フレーム消費数 |
| 針 | `needle_direction` | レポート針方向 (0-7 → ↑↗→↘↓↙←↖) |
| 種族 | `species_name` | ポケモン名 (species_id 指定時のみ意味を持つ) |
| 性格 | `nature_name` | 性格名 |
| 特性 | `ability_name` | 特性名 |
| 性別 | `gender_symbol` | ♂/♀/- |
| 色違い | `shiny_symbol` | ◇/☆/空 |
| H | `ivs[0]` | HP |
| A | `ivs[1]` | こうげき |
| B | `ivs[2]` | ぼうぎょ |
| C | `ivs[3]` | とくこう |
| D | `ivs[4]` | とくぼう |
| S | `ivs[5]` | すばやさ |
| めざパ | `hidden_power_type` | タイプ名 |
| PID | `pid` | 性格値 (hex) |
| 猶予F | `margin_frames` | 猶予フレーム数 (NPC考慮時) |

針方向の矢印マッピング:

```typescript
const NEEDLE_ARROWS = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'];
// 0=N(↑), 1=NE(↗), 2=E(→), 3=SE(↘), 4=S(↓), 5=SW(↙), 6=W(←), 7=NW(↖)
```

ヘッダー表記はロケールに応じて切替:
- ja: `H / A / B / C / D / S`
- en: `HP / Atk / Def / SpA / SpD / Spe`

モバイル表示では ResultCardList へ自動切替 (既存の DataTable/ResultCardList 機構)。

### 4.9 result-detail-dialog.tsx — 結果詳細ダイアログ

`UiEggData` の全フィールドを表示するダイアログ。

- Seed 情報 (base_seed, mt_seed, datetime_iso, timer0, vcount, key_input)
- 針方向 (needle_direction → 矢印記号)
- 個体情報 (種族, 性格, 特性, 性別, 色違い, IV, めざパ, PID)
- 孵化情報 (猶予フレーム, 継承スロット)

IV は `H:31 A:31 B:31 C:31 D:31 S:31` 形式で H/A/B/C/D/S ラベル付きで表示する。

### 4.10 EggParamsForm の共通化

`src/features/egg-search/components/egg-params-form.tsx` を `src/components/forms/egg-params-form.tsx` へ移動する。

**変更点**:
- 種族セレクタを追加 (`species_id: Option<u16>`)
- props インターフェースはそのまま維持
- `egg-search` と `egg-generation` の両方から利用可能にする

移動後、`egg-search` 側の import パスを更新する:

```typescript
// src/features/egg-search/components/egg-search-page.tsx
- import { EggParamsForm } from './egg-params-form';
+ import { EggParamsForm } from '@/components/forms/egg-params-form';
```

---

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|----------|
| `validateEggGenerationForm` — 正常系 | SeedOrigin あり + 正常な advance 範囲で isValid = true |
| `validateEggGenerationForm` — 異常系 | SEEDS_EMPTY, ADVANCE_RANGE_INVALID, OFFSET_NEGATIVE, IV_OUT_OF_RANGE の各条件 |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| Worker 経由 egg-generation 生成 | Worker 起動 → `egg-generation` タスク → `GeneratedEggData[]` 返却。結果 1 件以上 |
| species_id 指定時の種族反映 | species_id を指定した場合、UiEggData.species_name が正しく解決されること |

### 5.3 コンポーネントテスト (想定)

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

- [ ] `src/features/egg-generation/types.ts` — フォーム状態型 + バリデーション
- [ ] `src/features/egg-generation/index.ts` — re-export
- [ ] `src/workers/types.ts` — `EggGenerationTask` + `EggGenerationResultResponse` 追加
- [ ] `src/workers/search.worker.ts` — `egg-generation` タスク処理追加
- [ ] `src/services/search-tasks.ts` — `createEggGenerationTask` 追加
- [ ] `src/features/egg-generation/hooks/use-egg-generation.ts` — 生成フック
- [ ] `src/components/forms/egg-params-form.tsx` — EggParamsForm 移動 + 種族セレクタ追加
- [ ] `src/features/egg-search/components/egg-search-page.tsx` — import パス更新
- [ ] `src/features/egg-generation/components/egg-filter-form.tsx` — フィルタ入力
- [ ] `src/features/egg-generation/components/egg-result-columns.tsx` — カラム定義
- [ ] `src/features/egg-generation/components/result-detail-dialog.tsx` — 詳細ダイアログ
- [ ] `src/features/egg-generation/components/egg-generation-page.tsx` — ページ統合
- [ ] `src/test/unit/egg-generation-validation.test.ts` — バリデーションテスト
- [ ] `src/test/integration/egg-generation-worker.test.ts` — Worker 統合テスト
- [ ] `feature-content.tsx` — `egg-generation` ルートにページコンポーネントを登録
- [ ] 翻訳カタログ更新 (`pnpm lingui:extract`)

---

## 8. コンポーネント再利用マトリクス

| コンポーネント | 再利用元 | 新規実装 | 変更内容 |
|--------------|---------|---------|---------|
| SeedInputSection | pokemon-list | - | そのまま再利用 |
| DatetimeInput | pokemon-list | - | そのまま再利用 |
| KeyInputSelector | pokemon-list | - | そのまま再利用 |
| EggParamsForm | egg-search | - | `src/components/forms/` へ移動 + 種族セレクタ追加 |
| EggFilterForm | - | ✓ | 新規実装 (pokemon-list の PokemonFilterForm を参考) |
| EggResultColumns | - | ✓ | 新規実装 (pokemon-list の PokemonResultColumns を参考) |
| ResultDetailDialog | - | ✓ | 新規実装 (UiEggData 用) |

---

## 9. 関連ドキュメント

- [個体生成(ポケモン) 仕様書](../../completed/local_064/POKEMON_LIST.md)
- [フロントエンド構成](../../architecture/frontend-structure.md)
- [Worker 設計](../../architecture/worker-design.md)
- [状態管理方針](../../architecture/state-management.md)
