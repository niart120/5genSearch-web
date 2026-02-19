# Feature 初期値見直し 仕様書

## 1. 概要

### 1.1 目的

各 feature のフォーム初期値を、ユーザが最小限の操作で検索を開始できる状態に見直す。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| DS Config | DS 本体・ROM の設定 (MAC, hardware, version, region 等)。サイドバーで管理 |
| Trainer | トレーナー情報 (TID/SID)。サイドバーで管理 |
| genConfig | 個体生成系 feature の共通パラメータ (`user_offset`, `max_advance`) |
| Seed テンプレート | GPU 全探索で導出済みの MT Seed 値セット (`src/data/seed-templates.ts`) |
| DateRangeParams | 検索対象の日付範囲 (start/end の year, month, day) |
| TimeRangeParams | 検索対象の時刻範囲 (start/end の hour, minute, second) |

### 1.3 背景・問題

現状の初期値には以下の問題がある:

- **dateRange が `2000/1/1 ~ 2000/1/1` 固定**: 1 日分しか検索しないため、初回使用時にヒットに期待できない
- **`useGpu` が `false`**: GPU 対応ブラウザでも CPU 検索がデフォルトになる
- **`targetSeedsRaw` が空**: 検索対象 Seed を手動入力しないと検索開始できない
- **`max_advance` が `100`**: 孵化・個体生成系では不必要に大きく、結果が多すぎて見づらい
- **pokemon-list の `slots` が空**: バリデーションエラーで即座に検索できない
- **pokemon-list の `seedInputMode` が `import`**: 検索結果の連携がない初回起動時に非直感的
- **egg-search / tid-adjust の dateRange に「当日」概念がない**: DS の日付設定は現実日付が多いため、当日起点が実用的

### 1.4 期待効果

| 指標 | 変更前 | 変更後 |
|------|--------|--------|
| datetime-search: 検索開始までの操作数 | Seed 入力 + dateRange 変更 (3 操作以上) | 0 操作 (そのまま検索可能) |
| mtseed-search: GPU 有効化操作 | 手動トグル (1 操作) | 不要 |
| egg-search / tid-adjust: dateRange 設定 | 年月日を 6 フィールド変更 | 0 操作 (当日がデフォルト) |
| pokemon-list: 検索開始までの操作数 | Seed 入力 + 種族選択 (2 操作以上) | Seed 入力のみ (1 操作) |

### 1.5 着手条件

- feature/seed-templates ブランチのマージ完了 (Seed テンプレートデータの存在が前提)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/datetime-search/components/datetime-search-page.tsx` | 変更 | dateRange, useGpu, targetSeedsRaw の初期値変更 |
| `src/features/mtseed-search/components/mtseed-search-page.tsx` | 変更 | useGpu の初期値変更 |
| `src/features/egg-search/components/egg-search-page.tsx` | 変更 | dateRange を当日日付へ、max_advance を 30 へ |
| `src/features/egg-list/components/egg-list-page.tsx` | 変更 | max_advance を 30 へ |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更 | seedInputMode を `manual-startup` へ |
| `src/features/pokemon-list/components/pokemon-params-form.tsx` | 変更 | Stationary 先頭エントリの自動選択 |
| `src/features/pokemon-list/types.ts` | 変更 | DEFAULT_ENCOUNTER_PARAMS の genConfig.max_advance を 30 へ |
| `src/features/needle/components/needle-page.tsx` | 変更 | maxAdvance を 30 へ |
| `src/features/tid-adjust/components/tid-adjust-page.tsx` | 変更 | dateRange を当日日付へ |
| `src/test/unit/` (複数) | 追加/変更 | 初期値変更に伴うテスト更新 |

## 3. 設計方針

### 3.1 変更のスコープ

初期値の変更のみ。型定義・バリデーション・検索ロジックへの変更は行わない。

### 3.2 初期値定義の配置方針

現状の「各ページコンポーネント内に `DEFAULT_*` 定数を定義」する方式を維持する。共通定数の切り出しは本タスクのスコープ外とする。

### 3.3 dateRange の「当日日付」取得

egg-search / tid-adjust で使用する「当日日付」は `new Date()` から導出する。コンポーネント初期化時に 1 回取得し、レンダリングごとの再取得は行わない。

```typescript
function getTodayDateRange(): DateRangeParams {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return {
    start_year: year, start_month: month, start_day: day,
    end_year: year,   end_month: month,   end_day: day,
  };
}
```

DS の年範囲は 2000-2099 であるため、`getTodayDateRange()` の結果はバリデーション上常に有効である（2026 年現在）。

### 3.4 useGpu の初期値

常に `true` とする。GPU 非対応環境で `useGpu: true` の状態で検索を実行した場合、既存のエラーハンドリング（GPU Worker の初期化失敗通知）で対応される。

### 3.5 targetSeedsRaw の初期値

BW 固定・野生 6V テンプレートの Seed 値 5 件を初期値とする。DS Config の `version` に依存しない固定値とする。

```typescript
import { SEED_TEMPLATES } from '@/data/seed-templates';

function getDefaultTargetSeeds(): string {
  const bw6v = SEED_TEMPLATES.find((t) => t.id === 'bw-stationary-6v');
  if (!bw6v) return '';
  return bw6v.seeds.map((s) => s.toString(16).padStart(8, '0').toUpperCase()).join('\n');
}
```

根拠: BW/BW2 共通で 6V 理想個体の探索ニーズが最も高く、初回ユーザの体験として適切であるため。BW2 ユーザはテンプレートダイアログから BW2 用テンプレートに変更できる。

### 3.6 pokemon-list: Stationary 先頭エントリの自動選択

`speciesOptions` が非同期ロード完了し、かつユーザが未選択（`selectedStaticEntry === ''`）の場合に、リストの先頭エントリを自動選択する。

```typescript
// speciesOptions ロード完了後の effect 内
if (!isLocationBased && speciesOptions.length > 0 && selectedStaticEntry === '') {
  const firstStatic = speciesOptions.find((s) => s.kind === 'static');
  if (firstStatic) {
    handleStaticEntryChange(firstStatic.id);
  }
}
```

先頭エントリはバージョン依存:

| Version | encounterType: Stationary の先頭 |
|---------|------|
| Black | Reshiram (Lv.50) |
| White | Zekrom (Lv.50) |
| Black2 | Zekrom (Lv.70) |
| White2 | Reshiram (Lv.70) |

## 4. 実装仕様

### 4.1 グローバル設定 (変更なし)

DS Config / Trainer の初期値は現状のままとする。

| ストア | フィールド | 初期値 | 変更 |
|--------|------------|--------|------|
| ds-config | `mac` | `[0, 0, 0, 0, 0, 0]` | なし |
| ds-config | `hardware` | `DsLite` | なし |
| ds-config | `version` | `Black` | なし |
| ds-config | `region` | `Jpn` | なし |
| ds-config | `timer0Auto` | `true` | なし |
| ds-config | `ranges` | `[{ timer0_min: 0x0C79, timer0_max: 0x0C7A, vcount_min: 0x60, vcount_max: 0x60 }]` | なし |
| ds-config | `gameStart.start_mode` | `Continue` | なし |
| ds-config | `gameStart.save` | `WithSave` | なし |
| ds-config | `gameStart.memory_link` | `Disabled` | なし |
| ds-config | `gameStart.shiny_charm` | `NotObtained` | なし |
| trainer | `tid` | `undefined` | なし |
| trainer | `sid` | `undefined` | なし |

### 4.2 datetime-search（起動時刻検索）

定義箇所: `src/features/datetime-search/components/datetime-search-page.tsx`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `dateRange` | `2000/1/1 ~ 2000/1/1` | `2000/1/1 ~ 2099/12/31` |
| `timeRange` | `0:00:00 ~ 23:59:59` | 変更なし |
| `keySpec` | `{ available_buttons: [] }` | 変更なし |
| `targetSeedsRaw` | `''` | BW 6V テンプレートの Seed 5 件 (3.5 節参照) |
| `useGpu` | `false` | `true` |

### 4.3 mtseed-search（MT Seed IV 検索）

定義箇所: `src/features/mtseed-search/components/mtseed-search-page.tsx`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `ivFilter` | 全 `[31, 31]` | 変更なし |
| `mtOffset` | BW: `0`, BW2: `2` | 変更なし |
| `isRoamer` | `false` | 変更なし |
| `useGpu` | `false` | `true` |

### 4.4 egg-search（孵化起動時刻検索）

定義箇所: `src/features/egg-search/components/egg-search-page.tsx`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `dateRange` | `2000/1/1 ~ 2000/1/1` | 当日日付 ~ 当日日付 (3.3 節参照) |
| `timeRange` | `0:00:00 ~ 23:59:59` | 変更なし |
| `keySpec` | `{ available_buttons: [] }` | 変更なし |
| 親個体値（♂♀共通） | 全 `0` | 変更なし |
| `everstone` | `None` | 変更なし |
| `female_ability_slot` | `First` | 変更なし |
| `uses_ditto` | `false` | 変更なし |
| `gender_ratio` | `F1M1` | 変更なし |
| `nidoran_flag` | `false` | 変更なし |
| `masuda_method` | `false` | 変更なし |
| `consider_npc` | `false` | 変更なし |
| `genConfig.user_offset` | `0` | 変更なし |
| `genConfig.max_advance` | `100` | `30` |
| `filter` | `undefined` | 変更なし |

### 4.5 egg-list（タマゴ個体生成）

定義箇所: `src/features/egg-list/components/egg-list-page.tsx`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `seedInputMode` | `manual-startup` | 変更なし |
| `seedOrigins` | `[]` | 変更なし |
| 親個体値（♂♀共通） | 全 `31` | 変更なし |
| `everstone` | `None` | 変更なし |
| `female_ability_slot` | `First` | 変更なし |
| `uses_ditto` | `false` | 変更なし |
| `gender_ratio` | `F1M1` | 変更なし |
| `nidoran_flag` | `false` | 変更なし |
| `masuda_method` | `false` | 変更なし |
| `consider_npc` | `false` | 変更なし |
| `genConfig.user_offset` | `0` | 変更なし |
| `genConfig.max_advance` | `100` | `30` |
| `filter` / `statsFilter` | `undefined` | 変更なし |
| `speciesId` | `undefined` | 変更なし |

### 4.6 pokemon-list（ポケモン個体生成）

定義箇所: `src/features/pokemon-list/components/pokemon-list-page.tsx`, `pokemon-params-form.tsx`, `src/features/pokemon-list/types.ts`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `seedInputMode` | `import` | `manual-startup` |
| `seedOrigins` | `[]` | 変更なし |
| `encounterType` | `Normal` | 変更なし |
| `encounterMethod` | `Stationary` | 変更なし |
| `slots` | `[]` | 先頭エントリを自動選択 (3.6 節参照) |
| `leadAbility` | `None` | 変更なし |
| `genConfig.user_offset` | `0` | 変更なし |
| `genConfig.max_advance` | `100` | `30` |
| `filter` | `undefined` | 変更なし |

### 4.7 needle（針読み検索）

定義箇所: `src/features/needle/components/needle-page.tsx`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `seedMode` | `datetime` | 変更なし |
| `datetime` | `2000/1/1 0:00:00` | 変更なし |
| `seedHex` | `''` | 変更なし |
| `patternRaw` | `''` | 変更なし |
| `userOffset` | `0` | 変更なし |
| `maxAdvance` | `200` | `30` |
| `autoSearch` | `true` | 変更なし |

### 4.8 tid-adjust（ID 調整）

定義箇所: `src/features/tid-adjust/components/tid-adjust-page.tsx`

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `dateRange` | `2000/1/1 ~ 2000/1/1` | 当日日付 ~ 当日日付 (3.3 節参照) |
| `timeRange` | `0:00:00 ~ 23:59:59` | 変更なし |
| `keySpec` | `{ available_buttons: [] }` | 変更なし |
| `tid` / `sid` | `''` | 変更なし |
| `shinyPidRaw` | `''` | 変更なし |
| `saveMode` | `NoSave` | 変更なし |
| GameStart（ローカル） | `NewGame` / `NoSave` / `Disabled` / `NotObtained` | 変更なし |

### 4.9 変更サマリ

| feature | 変更項目 |
|---------|----------|
| datetime-search | dateRange 全範囲化, useGpu → true, targetSeedsRaw → BW 6V seeds |
| mtseed-search | useGpu → true |
| egg-search | dateRange → 当日, max_advance → 30 |
| egg-list | max_advance → 30 |
| pokemon-list | seedInputMode → manual-startup, max_advance → 30, slots 自動選択 |
| needle | maxAdvance → 30 |
| tid-adjust | dateRange → 当日 |

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `getTodayDateRange` | 返却値が現在日付と一致すること |
| `getDefaultTargetSeeds` | BW 6V テンプレートの Seed 5 件が改行区切りの hex 文字列で返ること |

### 5.2 コンポーネントテスト

| テスト | 検証内容 |
|--------|----------|
| datetime-search 初期表示 | dateRange が `2000 ~ 2099` であること。targetSeedsRaw に 5 行の hex 値が入っていること。useGpu トグルが ON であること |
| mtseed-search 初期表示 | useGpu トグルが ON であること |
| egg-search 初期表示 | dateRange が当日であること。max_advance が `30` であること |
| egg-list 初期表示 | max_advance が `30` であること |
| pokemon-list 初期表示 | seedInputMode が `manual-startup` であること。max_advance が `30` であること |
| needle 初期表示 | maxAdvance が `30` であること |
| tid-adjust 初期表示 | dateRange が当日であること |

### 5.3 テスト対象外

- GPU 実行の E2E テスト（CI 環境に GPU なし）
- pokemon-list の slots 自動選択（非同期エンカウントデータのロードに依存するため統合テストで対応すべきだが、本タスクでは対象外）

## 6. 実装チェックリスト

- [x] datetime-search: `DEFAULT_DATE_RANGE` を `2000/1/1 ~ 2099/12/31` に変更
- [x] datetime-search: `useGpu` 初期値を `true` に変更
- [x] datetime-search: `targetSeedsRaw` 初期値を BW 6V seeds に変更 (`getDefaultTargetSeeds` 関数追加)
- [x] mtseed-search: `useGpu` 初期値を `true` に変更
- [x] egg-search: `DEFAULT_DATE_RANGE` を `getTodayDateRange()` に変更
- [x] egg-search: `DEFAULT_GEN_CONFIG.max_advance` を `30` に変更
- [x] egg-list: `DEFAULT_GEN_CONFIG.max_advance` を `30` に変更
- [x] pokemon-list: `seedInputMode` 初期値を `manual-startup` に変更
- [x] pokemon-list: `DEFAULT_ENCOUNTER_PARAMS.genConfig.max_advance` を `30` に変更
- [x] pokemon-list: `speciesOptions` ロード完了時の先頭エントリ自動選択ロジック追加
- [x] needle: `maxAdvance` 初期値を `30` に変更
- [x] tid-adjust: `DEFAULT_DATE_RANGE` を `getTodayDateRange()` に変更
- [x] ユニットテスト追加 (`getTodayDateRange`, `getDefaultTargetSeeds`)
- [x] コンポーネントテスト追加/更新 (NeedlePage / MtseedSearchPage の初期値を検証)
- [x] 動作確認: 各 feature ページの初期表示・検索実行が正常に動作すること
