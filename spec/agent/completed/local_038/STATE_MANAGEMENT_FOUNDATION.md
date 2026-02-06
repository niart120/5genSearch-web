# 状態管理基盤 仕様書

## 1. 概要

### 1.1 目的

Zustand による状態管理基盤を構築し、永続化対象の設定 Store・カスタムフック・Store 間同期の仕組みを整備する。Phase 2 以降の UI 実装がスムーズに進行できる土台を作る。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Store | Zustand の `create()` で生成される状態コンテナ |
| persist middleware | Zustand の永続化ミドルウェア。localStorage との同期を担う |
| カスタムフック | Store を隠蔽し、コンポーネントが Store 実装に依存しないための React Hook |
| Store 間同期 | `subscribe` ベースで Store 間の状態連携を行う仕組み |
| `DsConfig` | WASM 側で定義された DS 本体設定型 (`mac`, `hardware`, `version`, `region`) |
| `Timer0VCountRange` | Timer0/VCount の範囲を表す WASM 型 |
| `TrainerInfo` | トレーナー ID (`tid`) と裏 ID (`sid`) を保持する WASM 型 |

### 1.3 背景・問題

現時点で永続化が必要な設定値 (DS 設定、トレーナー情報) の管理基盤が存在しない。Phase 3 の機能実装 (DS 設定画面、起動時刻検索フォーム等) を開始するには、以下が必要:

1. DS 設定を保存・復元する仕組み
2. トレーナー情報を保存・復元する仕組み
3. UI 設定 (言語等) を保存・復元する仕組み
4. 上記をコンポーネントから参照するためのカスタムフック

検索進捗 (progress) は `use-search.ts` 内の `useState` で管理しており、Phase 1 では据え置く。ProgressOverlay のデザインが固まり、コンポーネントツリーを跨ぐ参照が必要になった時点で Store 化を検討する。

検索結果 (results) は Zustand Store で管理する。起動時刻検索で得た `SeedOrigin` を個体生成リスト機能に引き継ぐ等、機能横断で結果を参照するユースケースが想定されるため、Phase 1 の時点で Store 化しておく。

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 永続化 | DS 設定やトレーナー情報がブラウザリロード後も保持される |
| 結果の機能横断参照 | 検索結果を features 間で引き継げる (例: 起動時刻検索 → 個体生成リスト) |
| Store 分割 | 1 ファイルあたり 200 行以下を目安にし、保守性を確保 |
| tsx 疎結合 | コンポーネントが Store 実装に依存せず、カスタムフック経由でアクセス |
| テスト容易性 | `getState()` / `setState()` で React 不要のユニットテスト |

### 1.5 着手条件

- Worker 基盤が完了していること (達成済み)
- Zustand が依存に追加されていること (本チケットで実施)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 変更 | `zustand` を dependencies に追加 |
| `src/stores/settings/ds-config.ts` | 新規 | DS 設定 Store (永続化) |
| `src/stores/settings/trainer.ts` | 新規 | トレーナー情報 Store (永続化) |
| `src/stores/settings/ui.ts` | 新規 | UI 設定 Store (永続化) |
| `src/stores/settings/index.ts` | 新規 | settings re-export |
| `src/stores/search/results.ts` | 新規 | 検索結果 Store (非永続化) |
| `src/stores/search/index.ts` | 新規 | search re-export |
| `src/stores/index.ts` | 新規 | stores re-export |
| `src/stores/sync.ts` | 新規 | Store 間同期セットアップ |
| `src/hooks/use-ds-config.ts` | 新規 | DS 設定カスタムフック |
| `src/hooks/use-trainer.ts` | 新規 | トレーナー情報カスタムフック |
| `src/hooks/use-ui-settings.ts` | 新規 | UI 設定カスタムフック |
| `src/hooks/use-search-results.ts` | 新規 | 検索結果カスタムフック |
| `src/test/unit/stores/ds-config.test.ts` | 新規 | DS 設定 Store テスト |
| `src/test/unit/stores/trainer.test.ts` | 新規 | トレーナー情報 Store テスト |
| `src/test/unit/stores/ui.test.ts` | 新規 | UI 設定 Store テスト |
| `src/test/unit/stores/results.test.ts` | 新規 | 検索結果 Store テスト |
| `src/test/unit/stores/sync.test.ts` | 新規 | Store 間同期テスト |
| `spec/agent/architecture/frontend-structure.md` | 変更 | `stores/` 構成を 5 ファイル分割に更新 |

## 3. 設計方針

### 3.1 Store 分割

```
stores/
├── settings/
│   ├── ds-config.ts      # DS 設定 (永続化)
│   ├── trainer.ts         # トレーナー情報 (永続化)
│   ├── ui.ts              # UI 設定 (永続化)
│   └── index.ts           # re-export
├── search/
│   ├── results.ts         # 検索結果 (非永続化)
│   └── index.ts           # re-export
├── sync.ts                # Store 間同期
└── index.ts               # re-export
```

Phase 1 で永続化対象の 3 Store と検索結果 Store を実装する。検索進捗 (progress) は `use-search.ts` 内の `useState` に据え置く。

### 3.2 分割基準

| 基準 | 説明 |
|------|------|
| 永続化有無 | 永続化対象は個別 Store に分離し、persist 設定を局所化 |
| 更新頻度 | 低頻度更新 (設定値) と高頻度更新 (進捗) を分離 |
| 依存関係 | 相互依存する状態は同一 Store に集約 |

### 3.3 設計規約

- 1 Store のコード量は **200 行以下** を目安とする
- `State` と `Actions` を interface で分離定義する
- WorkerPool 等のインスタンスは Store に保持しない
- コンポーネントは Store を直接参照せず、カスタムフック経由でアクセスする

### 3.4 永続化方針

- Zustand `persist` middleware を使用
- localStorage をストレージとする
- Store ごとに一意の `name` キーを付与
- `version` フィールドでスキーマバージョンを管理
- Phase 1 時点で `migrate` は省略 (初回スキーマのため)

### 3.5 WASM 型の利用方針

Store の State 型は WASM パッケージの型を直接利用する。フロントエンド独自のラッパー型は定義しない。

| Store | 利用する WASM 型 |
|-------|-----------------|
| ds-config | `DsConfig`, `Hardware`, `RomVersion`, `RomRegion`, `Timer0VCountRange` |
| trainer | `TrainerInfo` |
| ui | (WASM 型なし、フロントエンド独自型) || results | `SeedOrigin`, `MtseedResult`, `EggDatetimeSearchResult`, `TrainerInfoSearchResult` |
## 4. 実装仕様

### 4.1 DS 設定 Store

```typescript
// src/stores/settings/ds-config.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DsConfig,
  Timer0VCountRange,
} from '../../wasm/wasm_pkg.js';

// --- State ---

interface DsConfigState {
  /** DS 本体設定 */
  config: DsConfig;
  /** Timer0/VCount 範囲 (複数指定可能) */
  ranges: Timer0VCountRange[];
}

// --- Actions ---

interface DsConfigActions {
  /** DS 設定を部分更新 */
  setConfig: (partial: Partial<DsConfig>) => void;
  /** DS 設定を全体置換 */
  replaceConfig: (config: DsConfig) => void;
  /** Timer0/VCount 範囲を設定 */
  setRanges: (ranges: Timer0VCountRange[]) => void;
  /** 設定をデフォルトにリセット */
  reset: () => void;
}

// --- Defaults ---

const DEFAULT_DS_CONFIG: DsConfig = {
  mac: [0, 0, 0, 0, 0, 0],
  hardware: 'DsLite',
  version: 'Black',
  region: 'Jpn',
};

const DEFAULT_RANGES: Timer0VCountRange[] = [
  {
    timer0_min: 0x0c79,
    timer0_max: 0x0c7a,
    vcount_min: 0x5e,
    vcount_max: 0x5e,
  },
];

const DEFAULT_STATE: DsConfigState = {
  config: DEFAULT_DS_CONFIG,
  ranges: DEFAULT_RANGES,
};

// --- Store ---

export const useDsConfigStore = create<DsConfigState & DsConfigActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setConfig: (partial) =>
        set((state) => ({
          config: { ...state.config, ...partial },
        })),
      replaceConfig: (config) => set({ config }),
      setRanges: (ranges) => set({ ranges }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'ds-config',
      version: 1,
    },
  ),
);

/** Store 初期状態を取得 (テスト用) */
export const getDsConfigInitialState = (): DsConfigState => DEFAULT_STATE;
```

### 4.2 トレーナー情報 Store

```typescript
// src/stores/settings/trainer.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- State ---

interface TrainerState {
  /** トレーナー ID */
  tid: number | undefined;
  /** 裏 ID */
  sid: number | undefined;
}

// --- Actions ---

interface TrainerActions {
  /** TID を設定 */
  setTid: (tid: number | undefined) => void;
  /** SID を設定 */
  setSid: (sid: number | undefined) => void;
  /** TID/SID を一括設定 */
  setTrainer: (tid: number | undefined, sid: number | undefined) => void;
  /** リセット */
  reset: () => void;
}

// --- Defaults ---

const DEFAULT_STATE: TrainerState = {
  tid: undefined,
  sid: undefined,
};

// --- Store ---

export const useTrainerStore = create<TrainerState & TrainerActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setTid: (tid) => set({ tid }),
      setSid: (sid) => set({ sid }),
      setTrainer: (tid, sid) => set({ tid, sid }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'trainer',
      version: 1,
    },
  ),
);

/** Store 初期状態を取得 (テスト用) */
export const getTrainerInitialState = (): TrainerState => DEFAULT_STATE;
```

**設計判断: `TrainerInfo` 型を直接使わない理由**

WASM の `TrainerInfo` は `{ tid: number; sid: number }` だが、UI の入力状態として「未入力 (undefined)」を表現する必要がある。`TrainerInfo` 型のままでは未入力を表現できないため、Store 独自に `number | undefined` で保持する。`DatetimeSearchContext` 組み立て時に値を検証し、`TrainerInfoFilter` に変換する。

### 4.3 UI 設定 Store

```typescript
// src/stores/settings/ui.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

/** サポートする言語 */
type Language = 'ja' | 'en';

/** テーマ (将来対応) */
type Theme = 'light' | 'dark' | 'system';

// --- State ---

interface UiState {
  /** 表示言語 */
  language: Language;
  /** テーマ */
  theme: Theme;
}

// --- Actions ---

interface UiActions {
  /** 言語を設定 */
  setLanguage: (language: Language) => void;
  /** テーマを設定 */
  setTheme: (theme: Theme) => void;
  /** リセット */
  reset: () => void;
}

// --- Defaults ---

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: 'system',
};

// --- Store ---

export const useUiStore = create<UiState & UiActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'ui-settings',
      version: 1,
    },
  ),
);

/** Store 初期状態を取得 (テスト用) */
export const getUiInitialState = (): UiState => DEFAULT_STATE;
```

### 4.4 検索結果 Store

```typescript
// src/stores/search/results.ts

import { create } from 'zustand';
import type {
  SeedOrigin,
  MtseedResult,
  EggDatetimeSearchResult,
  TrainerInfoSearchResult,
} from '../../wasm/wasm_pkg.js';

// --- Types ---

/**
 * 検索結果の型 (すべての結果型の Union)
 *
 * worker-pool.ts の SearchResult と同一定義。
 * Store 側で再定義し、worker-pool への依存を避ける。
 */
export type SearchResult =
  | SeedOrigin[]
  | MtseedResult[]
  | EggDatetimeSearchResult[]
  | TrainerInfoSearchResult[];

// --- State ---

interface SearchResultsState {
  /** 検索結果 (累積) */
  results: SearchResult[];
  /** 最終検索完了時刻 (結果の鮮度判定用) */
  lastUpdatedAt: number | null;
}

// --- Actions ---

interface SearchResultsActions {
  /** 結果を追加 (Worker からの部分結果を累積) */
  addResult: (result: SearchResult) => void;
  /** 結果をクリア (新規検索開始時) */
  clearResults: () => void;
}

// --- Defaults ---

const DEFAULT_STATE: SearchResultsState = {
  results: [],
  lastUpdatedAt: null,
};

// --- Store ---

export const useSearchResultsStore = create<SearchResultsState & SearchResultsActions>()(
  (set) => ({
    ...DEFAULT_STATE,
    addResult: (result) =>
      set((state) => ({
        results: [...state.results, result],
        lastUpdatedAt: Date.now(),
      })),
    clearResults: () => set(DEFAULT_STATE),
  }),
);

/** Store 初期状態を取得 (テスト用) */
export const getSearchResultsInitialState = (): SearchResultsState => DEFAULT_STATE;
```

**設計判断: progress を Store 化しない理由**

進捗情報は現時点で `use-search.ts` を呼び出すコンポーネント内でのみ参照される。ProgressOverlay 等でコンポーネントツリーを跨ぐ参照が必要になった時点で Store 化を検討する。

結果を Store 化する理由は、起動時刻検索で得た `SeedOrigin` を個体生成リスト機能に引き継ぐ等、機能横断での参照が想定されるため。

### 4.5 re-export

```typescript
// src/stores/settings/index.ts
export { useDsConfigStore, getDsConfigInitialState } from './ds-config';
export { useTrainerStore, getTrainerInitialState } from './trainer';
export { useUiStore, getUiInitialState } from './ui';
```

```typescript
// src/stores/search/index.ts
export { useSearchResultsStore, getSearchResultsInitialState } from './results';
export type { SearchResult } from './results';
```

```typescript
// src/stores/index.ts
export * from './settings';
export * from './search';
```

### 4.6 カスタムフック

```typescript
// src/hooks/use-ds-config.ts

import { useDsConfigStore } from '../stores/settings/ds-config';
import type { DsConfig, Timer0VCountRange } from '../wasm/wasm_pkg.js';

/** DS 設定の読み書きフック */
export function useDsConfig() {
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const setConfig = useDsConfigStore((s) => s.setConfig);
  const replaceConfig = useDsConfigStore((s) => s.replaceConfig);
  const setRanges = useDsConfigStore((s) => s.setRanges);
  const reset = useDsConfigStore((s) => s.reset);

  return { config, ranges, setConfig, replaceConfig, setRanges, reset } as const;
}

/** DS 設定の読み取り専用フック (結果表示など) */
export function useDsConfigReadonly(): {
  config: DsConfig;
  ranges: Timer0VCountRange[];
} {
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  return { config, ranges };
}
```

```typescript
// src/hooks/use-trainer.ts

import { useTrainerStore } from '../stores/settings/trainer';

/** トレーナー情報の読み書きフック */
export function useTrainer() {
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);
  const setTid = useTrainerStore((s) => s.setTid);
  const setSid = useTrainerStore((s) => s.setSid);
  const setTrainer = useTrainerStore((s) => s.setTrainer);
  const reset = useTrainerStore((s) => s.reset);

  return { tid, sid, setTid, setSid, setTrainer, reset } as const;
}
```

```typescript
// src/hooks/use-ui-settings.ts

import { useUiStore } from '../stores/settings/ui';

/** UI 設定の読み書きフック */
export function useUiSettings() {
  const language = useUiStore((s) => s.language);
  const theme = useUiStore((s) => s.theme);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const setTheme = useUiStore((s) => s.setTheme);
  const reset = useUiStore((s) => s.reset);

  return { language, theme, setLanguage, setTheme, reset } as const;
}
```

```typescript
// src/hooks/use-search-results.ts

import { useSearchResultsStore } from '../stores/search/results';
import type { SearchResult } from '../stores/search/results';

/** 検索結果の読み書きフック */
export function useSearchResults() {
  const results = useSearchResultsStore((s) => s.results);
  const lastUpdatedAt = useSearchResultsStore((s) => s.lastUpdatedAt);
  const addResult = useSearchResultsStore((s) => s.addResult);
  const clearResults = useSearchResultsStore((s) => s.clearResults);

  return { results, lastUpdatedAt, addResult, clearResults } as const;
}

/** 検索結果の読み取り専用フック (他機能からの参照用) */
export function useSearchResultsReadonly(): {
  results: SearchResult[];
  lastUpdatedAt: number | null;
} {
  const results = useSearchResultsStore((s) => s.results);
  const lastUpdatedAt = useSearchResultsStore((s) => s.lastUpdatedAt);
  return { results, lastUpdatedAt };
}
```

### 4.7 Store 間同期

DS 設定が変更されたとき、他の Store に影響を波及させる仕組み。Phase 1 では同期対象が存在しないため、セットアップ関数のスケルトンのみ用意する。

```typescript
// src/stores/sync.ts

/**
 * Store 間同期のセットアップ
 *
 * アプリ起動時に 1 回だけ呼び出す。
 * 戻り値のクリーンアップ関数で全 subscription を解除できる。
 *
 * Phase 1 時点では同期対象なし。Phase 3 で検索 Store との同期を追加する。
 */
export function setupStoreSyncSubscriptions(): () => void {
  const cleanups: Array<() => void> = [];

  // Phase 3 で以下のような同期を追加:
  // const unsub = useDsConfigStore.subscribe(
  //   (state) => state.config,
  //   (config) => { useSearchStore.getState().applyDsConfig(config); },
  // );
  // cleanups.push(unsub);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
```

### 4.8 アプリ初期化への組み込み

`main.tsx` で同期セットアップを呼び出す:

```typescript
// main.tsx (変更箇所のみ)
import { setupStoreSyncSubscriptions } from './stores/sync';

// Store 間同期のセットアップ
setupStoreSyncSubscriptions();

// React ルート生成
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## 5. テスト方針

### 5.1 テスト分類

| テスト | 対象 | 環境 | ディレクトリ |
|--------|------|------|------------|
| DS 設定 Store | `useDsConfigStore` の状態操作 | jsdom | `src/test/unit/stores/` |
| トレーナー Store | `useTrainerStore` の状態操作 | jsdom | `src/test/unit/stores/` |
| UI 設定 Store | `useUiStore` の状態操作 | jsdom | `src/test/unit/stores/` |
| 検索結果 Store | `useSearchResultsStore` の状態操作 | jsdom | `src/test/unit/stores/` |
| Store 間同期 | `setupStoreSyncSubscriptions` | jsdom | `src/test/unit/stores/` |

Store テストは React コンポーネント不要で `getState()` / `setState()` による直接テストを行う。

### 5.2 テストケース一覧

#### DS 設定 Store

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | 初期状態 | デフォルト値 (`DsLite`, `Black`, `Jpn` 等) が設定されている |
| 2 | `setConfig` で部分更新 | `version` のみ変更し、他フィールドが保持される |
| 3 | `replaceConfig` で全体置換 | 全フィールドが新しい値に置換される |
| 4 | `setRanges` | Timer0/VCount 範囲が更新される |
| 5 | `reset` | デフォルト値に戻る |
| 6 | MAC アドレスの設定 | 6 要素の number 配列が正しく保存される |

#### トレーナー情報 Store

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | 初期状態 | `tid`, `sid` が `undefined` |
| 2 | `setTid` | TID のみ更新、SID は変更なし |
| 3 | `setSid` | SID のみ更新、TID は変更なし |
| 4 | `setTrainer` | TID/SID を一括更新 |
| 5 | `reset` | `undefined` に戻る |

#### UI 設定 Store

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | 初期状態 | `language: 'ja'`, `theme: 'system'` |
| 2 | `setLanguage` | 言語が変更される |
| 3 | `setTheme` | テーマが変更される |
| 4 | `reset` | デフォルト値に戻る |

#### 検索結果 Store

| # | テストケース | 検証内容 |
|---|------------|----------|
| 1 | 初期状態 | `results` が空配列、`lastUpdatedAt` が `null` |
| 2 | `addResult` | 結果が累積される |
| 3 | `addResult` 複数回 | 複数回呼ぶと結果が順に追加される |
| 4 | `addResult` で `lastUpdatedAt` 更新 | タイムスタンプが設定される |
| 5 | `clearResults` | 結果が空になり `lastUpdatedAt` が `null` に戻る |

#### Store 間同期

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | セットアップ | `setupStoreSyncSubscriptions()` がエラーなく完了する |
| 2 | クリーンアップ | 戻り値の関数を呼ぶと subscription が解除される |

### 5.3 テスト実装パターン

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useDsConfigStore, getDsConfigInitialState } from '../../../stores/settings/ds-config';

describe('ds-config store', () => {
  beforeEach(() => {
    useDsConfigStore.setState(getDsConfigInitialState(), true);
  });

  it('should have default config', () => {
    const { config } = useDsConfigStore.getState();
    expect(config.hardware).toBe('DsLite');
    expect(config.version).toBe('Black');
    expect(config.region).toBe('Jpn');
  });

  it('should partially update config via setConfig', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    const { config } = useDsConfigStore.getState();
    expect(config.version).toBe('White2');
    expect(config.hardware).toBe('DsLite'); // 他フィールド保持
  });
});
```

### 5.4 persist テストの注意点

- jsdom 環境では `localStorage` がモック提供される (`src/test/setup.ts` で設定済み)
- テスト間汚染を防ぐため `beforeEach` で Store を初期状態にリセットする
- hydration (localStorage → Store) のテストは Phase 1 では省略可能。永続化は `persist` middleware に委譲しており、middleware 自体のテストは Zustand 側の責務

## 6. 実装チェックリスト

- [x] `zustand` を dependencies に追加 (`pnpm add zustand`)
- [x] `src/stores/settings/ds-config.ts` — DS 設定 Store
- [x] `src/stores/settings/trainer.ts` — トレーナー情報 Store
- [x] `src/stores/settings/ui.ts` — UI 設定 Store
- [x] `src/stores/settings/index.ts` — settings re-export
- [x] `src/stores/search/results.ts` — 検索結果 Store
- [x] `src/stores/search/index.ts` — search re-export
- [x] `src/stores/index.ts` — stores re-export
- [x] `src/stores/sync.ts` — Store 間同期 (スケルトン)
- [x] `src/hooks/use-ds-config.ts` — DS 設定フック
- [x] `src/hooks/use-trainer.ts` — トレーナー情報フック
- [x] `src/hooks/use-ui-settings.ts` — UI 設定フック
- [x] `src/hooks/use-search-results.ts` — 検索結果フック
- [x] `src/main.tsx` — 同期セットアップ呼び出し追加
- [x] `src/test/unit/stores/ds-config.test.ts` — DS 設定 Store テスト
- [x] `src/test/unit/stores/trainer.test.ts` — トレーナー情報 Store テスト
- [x] `src/test/unit/stores/ui.test.ts` — UI 設定 Store テスト
- [x] `src/test/unit/stores/results.test.ts` — 検索結果 Store テスト
- [x] `src/test/unit/stores/sync.test.ts` — Store 間同期テスト
- [x] `spec/agent/architecture/frontend-structure.md` — stores 構成を更新
- [x] `pnpm lint` / `pnpm format:check` パス
- [x] `pnpm test:run` 全テストパス
