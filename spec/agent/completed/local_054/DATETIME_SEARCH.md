# MT Seed 起動時刻検索 仕様書

## 1. 概要

### 1.1 目的

指定した MT Seed に対応する DS 起動日時・条件 (Timer0, VCount, キー入力) を逆引きする機能を実装する。ナビゲーション (local_053) の「検索」カテゴリ内「起動時刻検索」機能として配置する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| MT Seed | Mersenne Twister の初期化シード (32bit)。IV 決定に使用 |
| LCG Seed (Base Seed) | SHA-1 ハッシュから導出される初期シード (64bit)。UI では Base Seed と表示 |
| Timer0 / VCount | DS 起動時のハードウェアパラメータ。SHA-1 メッセージの構成要素 |
| KeySpec | 探索対象のボタン組み合わせ仕様。`available_buttons` で指定したボタンの全組み合わせを探索 |
| SeedOrigin | 検索結果 1 件の構造体。`Startup` バリアントに datetime + condition を含む |
| DatetimeSearchContext | 起動時刻検索の共通入力。DS 設定 + 日付範囲 + 時刻範囲 + Timer0/VCount 範囲 + KeySpec |

### 1.3 背景・問題

ロードマップ Phase 3 の検索機能。DS 設定 (Phase 3.1) + ナビゲーション (local_053) 完了後、検索基盤 (Worker/Store) を活用する最初の検索機能。

本 spec では MT Seed 起動時刻検索のみを扱う。孵化検索は local_055 で別途実装する。両機能で共有する入力コンポーネント (KeySpecInput, TargetSeedsInput, SearchContextForm) は本 spec で作成する。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| MT Seed 起動時刻特定 | 目的の MT Seed を出すための DS 起動日時 + 条件を検索 |
| CPU/GPU 両対応 | 既存 WorkerPool 基盤で CPU (SIMD) / GPU (WebGPU) 検索可能 |
| 共通コンポーネント整備 | KeySpecInput, SearchContextForm 等を共通部品として作成し、local_055 以降で再利用 |

### 1.5 着手条件

- [x] Phase 1 基盤 (Worker, Store, i18n, デザインシステム) 完了
- [x] Phase 2 共通コンポーネント完了
- [x] DS 設定 (Phase 3.1) 完了
- [ ] ナビゲーション (local_053) 完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/components/forms/key-spec-input.tsx` | 新規 | KeySpec 入力コンポーネント (共通) |
| `src/components/forms/target-seeds-input.tsx` | 新規 | MT Seed 入力コンポーネント (共通) |
| `src/components/forms/search-context-form.tsx` | 新規 | 検索コンテキスト入力フォーム (共通) |
| `src/components/forms/index.ts` | 変更 | 新コンポーネントの re-export 追加 |
| `src/features/datetime-search/index.ts` | 新規 | 公開 API (re-export) |
| `src/features/datetime-search/types.ts` | 新規 | 型定義 + バリデーション関数 |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 新規 | ページコンポーネント |
| `src/features/datetime-search/components/seed-origin-columns.tsx` | 新規 | 結果テーブル列定義 |
| `src/features/datetime-search/components/result-detail-dialog.tsx` | 新規 | 結果詳細ダイアログ |
| `src/features/datetime-search/hooks/use-datetime-search.ts` | 新規 | 検索実行ロジック |
| `src/lib/format.ts` | 変更 | フォーマット関数追加 (`toHex`, `formatDatetime`, `formatKeyCode`) |
| `src/components/layout/feature-page-layout.tsx` | 新規 | FeaturePageLayout Compound Component (Controls / Results 2 ペイン) |
| `src/components/layout/feature-content.tsx` | 変更 | `datetime-search` の `case` を実ページに差し替え |

## 3. 設計方針

### 3.1 画面構成

PC 版 (`lg+`) では `FeaturePageLayout` により Controls / Results の横 2 ペイン構成とする。モバイル (`< lg`) では縦積み。

```
PC (lg+)
┌─── Controls (w-[28rem]) ──┬───── Results (flex-1) ─────┐
│ [検索開始] [GPU]             │                              │
│ SearchProgress (常駐)       │ 結果テーブル (DataTable)       │
│                             │ │ 日時 | T0 | VC | Key | Base  │
│ SearchContextForm           │ │ ...                        │
│ ├ DateRangePicker            │ │ ...                        │
│ ├ TimeRangePicker            │ │ (internal scroll)          │
│ └ KeySpecInput (コントローラ型) │                              │
│                             │ ResultDetailDialog          │
│ TargetSeedsInput            │                              │
└─────────────────────────────┴──────────────────────────────┘

モバイル (< lg)
┌────────────────────────────────┐
│ [検索開始] [GPU]                 │
│ SearchProgress (常駐)           │
│                                  │
│ SearchContextForm (shared)       │
│ ├ DateRangePicker                │
│ ├ TimeRangePicker                │
│ └ KeySpecInput (コントローラ型)   │
│                                  │
│ TargetSeedsInput                 │
│                                  │
│ 結果 (DataTable / CardList)       │
│ ResultDetailDialog               │
└────────────────────────────────┘
```

ページコンポーネントでの使用例:

```tsx
function DatetimeSearchPage() {
  return (
    <FeaturePageLayout>
      <FeaturePageLayout.Controls>
        <SearchButton ... />
        <SearchProgress ... /> {/* 常駐表示 */}
        <SearchContextForm ... />
        <TargetSeedsInput ... />
      </FeaturePageLayout.Controls>
      <FeaturePageLayout.Results>
        <DataTable ... />
        <ResultDetailDialog ... />
      </FeaturePageLayout.Results>
    </FeaturePageLayout>
  );
}
```

### 3.2 WASM API 対応

| レイヤー | 関数 / クラス | 説明 |
|---------|------------|------|
| タスク生成 (Main) | `generate_mtseed_search_tasks(context, target_seeds, worker_count)` | `DatetimeSearchContext` + `MtSeed[]` → `MtseedDatetimeSearchParams[]` |
| CPU 検索 (Worker) | `MtseedDatetimeSearcher` | 条件合致する `SeedOrigin[]` を返す |
| GPU 検索 (Worker) | `GpuDatetimeSearchIterator.create(context, target_seeds)` | GPU 版 |
| TS ラッパー | `createMtseedDatetimeSearchTasks()` | `services/search-tasks.ts` (既存) |

### 3.3 `DatetimeSearchContext` の組み立て

```typescript
// DS 設定: Store から取得
// 日付範囲, 時刻範囲, キー仕様: フォーム状態から取得
interface DatetimeSearchContext {
  ds: DsConfig;
  date_range: DateRangeParams;
  time_range: TimeRangeParams;
  ranges: Timer0VCountRange[];
  key_spec: KeySpec;
}
```

DS 設定 (`DsConfig`, `Timer0VCountRange[]`) はサイドバーで管理済み。ページコンポーネントが Store から取得し、検索開始時にフォーム状態とマージして `DatetimeSearchContext` を構築する。

### 3.4 状態管理

| 状態 | 管理方式 | 永続化 | 理由 |
|------|---------|--------|------|
| DS 設定 | `useDsConfigStore` (既存) | localStorage | 複数機能で共有 |
| 検索結果 (`SeedOrigin[]`) | `useSearchResultsStore` (既存) | なし | セッション中のみ有効 |
| 検索条件 (日付範囲/時刻範囲/キー/Target Seeds) | `useState` (ローカル) | なし | 機能固有、試行錯誤で頻繁に変わる |
| 進捗、Worker 状態 | `useSearch` フック内 (既存) | なし | 一時的 |

### 3.5 バリデーション

バリデーションは feature 層で純粋関数として実装する。

| 検証項目 | 条件 | エラーメッセージ |
|---------|------|----------------|
| 日付範囲 | 開始日 ≤ 終了日 | 開始日は終了日以前を指定してください |
| 時刻範囲 | 各フィールド範囲内 (hour: 0-23, minute: 0-59, second: 0-59) | 時刻の範囲が無効です |
| Target Seeds | 1 件以上 | MT Seed を 1 つ以上入力してください |
| Target Seeds 値 | $0 \le \text{seed} \le \text{0xFFFFFFFF}$ | MT Seed は 0〜FFFFFFFF の範囲で指定してください |

### 3.6 翻訳方針

- UI ラベル: Lingui `<Trans>` マクロ / `t` 関数を使用
- WASM 由来の表示文字列: 本機能では不要 (SeedOrigin は数値データのみ)
- 対象ロケール: `ja` / `en`

## 4. 実装仕様

### 4.1 機能固有型 (`types.ts`)

```typescript
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  MtSeed,
} from '../../wasm/wasm_pkg.js';

/** MT Seed 検索フォーム状態 */
export interface MtseedSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  targetSeedsRaw: string;
}

/** バリデーション結果 */
export interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

/** Target Seeds パース結果 */
export interface ParsedTargetSeeds {
  seeds: MtSeed[];
  errors: { line: number; value: string; message: string }[];
}

export function validateMtseedSearchForm(
  form: MtseedSearchFormState,
  parsedSeeds: ParsedTargetSeeds,
): ValidationResult;

export function parseTargetSeeds(input: string): ParsedTargetSeeds;
```

### 4.2 共通コンポーネント: KeySpecInput

```
src/components/forms/key-spec-input.tsx
```

DS ボタンの選択 UI。`KeySpec` 型と対応する。DS コントローラ風レイアウトで表示する。

```typescript
interface KeySpecInputProps {
  value: KeySpec;
  onChange: (value: KeySpec) => void;
  disabled?: boolean;
}
```

| 項目 | 仕様 |
|------|------|
| レイアウト | DS コントローラ風: ショルダー (L/R) 上段、D-Pad (十字) 左側、Face (XYAB ダイヤモンド) 右側、Select/Start 下部中央に横並び |
| ボタン一覧 | A, B, X, Y, L, R, Start, Select, ↑, ↓, ←, → (トグルボタン) |
| 組み合わせ数表示 | `get_key_combination_count(key_spec)` (WASM) で計算した値を表示 |
| WASM 未初期化時 | ボタン数のみ表示 (組み合わせ数のフォールバック) |

### 4.3 共通コンポーネント: TargetSeedsInput

```
src/components/forms/target-seeds-input.tsx
```

MT Seed の直接入力フィールド。

```typescript
interface TargetSeedsInputProps {
  value: string;
  onChange: (raw: string) => void;
  parsedSeeds: MtSeed[];
  errors: { line: number; value: string; message: string }[];
  disabled?: boolean;
}
```

| 項目 | 仕様 |
|------|------|
| 入力方式 | `<textarea>` で改行区切りの 16 進数 |
| 入力形式 | 1 行 1 Seed、`0x` プレフィックスは任意 |
| パース結果表示 | 有効 Seed 数を表示 (例: `有効な Seed: 3`) |
| エラー表示 | パースエラー行をインラインで表示 |

### 4.4 共通コンポーネント: SearchContextForm

```
src/components/forms/search-context-form.tsx
```

日付範囲 / 時刻範囲 / キー仕様の共通入力フォーム。MT Seed 検索・孵化検索の両方で使用する。

```typescript
interface SearchContextFormProps {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  onDateRangeChange: (range: DateRangeParams) => void;
  onTimeRangeChange: (range: TimeRangeParams) => void;
  onKeySpecChange: (spec: KeySpec) => void;
  disabled?: boolean;
}
```

DS 設定 (`DsConfig`, `Timer0VCountRange[]`, `GameStartConfig`) はサイドバーで管理済みのため、このフォームには含めない。

### 4.5 ページコンポーネント (`DatetimeSearchPage`)

```
src/features/datetime-search/components/datetime-search-page.tsx
```

「起動時刻検索」機能のエントリポイント。

```typescript
function DatetimeSearchPage(): ReactElement;
```

責務:

1. フォーム状態 (`MtseedSearchFormState`) の `useState` 管理
2. `parseTargetSeeds` で入力パース
3. `validateMtseedSearchForm` でバリデーション
4. `useDatetimeSearch` で検索実行
5. Store から DS 設定を取得し `DatetimeSearchContext` を組み立て
6. 結果テーブル + 詳細ダイアログの描画

### 4.6 結果テーブル列定義 (`seed-origin-columns.tsx`)

| 列 | フィールド | 表示形式 |
|----|----------|---------|
| 日時 | `datetime` | `YYYY/MM/DD HH:mm:ss` |
| Timer0 | `condition.timer0` | 16 進 4 桁 (例: `0C7A`) |
| VCount | `condition.vcount` | 16 進 2 桁 (例: `60`) |
| キー入力 | `condition.key_code` | ボタン名リスト or `なし` |
| Base Seed | `base_seed` | 16 進 16 桁 |
| MT Seed | `mt_seed` | 16 進 8 桁 |

TanStack Table の `ColumnDef<SeedOrigin>[]` として定義する。

### 4.7 結果詳細ダイアログ (`ResultDetailDialog`)

テーブル行クリックまたはカード操作で開く。Radix `Dialog` を使用。

表示項目:

| 項目 | 表示例 |
|------|--------|
| 起動日時 | `2025/01/15 12:30:45` |
| Timer0 | `0C7A` |
| VCount | `60` |
| キー入力 | `A + Start` or `なし` |
| Base Seed (LCG) | `1234567890ABCDEF` |
| MT Seed | `12345678` |

各値はコピーボタン付き。

### 4.8 検索実行フック (`use-datetime-search.ts`)

```typescript
interface UseDatetimeSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: SeedOrigin[];
  error: Error | undefined;
  startSearch: (
    context: DatetimeSearchContext,
    targetSeeds: MtSeed[],
  ) => void;
  cancel: () => void;
}

export function useDatetimeSearch(useGpu: boolean): UseDatetimeSearchReturn;
```

処理フロー:

1. UI から `startSearch(context, targetSeeds)` 呼び出し
2. `createMtseedDatetimeSearchTasks(context, targetSeeds, workerCount)` でタスク分割
3. `useSearch.start(tasks)` で WorkerPool に投入
4. 結果を `useSearchResultsStore` に蓄積
5. フックが Store の `results` を `SeedOrigin[]` に型変換して返す

### 4.9 フォーマットユーティリティ (`lib/format.ts`)

既存ファイルに下記関数を追加する (既存実装がある場合は再利用):

```typescript
/** 数値を 16 進文字列にフォーマット (指定桁数ゼロ埋め) */
export function toHex(value: number | bigint, digits: number): string;

/** WASM Datetime 型を表示文字列にフォーマット */
export function formatDatetime(dt: Datetime): string;

/** KeyCode からボタン名リストを逆引き */
export function formatKeyCode(keyCode: number): string;
```

### 4.10 FeatureContent 更新

`components/layout/feature-content.tsx` の `switch` に `datetime-search` の `case` を追加:

```typescript
case 'datetime-search':
  return <DatetimeSearchPage />;
```

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|---------|
| `target-seeds-parser.test.ts` | `parseTargetSeeds`: 正常値・空文字・不正値・`0x` プレフィックスの解析 |
| `datetime-search-validation.test.ts` | `validateMtseedSearchForm`: 日付範囲逆転、Seeds 空、正常ケースの検証 |
| `format.test.ts` | `toHex`, `formatDatetime`, `formatKeyCode` の各種フォーマット |

### 5.2 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 |
|--------|---------|
| `key-spec-input.test.tsx` | ボタン選択 / 解除で `onChange` が正しい `KeySpec` を返す |
| `target-seeds-input.test.tsx` | テキスト入力でパース結果とエラーが正しく表示される |

### 5.3 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|---------|
| `mtseed-datetime-search.test.ts` | WASM + Worker で既知の MT Seed を検索し、期待する `SeedOrigin` が返る |

テストデータ (リファレンス実装のデフォルト値):

```typescript
const testContext: DatetimeSearchContext = {
  ds: {
    mac: [0x00, 0x09, 0xbf, 0x0e, 0x54, 0x53],
    hardware: 'DsLite',
    version: 'Black',
    region: 'Jpn',
  },
  date_range: {
    start_year: 2025, start_month: 1, start_day: 1,
    end_year: 2025, end_month: 1, end_day: 1,
  },
  time_range: {
    hour_start: 0, hour_end: 23,
    minute_start: 0, minute_end: 59,
    second_start: 0, second_end: 59,
  },
  ranges: [{ timer0_min: 0x0c79, timer0_max: 0x0c7a, vcount_min: 0x60, vcount_max: 0x60 }],
  key_spec: { available_buttons: [] },
};
```

## 6. 実装チェックリスト

### 共通コンポーネント

- [x] `components/forms/key-spec-input.tsx` — KeySpec 入力部品
- [x] `components/forms/target-seeds-input.tsx` — Target Seeds 入力部品
- [x] `components/forms/search-context-form.tsx` — 検索コンテキストフォーム
- [x] `components/forms/index.ts` — re-export 追加

### Feature: datetime-search

- [x] `features/datetime-search/types.ts` — 型定義 + バリデーション + パーサー
- [x] `features/datetime-search/hooks/use-datetime-search.ts` — 検索実行ロジック
- [x] `features/datetime-search/components/datetime-search-page.tsx` — ページコンポーネント
- [x] `features/datetime-search/components/seed-origin-columns.tsx` — 結果テーブル列定義
- [x] `features/datetime-search/components/result-detail-dialog.tsx` — 詳細ダイアログ
- [x] `features/datetime-search/index.ts` — re-export

### レイアウト・ユーティリティ

- [x] `components/layout/feature-page-layout.tsx` — FeaturePageLayout Compound Component
- [x] `components/layout/feature-content.tsx` — `datetime-search` case 追加
- [x] `lib/format.ts` — フォーマット関数追加 (既存確認後)

### テスト

- [x] `test/unit/target-seeds-parser.test.ts` — パース関数
- [x] `test/unit/datetime-search-validation.test.ts` — バリデーション
- [x] `test/unit/format.test.ts` — フォーマット関数
- [x] `test/components/key-spec-input.test.tsx` — KeySpec 入力
- [x] `test/components/target-seeds-input.test.tsx` — Target Seeds 入力
- [x] `test/integration/mtseed-datetime-search.test.ts` — Worker/WASM 統合
