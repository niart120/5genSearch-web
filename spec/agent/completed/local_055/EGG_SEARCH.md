# 孵化起動時刻検索 仕様書

## 1. 概要

### 1.1 目的

目的の孵化個体 (IV / 性格 / 色違い等) を得るための DS 起動日時・条件を逆引きする機能を実装する。ナビゲーション (local_053) の「検索」カテゴリ内「孵化検索」機能として配置する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| LCG Seed (Base Seed) | SHA-1 ハッシュから導出される初期シード (64bit) |
| EggGenerationParams | 孵化に関する親情報。かわらずのいし、夢特性、メタモン使用、国際孵化等 |
| GenerationConfig | 検索範囲の設定。`user_offset` (開始位置) と `max_advance` (探索終了位置) |
| EggFilter | 結果絞り込み条件。IV 範囲、性格、性別、色違い、猶予フレーム等 |
| EggDatetimeSearchResult | 検索結果 1 件。SeedOrigin (起動条件) + EggCore (個体データ) + advance + margin |
| DatetimeSearchContext | 起動時刻検索の共通入力 (local_054 と共有) |

### 1.3 背景・問題

ナビゲーション (local_053) 内の「検索」カテゴリ第 2 機能。MT Seed 起動時刻検索 (local_054) で作成した共通コンポーネント (`SearchContextForm`, `KeySpecInput`, `SearchControls`) を再利用する。

孵化検索は入力パラメータが多く (親情報、国際孵化、NPC 消費等)、フォーム設計に注意を要する。WASM 側の `EggDatetimeSearcher` および関連型を活用する。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 孵化個体の起動時刻特定 | 目的の IV / 性格 / 色違い等を満たす孵化個体の起動日時 + 条件を検索 |
| フィルタリング | IV / 性格 / 性別 / 特性 / 色違い / 猶予フレームで結果を絞り込み |
| 共通基盤の再利用 | local_054 で整備した SearchContextForm, SearchControls, フォーマット関数を活用 |

### 1.5 着手条件

- [x] Phase 1 基盤 (Worker, Store, i18n, デザインシステム) 完了
- [x] Phase 2 共通コンポーネント完了
- [x] DS 設定 (Phase 3.1) 完了
- [ ] ナビゲーション (local_053) 完了
- [ ] MT Seed 起動時刻検索 (local_054) 完了 — 共通コンポーネント利用のため

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/features/egg-search/index.ts` | 新規 | 公開 API (re-export) |
| `src/features/egg-search/types.ts` | 新規 | 型定義 + バリデーション関数 |
| `src/features/egg-search/components/egg-search-page.tsx` | 新規 | ページコンポーネント |
| `src/features/egg-search/components/egg-params-form.tsx` | 新規 → 共通化 | 孵化パラメータ入力フォーム (**後日 `src/components/forms/egg-params-form.tsx` へ移動済み**) |
| `src/features/egg-search/components/egg-filter-form.tsx` | 新規 → 共通化 | 孵化フィルターフォーム (**後日 `src/components/forms/egg-filter-form.tsx` へ共通化済み。めざパフィルター追加**) |
| `src/features/egg-search/components/egg-result-columns.tsx` | 新規 | 結果テーブル列定義 |
| `src/features/egg-search/components/result-detail-dialog.tsx` | 新規 | 結果詳細ダイアログ |
| `src/features/egg-search/hooks/use-egg-search.ts` | 新規 | 検索実行ロジック |
| `src/components/layout/feature-content.tsx` | 変更 | `egg-search` の `case` を実ページに差し替え |
| `src/components/forms/iv-range-input.tsx` | 変更 | `allowUnknown` 時のラベルを `Unknown (any)` → `任意` / `Any` に変更 |

## 3. 設計方針

### 3.1 画面構成

PC 版 (`lg+`) では `FeaturePageLayout` により Controls / Results の横 2 ペイン構成とする。モバイル (`< lg`) では縦積み + 下部固定検索バー。

local_054 で確立したレスポンシブパターンを踏襲する:

- **Controls 幅**: `lg:w-[28rem]` (入力項目が多い本機能でも同一幅)
- **デュアルレンダーパターン**: 共通コンポーネント `SearchControls` (`src/components/forms/search-controls.tsx`) を PC (`hidden lg:flex`) とモバイル (`fixed bottom-14 lg:hidden`) の 2 箇所に配置。GPU トグルは不要なため `useGpu` / `onGpuChange` props を省略する
- **FeaturePageLayout**: `className="pb-32 lg:pb-4"` でモバイル固定バーとの重なりを防止
- **高さ制約伝播**: PC 版は flex チェーンで Results が 1 画面に収まる

入力項目が多いため、Controls ペイン内部では EggParamsForm と EggFilterForm を Accordion / Collapsible で折りたたみ管理する。

```
PC (lg+)
┌─── Controls (lg:w-[28rem]) ──┬───── Results (flex-1) ─────┐
│ SearchControls (hidden lg:flex) │                              │
│  (GPU トグルなし)               │ 結果テーブル (DataTable)       │
│                                │ │ 日時 | 性格 | IV | 色違い   │
│ SearchContextForm              │ │ ...                        │
│ ├ DateRangePicker              │ │ ...                        │
│ ├ TimeRangePicker              │ │ (internal scroll)          │
│ └ KeySpecInput                 │                              │
│                                │ ResultDetailDialog          │
│ ▼ EggParamsForm                │                              │
│ ├ かわらずのいし (性格指定)      │                              │
│ ├ メス親夢特性/メタモン         │                              │
│ ├ 親個体値 (♂ / ♀)            │                              │
│ ├ NPC 消費                     │                              │
│ └ offset / max_advance         │                              │
│                                │                              │
│ ▼ EggFilterForm (任意)         │                              │
│ ├ IV フィルター                 │                              │
│ └ 性格/性別/特性/色違い         │                              │
└────────────────────────────────┴──────────────────────────────┘

モバイル (< lg)
┌──────────────────────────────────┐
│ SearchContextForm (共通/local_054)│
│ ├ DateRangePicker (flex-row wrap) │
│ ├ TimeRangePicker (flex-row wrap) │
│ └ KeySpecInput (コントローラ型)    │
│                                  │
│ EggParamsForm                    │
│ ├ かわらずのいし (性格指定)        │
│ ├ メス親夢特性 / メタモン使用      │
│ ├ 性別比 / ニドラン♀             │
│ ├ 国際孵化                       │
│ ├ 親個体値 (♂ / ♀)              │
│ ├ NPC 消費                       │
│ └ user_offset / max_advance      │
│                                  │
│ EggFilterForm (任意)             │
│ ├ IV フィルター                   │
│ ├ 性格 / 性別 / 特性 / 色違い     │
│ └ 猶予フレーム下限                │
│                                  │
│ 結果テーブル (DataTable/CardList) │
│ ResultDetailDialog               │
│                                  │
│ (pb-32 でバー分の余白確保)        │
├──────────────────────────────────┤
│ BottomNav (h-14)                 │
├──────────────────────────────────┤  ← fixed bottom-14
│ SearchControls (GPU トグルなし)   │  ← モバイル固定検索バー (lg:hidden)
└──────────────────────────────────┘
```

### 3.2 WASM API 対応

| レイヤー | 関数 / クラス | 説明 |
|---------|------------|------|
| タスク生成 (Main) | `generate_egg_search_tasks(context, egg_params, gen_config, filter, worker_count)` | `DatetimeSearchContext` + 孵化条件 → `EggDatetimeSearchParams[]` |
| CPU 検索 (Worker) | `EggDatetimeSearcher` | 条件合致する `EggDatetimeSearchResult[]` を返す |
| TS ラッパー | `createEggSearchTasks()` | `services/search-tasks.ts` (既存) |

GPU 対応: 孵化検索は現時点で `GpuDatetimeSearchIterator` (MT Seed 用) のみ存在し、孵化専用の GPU 実装はない。CPU のみで検索する。

### 3.3 状態管理

| 状態 | 管理方式 | 永続化 | 理由 |
|------|---------|--------|------|
| DS 設定 | `useDsConfigStore` (既存) | localStorage | 複数機能で共有 |
| トレーナー情報 | `useTrainerStore` (既存) | localStorage | 色違い判定に必要 (TID/SID) |
| 検索結果 (`EggDatetimeSearchResult[]`) | `useSearchResultsStore` (既存) | なし | セッション中のみ有効 |
| 検索条件 (コンテキスト + 孵化パラメータ + フィルター) | `useState` (ローカル) | なし | 機能固有、試行錯誤で頻繁に変わる |
| 進捗、Worker 状態 | `useSearch` フック内 (既存) | なし | 一時的 |

### 3.4 バリデーション

| 検証項目 | 条件 | エラーメッセージ |
|---------|------|----------------|
| 日付範囲 | 開始日 ≤ 終了日 | 開始日は終了日以前を指定してください |
| 時刻範囲 | 各フィールド範囲内 | 時刻の範囲が無効です |
| max_advance | `max_advance` ≥ `user_offset` | 検索終了位置は開始位置以上を指定してください |
| user_offset | $\ge 0$ | 開始位置は 0 以上を指定してください |
| 親個体値 | 各値 0-31 または 32 (不明) | 個体値は 0〜31 の範囲で指定してください |

IV フィルターの min ≤ max はフォーム部品側 (IvRangeInput) でクランプ済み。

### 3.5 翻訳方針

- UI ラベル: Lingui `<Trans>` マクロ / `t` 関数
- WASM 由来の表示文字列 (性格名等): `resolve_egg_data_batch()` の `locale` 引数で制御
- 対象ロケール: `ja` / `en`

## 4. 実装仕様

### 4.1 機能固有型 (`types.ts`)

```typescript
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
} from '../../wasm/wasm_pkg.js';

/** 孵化検索フォーム状態 */
export interface EggSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
}

/** バリデーションエラーコード (i18n: UI 層で翻訳する) */
export type EggValidationErrorCode =
  | 'DATE_RANGE_INVALID'
  | 'TIME_RANGE_INVALID'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface ValidationResult {
  errors: EggValidationErrorCode[];
  isValid: boolean;
}

export function validateEggSearchForm(
  form: EggSearchFormState,
): ValidationResult;
```

### 4.2 EggParamsForm (`egg-params-form.tsx`)

```typescript
interface EggParamsFormProps {
  value: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  onChange: (params: EggGenerationParams) => void;
  onGenConfigChange: (config: Pick<GenerationConfig, 'user_offset' | 'max_advance'>) => void;
  disabled?: boolean;
}
```

入力フィールド (表示順):

| フィールド | 型 | UI 部品 | 備考 |
|-----------|-----|---------|------|
| 親個体値 (♂) | `Ivs` | 6 つの TextInput (0-31) + stat 毎の `[?]` Checkbox | Checkbox ON → 値 32 (`IV_VALUE_UNKNOWN`) + 入力 disabled |
| 親個体値 (♀) | `Ivs` | 6 つの TextInput (0-31) + stat 毎の `[?]` Checkbox | Checkbox ON → 値 32 (`IV_VALUE_UNKNOWN`) + 入力 disabled |
| ♀親の特性 | `AbilitySlot` | Select | 特性1 / 特性2 / 隠れ特性 → `female_ability_slot` に直接設定 |
| かわらずのいし | `Nature \| undefined` | Select (性格一覧 + なし) | `undefined` = 不使用 |
| 性別比 | `GenderRatio` | Select | 1:1, 1:3, 3:1, 7:1, 性別不明 等 |
| メタモン使用 | `boolean` | Checkbox | |
| ニドラン♀ | `boolean` | Checkbox | ニドラン♀孵化時のみ |
| 国際孵化 | `boolean` | Checkbox | |
| NPC 消費 | `boolean` | Checkbox | |
| user_offset | `number` | NumberInput | 消費開始位置 |
| max_advance | `number` | NumberInput | 探索終了位置 |

親個体値の Unknown (32) サポート:

- WASM 側 `Ivs` は各フィールド 0-31 の通常値に加え 32 (`IV_VALUE_UNKNOWN`) を受け付ける
- 値 32 は遺伝アルゴリズム内でそのまま子に伝播し、表示解決層で `"?"` として出力される
- UI: 各 stat ラベル行 (H, A, B, C, D, S) に `[?]` チェックボックスを隣接配置する
  - Checkbox ON → テキスト入力を `disabled` にし、値を `IV_VALUE_UNKNOWN` (32) に固定
  - Checkbox OFF → テキスト入力を有効化し、値を `0` にリセット
  - チェックボックスによる明示的な切り替えにより、Unknown 指定の Discovery を担保する
- AbilitySlot Select: UI 値がそのまま `female_ability_slot: AbilitySlot` として WASM API に渡される（不可逆マッピング廃止）

### 4.3 EggFilterForm (`src/components/forms/egg-filter-form.tsx`)

**後日のリファクタリングで `src/components/forms/` へ共通化済み。egg-generation / egg-search 両方で共用。**

```typescript
interface EggFilterFormProps {
  value: EggFilter | undefined;
  onChange: (filter: EggFilter | undefined) => void;
  /** Stats 表示モード。指定時に IV / Stats フィルタを切替表示する */
  statMode?: StatDisplayMode;
  statsFilter?: StatsFixedValues | undefined;
  onStatsFilterChange?: (filter: StatsFixedValues | undefined) => void;
  disabled?: boolean;
}
```

フィルター項目:

| フィールド | 型 | UI 部品 | 備考 |
|-----------|-----|---------|------|
| IV 範囲 | `IvFilter` | IvRangeInput (既存, `allowUnknown={true}`) | `statMode !== 'stats'` で表示 |
| めざパタイプ + 威力下限 | `HiddenPowerType[]` + `number?` | HiddenPowerSelect | `statMode !== 'stats'` で表示。`IvFilter.hidden_power_types` / `hidden_power_min_power` に格納 |
| 性格 | `Nature[]` | NatureSelect (複数選択) | 空 = フィルターなし |
| 性別 | `Gender \| undefined` | GenderSelect | ♂ / ♀ / 指定なし |
| 特性スロット | `AbilitySlot \| undefined` | AbilitySlotSelect | 第 1 / 第 2 / 夢 / 指定なし |
| 色違い | `ShinyFilter \| undefined` | ShinySelect | 指定なし / ☆ / ◇ / ☆&◇ |
| 猶予フレーム下限 | `number \| undefined` | Input | `undefined` = 制限なし |

フォーム全体は折りたたみ可能にし、デフォルトは閉じた状態とする。
egg-search では `statMode` を渡さずに使用するため、常に IV フィルター + めざパフィルターが表示される。

### 4.4 結果テーブル列定義 (`egg-result-columns.tsx`)

| 列 | フィールド | 表示形式 |
|----|----------|---------|
| 日時 | `source.Startup.datetime` | `YYYY/MM/DD HH:mm:ss` |
| Timer0 | `source.Startup.condition.timer0` | 16 進 4 桁 |
| VCount | `source.Startup.condition.vcount` | 16 進 2 桁 |
| 性格 | `core.nature` | 性格名 (ロケール依存) |
| H/A/B/C/D/S | `core.ivs` | 個別ステータス列 (6 列) |
| 特性 | `core.ability_slot` | スロット表示 |
| 性別 | `core.gender` | `♂` / `♀` / `-` |
| 色違い | `core.shiny_type` | `☆` / `◇` / (空) |
| 消費 | `advance` | 数値 |
| 猶予 | `margin_frames` | 数値 or `-` |

TanStack Table の `ColumnDef<EggDatetimeSearchResult>[]` として定義する。

性格名などのロケール依存表示は `resolve_egg_data_batch()` を使用するか、列定義側でマッピングするかを実装時に判断する。

### 4.5 結果詳細ダイアログ (`ResultDetailDialog`)

テーブル行クリックまたはカード操作で開く。

表示項目:

| セクション | 項目 |
|-----------|------|
| 起動条件 | 日時, Timer0, VCount, キー入力, Base Seed |
| 個体データ | IV (6 値), 性格, 特性スロット, 性別, 色違い種別 |
| 検索情報 | 消費 (advance), 猶予フレーム (margin_frames) |

各値はコピーボタン付き。

### 4.6 検索実行フック (`use-egg-search.ts`)

```typescript
interface UseEggSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: EggDatetimeSearchResult[];
  error: Error | undefined;
  startSearch: (
    context: DatetimeSearchContext,
    eggParams: EggGenerationParams,
    genConfig: GenerationConfig,
    filter: EggFilter | undefined,
  ) => void;
  cancel: () => void;
}

export function useEggSearch(): UseEggSearchReturn;
```

処理フロー:

1. UI から `startSearch()` 呼び出し
2. `createEggSearchTasks(context, eggParams, genConfig, filter, workerCount)` でタスク分割
3. `useSearch.start(tasks)` で WorkerPool に投入
4. 結果を `useSearchResultsStore` に蓄積
5. フックが Store の `results` を `EggDatetimeSearchResult[]` に型変換して返す

GPU 未対応のため `useGpu` パラメータは設けない。

### 4.7 ページコンポーネント (`EggSearchPage`)

```
src/features/egg-search/components/egg-search-page.tsx
```

```typescript
function EggSearchPage(): ReactElement;
```

責務:

1. フォーム状態 (`EggSearchFormState`) の `useState` 管理
2. `validateEggSearchForm` でバリデーション
3. `useEggSearch` で検索実行
4. Store から DS 設定 + トレーナー情報を取得し `DatetimeSearchContext` / `GenerationConfig` を構築
5. 結果テーブル + 詳細ダイアログの描画
6. デュアルレンダーパターンで共通 `SearchControls` を PC / モバイルに配置 (GPU トグルなし)

local_054 (`DatetimeSearchPage`) と同じ構造を採用する。検索ボタン・進捗・エラー表示は `src/components/forms/search-controls.tsx` の `SearchControls` を使用し、機能固有の再定義を行わない:

```tsx
import { SearchControls } from '@/components/forms/search-controls';

function EggSearchPage() {
  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC 用: hidden lg:flex */}
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
          <SearchContextForm ... />
          <EggParamsForm ... />
          <EggFilterForm ... />
        </FeaturePageLayout.Controls>
        <FeaturePageLayout.Results>
          <DataTable ... />
          <ResultDetailDialog ... />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル用固定検索バー */}
      <div className="fixed bottom-14 ... lg:hidden">
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
```

`useGpu` / `onGpuChange` を省略することで GPU トグルは描画されない。

### 4.8 FeatureContent 更新

`components/layout/feature-content.tsx` の `switch` に `egg-search` の `case` を追加:

```typescript
case 'egg-search':
  return <EggSearchPage />;
```

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|---------|
| `egg-search-validation.test.ts` | `validateEggSearchForm`: 日付範囲逆転、advance 範囲不正、正常ケースの検証 |

### 5.2 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 |
|--------|---------|
| `egg-params-form.test.tsx` | 各入力フィールドの変更で正しい `EggGenerationParams` が返る |
| `egg-filter-form.test.tsx` | フィルター入力の変更で正しい `EggFilter` が返る。折りたたみの動作 |

### 5.3 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|---------|
| `egg-datetime-search.test.ts` | WASM + Worker で既知の孵化条件を検索し、期待する `EggDatetimeSearchResult` が返る |

CI 環境制約: GPU なし環境では GPU 関連テストをスキップ (`describe.skipIf(!navigator.gpu)`)。本機能は CPU のみのため該当なし。

## 6. 実装チェックリスト

### Feature: egg-search

- [x] `features/egg-search/types.ts` — 型定義 + バリデーション関数
- [x] `features/egg-search/hooks/use-egg-search.ts` — 検索実行ロジック
- [x] `features/egg-search/components/egg-params-form.tsx` — 孵化パラメータフォーム
- [x] `features/egg-search/components/egg-filter-form.tsx` — 孵化フィルターフォーム
- [x] `features/egg-search/components/egg-search-page.tsx` — ページコンポーネント
- [x] `features/egg-search/components/egg-result-columns.tsx` — 結果テーブル列定義
- [x] `features/egg-search/components/result-detail-dialog.tsx` — 詳細ダイアログ
- [x] `features/egg-search/index.ts` — re-export

### 統合

- [x] `components/layout/feature-content.tsx` — `egg-search` case 追加

### IV Unknown UI 改善

- [x] `features/egg-search/components/egg-params-form.tsx` — `ParentIvsInput` に stat 毎の `[?]` Checkbox 追加
- [x] `features/egg-search/components/egg-filter-form.tsx` — `IvRangeInput` に `allowUnknown` prop を渡す
- [x] `components/forms/iv-range-input.tsx` — ラベル `Unknown (any)` → `任意` / `Any` に変更
- [x] `test/components/egg-params-form.test.tsx` — Checkbox トグルのテスト追加
- [x] `test/components/egg-filter-form.test.tsx` — `allowUnknown` 表示のテスト追加

### テスト

- [x] `test/unit/egg-search-validation.test.ts` — バリデーション
- [x] `test/components/egg-params-form.test.tsx` — 孵化パラメータフォーム
- [x] `test/components/egg-filter-form.test.tsx` — フィルターフォーム
- [x] `test/integration/egg-datetime-search.test.ts` — Worker/WASM 統合

### 後日リファクタリング (local_067 で実施)

- [x] `features/egg-search/components/egg-params-form.tsx` → `src/components/forms/egg-params-form.tsx` へ共通化
- [x] `features/egg-search/components/egg-filter-form.tsx` → `src/components/forms/egg-filter-form.tsx` へ共通化 + めざパフィルター追加
- [x] `features/egg-search/types.ts` — `validateGenConfig` / `isIvValid` を `src/lib/validation.ts` から使用
- [x] `features/egg-search/components/egg-result-columns.tsx` — IV 表示を `formatIvs` 連結から個別 H/A/B/C/D/S カラムに変更
