# SeedInputSection pending 消費リファクタリング 仕様書

## 1. 概要

### 1.1 目的

`SeedInputSection` コンポーネントのマウント時 pending データ消費パターンを改善し、`react-hooks/exhaustive-deps` の lint 抑制を解消する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| pending パターン | Feature 間データ受け渡しのために `stores/search/results.ts` に一時値を書き込み、受信側がマウント時に消費してクリアする方式 |
| DetailOriginConsumer | pending detail origin の消費先 feature。`'pokemon-list' \| 'egg-list' \| 'needle'` の 3 種 |
| SeedInputSection | 3 つの入力モード (startup / seeds / import) を持つ共通 Seed 入力コンポーネント |
| atomic consume | Store から pending データを「読み取り + クリア」を 1 つの action で行う操作 |

### 1.3 背景・問題

`feature/state-persistence` ブランチ (local_088) で導入した Feature Store 化に伴い、`SeedInputSection` はマウント時に `useEffect` で pending データを消費する。この effect は空の依存配列 `[]` で mount-only として動作させるため、`eslint-disable-next-line react-hooks/exhaustive-deps` で lint を抑制している。

抑制が必要な理由:

1. effect 内で `setDatetime` / `setKeyInput` / `setSeedText` を呼ぶため、依存配列を正直に追加すると `react-hooks/set-state-in-effect` (effect 内 setState の検出) と矛盾する
2. `onModeChange` / `onOriginsChange` 等のコールバックを依存配列に含めると、mount-only の意図に反して再実行されるリスクがある
3. `autoResolveStartup` / `autoResolveSeeds` が `dsConfig` / `ranges` に依存しており、それらも巻き込まれる

### 1.4 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| `exhaustive-deps` disable 数 | ブランチ内 1 箇所 | 0 箇所 |
| pending 消費の実行タイミング | effect (非同期、React 管理) | 同期的な初期化 |
| UX | 現状維持 | 現状維持 |

### 1.5 着手条件

- `feature/state-persistence` ブランチの Feature Store 化 (local_088) が完了していること
- `SeedInputSection` の既存テスト・lint が通過していること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|----------|---------|
| `src/stores/search/results.ts` | 修正 | `consumePendingDetailOrigin` / `consumePendingSeedOrigins` action 追加 |
| `src/components/forms/seed-input-section.tsx` | 修正 | mount effect の pending 消費を lazy initializer ベースに書き換え |
| `src/test/unit/stores/search-results-store.test.ts` | 新規 | atomic consume action のテスト |

## 3. 設計方針

### 3.1 案の比較と判断

セルフレビューで検出した問題に対し、3 つの代替案を検討した。

| 観点 | 案A: atomic consume | 案B: pending 廃止 (直接書き込み) | 案C: 内部 state 全面外出し |
|------|---------------------|--------------------------------|--------------------------|
| 概要 | Store に「読む+消す」を 1 action 化。effect → lazy init に置き換え | 送信側が受信側 Store action を直接呼ぶ。mount 消費を不要にする | `datetime` / `keyInput` / `seedText` を全て feature store に移管 |
| 変更範囲 | `results.ts` + `seed-input-section.tsx` | 送信側 (detail dialog) + 受信側 (3 feature page) + `results.ts` | 3 feature store + `seed-input-section.tsx` + 3 feature page |
| Feature 間結合 | 低 (現状維持) | 高 (送信側が受信側の内部構造を知る) | 低 |
| lint 抑制解消 | 解消可能 | 解消可能 | 解消可能 |
| リスク | 低 | 将来の feature 追加時に送信側の改修が必要 | 改修範囲が広く、テスト負荷が高い |

**判断**: 案A を採用する。変更範囲が最小で、feature 間の結合度を維持したまま lint 抑制を解消できる。案B は feature 間結合が強まるため不採用。案C は正しい方向性だが改修範囲が広く、本件の目的（lint 抑制解消）に対してコストが見合わない。案C は将来的に `SeedInputSection` の controlled 化が必要になった時点で別途検討する。

### 3.2 設計

#### Store 側: atomic consume action

`results.ts` に 2 つの consume action を追加する。いずれも「現在値を返却し、同時に Store をクリアする」動作を行う。

- `consumePendingDetailOrigin(consumer)`: `pendingDetailOrigins[consumer]` を返却し、当該エントリを削除
- `consumePendingSeedOrigins()`: `pendingSeedOrigins` を返却し、空配列にリセット

Zustand の `getState()` を介して同期的に呼び出すため、React レンダリングサイクルとの競合がない。

#### SeedInputSection 側: lazy initializer

mount effect を削除し、代わりに `useState` の lazy initializer (初期化関数) で pending データを消費する。

```tsx
// 概念コード
const [initialPending] = useState(() => {
  const store = useSearchResultsStore.getState();
  const detail = store.consumePendingDetailOrigin(featureId);
  if (detail) return { type: 'detail' as const, detail };
  const seeds = store.consumePendingSeedOrigins();
  if (seeds.length > 0) return { type: 'seeds' as const, seeds };
  return undefined;
});
```

lazy initializer は React の state 初期化時に 1 回だけ実行され、effect と異なり以下の利点がある:

- 依存配列が不要 (mount-only が構造的に保証される)
- 同期的に実行される (render 中に完了する)
- `set-state-in-effect` lint に抵触しない

pending データの消費結果に基づく `onModeChange` / `onOriginsChange` / `autoResolve` の呼び出しは、別途 mount effect で `initialPending` を参照して実行する。この effect は `initialPending` のみを依存に持つため、exhaustive-deps を満たしつつ mount-only になる（`useState` の lazy init 結果は参照が安定する）。

## 4. 実装仕様

### 4.1 `stores/search/results.ts` — consume action 追加

```ts
interface SearchResultsActions {
  // ... 既存 action ...

  /** pendingDetailOrigin を消費 (読み取り + クリア) */
  consumePendingDetailOrigin: (consumer: DetailOriginConsumer) => SeedOrigin | undefined;
  /** pendingSeedOrigins を消費 (読み取り + クリア) */
  consumePendingSeedOrigins: () => SeedOrigin[];
}
```

実装:

```ts
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

### 4.2 `seed-input-section.tsx` — mount effect → lazy initializer

#### 4.2.1 pending 消費の型定義

```ts
type PendingDetail =
  | { type: 'startup'; detail: SeedOrigin & { Startup: unknown } }
  | { type: 'seed'; detail: SeedOrigin & { Seed: unknown } }
  | { type: 'seeds'; seeds: SeedOrigin[] }
  | undefined;
```

#### 4.2.2 useState lazy initializer で pending 消費

```tsx
const [initialPending] = useState<PendingDetail>(() => {
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

#### 4.2.3 pending の副作用を effect で処理

```tsx
useEffect(() => {
  if (!initialPending) {
    if (mode === 'manual-startup') {
      autoResolveStartup(datetime, keyInput);
    }
    return;
  }
  switch (initialPending.type) {
    case 'startup': {
      const d = initialPending.detail;
      if ('Startup' in d) {
        const ki = keyCodeToKeyInput(d.Startup.condition.key_code);
        const hex = d.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
        setDatetime(d.Startup.datetime);
        setKeyInput(ki);
        setSeedText(hex);
        onModeChange('manual-startup');
        autoResolveStartup(d.Startup.datetime, ki);
      }
      break;
    }
    case 'seed': {
      const d = initialPending.detail;
      if ('Seed' in d) {
        const hex = d.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
        setSeedText(hex);
        onModeChange('manual-seeds');
        autoResolveSeeds(hex);
      }
      break;
    }
    case 'seeds':
      onModeChange('import');
      onOriginsChange(initialPending.seeds);
      break;
  }
  // initialPending は useState の初期化結果で参照安定
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialPending]);
```

**注**: この effect にも `exhaustive-deps` disable が残る可能性がある。`initialPending` は mount 時に確定する不変値だが、`autoResolveStartup` / `onModeChange` 等の関数が依存配列に要求される。

### 4.3 代替: effect を使わず initializer 内で完結させる

§4.2 の approach では effect 内の setState 問題が残る可能性がある。以下の方針で effect 自体を不要にできるか検討する。

```tsx
// useState の initializer で state 初期値を直接設定
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

`onModeChange` / `onOriginsChange` / `autoResolve` は render 中に呼べないため、これらについては mount effect が依然として必要。ただし、内部 state の初期化を lazy initializer で済ませることで、effect 内の `setDatetime` / `setKeyInput` / `setSeedText` 呼び出しが不要になり、`set-state-in-effect` との矛盾が解消される。

**この方針 (§4.3) を実装の主軸とする。** mount effect は `onModeChange` + `onOriginsChange` + auto-resolve のみを担当する。

### 4.4 mount effect の最終形

§4.3 の方針により、mount effect から内部 setState を除去した形:

```tsx
const mountedRef = useRef(false);
useEffect(() => {
  if (mountedRef.current) return;
  mountedRef.current = true;

  if (!initialPending) {
    if (mode === 'manual-startup') {
      autoResolveStartup(datetime, keyInput);
    }
    return;
  }
  switch (initialPending.type) {
    case 'startup': {
      const d = initialPending.detail;
      if ('Startup' in d) {
        onModeChange('manual-startup');
        autoResolveStartup(d.Startup.datetime, keyCodeToKeyInput(d.Startup.condition.key_code));
      }
      break;
    }
    case 'seed': {
      const d = initialPending.detail;
      if ('Seed' in d) {
        onModeChange('manual-seeds');
        autoResolveSeeds(
          d.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0')
        );
      }
      break;
    }
    case 'seeds':
      onModeChange('import');
      onOriginsChange(initialPending.seeds);
      break;
  }
  // mountedRef ガードにより実質 mount-only
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialPending]);
```

**現実的な結論**: `onModeChange` 等の parent callback が依存に入るため、`exhaustive-deps` の完全な lint 適合は `mountedRef` ガードと組み合わせても困難。ただし §4.3 により `set-state-in-effect` は解消され、effect の責務は「親への通知 + auto-resolve 発火」に限定される。disable コメントは残るが、正当性の根拠が明確になる。

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | 検証内容 | ファイル |
|--------|---------|---------|
| `consumePendingDetailOrigin` 正常系 | pending あり → 値を返却し、Store からクリアされる | `src/test/unit/stores/search-results-store.test.ts` |
| `consumePendingDetailOrigin` 空 | pending なし → `undefined` を返却、Store 変更なし | 同上 |
| `consumePendingSeedOrigins` 正常系 | pending あり → 配列を返却、Store は空配列になる | 同上 |
| `consumePendingSeedOrigins` 空 | pending 空 → 空配列返却、Store 変更なし | 同上 |
| consume 後の二重消費防止 | 1 回目で消費後、2 回目は空を返す | 同上 |

### 5.2 既存テストの確認

`SeedInputSection` をレンダリングする既存テスト (存在する場合) が引き続き通過することを確認する。

## 6. 実装チェックリスト

- [ ] `results.ts`: `create` の第2引数 `get` を受け取るよう変更
- [ ] `results.ts`: `consumePendingDetailOrigin` action 追加
- [ ] `results.ts`: `consumePendingSeedOrigins` action 追加
- [ ] `seed-input-section.tsx`: `initialPending` の useState lazy initializer 追加
- [ ] `seed-input-section.tsx`: `datetime` / `keyInput` / `seedText` の useState に lazy initializer 追加
- [ ] `seed-input-section.tsx`: mount effect から内部 setState を除去
- [ ] `seed-input-section.tsx`: mount effect の依存配列・コメントを更新
- [ ] ユニットテスト: `search-results-store.test.ts` 作成
- [ ] 既存テスト通過確認 (`pnpm test:run`)
- [ ] lint 通過確認 (`pnpm lint`)
- [ ] `exhaustive-deps` disable の残存理由をコメントに明記
