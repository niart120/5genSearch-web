# SeedInputSection pending 消費リファクタリング 仕様書

## 1. 概要

### 1.1 目的

`SeedInputSection` コンポーネントのマウント時 pending データ消費パターンを改善し、`react-hooks/exhaustive-deps` の lint 抑制を **完全に** 解消する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| pending パターン | Feature 間データ受け渡しのために `stores/search/results.ts` に一時値を書き込み、受信側がマウント時に消費してクリアする方式 |
| DetailOriginConsumer | pending detail origin の消費先 feature。`'pokemon-list' \| 'egg-list' \| 'needle'` の 3 種 |
| SeedInputSection | 3 つの入力モード (startup / seeds / import) を持つ共通 Seed 入力コンポーネント |
| atomic consume | Store から pending データを「読み取り + クリア」を 1 つの action で行う操作 |
| initialPending | lazy initializer で消費した pending データのスナップショット。mount 時に1回だけ確定する不変値 |

### 1.3 背景・問題

`SeedInputSection` はマウント時に `useEffect` で pending データを消費する。この effect は空の依存配列 `[]` で mount-only として動作させるため、`eslint-disable-next-line react-hooks/exhaustive-deps` で lint を抑制している。

抑制が必要だった理由:

1. effect 内で `setDatetime` / `setKeyInput` / `setSeedText` を呼ぶため、依存配列を正直に追加すると再実行を引き起こす
2. `onModeChange` / `onOriginsChange` 等の親コールバックを依存配列に含めると mount-only の意図に反する
3. `autoResolveStartup` / `autoResolveSeeds` が `dsConfig` / `ranges` に依存しており、それらも巻き込まれる

### 1.4 前提: local_092 による構造変更

本仕様は **local_092 (SeedInputSection タブ別 Origins 独立管理) の完了を前提とする**。

local_092 により、`autoResolveStartup` / `autoResolveSeeds` の出力先が `onOriginsChange` (親コールバック) から `setStartupOrigins` / `setSeedsOrigins` (内部 state) に変わる。この変更により:

- mount effect 内の `onOriginsChange` / `autoResolve*` 呼び出しが不要になる
- 全ての内部 state 初期化を `useState` lazy initializer で完結できる
- mount effect に残る親コールバックは `onModeChange` のみになる
- `onModeChange` は `initialPending` (参照安定) と組み合わせて `exhaustive-deps` を正直に満たせる

結果として、**lint 抑制が完全に不要になる**。

### 1.5 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| `exhaustive-deps` disable 数 | 1 箇所 | **0 箇所** |
| pending 消費の実行タイミング | effect (非同期、React 管理) | 同期的な初期化 (lazy initializer) |
| mount effect の責務 | 内部 state 初期化 + 親通知 + auto-resolve | `onModeChange` のみ |
| UX | 現状維持 | 現状維持 |

### 1.6 着手条件

- **local_092 (SeedInputSection タブ別 Origins 独立管理) が完了していること**
- `SeedInputSection` の既存テスト・lint が通過していること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|----------|---------|
| `src/stores/search/results.ts` | 修正 | `consumePendingDetailOrigin` / `consumePendingSeedOrigins` action 追加 |
| `src/components/forms/seed-input-section.tsx` | 修正 | mount effect → lazy initializer 化、lint 抑制コメント削除 |
| `src/test/unit/stores/search-results-store.test.ts` | 新規 | atomic consume action のテスト |

## 3. 設計方針

### 3.1 解決アプローチ

mount effect 内の操作を2層に分離する:

| 層 | 手段 | 対象 | lint 問題 |
|----|------|------|-----------|
| **同期初期化** | `useState` lazy initializer | pending 消費 + 内部 state 初期値 + origins 初期値 | なし (依存配列不要) |
| **親への通知** | `useEffect` | `onModeChange` のみ | なし (後述) |

local_092 前の構造では、resolve 結果を `onOriginsChange` で親に通知する必要があり、effect の依存配列が膨張していた。local_092 後は origins が内部 state になるため、lazy initializer で resolve 結果を直接セットできる。

### 3.2 Store 側: atomic consume action

`results.ts` に 2 つの consume action を追加する。いずれも「現在値を返却し、同時に Store をクリアする」動作を行う。

- `consumePendingDetailOrigin(consumer)`: `pendingDetailOrigins[consumer]` を返却し、当該エントリを削除
- `consumePendingSeedOrigins()`: `pendingSeedOrigins` を返却し、空配列にリセット

Zustand の `getState()` を介して同期的に呼び出すため、React レンダリングサイクルとの競合がない。

### 3.3 SeedInputSection 側: 全面 lazy initializer 化

```
useState(() => consumePending())       → initialPending (不変)
useState(() => derive(initialPending)) → datetime, keyInput, seedText
useState(() => resolve(initialPending))→ startupOrigins, seedsOrigins, importOrigins

useEffect([initialPending, onModeChange]) → onModeChange のみ
```

`initialPending` は lazy init で確定する不変値のため、effect の依存配列に含めても再実行されない。`onModeChange` は親側の `useCallback` で参照安定。この2つだけの依存配列で `exhaustive-deps` を正直に満たせる。

## 4. 実装仕様

### 4.1 `stores/search/results.ts` — consume action 追加

```typescript
interface SearchResultsActions {
  // ... 既存 action ...

  /** pendingDetailOrigin を消費 (読み取り + クリア) */
  consumePendingDetailOrigin: (consumer: DetailOriginConsumer) => SeedOrigin | undefined;
  /** pendingSeedOrigins を消費 (読み取り + クリア) */
  consumePendingSeedOrigins: () => SeedOrigin[];
}
```

実装:

```typescript
consumePendingDetailOrigin: (consumer) => {
  const current = get().pendingDetailOrigins[consumer];
  if (current !== undefined) {
    set((state) => {
      const next = { ...state.pendingDetailOrigins };
      delete next[consumer];
      return { pendingDetailOrigins: next };
    });
  }
  return current;
},
consumePendingSeedOrigins: () => {
  const current = get().pendingSeedOrigins;
  if (current.length > 0) {
    set({ pendingSeedOrigins: [] });
  }
  return current;
},
```

注意: `create` の引数を `(set)` → `(set, get)` に変更して `get` を受け取る。

### 4.2 pending 消費の型定義

```typescript
type InitialPending =
  | { type: 'startup'; detail: SeedOrigin & { Startup: unknown } }
  | { type: 'seed'; detail: SeedOrigin & { Seed: unknown } }
  | { type: 'seeds'; seeds: SeedOrigin[] }
  | undefined;
```

### 4.3 lazy initializer: pending 消費

```typescript
const [initialPending] = useState<InitialPending>(() => {
  const store = useSearchResultsStore.getState();
  const detail = store.consumePendingDetailOrigin(featureId);
  if (detail) {
    if ('Startup' in detail) return { type: 'startup', detail };
    return { type: 'seed', detail };
  }
  const seeds = store.consumePendingSeedOrigins();
  if (seeds.length > 0) return { type: 'seeds', seeds };
  return undefined;
});
```

### 4.4 lazy initializer: 内部 state 初期値

```typescript
const [datetime, setDatetime] = useState<Datetime>(() => {
  if (initialPending?.type === 'startup' && 'Startup' in initialPending.detail) {
    return initialPending.detail.Startup.datetime;
  }
  return DEFAULT_DATETIME;
});

const [keyInput, setKeyInput] = useState<KeyInput>(() => {
  if (initialPending?.type === 'startup' && 'Startup' in initialPending.detail) {
    return keyCodeToKeyInput(initialPending.detail.Startup.condition.key_code);
  }
  return { buttons: [] };
});

const [seedText, setSeedText] = useState(() => {
  if (initialPending?.type === 'startup' && 'Startup' in initialPending.detail) {
    return initialPending.detail.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
  }
  if (initialPending?.type === 'seed' && 'Seed' in initialPending.detail) {
    return initialPending.detail.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
  }
  return '';
});
```

### 4.5 lazy initializer: origins 初期値 (local_092 の独立 state)

```typescript
const [startupOrigins, setStartupOrigins] = useState<SeedOrigin[]>(() => {
  if (initialPending?.type === 'startup' && 'Startup' in initialPending.detail) {
    const ki = keyCodeToKeyInput(initialPending.detail.Startup.condition.key_code);
    try {
      return resolveSeedOrigins({
        type: 'Startup',
        ds: dsConfig,
        datetime: initialPending.detail.Startup.datetime,
        ranges,
        key_input: ki,
      });
    } catch {
      return [];
    }
  }
  // pending なし + Startup タブがデフォルトの場合にも初期解決
  if (!initialPending && mode === 'manual-startup') {
    try {
      return resolveSeedOrigins({
        type: 'Startup',
        ds: dsConfig,
        datetime: DEFAULT_DATETIME,
        ranges,
        key_input: { buttons: [] },
      });
    } catch {
      return [];
    }
  }
  return [];
});

const [seedsOrigins, setSeedsOrigins] = useState<SeedOrigin[]>(() => {
  if (initialPending?.type === 'seed' && 'Seed' in initialPending.detail) {
    const hex = initialPending.detail.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
    // autoResolveSeeds 相当のロジック
    const seed = parseLcgSeed(hex);
    if (seed !== undefined) {
      try {
        return resolveSeedOrigins({ type: 'Seeds', seeds: [seed] });
      } catch {
        return [];
      }
    }
  }
  return [];
});

const [importOrigins, setImportOrigins] = useState<SeedOrigin[]>(() => {
  if (initialPending?.type === 'seeds') {
    return initialPending.seeds;
  }
  return [];
});
```

### 4.6 mount effect: `onModeChange` のみ

```typescript
useEffect(() => {
  if (!initialPending) return;
  switch (initialPending.type) {
    case 'startup':
      onModeChange('manual-startup');
      break;
    case 'seed':
      onModeChange('manual-seeds');
      break;
    case 'seeds':
      onModeChange('import');
      break;
  }
}, [initialPending, onModeChange]);
```

- `initialPending` は lazy init 結果で参照安定 (mount 後に変化しない)
- `onModeChange` は親の `useCallback` で参照安定
- **`exhaustive-deps` を正直に書いて lint 適合し、かつ mount-only で動作する**

### 4.7 activeOrigins の初回親通知

local_092 の設計で、activeOrigins は `mode` + 3つの origins state から導出される。初回レンダー時点で origins が lazy init で確定するため、local_092 の `onOriginsChange` 通知ロジック (タブ切り替え時 or resolve 完了時) がそのまま適用される。

mount effect では `onModeChange` に加え `onOriginsChange` も呼ぶ。親コールバックが inline lambda の場合に unstable な参照で effect が再実行されるのを防ぐため、callback ref パターン (`onModeChangeRef` / `onOriginsChangeRef`) を採用し、effect deps を `[initialPending, dsConfig, ranges]` のみとした。

また、pending なし + Startup タブがデフォルトの場合にも初回 origins 通知が必要なため、`InitialPending` 型に `'default-startup'` バリアントを追加し、mount effect で統一的に処理する。

`modeRef` は `autoResolveStartup` / `autoResolveSeeds` 内の条件付き `onOriginsChange` 呼び出しのために存在したが、これらのコールバックはタブ固有の入力操作からのみ呼ばれるため、条件は冗長であった。`modeRef` を削除し `onOriginsChange` 呼び出しを無条件化した。

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | 検証内容 | ファイル |
|--------|---------|---------|
| `consumePendingDetailOrigin` 正常系 | pending あり → 値を返却し、Store からクリアされる | `src/test/unit/stores/results.test.ts` |
| `consumePendingDetailOrigin` 空 | pending なし → `undefined` を返却、Store 変更なし | 同上 |
| `consumePendingSeedOrigins` 正常系 | pending あり → 配列を返却、Store は空配列になる | 同上 |
| `consumePendingSeedOrigins` 空 | pending 空 → 空配列返却、Store 変更なし | 同上 |
| consume 後の二重消費防止 | 1 回目で消費後、2 回目は空を返す | 同上 |

### 5.2 既存テストの確認

`SeedInputSection` をレンダリングする既存テスト (存在する場合) が引き続き通過することを確認する。

## 6. 実装チェックリスト

- [x] `results.ts`: `create` の引数に `get` を追加
- [x] `results.ts`: `consumePendingDetailOrigin` action 追加
- [x] `results.ts`: `consumePendingSeedOrigins` action 追加
- [x] `seed-input-section.tsx`: `InitialPending` 型定義追加 (`'default-startup'` バリアント含む)
- [x] `seed-input-section.tsx`: `initialPending` の lazy initializer 追加
- [x] `seed-input-section.tsx`: `datetime` / `keyInput` / `seedText` の lazy initializer 追加
- [x] `seed-input-section.tsx`: `startupOrigins` / `seedsOrigins` / `importOrigins` の lazy initializer 追加
- [x] `seed-input-section.tsx`: mount effect を callback ref パターンで `onModeChange` + `onOriginsChange` 通知に簡素化
- [x] `seed-input-section.tsx`: `eslint-disable-next-line react-hooks/exhaustive-deps` コメントを **削除** (0 箇所)
- [x] `seed-input-section.tsx`: `mountedRef` ガードを削除
- [x] `seed-input-section.tsx`: `modeRef` を削除、`autoResolve*` の条件付き呼び出しを無条件化
- [x] ユニットテスト: `results.test.ts` に consume action テスト追加 (6 件)
- [x] 既存テスト通過確認 (`pnpm test:run`) — 105 ファイル 1327 テスト全通過
- [x] lint 通過確認 (`pnpm lint`) — `exhaustive-deps` disable が 0 箇所
- [x] 型チェック通過確認 (`pnpm exec tsc -b --noEmit`)
