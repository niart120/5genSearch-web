# Feature Store 導入 — フォーム入力永続化・検索結果保持 仕様書

## 1. 概要

### 1.1 目的

各 feature のフォーム入力値を localStorage に永続化し、検索結果を Zustand Store に保持することで、ブラウザ再起動時やタブ切替時の状態消失を防ぐ。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Feature Store | 各 feature が持つ Zustand Store。フォーム入力 (永続化) と検索結果 (非永続化) を保持する |
| フォーム入力 | ユーザが直接入力・選択する値。検索条件・パラメータなど |
| 検索結果 | 検索実行により得られたデータ。`SeedOrigin[]`, `MtseedResult[]` 等 |
| Feature 切替 | サイドバーから別 feature のタブに遷移する操作。現在の feature コンポーネントがアンマウントされる |
| 永続化 | localStorage に保存し、ブラウザを閉じても値が保持されること |

### 1.3 背景・問題

現在の状態管理設計 ([state-management.md](../../architecture/state-management.md) Section 3) では、検索条件・フォーム入力値を各 feature の `useState` で管理し、検索結果を `useSearch` hook 内部の `useState` で保持している。

この設計には以下の問題がある:

| 問題 | 影響 |
|------|------|
| Feature 切替でフォーム入力値が消失 | ユーザが設定した検索条件を再入力する必要がある |
| Feature 切替で検索結果が消失 | 時間のかかった検索結果を再取得する必要がある |
| ブラウザ再起動でフォーム入力値が消失 | DS 設定・トレーナー情報以外の全条件を毎回入力し直す必要がある |

### 1.4 期待効果

| 状態 | 現状 | 変更後 |
|------|------|--------|
| フォーム入力 | Feature 切替・リロードで消失 | ブラウザを閉じても保持 (localStorage) |
| 検索結果 | Feature 切替で消失 | Feature 切替後も保持 (Zustand in-memory) |
| 検索結果 | リロードで消失 | リロードで消失 (変更なし — 意図的) |

検索結果を localStorage に永続化しない理由: 結果データは数千〜数万件になりうるため、localStorage の容量制限 (5-10 MB) を圧迫するリスクがある。

### 1.5 着手条件

- 全 7 feature (datetime-search, mtseed-search, egg-search, tid-adjust, needle, pokemon-list, egg-list) の Page コンポーネントが実装済みであること
- `useSearch` hook / `WorkerPool` の基本動作が安定していること
- 公開前であるため、localStorage スキーマの後方互換は不要

## 2. 対象ファイル

### 2.1 新規作成

| ファイル | 変更種別 | 変更内容 |
|---------|----------|---------|
| `src/features/datetime-search/store.ts` | 新規 | 起動時刻検索 Feature Store |
| `src/features/mtseed-search/store.ts` | 新規 | MT Seed 検索 Feature Store |
| `src/features/egg-search/store.ts` | 新規 | 孵化起動時刻検索 Feature Store |
| `src/features/tid-adjust/store.ts` | 新規 | ID 調整 Feature Store |
| `src/features/needle/store.ts` | 新規 | 針読み Feature Store |
| `src/features/pokemon-list/store.ts` | 新規 | ポケモンリスト Feature Store |
| `src/features/egg-list/store.ts` | 新規 | タマゴリスト Feature Store |
| `src/test/unit/features/datetime-search-store.test.ts` | 新規 | Store テスト |
| `src/test/unit/features/mtseed-search-store.test.ts` | 新規 | Store テスト |
| `src/test/unit/features/egg-search-store.test.ts` | 新規 | Store テスト |
| `src/test/unit/features/tid-adjust-store.test.ts` | 新規 | Store テスト |
| `src/test/unit/features/needle-store.test.ts` | 新規 | Store テスト |
| `src/test/unit/features/pokemon-list-store.test.ts` | 新規 | Store テスト |
| `src/test/unit/features/egg-list-store.test.ts` | 新規 | Store テスト |

### 2.2 既存変更

| ファイル | 変更種別 | 変更内容 |
|---------|----------|---------|
| `src/features/datetime-search/components/datetime-search-page.tsx` | 修正 | `useState` → Feature Store 参照に切替 |
| `src/features/mtseed-search/components/mtseed-search-page.tsx` | 修正 | 同上 |
| `src/features/egg-search/components/egg-search-page.tsx` | 修正 | 同上 |
| `src/features/tid-adjust/components/tid-adjust-page.tsx` | 修正 | 同上 |
| `src/features/needle/components/needle-page.tsx` | 修正 | 同上 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 修正 | 同上 |
| `src/features/egg-list/components/egg-list-page.tsx` | 修正 | 同上 |
| `src/features/datetime-search/hooks/use-datetime-search.ts` | 修正 | 検索結果を Feature Store に書き込み |
| `src/features/mtseed-search/hooks/use-mtseed-search.ts` | 修正 | 同上 |
| `src/features/egg-search/hooks/use-egg-search.ts` | 修正 | 同上 |
| `src/features/tid-adjust/hooks/use-tid-adjust.ts` | 修正 | 同上 |
| `src/features/needle/hooks/use-needle-search.ts` | 修正 | 同上 |
| `src/features/pokemon-list/hooks/use-pokemon-list.ts` | 修正 | 同上 |
| `src/features/egg-list/hooks/use-egg-list.ts` | 修正 | 同上 |
| `spec/agent/architecture/state-management.md` | 修正 | Section 3, 4, 5 の更新 |
| `spec/agent/architecture/frontend-structure.md` | 修正 | feature 内部構成に `store.ts` 追加 |

## 3. 設計方針

### 3.1 状態分類の再定義

既存の状態分類 ([state-management.md](../../architecture/state-management.md) Section 3) を以下のように再定義する。

| 分類 | 保存先 | ライフサイクル | 対象 |
|------|--------|--------------|------|
| グローバル設定 (永続化) | Zustand + localStorage | ブラウザ閉→保持 | DS 設定, トレーナー情報, UI 設定 |
| **Feature 入力 (永続化)** | Zustand + localStorage | **ブラウザ閉→保持** | 各 feature のフォーム入力値 |
| **Feature 結果 (非永続化)** | Zustand (in-memory) | **Feature 切替→保持, リロード→消失** | 各 feature の検索結果 |
| Feature 間連携 (非永続化) | Zustand (in-memory) | Feature 切替→保持, リロード→消失 | `pendingTargetSeeds`, `pendingSeedOrigins` 等 |
| UI ローカル (非永続化) | `useState` | コンポーネント破棄→消失 | ダイアログ開閉, 確認ダイアログ, 選択行 |

太字が今回の変更箇所。既存の「検索条件 → feature ローカル state」「フォーム入力中の値 → `useState`」を廃止し、Feature Store に移行する。

### 3.2 Feature Store のディレクトリ配置

Feature Store は各 feature ディレクトリ内に `store.ts` として配置する。

```
features/{feature-name}/
├── index.ts
├── store.ts                 # NEW: Feature Store
├── types.ts
├── components/
│   ├── {Feature}Page.tsx
│   └── ...
└── hooks/
    └── use-{feature}.ts
```

`stores/` ディレクトリではなく `features/` 内に配置する理由:

1. Feature Store はその feature の Page / Hook からのみ参照される (feature 外から参照されない)
2. フォーム入力の型定義 (`types.ts`) と同じ feature 内に配置することで依存が局所化する
3. `stores/` は機能横断の共有状態 (`settings/`, `search/`) に限定する方針を維持できる

依存方向:

```
Feature Page → Feature Store ← Feature Hook
              ↓
         stores/settings/  (DS 設定の参照のみ)
```

Feature Store 間の依存は禁止する。Feature 間の状態連携は既存の `stores/search/results.ts` (`pending*`) を継続使用する。

### 3.3 永続化設計

#### 3.3.1 永続化対象の選定基準

| 永続化する | 永続化しない |
|-----------|-------------|
| ユーザが直接入力した値 (テキスト, 数値, 選択) | 他の永続化済み値から再導出可能な値 |
| ユーザがトグルした設定値 (GPU 使用, 自動検索等) | 検索結果データ |
| | ダイアログ開閉状態 |
| | 他 feature からの連携値 (`pendingSeedOrigins` 等) |

`SeedOrigin` は永続化対象から除外する。BigInt を含むため `JSON.stringify` で直接シリアライズ不可という技術的制約はあるが (`seed-origin-serde.ts` に hex 文字列変換の仕組みは実装済み)、主たる除外理由は以下の通り:

1. **needle**: `seedOrigins` は `seedMode` / `seedHex` / `datetime` / `keyInput` + DS 設定から `useMemo` で導出される。入力値を永続化すれば再導出可能
2. **pokemon-list / egg-list**: `seedOrigins` は `SeedInputSection` 経由で設定される。manual-seeds / manual-startup モードでは入力値から再導出可能。import モードでは元の JSON テキストからの再パースで復元可能

いずれのケースでも、元となる入力値 (seedHex, datetime 等) を永続化すれば `SeedOrigin` 自体を永続化する必要はない。導出元を永続化し、mount 時に再導出する方針で統一する。

#### 3.3.2 Feature 別永続化フィールド

| Feature | 永続化フィールド | 除外フィールド |
|---------|-----------------|--------------|
| datetime-search | `dateRange`, `timeRange`, `keySpec`, `targetSeedsRaw`, `useGpu` | 検索結果, UI 状態 |
| mtseed-search | `ivFilter`, `mtOffset`, `isRoamer`, `useGpu` | 検索結果 |
| egg-search | `dateRange`, `timeRange`, `keySpec`, `eggParams`, `genConfig`, `filter` | 検索結果, UI 状態 |
| tid-adjust | `dateRange`, `timeRange`, `keySpec`, `tid`, `sid`, `shinyPidRaw`, `saveMode` | 検索結果, UI 状態 |
| needle | `seedMode`, `datetime`, `keyInput`, `seedHex`, `patternRaw`, `userOffset`, `maxAdvance`, `autoSearch` | `seedOrigins` (入力値から再導出), 検索結果 |
| pokemon-list | `seedInputMode`, `encounterParams`, `filter`, `statsFilter`, `statMode` | `seedOrigins` (入力値から再導出), 検索結果 |
| egg-list | `seedInputMode`, `eggParams`, `genConfig`, `speciesId`, `filter`, `statsFilter`, `statMode` | `seedOrigins` (入力値から再導出), 検索結果 |

#### 3.3.3 localStorage キー命名

Zustand `persist` の `name` を以下の形式で命名する:

```
feature:{feature-id}
```

例: `feature:datetime-search`, `feature:mtseed-search`

既存の `ds-config`, `trainer`, `ui-settings` キーとの衝突を避けるため `feature:` プレフィクスを使用する。

#### 3.3.4 スキーマ管理

公開前のため migration は実装しない ([typescript.instructions.md](../../../.github/instructions/typescript.instructions.md) の永続化運用規約に従う)。

- 状態追加: Zustand の shallow merge で初期値補完
- 破壊的変更: localStorage クリアで対応
- `version: 1` を設定し、公開後の migration に備える

### 3.4 検索結果の Store 化

#### 3.4.1 結果の保持ライフサイクル

```
search start → 既存結果クリア → バッチ結果を Store に蓄積 → search complete
                                                              ↓
                                                    Store に結果が残る
                                                              ↓
                                          Feature 切替 (unmount) → Store 保持
                                                              ↓
                                          Feature 復帰 (remount) → Store から読み込み
```

#### 3.4.2 useSearch との連携パターン

`useSearch` hook は WorkerPool のライフサイクルと密接に結合しており、内部の `useState` で結果を管理している。この内部状態はコンポーネントのアンマウント時に消失する。

Feature Hook は `useSearch` の結果を Feature Store に同期する:

```typescript
// 概念的なパターン (実コードは Feature ごとに型が異なる)
export function useFeatureSearch() {
  const search = useSearch(config);
  const setResults = useFeatureStore((s) => s.setResults);
  const clearResults = useFeatureStore((s) => s.clearResults);
  const storedResults = useFeatureStore((s) => s.results);

  // 検索開始済みフラグ — mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);

  const startSearch = useCallback((...args) => {
    searchActiveRef.current = true;
    clearResults();
    search.start(buildTasks(...args));
  }, [clearResults, search]);

  // useSearch の結果を Store に同期
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const flattened = flattenResults(search.results);
    setResults(flattened);
  }, [search.results, setResults]);

  // 検索完了時にフラグリセット
  useEffect(() => {
    if (searchActiveRef.current && !search.isLoading) {
      searchActiveRef.current = false;
    }
  }, [search.isLoading]);

  return {
    // 結果は Store から読み出す (Feature 切替後も保持される)
    results: storedResults,
    // isLoading / progress / error は useSearch から (エフェメラル)
    isLoading: search.isLoading,
    progress: search.progress,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
```

要点:

- `searchActiveRef`: mount 直後に `useSearch` の空 results で Store を上書きすることを防ぐガード
- `results` は Store から返す → Feature 切替後も保持される
- `isLoading` / `progress` / `error` は `useSearch` 内部の `useState` から返す → エフェメラル (Feature 切替で消失するが、検索中に切替える運用を想定しない)

#### 3.4.3 needle の特殊対応

needle はメインスレッド同期実行 (`search_needle_pattern`) のため `useSearch` / WorkerPool を使用しない。`useNeedleSearch` hook は内部の `useState` で結果を管理している。

同様のパターンで Feature Store に同期する:

```typescript
export function useNeedleSearch() {
  const setResults = useNeedleStore((s) => s.setResults);
  const storedResults = useNeedleStore((s) => s.results);

  const search = useCallback((origins, pattern, config) => {
    const found = search_needle_pattern(origins, pattern, config);
    setResults(found); // Store に直接書き込み
  }, [setResults]);

  return { results: storedResults, search, /* ... */ };
}
```

### 3.5 Page コンポーネントの改修方針

#### 3.5.1 useState → Store 参照への移行

Page コンポーネントのフォーム入力 `useState` を Feature Store の selector + action に置換する。

変更前:

```tsx
function MtseedSearchPage() {
  const [ivFilter, setIvFilter] = useState<IvFilter>(DEFAULT_IV_FILTER);
  const [mtOffset, setMtOffset] = useState(0);
  // ...
}
```

変更後:

```tsx
function MtseedSearchPage() {
  const ivFilter = useMtseedSearchStore((s) => s.ivFilter);
  const setIvFilter = useMtseedSearchStore((s) => s.setIvFilter);
  const mtOffset = useMtseedSearchStore((s) => s.mtOffset);
  const setMtOffset = useMtseedSearchStore((s) => s.setMtOffset);
  // ...
}
```

#### 3.5.2 useState に残す状態

以下はコンポーネントローカルの `useState` に残す (永続化不要、Feature 切替時の復元不要):

- `detailOpen`, `selectedResult` — 詳細ダイアログの開閉・選択行
- `confirmDialog` — 確認ダイアログの状態
- `templateDialogOpen` — テンプレート選択ダイアログの開閉

#### 3.5.3 再レンダリング最適化

Feature Store からの読み込みは、必要なフィールドのみを selector で取得する。Zustand の shallow comparison により、無関係なフィールドの変更で再レンダリングが発生しない。

```tsx
// 個別 selector (推奨)
const ivFilter = useMtseedSearchStore((s) => s.ivFilter);

// まとめて取得する場合は shallow で比較
import { useShallow } from 'zustand/react/shallow';
const { ivFilter, mtOffset } = useMtseedSearchStore(
  useShallow((s) => ({ ivFilter: s.ivFilter, mtOffset: s.mtOffset }))
);
```

`rerender-derived-state` ルール ([React Best Practices](../../../.github/skills/vercel-react-best-practices/AGENTS.md) Section 5.8) に従い、バリデーション結果などの導出値は selector 内で計算せず、コンポーネント内の `useMemo` で導出する。

### 3.6 アーキテクチャ文書の更新方針

以下のアーキテクチャ文書を本実装に合わせて更新する:

#### state-management.md

| Section | 変更内容 |
|---------|---------|
| 3.2.1 | 「検索条件 → 各 feature のローカル state」を「Feature Store (永続化)」に変更 |
| 3.3 | 「フォーム入力中の値 → `useState`」を Feature Store に変更。`useState` に残す状態を再定義 |
| 4.1 | Feature Store のディレクトリ配置を追記 |
| 5 | Feature Store の参照パターンを追記 |

#### frontend-structure.md

| Section | 変更内容 |
|---------|---------|
| features/ 内部構成 | `store.ts` を追加 |

## 4. 実装仕様

### 4.1 Feature Store インターフェース

各 Feature Store は以下の構造を持つ。具体的なフィールドは Feature ごとに異なるが、パターンは共通する。

```typescript
// features/mtseed-search/store.ts — 代表例

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IvFilter, MtseedResult } from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface MtseedSearchFormState {
  ivFilter: IvFilter;
  mtOffset: number;
  isRoamer: boolean;
  useGpu: boolean;
}

/** 非永続化: 検索結果 */
interface MtseedSearchResultState {
  results: MtseedResult[];
}

type MtseedSearchState = MtseedSearchFormState & MtseedSearchResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface MtseedSearchActions {
  // Form actions
  setIvFilter: (ivFilter: IvFilter) => void;
  setMtOffset: (mtOffset: number) => void;
  setIsRoamer: (isRoamer: boolean) => void;
  setUseGpu: (useGpu: boolean) => void;

  // Result actions
  setResults: (results: MtseedResult[]) => void;
  clearResults: () => void;

  // Reset
  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_IV_FILTER: IvFilter = {
  hp: [31, 31],
  atk: [31, 31],
  def: [31, 31],
  spa: [31, 31],
  spd: [31, 31],
  spe: [31, 31],
};

const DEFAULT_FORM_STATE: MtseedSearchFormState = {
  ivFilter: DEFAULT_IV_FILTER,
  mtOffset: 0,
  isRoamer: false,
  useGpu: true,
};

const DEFAULT_RESULT_STATE: MtseedSearchResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useMtseedSearchStore = create<MtseedSearchState & MtseedSearchActions>()(
  persist(
    (set) => ({
      ...DEFAULT_FORM_STATE,
      ...DEFAULT_RESULT_STATE,

      // Form actions
      setIvFilter: (ivFilter) => set({ ivFilter }),
      setMtOffset: (mtOffset) => set({ mtOffset }),
      setIsRoamer: (isRoamer) => set({ isRoamer }),
      setUseGpu: (useGpu) => set({ useGpu }),

      // Result actions
      setResults: (results) => set({ results }),
      clearResults: () => set({ results: [] }),

      // Reset
      resetForm: () => set(DEFAULT_FORM_STATE),
    }),
    {
      name: 'feature:mtseed-search',
      version: 1,
      partialize: (state) => ({
        ivFilter: state.ivFilter,
        mtOffset: state.mtOffset,
        isRoamer: state.isRoamer,
        useGpu: state.useGpu,
      }),
    }
  )
);
```

設計ポイント:

- `partialize` で永続化対象をフォーム入力のみに限定し、検索結果を除外
- State と Actions を interface で分離 ([state-management.md](../../architecture/state-management.md) Section 4.3)
- デフォルト値を `DEFAULT_FORM_STATE` / `DEFAULT_RESULT_STATE` に分離し、`resetForm` で初期化可能にする

### 4.2 各 Feature Store の定義

#### 4.2.1 datetime-search

```typescript
interface DatetimeSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  targetSeedsRaw: string;
  useGpu: boolean;
}

interface DatetimeSearchResultState {
  results: SeedOrigin[];
}
```

`results` は検索結果データのため `partialize` で除外する。`targetSeedsRaw` はテキスト形式 (hex 文字列) のため永続化可能。

**注意**: `SeedOrigin` は BigInt を含むため `JSON.stringify` で直接シリアライズ不可だが、これは検索結果側のフィールドであるため `partialize` による除外で問題ない。

#### 4.2.2 mtseed-search

Section 4.1 の代表例と同一。

#### 4.2.3 egg-search

```typescript
interface EggSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
}

interface EggSearchResultState {
  results: EggDatetimeSearchResult[];
}
```

`eggParams` は `EggGenerationParams` 型で、`parent_male` / `parent_female` (IV 値) や文字列型の enum を含むがすべて JSON シリアライズ可能。

#### 4.2.4 tid-adjust

```typescript
interface TidAdjustFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  tid: string;
  sid: string;
  shinyPidRaw: string;
  saveMode: SaveMode;
}

interface TidAdjustResultState {
  results: TrainerInfoSearchResult[];
}
```

`tid` / `sid` は数値ではなくフォーム上の文字列表現を保持する (未入力状態 `''` を表現するため)。

#### 4.2.5 needle

```typescript
interface NeedleFormState {
  seedMode: SeedMode;
  datetime: Datetime;
  keyInput: KeyInput;
  seedHex: string;
  patternRaw: string;
  userOffset: number;
  maxAdvance: number;
  autoSearch: boolean;
}

interface NeedleResultState {
  results: NeedleSearchResult[];
}
```

`datetime` (`{ year, month, day, hour, minute, second }`) と `keyInput` (`{ buttons: string[] }`) はプレーンオブジェクトのため JSON シリアライズ可能。

#### 4.2.6 pokemon-list

```typescript
interface PokemonListFormState {
  seedInputMode: SeedInputMode;
  encounterParams: EncounterParamsOutput;
  filter: PokemonFilter | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
}

interface PokemonListResultState {
  results: UiPokemonData[];
}
```

`seedOrigins` は永続化対象外。入力値 (seedInputMode に応じた seedHex / datetime 等) から再導出可能であり、`SeedInputSection` の mount 時に自動解決される。Feature 間連携 (`pendingSeedOrigins`) 経由の場合もワンショット消費後に入力値として定着する。

`encounterParams` はエンカウントスロット情報を含む。選択したロケーション・種族の情報は永続化されるが、アプリ再起動時にエンカウントデータの読み込みが完了している前提で動作する。

#### 4.2.7 egg-list

```typescript
interface EggListFormState {
  seedInputMode: SeedInputMode;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  speciesId: number | undefined;
  filter: EggFilter | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
}

interface EggListResultState {
  results: UiEggData[];
}
```

### 4.3 Feature Hook 改修

#### 4.3.1 WorkerPool 系 Feature Hook (datetime-search, mtseed-search, egg-search, tid-adjust, pokemon-list, egg-list)

Section 3.4.2 のパターンに従い、`useSearch` の結果を Feature Store に同期する。

変更点:

1. 結果の格納先を `useSearch` 内部 → Feature Store に変更
2. `startSearch` 内で `clearResults()` を呼び出し
3. `searchActiveRef` で mount 直後の空配列上書きを防止
4. 返り値の `results` を Store から取得

```typescript
// features/mtseed-search/hooks/use-mtseed-search.ts — 代表例

export function useMtseedSearch(): UseMtseedSearchReturn {
  // Store → useGpu を読み取り (永続化済み)
  const useGpu = useMtseedSearchStore((s) => s.useGpu);
  const config = useSearchConfig(useGpu);
  const search = useSearch(config);

  // Store actions
  const setResults = useMtseedSearchStore((s) => s.setResults);
  const clearResults = useMtseedSearchStore((s) => s.clearResults);
  const storedResults = useMtseedSearchStore((s) => s.results);

  const searchActiveRef = useRef(false);

  const startSearch = useCallback(
    (context: MtseedSearchContext) => {
      searchActiveRef.current = true;
      clearResults();
      // ... build tasks, call search.start(tasks)
    },
    [clearResults, search, /* ... */]
  );

  // 結果同期
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const flat = flattenBatchResults<MtseedResult>(search.results, isMtseedResult);
    setResults(flat);
  }, [search.results, setResults]);

  useEffect(() => {
    if (searchActiveRef.current && !search.isLoading) {
      searchActiveRef.current = false;
    }
  }, [search.isLoading]);

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    results: storedResults,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
```

**useGpu の管理**: `useGpu` は Feature Store で永続化されるため、Feature Hook が Store から直接読み取り `useSearchConfig` に渡す。Page コンポーネントから引数として受け取る必要がなくなり、hook の API が簡素化される。

#### 4.3.2 needle (同期実行)

Section 3.4.3 のパターンに従う。WASM 同期呼び出しの結果を直接 Store に書き込む。

### 4.4 デフォルト値の扱い

一部の feature ではフォーム入力のデフォルト値が DS 設定や動的データに依存する:

| Feature | フィールド | 依存先 | 対応方針 |
|---------|-----------|--------|---------|
| mtseed-search | `mtOffset` | `config.version` (BW: 0, BW2: 2) | Store のデフォルト値は 0。DS 設定変更時に Page コンポーネント側で `useEffect` により補正する |
| datetime-search | `targetSeedsRaw` | `pendingTargetSeeds` (Feature 間連携) | Store のデフォルト値は空文字列。`pendingTargetSeeds` 消費は Page コンポーネントの `useEffect` で対応 (既存パターンを維持) |
| egg-search | `dateRange` | `getTodayDateRange()` | Store のデフォルト値は `getTodayDateRange()` (lazy init)。永続化済みの場合は復元値が優先される |

Store のデフォルト値は静的な初期値を使用し、DS 設定などの動的依存は Page コンポーネント側の `useEffect` で注入する。

## 5. テスト方針

### 5.1 Store ユニットテスト

各 Feature Store に対して以下を検証する。実行環境: jsdom (`src/test/unit/`)。

| テスト内容 | 検証事項 |
|-----------|---------|
| 初期状態 | `getState()` がデフォルト値を返すこと |
| フォーム入力更新 | `setXxx()` で対応フィールドが更新されること |
| 検索結果更新 | `setResults()` / `clearResults()` が正しく動作すること |
| フォームリセット | `resetForm()` でフォーム入力がデフォルトに戻り、検索結果は保持されること |
| 永続化対象の分離 | `partialize` が検索結果を除外すること |

```typescript
// テスト例: features/mtseed-search/store.ts
describe('mtseed-search store', () => {
  beforeEach(() => {
    useMtseedSearchStore.setState(useMtseedSearchStore.getInitialState?.() ?? {});
  });

  it('should initialize with default values', () => {
    const state = useMtseedSearchStore.getState();
    expect(state.ivFilter.hp).toEqual([31, 31]);
    expect(state.results).toEqual([]);
  });

  it('should update ivFilter', () => {
    useMtseedSearchStore.getState().setIvFilter({
      ...DEFAULT_IV_FILTER,
      hp: [0, 31],
    });
    expect(useMtseedSearchStore.getState().ivFilter.hp).toEqual([0, 31]);
  });

  it('should preserve results on resetForm', () => {
    useMtseedSearchStore.getState().setResults([mockResult]);
    useMtseedSearchStore.getState().resetForm();
    expect(useMtseedSearchStore.getState().results).toEqual([mockResult]);
    expect(useMtseedSearchStore.getState().ivFilter).toEqual(DEFAULT_IV_FILTER);
  });
});
```

### 5.2 Feature Hook テスト

Feature Hook の結果同期ロジックを検証する。WorkerPool 依存のため、統合テスト (`src/test/integration/`) またはモック環境で実施する。

| テスト内容 | 検証事項 |
|-----------|---------|
| 検索結果の Store 同期 | 検索完了後に Store に結果が書き込まれること |
| mount 直後の上書き防止 | remount 時に Store の既存結果が空配列で上書きされないこと |

### 5.3 既存テストへの影響

既存のコンポーネントテストで `useState` 初期値に依存しているものがある場合、Feature Store のモック/リセットが必要になる。`beforeEach` で Store をリセットするパターンを適用する。

## 6. 実装チェックリスト

### Phase 1: Store 作成

- [x] `src/features/datetime-search/store.ts` 作成
- [x] `src/features/mtseed-search/store.ts` 作成
- [x] `src/features/egg-search/store.ts` 作成
- [x] `src/features/tid-adjust/store.ts` 作成
- [x] `src/features/needle/store.ts` 作成
- [x] `src/features/pokemon-list/store.ts` 作成
- [x] `src/features/egg-list/store.ts` 作成
- [x] Store ユニットテスト 7 件作成

### Phase 2: Feature Hook 改修

- [x] `use-datetime-search.ts` — 結果を Store に同期
- [x] `use-mtseed-search.ts` — 結果を Store に同期
- [x] `use-egg-search.ts` — 結果を Store に同期
- [x] `use-tid-adjust.ts` — 結果を Store に同期
- [x] `use-needle-search.ts` — 結果を Store に同期
- [x] `use-pokemon-list.ts` — 結果を Store に同期
- [x] `use-egg-list.ts` — 結果を Store に同期

### Phase 3: Page コンポーネント改修

- [x] `datetime-search-page.tsx` — `useState` → Store
- [x] `mtseed-search-page.tsx` — `useState` → Store
- [x] `egg-search-page.tsx` — `useState` → Store
- [x] `tid-adjust-page.tsx` — `useState` → Store
- [x] `needle-page.tsx` — `useState` → Store
- [x] `pokemon-list-page.tsx` — `useState` → Store
- [x] `egg-list-page.tsx` — `useState` → Store

### Phase 4: アーキテクチャ文書更新

- [x] `spec/agent/architecture/state-management.md` 更新
- [x] `spec/agent/architecture/frontend-structure.md` 更新

### Phase 5: 検証

- [ ] 全 feature のフォーム入力→ブラウザリロード→入力値復元を確認
- [ ] 全 feature の検索実行→タブ切替→復帰→結果表示を確認
- [x] `pnpm test:run` 全テスト pass
- [x] `pnpm lint` エラーなし
- [x] `pnpm exec tsc -b --noEmit` 型エラーなし
