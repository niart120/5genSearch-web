# 検索結果件数の事前見積もり 仕様書

## 1. 概要

### 1.1 目的

検索系機能 (datetime-search, mtseed-search, egg-search, tid-adjust) およびリスト生成機能 (pokemon-list, egg-list) において、実行開始前に結果件数を概算し、膨大な結果が予想される場合にユーザーへ警告ダイアログを表示する。WASM 側にはキャップを設けず、TS 側の見積もりロジックのみで制御する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| 検索空間サイズ | 検索パラメータから算出される、探索対象の組み合わせ総数 |
| 生成件数 | リスト生成機能において `seeds.length × (max_advance - user_offset)` で算出される総個体数 |
| ヒット率 (hit rate) | フィルタ条件を通過する結果の割合の概算値 (0.0–1.0) |
| 推定結果件数 | 検索系: `検索空間サイズ × ヒット率`、リスト生成系: `生成件数 × ヒット率` で算出する概算値 |
| 警告閾値 | 推定結果件数がこの値を超えた場合に警告ダイアログを表示する件数。デフォルト 50,000 件 |

### 1.3 背景・問題

ID 調整 (TID/SID 検索) ではフィルタ全未指定を許容する方針としたが、フィルタが緩い場合やフィルタ未指定 + 広い検索範囲の場合、結果件数が膨大になりメモリ消費・UI (DataTable) 描画の負荷が問題になる。この問題は ID 調整に限らず、datetime-search・egg-search・mtseed-search の検索系機能に共通する。

また、リスト生成機能 (pokemon-list, egg-list) でも同様の問題が発生する。多数の Seed に対して大きな `max_advance` を設定した場合、フィルタなしでは `seeds × advance` 分の全個体が UI に返され、メモリと描画の両面で問題になる。

WASM 側に呼び出し制限ロジックを設けると、キャップ値の管理が TS/Rust の両方に散逸し、予期せぬエラーの原因になるため、制御は TS 側に限定する。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| メモリ保護 | 大量結果によるブラウザのメモリ不足・タブクラッシュの防止 |
| UX 改善 | 検索開始前にフィードバックを提示し、条件の見直しを促す |
| 実装の局所性 | `services/` 層に閉じた共通ユーティリティとして実装し、各 feature から利用 |

### 1.5 着手条件

| 条件 | 状態 |
|------|------|
| 4 検索 feature + 2 リスト生成 feature のフォーム・フック実装 | 実装済み |
| `SearchControls` コンポーネント | 実装済み |
| `services/search-tasks.ts` | 実装済み |
| 警告ダイアログ UI (AlertDialog) | Radix UI で利用可能 |

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/services/search-estimation.ts` | 新規 | 見積もりロジック (検索空間サイズ計算 + ヒット率概算 + 推定結果件数) |
| `src/services/search-estimation.test.ts` → `src/test/unit/services/search-estimation.test.ts` | 新規 | 見積もりロジックのユニットテスト |
| `src/components/forms/search-confirmation-dialog.tsx` | 新規 | 警告ダイアログコンポーネント |
| `src/features/tid-adjust/components/tid-adjust-page.tsx` | 修正 | `handleSearch` に見積もり・確認ダイアログを追加 |
| `src/features/egg-search/components/egg-search-page.tsx` | 修正 | 同上 |
| `src/features/mtseed-search/components/mtseed-search-page.tsx` | 修正 | 同上 |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 修正 | 同上 |
| `src/components/forms/search-context-form.tsx` | 修正 | `keyCombinationCount` prop を各 feature ページから渡すよう対応 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 修正 | `handleGenerate` に見積もり・確認ダイアログを追加 |
| `src/features/egg-list/components/egg-list-page.tsx` | 修正 | 同上 |
| `wasm-pkg/src/lib.rs` | 修正 | `get_key_combination_count` WASM export 関数を削除 |
| `src/i18n/locales/ja/messages.po` | 修正 | 警告ダイアログの翻訳キー追加 |
| `src/i18n/locales/en/messages.po` | 修正 | 同上 |

## 3. 設計方針

### 3.1 アーキテクチャ

```
[Feature Page (検索系)]
  │
  ├── handleSearch()
  │     ├── (1) estimateXxxResults() ← services/search-estimation.ts
  │     ├── (2) 閾値超過 → SearchConfirmationDialog 表示
  │     └── (3) 確認 OK or 閾値以下 → search.start(tasks)
  │
  └── <SearchConfirmationDialog />

[Feature Page (リスト生成系)]
  │
  ├── handleGenerate()
  │     ├── (1) estimateXxxListResults() ← services/search-estimation.ts
  │     ├── (2) 閾値超過 → SearchConfirmationDialog 表示
  │     └── (3) 確認 OK or 閾値以下 → generate(seeds, params, config, filter)
  │
  └── <SearchConfirmationDialog />
```

見積もりロジックは `services/search-estimation.ts` に集約し、各 feature ページの `handleSearch` / `handleGenerate` 内で呼び出す。閾値を超えた場合は `SearchConfirmationDialog` を表示し、ユーザーの確認を得てから実行する。

### 3.2 検索空間サイズの計算

#### 3.2.1 起動時刻検索系 (datetime-search, egg-search, tid-adjust)

共通して `DatetimeSearchContext` を使用する。検索空間サイズは各パラメータの直積:

$$N_{total} = N_{days} \times N_{time} \times N_{t0vc} \times N_{keys}$$

| 変数 | 計算方法 |
|------|----------|
| $N_{days}$ | `DateRangeParams` の開始日〜終了日の暦日数 |
| $N_{time}$ | $(hour_{end} - hour_{start} + 1) \times (minute_{end} - minute_{start} + 1) \times (second_{end} - second_{start} + 1)$ |
| $N_{t0vc}$ | $\sum_{r \in ranges} (r.timer0_{max} - r.timer0_{min} + 1) \times (r.vcount_{max} - r.vcount_{min} + 1)$ |
| $N_{keys}$ | `KeySpec.available_buttons` から派生する有効組み合わせ数 |

**KeySpec の組み合わせ数**:

WASM 側に `get_key_combination_count` が export されているが、Rust 内部の検索ロジックでは使用されておらず外部向け専用である。他の見積もり系ユーティリティ (`countDays`, `countValidSeconds`) との一貫性を保つため、TS 側で再実装する。

組み合わせ数の計算ロジック:
- `available_buttons` の全部分集合 ($2^n$ 通り) から以下を除外:
  - Up + Down 同時押し
  - Left + Right 同時押し
  - L + R + Start + Select 同時押し (ソフトリセット)
- 空集合 (ボタン無し) は有効な 1 通りとして含む

なお、`KeySpecSelector` コンポーネントには `combinationCount` prop が既に定義されているが、現在どの feature ページからも渡されておらず、フォールバックとして「ボタンの数」(`available_buttons.length`) が表示されている。本件の実装時に併せて、各 feature ページから `countKeyCombinations` の結果を渡すよう修正する。

#### 3.2.2 MT Seed IV 検索 (mtseed-search)

固定の全空間: $N_{total} = 2^{32} = 4{,}294{,}967{,}296$

#### 3.2.3 リスト生成系 (pokemon-list, egg-list)

リスト生成系は検索空間の概念を持たず、結果件数が入力パラメータから正確に確定する:

$$N_{generated} = \lvert seeds \rvert \times (max\_advance - user\_offset)$$

| 変数 | 説明 |
|------|------|
| $\lvert seeds \rvert$ | 入力 `SeedOrigin[]` の要素数。事前検索の結果から選択される |
| $max\_advance$ | `GenerationConfig.max_advance`。ユーザーが任意に設定可能 (デフォルト 100) |
| $user\_offset$ | `GenerationConfig.user_offset`。生成開始位置のオフセット (デフォルト 0) |

フィルタは WASM 側で全個体を生成した**後**に適用されるため、生成件数自体は減少しない。ただし UI に返る件数はフィルタ通過分のみとなる。

#### 3.2.4 datetime-search 固有

datetime-search は日時空間をフルスキャンし、各日時の SHA-1 ハッシュから導出した MT Seed が `targetSeeds` (BTreeSet) に含まれるかをチェックする方式である。したがって推定結果件数は:

$$N_{estimated} = N_{total} \times \frac{\lvert targetSeeds \rvert}{2^{32}}$$

$N_{total}$ は起動時刻の組み合わせ数 (3.2.1 で計算)、$2^{32}$ は MT Seed の全空間サイズ。各日時から導出される MT Seed が `targetSeeds` にマッチする確率を $\lvert targetSeeds \rvert / 2^{32}$ と見積もる。

実運用で `targetSeeds` は数個〜数十個程度のため、推定結果件数は小さくなり、閾値超過はほぼ発生しない。

### 3.3 ヒット率の概算

各フィルタ条件を独立と仮定し、条件ごとのヒット率の積で全体のヒット率を概算する。

#### 3.3.1 共通フィルタ (CoreDataFilter)

| 条件 | ヒット率の概算 | 備考 |
|------|---------------|------|
| IV (各ステータス) | $(max_s - min_s + 1) / 32$ | 6 ステータスの積 |
| めざパタイプ | $\lvert selected \rvert / 16$ | 未指定時は 1.0 |
| めざパ最低威力 | $(70 - min + 1) / 41$ | 30–70 の範囲。未指定時は 1.0。IV 分布依存のため概算 |
| 性格 (Nature) | $\lvert selected \rvert / 25$ | 25 種。未指定時は 1.0 |
| 性別 (Gender) | 概算 $0.5$ | 種族依存だが概算値として固定。未指定時は 1.0 |
| 特性スロット (AbilitySlot) | $0.5$ | First/Second の 2 択。Hidden は概算外。未指定時は 1.0 |
| 色違い (ShinyFilter) | 下表参照 | 未指定時は 1.0 |
| 実ステータス (StatsFilter) | 概算対象外 | 種族・レベル依存が強く概算困難。1.0 として扱う |

**色違いのヒット率**:

| ShinyFilter | ヒット率 |
|-------------|---------|
| `Shiny` | $8 / 65536 \approx 1/8192$ |
| `Star` | $7 / 65536$ |
| `Square` | $1 / 65536$ |

#### 3.3.2 PokemonFilter 固有

| 条件 | ヒット率の概算 | 備考 |
|------|---------------|------|
| `species_ids` | 概算対象外 | エンカウントテーブル依存。1.0 として扱う |
| `level_range` | 概算対象外 | エンカウントテーブル依存。1.0 として扱う |

#### 3.3.3 EggFilter 固有

| 条件 | ヒット率の概算 | 備考 |
|------|---------------|------|
| CoreDataFilter の IV | 遺伝により 3 箇所は親 IV 由来。概算精度が下がるが、無視して $(max_s - min_s + 1)^6 / 32^6$ で概算する | 実際のヒット率はこれより高くなる可能性がある (保守的方向) |
| `min_margin_frames` | 概算対象外 | NPC 消費依存で事前計算が困難。1.0 として扱う |
| 性格 (かわらずのいし使用時) | かわらずのいしの有無で変動するが、概算では通常どおり $\lvert selected \rvert / 25$ を使用する | 保守的とは言い切れないが、簡潔さを優先 |
| 色違い (国際孵化) | `masuda_method` 使用時は $48 / 65536 \approx 1/1365$ | 通常は $8/65536$ |

#### 3.3.4 TrainerInfoFilter 固有

| 条件 | ヒット率 | 備考 |
|------|---------|------|
| TID 指定 | $1 / 65536$ | 完全一致 |
| SID 指定 | $1 / 65536$ | 完全一致 |
| shiny_pid 指定 | $8 / 65536 = 1/8192$ | TID/SID ペアが色違い条件を満たす確率 |
| 全未指定 | $1.0$ | 全件通過 |

複数条件を指定時はそれぞれ独立として積をとる。例: TID + shiny_pid 指定時 → $1/65536 \times 8/65536$

#### 3.3.5 IvFilter 固有 (mtseed-search)

mtseed-search は `IvFilter` のみを使用する。ヒット率は 3.3.1 の IV 部分と同じ計算式を適用する。

#### 3.3.6 ヒット率概算の精度について

本見積もりは保守的 (false negative 寄り) ではなく、条件によっては実際の結果件数が推定値を上回る可能性がある。あくまでユーザーへの注意喚起が目的であり、正確な件数保証を意図しない。

### 3.4 推定結果件数

**検索系**:

$$N_{estimated} = N_{total} \times P_{hit}$$

- $N_{total}$: 検索空間サイズ (3.2 で計算)
- $P_{hit}$: ヒット率 (3.3 で計算)

**リスト生成系**:

$$N_{estimated} = N_{generated} \times P_{hit}$$

- $N_{generated}$: 生成件数 $= \lvert seeds \rvert \times (max\_advance - user\_offset)$
- $P_{hit}$: フィルタのヒット率 (3.3 で計算)

**特殊ケース**:

- **mtseed-search**: $N_{estimated} = 2^{32} \times P_{iv}$
- **datetime-search**: $N_{estimated} = N_{total} \times \lvert targetSeeds \rvert / 2^{32}$。日時起動条件空間をフルスキャンし、導出された MT Seed が targetSeeds に含まれる確率で結果件数を見積もる。実運用上は targetSeeds が少数のため、閾値超過はほぼ発生しない
- **pokemon-list / egg-list**: $N_{estimated} = \lvert seeds \rvert \times (max\_advance - user\_offset) \times P_{hit}$。フィルタ未指定時は $P_{hit} = 1.0$ で生成件数がそのまま結果件数
- **フィルタ未指定時**: $P_{hit} = 1.0$ となり、検索系は $N_{estimated} = N_{total}$、リスト生成系は $N_{estimated} = N_{generated}$

### 3.5 警告閾値と UX

- **デフォルト閾値**: 50,000 件
- **閾値定数の配置**: `src/services/search-estimation.ts` に `DEFAULT_RESULT_WARNING_THRESHOLD` として定義
- **UI**: `SearchConfirmationDialog` (Radix `AlertDialog` ベース)
  - 推定結果件数を表示
  - 「検索を続行」「キャンセル」の 2 択
  - 閾値以下の場合はダイアログを表示せず、直接検索開始

## 4. 実装仕様

### 4.1 見積もりモジュール (`src/services/search-estimation.ts`)

```ts
/** 警告閾値のデフォルト値 */
export const DEFAULT_RESULT_WARNING_THRESHOLD = 50_000;

/** 見積もり結果 */
export interface EstimationResult {
  /** 検索空間サイズ (探索する組み合わせの総数) */
  searchSpaceSize: number;
  /** フィルタのヒット率概算 (0.0–1.0) */
  hitRate: number;
  /** 推定結果件数 (searchSpaceSize * hitRate) */
  estimatedCount: number;
  /** 閾値を超過しているか */
  exceedsThreshold: boolean;
}
```

#### 4.1.1 検索空間サイズ計算

```ts
/**
 * DatetimeSearchContext から検索空間サイズを計算する。
 * datetime-search, egg-search, tid-adjust で共用。
 */
export function calculateDatetimeSearchSpace(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number
): number;

/**
 * MT Seed IV 検索の検索空間サイズ (固定: 2^32)
 */
export function calculateMtseedSearchSpace(): number;
```

#### 4.1.2 ヒット率計算

```ts
/**
 * CoreDataFilter からヒット率を概算する。
 * EggFilter, PokemonFilter の base 部分に対応。
 */
export function estimateCoreDataFilterHitRate(
  filter: CoreDataFilter | undefined
): number;

/**
 * IvFilter からヒット率を概算する。
 */
export function estimateIvFilterHitRate(
  filter: IvFilter
): number;

/**
 * TrainerInfoFilter からヒット率を概算する。
 */
export function estimateTrainerInfoFilterHitRate(
  filter: TrainerInfoFilter
): number;

/**
 * EggFilter からヒット率を概算する。
 * EggFilter.base (CoreDataFilter) のヒット率を返す。
 * masuda_method フラグで色違い確率を調整。
 */
export function estimateEggFilterHitRate(
  filter: EggFilter | undefined,
  masudaMethod: boolean
): number;

/**
 * PokemonFilter からヒット率を概算する。
 * PokemonFilter.base (CoreDataFilter) のヒット率を返す。
 * species_ids / level_range は概算対象外 (1.0)。
 */
export function estimatePokemonFilterHitRate(
  filter: PokemonFilter | undefined
): number;
```

#### 4.1.3 feature 別の統合推定関数

```ts
/**
 * datetime-search の推定結果。
 * 探索空間フルスキャン + BTreeSet ルックアップ方式に基づき、
 * N_total * (targetSeedsCount / 2^32) で推定。
 */
export function estimateDatetimeSearchResults(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number,
  targetSeedsCount: number,
  threshold?: number
): EstimationResult;

/** mtseed-search の推定結果 */
export function estimateMtseedSearchResults(
  ivFilter: IvFilter,
  threshold?: number
): EstimationResult;

/** egg-search の推定結果 */
export function estimateEggSearchResults(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number,
  filter: EggFilter | undefined,
  masudaMethod: boolean,
  threshold?: number
): EstimationResult;

/** tid-adjust の推定結果 */
export function estimateTidAdjustResults(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number,
  filter: TrainerInfoFilter,
  threshold?: number
): EstimationResult;

/** pokemon-list の推定結果 */
export function estimatePokemonListResults(
  seedCount: number,
  maxAdvance: number,
  userOffset: number,
  filter: PokemonFilter | undefined,
  threshold?: number
): EstimationResult;

/** egg-list の推定結果 */
export function estimateEggListResults(
  seedCount: number,
  maxAdvance: number,
  userOffset: number,
  filter: EggFilter | undefined,
  masudaMethod: boolean,
  threshold?: number
): EstimationResult;
```

#### 4.1.4 KeySpec 組み合わせ数計算

```ts
/**
 * KeySpec から有効な組み合わせ数を TS 側で計算する。
 *
 * available_buttons の全部分集合 (2^n) から無効パターンを除外:
 * - Up + Down 同時押し
 * - Left + Right 同時押し
 * - L + R + Start + Select 同時押し
 *
 * Rust 側 `KeySpec::combination_count()` と同一のロジック。
 * WASM にも `get_key_combination_count` が export されているが、
 * 他の見積もり系ユーティリティ (countDays, countValidSeconds) との
 * 一貫性を保つため TS 側で実装する。
 */
export function countKeyCombinations(keySpec: KeySpec): number;
```

#### 4.1.5 日数計算

```ts
/**
 * DateRangeParams から暦日数を計算する。
 */
export function countDays(dateRange: DateRangeParams): number;

/**
 * TimeRangeParams から 1 日あたりの有効秒数を計算する。
 */
export function countValidSeconds(timeRange: TimeRangeParams): number;
```

### 4.2 警告ダイアログ (`src/components/forms/search-confirmation-dialog.tsx`)

```tsx
interface SearchConfirmationDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 推定結果件数 */
  estimatedCount: number;
  /** 検索続行時のコールバック */
  onConfirm: () => void;
}

export function SearchConfirmationDialog(
  props: SearchConfirmationDialogProps
): React.ReactNode;
```

- Radix UI `AlertDialog` を使用
- 推定件数を `toLocaleString()` でカンマ区切り表示
- i18n キー:
  - `search.estimation.warning.title`: 警告タイトル
  - `search.estimation.warning.description`: 推定件数を含む説明文
  - `search.estimation.warning.confirm`: 続行ボタン
  - `search.estimation.warning.cancel`: キャンセルボタン

### 4.3 各 feature ページへの組み込み

6 feature 共通のパターン (検索系は `handleSearch`、リスト生成系は `handleGenerate` が対象):

```tsx
// 既存の handleSearch を handleSearchExecution にリネーム
const handleSearchExecution = useCallback(() => {
  // 既存の検索開始処理
  startSearch(/* ... */);
}, [/* deps */]);

// 新しい handleSearch: 見積もり → 確認 → 実行
const [confirmDialog, setConfirmDialog] = useState<{
  open: boolean;
  estimatedCount: number;
}>({ open: false, estimatedCount: 0 });

const handleSearch = useCallback(() => {
  const estimation = estimateXxxResults(/* params */);
  if (estimation.exceedsThreshold) {
    setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount });
  } else {
    handleSearchExecution();
  }
}, [/* deps */]);

// JSX
<SearchConfirmationDialog
  open={confirmDialog.open}
  onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
  estimatedCount={confirmDialog.estimatedCount}
  onConfirm={() => {
    setConfirmDialog({ open: false, estimatedCount: 0 });
    handleSearchExecution();
  }}
/>
```

#### 4.3.1 datetime-search 固有

- 推定式: $N_{total} \times \lvert targetSeeds \rvert / 2^{32}$
- 日時空間フルスキャン + BTreeSet ルックアップ方式のため、targetSeeds 数はマッチ確率として作用する
- 実運用上、targetSeeds は数個〜数十個程度のため、閾値超過はほぼ発生しない

#### 4.3.2 mtseed-search 固有

- 検索空間は固定 ($2^{32}$)
- `IvFilter` のヒット率のみで推定
- IV 範囲が全て `(0, 31)` の場合はヒット率 1.0 → 推定 $2^{32}$ 件で確実に警告表示

#### 4.3.3 egg-search 固有

- `EggFilter` が `undefined` の場合はヒット率 1.0
- `masudaMethod` フラグに応じて色違い確率を調整
- egg-search のフィルタは `CoreDataFilter` ベースのため、IV 6 軸 + 性格 + 色違い等すべて概算対象

#### 4.3.4 tid-adjust 固有

- `TrainerInfoFilter` の全フィールドが未指定 (`undefined`) の場合、ヒット率 1.0 → 検索空間全件
- TID/SID/shiny_pid の各フィールドの指定有無でヒット率が大きく変動

#### 4.3.5 pokemon-list 固有

- 生成件数は `seedOrigins.length × (max_advance - user_offset)` で正確に確定
- `PokemonFilter` のヒット率は `CoreDataFilter` ベース (3.3.1 + 3.3.2)
- フィルタ未指定時は生成件数がそのまま推定結果件数
- Seed 数は事前検索の結果に依存し、ユーザーが大量選択した場合に件数が膨大になりうる

#### 4.3.6 egg-list 固有

- 生成件数の計算は pokemon-list と同一
- `EggFilter` のヒット率は `CoreDataFilter` ベース (3.3.1 + 3.3.3)
- `masudaMethod` フラグで色違い確率を調整

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/services/search-estimation.test.ts`)

| テスト | 検証内容 |
|--------|----------|
| `countDays` の境界値 | 同一日 → 1、年跨ぎ、閏年 |
| `countValidSeconds` | 全範囲 (0-23, 0-59, 0-59) → 86400、単一秒 → 1 |
| `get_key_combination_count` | WASM 関数との一致確認。ボタン 0 個 → 1、ボタン 1 個 → 2、十字キーの制約排除 |
| `estimateIvFilterHitRate` | 全範囲 (0-31) → 1.0、単一値 (V, V, V, V, V, V) → $(1/32)^6$ |
| `estimateIvFilterHitRate` + めざパ | めざパ 1 タイプ指定 → $P_{iv} \times 1/16$ |
| `estimateCoreDataFilterHitRate` | 色違い Star → $7/65536$、性格 5 種指定 → $5/25$ |
| `estimateTrainerInfoFilterHitRate` | 全未指定 → 1.0、TID のみ → $1/65536$、TID+SID → $1/65536^2$ |
| `estimateEggFilterHitRate` + masuda | masuda=true + Shiny → $48/65536$ 適用確認 |
| `estimateTidAdjustResults` の統合 | 検索空間 × ヒット率 = 推定件数、閾値超過判定 |
| `estimateMtseedSearchResults` の統合 | $2^{32} \times P_{iv}$ の計算確認、閾値超過判定 |
| `calculateDatetimeSearchSpace` | 複数 Timer0VCountRange の合算 |
| `estimatePokemonListResults` | seeds=100, advance=1000, offset=0, filter=none → 100,000 件、閾値超過 |
| `estimateEggListResults` | masuda=true + Shiny → ヒット率にマスダメソッド確率適用 |
| `estimatePokemonFilterHitRate` | CoreDataFilter 部分の概算。species_ids / level_range は無視 |

### 5.2 コンポーネントテスト (`src/test/components/search-confirmation-dialog.test.tsx`)

| テスト | 検証内容 |
|--------|----------|
| 推定件数表示 | `estimatedCount` がカンマ区切りで表示される |
| 続行ボタン | クリック時に `onConfirm` が呼ばれる |
| キャンセルボタン | クリック時に `onOpenChange(false)` が呼ばれる |

## 6. 実装チェックリスト

- [x] `src/services/search-estimation.ts` — 検索空間サイズ計算関数の実装
- [x] `src/services/search-estimation.ts` — ヒット率概算関数の実装
- [x] `src/services/search-estimation.ts` — feature 別統合推定関数の実装
- [x] `src/test/unit/services/search-estimation.test.ts` — ユニットテスト
- [x] `src/components/forms/search-confirmation-dialog.tsx` — 警告ダイアログ
- [x] `src/test/components/search-confirmation-dialog.test.tsx` — コンポーネントテスト
- [x] `src/features/datetime-search/components/datetime-search-page.tsx` — 見積もり組み込み
- [x] `src/features/mtseed-search/components/mtseed-search-page.tsx` — 見積もり組み込み
- [x] `src/features/egg-search/components/egg-search-page.tsx` — 見積もり組み込み
- [x] `src/features/tid-adjust/components/tid-adjust-page.tsx` — 見積もり組み込み
- [x] `src/features/pokemon-list/components/pokemon-list-page.tsx` — 見積もり組み込み
- [x] `src/features/egg-list/components/egg-list-page.tsx` — 見積もり組み込み
- [x] `KeySpecSelector` の組み合わせ数表示修正 — 各 feature ページから `countKeyCombinations` を渡す
- [x] `wasm-pkg/src/lib.rs` — `get_key_combination_count` WASM export 関数の削除
- [x] `src/i18n/locales/ja/messages.po` — 翻訳追加
- [x] `src/i18n/locales/en/messages.po` — 翻訳追加
