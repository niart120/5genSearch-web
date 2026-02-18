# SeedOrigin インポート機能 仕様書

## 1. 概要

### 1.1 目的

検索結果 (`SeedOrigin[]`) を異なる feature 間で転写する仕組みを提供する。

転写には 2 つの経路を用意する:

1. **Store 経由の直接転記** — 転写元 feature のボタン操作で Store に `SeedOrigin[]` をセットし、転写先 feature に自動遷移する。`pendingTargetSeeds` と同様のワンショットパターン。
2. **Import タブ** — JSON ファイル読み込み・テーブル手入力により、セッション外部のデータを取り込む。

現行の `SeedInputSection`「Search results」タブ (`useSearchResultsStore.results` 経由) は、上記 2 経路に置き換えて廃止する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| `SeedOrigin` | WASM 型。`{ Seed: { base_seed, mt_seed } }` または `{ Startup: { base_seed, mt_seed, datetime, condition } }` の tagged union |
| `SerializedSeedOrigin` | `SeedOrigin` の JSON 互換型。`base_seed` (bigint) を 16 桁 hex 文字列に変換した構造 |
| 転写元 | datetime-search、egg-search。全結果転記は datetime-search → pokemon-list のみ。egg-list / needle へは詳細ダイアログからのみ転記可 |
| 転写先 | `SeedInputSection` を使用する feature (pokemon-list, egg-list, needle) |
| Store 転記 | `pendingSeedOrigins` を Store にセットし `navigateToFeature` で遷移先に自動移動する方式 |
| Import タブ | `SeedInputSection` の新規入力モード。JSON ファイル読み込み・テーブル手入力を提供 |

### 1.3 背景・問題

1. `SeedInputSection` の「Search results」タブは `useSearchResultsStore.results` を参照するが、datetime-search は結果を Store に書き込まないため、連携が成立しない
2. エクスポート済み JSON (`toSeedOriginJson` 出力) のインポート手段が存在しない
3. `SeedOrigin` のテーブル形式での手入力・確認 UI が存在しない

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 転写の確立 | datetime-search の全結果を pokemon-list に転記、詳細ダイアログから単一結果を pokemon-list / egg-list / needle に転記できるようになる |
| データの永続性 | JSON ファイル保存により、セッションを跨いだ検索結果の再利用が可能になる |
| テーブル手入力 | datetime / timer0 / vcount を直接入力でき、外部ツールの結果を取り込める |

### 1.5 着手条件

- [x] RESULT_EXPORT 仕様 (local_085) が完了済みで、`SerializedSeedOrigin` 型が `export.ts` に存在する
- [x] `SeedInputSection` コンポーネントが実装済み
- [x] `serializeSeedOrigin` が `export.ts` に実装済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/services/seed-origin-serde.ts` | **新規** | `SerializedSeedOrigin` 型、`serializeSeedOrigin`、`deserializeSeedOrigin`、`parseSerializedSeedOrigins` を集約 |
| `src/services/export.ts` | 変更 | `serializeSeedOrigin` / `SerializedSeedOrigin` を `seed-origin-serde.ts` から import する形に変更 |
| `src/components/forms/seed-input-section.tsx` | 変更 | 「Search results」タブ → 「Import」タブに置換。Store 転記データ (`pendingSeedOrigins`) の自動読み込み機能を追加 |
| `src/components/forms/seed-origin-table.tsx` | **新規** | `SeedOrigin[]` のテーブル表示・手入力コンポーネント |
| `src/stores/search/results.ts` | 変更 | `pendingSeedOrigins: SeedOrigin[]` を追加。`useSearchResultsStore.results` からの `SeedOrigin[]` 抽出ロジックを削除 |
| `src/lib/navigate.ts` | 変更 | `navigateToPokemonList`、`navigateToEggList`、`navigateToNeedle` を追加 |
| `src/hooks/use-search-results.ts` | 変更 | `pendingSeedOrigins` 用のアクセサを追加 |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 変更 | 結果テーブルに「個体生成に転記」ボタンを追加 (全結果 → Store + 遷移) |
| `src/features/datetime-search/components/result-detail-dialog.tsx` | 変更 | 詳細ダイアログに「個体生成に転記」ボタンを追加 (単一結果 → Store + 遷移) |
| `src/features/egg-search/components/result-detail-dialog.tsx` | 変更 | 詳細ダイアログに「孵化リストに転記」ボタンを追加 (単一結果 → Store + 遷移) |
| `src/i18n/locales/ja/messages.po` | 変更 | 新規翻訳キー追加 |
| `src/i18n/locales/en/messages.po` | 変更 | 新規翻訳キー追加 |

## 3. 設計方針

### 3.1 アーキテクチャ概要

2 つの転写経路を提供する。

```
経路 A: Store 転記 (アプリ内直接転記)

  [datetime-search 結果テーブル]
      │
      ├─[個体リストに転記]─→ setPendingSeedOrigins(origins)
      │                       + navigateToFeature('pokemon-list')
      │                              │
      │                              ▼
      │                       [pokemon-list]
      │                       SeedInputSection マウント時に
      │                       pendingSeedOrigins を消費
      │                       → Import タブに自動反映
      │
      └─[詳細ダイアログ → 転記]─→ 同上 (単一 SeedOrigin → pokemon-list / egg-list / needle)


経路 B: Import タブ (手動取り込み)

  [エクスポート JSON ファイル / 外部ツール出力 / 手入力]
      │
      ▼
  [pokemon-list / egg-list / needle]
  SeedInputSection → Import タブ
  ├── JSON ファイル読み込み
  └── テーブル手入力/編集
```

### 3.2 データフロー

#### 3.2.1 Store 転記: 全結果

1. datetime-search 結果テーブル上部の「個体リストに転記」ボタン押下
2. `setPendingSeedOrigins(results)` で Store にセット
3. `navigateToFeature('pokemon-list')` で自動ページ遷移
4. 転写先ページの `SeedInputSection` がマウント時に `pendingSeedOrigins` を読み取り
5. Import タブの `SeedOriginTable` に反映し、`onOriginsChange(origins)` で親に伝搬
6. `clearPendingSeedOrigins()` で Store をクリア

#### 3.2.2 Store 転記: 詳細ダイアログから単一結果

1. datetime-search / egg-search の詳細ダイアログで転記ボタン押下
2. 遷移先を選択 (pokemon-list / egg-list / needle)
3. `setPendingSeedOrigins([singleOrigin])` で Store にセット
4. `navigateToFeature(target)` で自動ページ遷移
5. 以降は 3.2.1 手順 4-6 と同様

全結果一括転記は datetime-search → pokemon-list のみ対応。egg-search / needle は詳細ダイアログからの単一転記に限定する。理由: 孵化の許容範囲が広く、複数候補をまとめて検索するユースケースがほぼないため。針についても同様にバラバラの起動時刻・条件の下で絞り込みを行うユースケースがほぼないため。

#### 3.2.3 Import: JSON ファイル取り込み

1. pokemon-list の Import タブで「JSON ファイル読み込み」ボタン押下
2. `<input type="file" accept=".json">` でファイル選択
3. ファイル内容をパースし、`results` 配列から `SerializedSeedOrigin[]` を抽出
4. `parseSerializedSeedOrigins` でデシリアライズし `SeedOrigin[]` を復元
5. テーブルに反映し、`onOriginsChange(origins)` で親に伝搬

#### 3.2.4 Import: テーブル手入力

1. Import タブの「行追加」ボタンで空行を追加
2. datetime / timer0 / vcount / key_code を手入力
3. `base_seed` / `mt_seed` は DS 設定 + 入力値から自動計算して表示
4. 入力完了時に `onOriginsChange(origins)` で親に伝搬

### 3.3 Store 連携の変更

#### 3.3.1 新規追加: `pendingSeedOrigins`

`useSearchResultsStore` に `pendingSeedOrigins: SeedOrigin[]` を追加する。
`pendingTargetSeeds` と同様のワンショットパターン。

| 項目 | 仕様 |
|------|------|
| state | `pendingSeedOrigins: SeedOrigin[]` |
| set action | `setPendingSeedOrigins(origins: SeedOrigin[])` |
| clear action | `clearPendingSeedOrigins()` |
| 永続化 | なし (セッション中のみ) |
| 消費タイミング | 転写先ページのマウント時 (SeedInputSection 内) |

#### 3.3.2 廃止: `useSearchResultsStore.results` からの `SeedOrigin[]` 抽出

`SeedInputSection` の「Search results」タブで行っていた、`results` 内の全バッチから型ガードで `SeedOrigin[]` を抽出するロジックを削除する。

#### 3.3.3 維持: `pendingTargetSeeds`

`pendingTargetSeeds` (mtseed-search → datetime-search) は既存のまま維持する。

| 比較 | `pendingTargetSeeds` | `pendingSeedOrigins` |
|------|---------------------|---------------------|
| 型 | `MtSeed[]` | `SeedOrigin[]` |
| 転写元 | mtseed-search | datetime-search, egg-search |
| 転写先 | datetime-search | pokemon-list (全結果), egg-list / needle (詳細ダイアログ経由のみ) |
| 用途 | MT Seed を検索条件として渡す | 生成元 Seed を個体生成に渡す |

型と用途が異なるため、統合せず個別に管理する。

### 3.4 性能要件

| 項目 | 要件 |
|------|------|
| JSON パース | 10,000 件の `SerializedSeedOrigin` を 100 ms 以内にデシリアライズ |
| テーブル描画 | 100 行以下は仮想スクロール不要。100 行超の場合は入力不可 (表示のみ) |

## 4. 実装仕様

### 4.1 `seed-origin-serde.ts` — シリアライズ/デシリアライズ

```typescript
// src/services/seed-origin-serde.ts

import type { SeedOrigin, Datetime, StartupCondition } from '@/wasm/wasm_pkg';

/** SeedOrigin のシリアライズ済み型 (bigint → hex 文字列) */
export type SerializedSeedOrigin =
  | { Seed: { base_seed: string; mt_seed: number } }
  | {
      Startup: {
        base_seed: string;
        mt_seed: number;
        datetime: Datetime;
        condition: StartupCondition;
      };
    };

/** SeedOrigin → SerializedSeedOrigin */
export function serializeSeedOrigin(origin: SeedOrigin): SerializedSeedOrigin;

/** SerializedSeedOrigin → SeedOrigin (hex → bigint 復元) */
export function deserializeSeedOrigin(serialized: SerializedSeedOrigin): SeedOrigin;

/**
 * JSON 文字列を SerializedSeedOrigin[] としてパースし、SeedOrigin[] を返す。
 *
 * 受け入れ形式:
 * - `SerializedSeedOrigin[]` (配列のみ)
 * - `{ results: SerializedSeedOrigin[], ... }` (meta 付きエクスポート形式)
 *
 * @throws パース失敗時またはバリデーション失敗時
 */
export function parseSerializedSeedOrigins(json: string): SeedOrigin[];
```

### 4.2 Store 変更

#### 4.2.1 `useSearchResultsStore` の変更

```typescript
// Before
interface SearchResultsState {
  results: SearchResult[];
  lastUpdatedAt: number | undefined;
  pendingTargetSeeds: MtSeed[];
}

// After
interface SearchResultsState {
  results: SearchResult[];
  lastUpdatedAt: number | undefined;
  pendingTargetSeeds: MtSeed[];         // 維持
  pendingSeedOrigins: SeedOrigin[];     // 新規追加
}

interface SearchResultsActions {
  // ... 既存 actions ...
  setPendingSeedOrigins: (origins: SeedOrigin[]) => void;  // 新規追加
  clearPendingSeedOrigins: () => void;                     // 新規追加
}
```

`DEFAULT_STATE` に `pendingSeedOrigins: []` を追加する。

### 4.3 ナビゲーション関数

```typescript
// src/lib/navigate.ts

import type { SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { FeatureId } from '@/lib/navigation';
import { useSearchResultsStore } from '@/stores/search/results';
import { useUiStore } from '@/stores/settings/ui';

/**
 * SeedOrigin[] を転写先 feature に引き渡してページ遷移する
 */
export function navigateWithSeedOrigins(
  origins: SeedOrigin[],
  target: FeatureId,
): void {
  useSearchResultsStore.getState().setPendingSeedOrigins(origins);
  useUiStore.getState().navigateToFeature(target);
}

// 既存 (維持)
export function navigateToDatetimeSearch(seeds: MtSeed[]): void { ... }
```

### 4.4 `SeedInputSection` の変更

#### 4.4.1 タブ構成

| Before | After |
|--------|-------|
| Startup / Seeds / Search results | Startup / Seeds / Import |

#### 4.4.2 `SeedInputMode` 型変更

```typescript
// Before
export type SeedInputMode = 'search-results' | 'manual-seeds' | 'manual-startup';

// After
export type SeedInputMode = 'import' | 'manual-seeds' | 'manual-startup';
```

#### 4.4.3 Store 転記データの自動消費

`SeedInputSection` のマウント時に `pendingSeedOrigins` を確認し、データがあれば Import タブに自動反映する。 

```typescript
// SeedInputSection 内の初期化ロジック (概要)
const [importedOrigins, setImportedOrigins] = useState<SeedOrigin[]>(() => {
  const pending = useSearchResultsStore.getState().pendingSeedOrigins;
  return pending;
});

useEffect(() => {
  const pending = useSearchResultsStore.getState().pendingSeedOrigins;
  if (pending.length > 0) {
    useSearchResultsStore.getState().clearPendingSeedOrigins();
    // Import タブに切り替え
    onModeChange('import');
    onOriginsChange(pending);
  }
}, []);
```

`pendingTargetSeeds` (datetime-search で消費) と同じパターンを採用する。

#### 4.4.4 Import タブの UI 構成

```
┌─────────────────────────────────────────┐
│  [Import]                               │
│                                         │
│  [JSON ファイル読み込み]                 │
│                                         │
│  ┌─── SeedOrigin テーブル ───────────┐  │
│  │ datetime  | T0   | VC  | base_seed| │
│  │ 2025/1/1  | 0x60 | 0x5E| ABCD...  | │
│  │ 2025/1/2  | 0x61 | 0x5F| 1234...  | │
│  │ [+ 行追加]               [全削除]  | │
│  └─────────────────────────────────────┘│
│                                         │
│  Resolved seeds: 4                      │
└─────────────────────────────────────────┘
```

Store 転記で受け取ったデータもこのテーブルに表示される。ユーザはテーブル上で確認・編集可能。

#### 4.4.5 Props 変更

Props インターフェースの形は変更なし。`mode` の取りうる値のみ変更。

```typescript
interface SeedInputSectionProps {
  mode: SeedInputMode;          // 'search-results' → 'import' に変更
  onModeChange: (mode: SeedInputMode) => void;
  origins: SeedOrigin[];
  onOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
}
```

### 4.5 `SeedOriginTable` コンポーネント

```typescript
// src/components/forms/seed-origin-table.tsx

interface SeedOriginTableProps {
  origins: SeedOrigin[];
  onOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
  /** テーブル編集 (行追加/削除) を許可するか。false の場合は表示のみ */
  editable?: boolean;
}
```

#### 4.5.1 テーブルカラム

| カラム | 型 | 入力 | 表示 | 備考 |
|--------|---|------|------|------|
| datetime | `Datetime` | 入力可 | `YYYY/MM/DD HH:mm:ss` | `DatetimeInput` コンポーネント再利用 |
| timer0 | `number` | 入力可 (hex) | `0xHH` | |
| vcount | `number` | 入力可 (hex) | `0xHH` | |
| key_code | `KeyCode` (number) | 入力可 (hex) | `0xHHHH` | |
| base_seed | `LcgSeed` (bigint) | 読み取り専用 | `0x{16桁hex}` | datetime / timer0 / vcount / key_code から自動計算 |
| mt_seed | `MtSeed` (number) | 読み取り専用 | `0x{8桁hex}` | `lcg_seed_to_mt_seed(base_seed)` で自動計算 |

手入力行では `base_seed` は DS 設定 (MAC アドレス等) + 入力した datetime / timer0 / vcount / key_code から WASM の `resolve_seeds` で計算する。DS 設定はサイドバーの ds-config を参照する。

#### 4.5.2 行操作

| 操作 | 動作 |
|------|------|
| 行追加 | 末尾にデフォルト値の行を追加 |
| 行削除 | 指定行を削除 |
| クリア | 全行削除 |

### 4.6 転写元 feature の変更

#### 4.6.1 datetime-search: 全結果転記

datetime-search-page のエクスポートボタン群に「個体リストに転記」ボタンを追加する。遷移先は pokemon-list 固定 (needle は詳細ダイアログからのみ)。

```typescript
const handleTransferToPokemonList = () => {
  navigateWithSeedOrigins(results, 'pokemon-list');
};
```

#### 4.6.2 datetime-search: 詳細ダイアログから単一結果転記

`result-detail-dialog.tsx` に転記ボタンを追加する。遷移先として pokemon-list / needle を選択可能。

```typescript
const handleTransferToGeneration = (target: FeatureId) => {
  navigateWithSeedOrigins([origin], target);
};
```

egg-list / needle への転記はこの詳細ダイアログからのみ行える。全結果一括転記は datetime-search → pokemon-list のみ対応。

#### 4.6.3 egg-search: 詳細ダイアログから単一結果転記

egg-search の `result-detail-dialog.tsx` に転記ボタンを追加する。遷移先として egg-list / needle を選択可能。

```typescript
const handleTransferToGeneration = (target: FeatureId) => {
  navigateWithSeedOrigins([origin], target);
};
```

### 4.7 バリデーション

#### 4.7.1 JSON パースバリデーション (`seed-origin-serde.ts`)

| チェック項目 | エラー時の動作 |
|-------------|---------------|
| JSON 構文エラー | `throw` (メッセージ: `"Invalid JSON"`) |
| `results` 配列または直接配列でない | `throw` (メッセージ: `"Expected array or { results: [...] }"`) |
| 各要素に `Seed` / `Startup` キーがない | `throw` (メッセージ: `"Invalid SeedOrigin at index N"`) |
| `base_seed` が有効な hex 文字列でない | `throw` (メッセージ: `"Invalid base_seed at index N"`) |

#### 4.7.2 テーブル入力バリデーション (`SeedOriginTable`)

| フィールド | バリデーション |
|-----------|---------------|
| datetime | `Datetime` の各フィールドが有効範囲内 (year: 2000-2099, month: 1-12, day: 1-31, hour: 0-23, minute: 0-59, second: 0-59) |
| timer0 | 0-65535 (u16) |
| vcount | 0-255 (u8) |
| key_code | 0-65535 (u16) |

バリデーションエラーは行単位でインライン表示する。不正な行がある場合、有効な行のみを `SeedOrigin[]` として親に伝搬する。

### 4.8 翻訳キー

新規 UI ラベルはすべて `<Trans>` / `t` で Lingui を使用する。

| UI テキスト (en) | コンテキスト |
|-----------------|-------------|
| `Import` | タブラベル |
| `Import JSON file` | ボタン |
| `Transfer to Pokemon list` | ボタン (datetime-search 全結果 → pokemon-list / 詳細ダイアログ → pokemon-list) |
| `Transfer to Egg list` | ボタン (詳細ダイアログ → egg-list) |
| `Transfer to generation` | ボタン (詳細ダイアログ) |
| `Transfer to Needle search` | ボタン (詳細ダイアログ → needle) |
| `Add row` | テーブル行追加ボタン |
| `Clear all` | テーブル全削除ボタン |
| `Import failed` | Toast エラー |
| `Transferred {count} seeds` | Toast 成功 |
| `Imported {count} seeds` | Toast 成功 (JSON 読み込み時) |

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|---------|
| `seed-origin-serde.test.ts` | `serializeSeedOrigin` で bigint → hex 変換が正しいこと |
| | `deserializeSeedOrigin` で hex → bigint 復元が正しいこと |
| | `parseSerializedSeedOrigins` で `SerializedSeedOrigin[]` 配列をパースできること |
| | `parseSerializedSeedOrigins` で `{ results: [...] }` 形式をパースできること |
| | `parseSerializedSeedOrigins` で不正 JSON に対してエラーを投げること |
| | ラウンドトリップ: `serialize → deserialize` で元の `SeedOrigin` と一致すること |

### 5.2 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 |
|--------|---------|
| `seed-input-section.test.tsx` | Import タブが表示されること |
| | `pendingSeedOrigins` がある状態でマウントすると Import タブに自動反映されること |
| | JSON ファイル選択で `SeedOrigin[]` が復元され `onOriginsChange` が呼ばれること |
| `seed-origin-table.test.tsx` | テーブルに `SeedOrigin[]` が正しく表示されること |
| | 行追加・削除が動作すること |

### 5.3 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|---------|
| `seed-origin-import.test.ts` | エクスポート JSON (`toSeedOriginJson`) → `parseSerializedSeedOrigins` でラウンドトリップが成立すること (WASM 依存) |

## 6. 実装チェックリスト

- [x] `src/services/seed-origin-serde.ts` を新規作成 (`SerializedSeedOrigin`, `serializeSeedOrigin`, `deserializeSeedOrigin`, `parseSerializedSeedOrigins`)
- [x] `src/services/export.ts` から `serializeSeedOrigin` / `SerializedSeedOrigin` を `seed-origin-serde.ts` に移動し、import 形式に変更
- [x] `src/test/unit/seed-origin-serde.test.ts` を作成
- [x] `src/stores/search/results.ts` に `pendingSeedOrigins` / `setPendingSeedOrigins` / `clearPendingSeedOrigins` を追加
- [x] `src/lib/navigate.ts` に `navigateWithSeedOrigins` を追加
- [x] `src/hooks/use-search-results.ts` に `pendingSeedOrigins` 用アクセサを追加
- [x] `src/components/forms/seed-origin-table.tsx` を新規作成
- [x] `src/components/forms/seed-input-section.tsx` を改修 (Search results → Import タブ + Store 転記自動消費)
- [ ] `src/test/components/seed-input-section.test.tsx` を改修/新規作成 (既存テストなし、別途対応)
- [x] `src/features/datetime-search/components/datetime-search-page.tsx` を改修 (転記ボタン追加)
- [x] `src/features/datetime-search/components/result-detail-dialog.tsx` を改修 (転記ボタン追加)
- [x] `src/features/egg-search/components/result-detail-dialog.tsx` を改修 (詳細ダイアログに転記ボタン追加)
- [ ] `src/test/integration/seed-origin-import.test.ts` を作成 (別途対応)
- [x] 翻訳キー追加 (`ja/messages.po`, `en/messages.po`)
- [x] `pnpm lint` / `pnpm test:run` / `cargo clippy` 全パス確認
