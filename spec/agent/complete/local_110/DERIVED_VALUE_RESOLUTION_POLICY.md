# 派生値解決タイミング整理 仕様書

## 1. 概要

### 1.1 目的

React コンポーネント内で入力値から導出する値について、解決タイミングと所有者を明確化し、設定変更後も検索・生成に最新値が使われる状態にする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| ソース値 | ユーザ入力、サイドバー設定、Zustand store、props など、派生値の元になる値 |
| 派生値 | ソース値から計算される値。例: `SeedOrigin[]`、表示用の数値文字列、フィルタ適用後の条件 |
| 解決 | ソース値を派生値へ変換する処理。例: `resolveSeedOrigins` |
| draft state | 入力途中の文字列やトグル OFF 中の条件など、即時に親 state へ反映しないローカル state |
| pending 値 | ページ間連携のため store に一時保存する値。例: `pendingSeedOrigins`、`pendingDetailOrigins` |
| consume-once | pending 値を 1 回だけ読み取り、読み取り後にクリアする処理 |

### 1.3 背景・問題

`SeedInputSection` の Startup タブでは、`datetime` または `keyInput` を変更した時だけ `SeedOrigin[]` を再解決していた。そのため、サイドバーの DS 設定や Timer0/VCount 範囲を変更しても、時間部分の入力を触るまで検索・生成結果が変わらない状態になっていた。

横展開調査では、同種の問題が起こり得る箇所として以下を確認した。

| 分類 | 代表例 | 問題の型 |
|------|--------|----------|
| pending 値の mount 時消費 | `DatetimeSearchPage`、`SeedInputSection`、`NeedlePage` | コンポーネントが既に mount 済みの場合、後から設定された pending 値を取り込めない可能性がある |
| pending 値の転写先 | `navigateWithSeedOrigins`、`pendingSeedOrigins` | navigation API は target を受け取るが、store 側の pending 値が target を保持していない |
| props 初期化ローカル state | `PokemonParamsForm`、`EggParamsForm` | 親 state が外部要因で変わっても、入力欄の表示 state が追従しない可能性がある |
| トグル付き内部フィルタ | `PokemonFilterForm`、`EggFilterForm` | 内部保持と外部反映の境界が曖昧だと、reset や再hydration 後に表示と実値がずれる可能性がある |

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 結果の一貫性 | 設定変更後、ユーザが無関係な入力欄を触り直さなくても最新条件で検索・生成できる |
| 実装判断の統一 | 派生値を `useMemo`、同期 `useEffect`、draft state のどれで扱うかを判断できる |
| レビュー容易性 | dependency 配列、pending 消費、props 初期化 state の確認観点が明確になる |
| 回帰防止 | ソース値変更だけで派生値が更新されることをテストで固定できる |

### 1.5 着手条件

既存の Zustand store、React component、WASM API の公開型は維持する。公開前の永続化破壊変更は migration ではなく localStorage クリアまたは store `name` 変更で対応する。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/stores/search/results.ts` | 修正 | pending 値の consumer / target 分離を store 型として表現する |
| `src/hooks/use-search-results.ts` | 修正 | `pendingSeedOrigins` の target 指定に追従する |
| `src/lib/navigate.ts` | 修正 | `navigateWithSeedOrigins` の target を pending store に保持する |
| `src/components/forms/seed-input-section.tsx` | 修正 | `pendingSeedOrigins` / `pendingDetailOrigins` の consume-once を mount 時だけに限定しない |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 修正 | `pendingTargetSeeds` を mount 後の store 更新でも取り込む |
| `src/features/needle/components/needle-page.tsx` | 修正 | `pendingDetailOrigins['needle']` を mount 後の store 更新でも取り込む |
| `src/features/pokemon-list/store.ts` | 修正 | 外部 reset 検出用の非永続 `formRevision` を追加する |
| `src/features/egg-list/store.ts` | 修正 | 外部 reset 検出用の非永続 `formRevision` を追加する |
| `src/features/egg-search/store.ts` | 修正 | 外部 reset 検出用の非永続 `formRevision` を追加する |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 修正 | `formRevision` をパラメータ・フィルタフォームへ渡す |
| `src/features/egg-list/components/egg-list-page.tsx` | 修正 | `formRevision` をパラメータ・フィルタフォームへ渡す |
| `src/features/egg-search/components/egg-search-page.tsx` | 修正 | `formRevision` をパラメータ・フィルタフォームへ渡す |
| `src/features/pokemon-list/components/pokemon-params-form.tsx` | 修正 | `genConfig` 由来の表示 state と外部値の同期方針を実装する |
| `src/components/forms/egg-params-form.tsx` | 修正 | 親 IV 表示 state と `genConfig` 表示 state の同期方針を実装する |
| `src/features/pokemon-list/components/pokemon-filter-form.tsx` | 修正 | トグル付き内部フィルタの外部変更追従条件を実装する |
| `src/components/forms/egg-filter-form.tsx` | 修正 | トグル付き内部フィルタの外部変更追従条件を実装する |
| `src/test/**` | 修正 | ソース値変更、pending 更新、外部 reset の回帰テストを追加する |

## 3. 設計方針

### 3.1 派生値の基本方針

派生値は、可能な限り render 時にソース値から直接導出する。保存する必要がある場合は、全ソース値を更新条件に含める。

| 方針 | 採用条件 | 例 |
|------|----------|----|
| render 時導出 | 計算が軽い、または `useMemo` で十分に抑制できる | `NeedlePage` の `seedOrigins` |
| 同期 `useEffect` | 計算結果を親へ通知する必要がある、または副作用として store 更新が必要 | `SeedInputSection` の Startup origins 通知 |
| draft state | 入力途中の不正値や未確定値を保持する必要がある | 数値入力の文字列、IV 入力欄 |
| pending store | ページ間連携で受け取り側が同時に存在しない可能性がある | `pendingSeedOrigins` |

### 3.2 dependency 配列

派生値を解決する callback や effect は、派生元の全ソース値を dependency に含める。親 callback が再生成されやすい場合は、callback 本体だけを `useRef` に退避し、派生元の dependency を省略しない。

```tsx
const onChangeRef = useRef(onChange);

useEffect(() => {
  onChangeRef.current = onChange;
}, [onChange]);

const resolve = useCallback(() => {
  const next = derive(sourceA, sourceB);
  onChangeRef.current(next);
}, [sourceA, sourceB]);
```

### 3.3 pending 値の受け渡し

pending 値は mount 時の lazy initializer だけで消費しない。受け取り側が既に mount 済みでも反映されるよう、store の対象 pending 値を購読して effect で consume する。

受け取り側が複数存在する pending 値は、store 上で target または consumer を保持する。購読側は自分に対応する pending 値だけを反映し、別 feature 向けの pending 値を消費しない。

```tsx
const pendingTargetSeeds = useSearchResultsStore((s) => s.pendingTargetSeeds);

useEffect(() => {
  if (pendingTargetSeeds.length === 0) return;
  const seeds = useSearchResultsStore.getState().consumePendingTargetSeeds();
  setTargetSeedsRaw(seeds.map((seed) => toHex(seed, 8)).join('\n'));
}, [pendingTargetSeeds, setTargetSeedsRaw]);
```

consume-once は読み取りとクリアの順序を 1 か所に寄せる。複数コンポーネントが同じ pending 値を消費する場合は、対象 consumer を key に分離する。

### 3.4 props 初期化ローカル state

props からローカル state を初期化する場合は、以下のどちらかを仕様として明示する。

| 型 | 方針 | 例 |
|----|------|----|
| controlled 表示 | props が更新されたらローカル表示 state も更新する | 数値入力欄、IV 入力欄 |
| draft 所有 | ローカル state が編集途中の値を所有し、確定操作で親へ反映する | ファイル import 前の入力、トグル OFF 中のフィルタ |

controlled 表示では、外部 reset、永続化 rehydrate、ページ間転写などの props 更新を表示に反映する。draft 所有では、どの操作で draft を破棄または維持するかをコンポーネント仕様に書く。

### 3.5 実行時設定の扱い

WASM 検索・生成に渡す `GenerationConfig` や `DatetimeSearchContext` は、検索・生成ボタン押下時に現在の store / props から組み立てる。検索開始前に作った context を長期保持しない。

## 4. 実装仕様

### 4.1 pending 消費の修正

`pendingTargetSeeds`、`pendingSeedOrigins`、`pendingDetailOrigins` は、受け取り側 component で対象値を subscribe し、値が入った時に effect で consume する。

`pendingSeedOrigins` は `navigateWithSeedOrigins(origins, target)` の `target` を store に保持する。`SeedInputSection` は自身の `featureId` と target が一致する場合だけ反映する。`FeatureId` 全体を受け付けると Seed 入力を持たない feature も指定できるため、実装時には転写可能な feature 型へ狭める。

対象 consumer が複数存在する `pendingDetailOrigins` は、以下の条件を満たす。

| 条件 | 内容 |
|------|------|
| consumer 分離 | `pokemon-list`、`egg-list`、`needle` ごとに独立して消費できる |
| 二重消費防止 | 1 consumer で同じ pending 値を 2 回反映しない |
| mount 後反映 | 既に開いているページでも、詳細ダイアログからのコピー操作を反映する |

### 4.2 draft state の同期修正

数値入力欄や IV 入力欄のように表示 state を持つ component は、props 側の確定値が変わった時に表示 state を更新する。

```tsx
useEffect(() => {
  setLocalOffset(String(genConfig.user_offset));
}, [genConfig.user_offset]);
```

入力中のカーソル位置や未確定文字列を保持する必要がある場合は、focus 中は同期を遅延し、blur 時に props と再同期する。

外部 reset のように props の確定値が同じ値へ戻る操作は、値比較だけでは検出できない。対象 feature store は非永続の `formRevision` を持ち、`resetForm` 時に加算する。フォーム component は `syncKey` として受け取り、未確定の表示 state を確定値へ戻す。

### 4.3 トグル付きフィルタの外部同期

トグル OFF 時に内部フィルタを保持する component は、外部 reset とユーザ編集を区別する。

| 操作 | 内部 state の扱い |
|------|-------------------|
| ユーザがトグル OFF | 内部フィルタを維持する |
| ユーザがフォーム内で Reset | 内部フィルタを初期値へ戻す |
| 親 store が reset | 内部フィルタも親の値へ同期する |
| 永続化 rehydrate | 親の復元値へ同期する |

外部 reset の検出が曖昧な場合は、親 store に `revision` または `resetVersion` を持たせ、component がそれを dependency として同期する。

実装では `formRevision` を `syncKey` として渡す。ユーザがフィルタのトグルを OFF にした時は内部状態を保持し、`syncKey` が変わった時は親 store の値へ同期して reset を優先する。

### 4.4 レビュー観点

新規 component または修正 component で以下を確認する。

| 観点 | 確認内容 |
|------|----------|
| 派生元列挙 | 派生値の全ソース値を列挙している |
| dependency | `useMemo` / `useCallback` / `useEffect` に全ソース値が含まれている |
| pending | mount 時だけの consume になっていない |
| draft | props 初期化 state の同期または所有方針が明確である |
| 実行直前組み立て | 検索・生成 context を古い closure から使っていない |

## 5. テスト方針

### 5.1 単体・コンポーネントテスト

| 対象 | テスト内容 |
|------|------------|
| `SeedInputSection` | mount 後に `pendingSeedOrigins` / `pendingDetailOrigins` を設定しても反映される |
| `DatetimeSearchPage` | mount 後に `pendingTargetSeeds` を設定しても textarea に反映される |
| `NeedlePage` | mount 後に `pendingDetailOrigins['needle']` を設定しても seed 入力へ反映される |
| `SearchResultsStore` | `pendingSeedOrigins` が target 別に保持・消費され、別 target の consumer が消費しない |
| `PokemonParamsForm` | `genConfig.user_offset` / `max_advance` の外部変更が入力欄へ反映される |
| `EggParamsForm` | 親 IV と offset / max_advance の外部変更が入力欄へ反映される |
| フィルタフォーム | 外部 reset とトグル OFF の内部保持が仕様どおりに分岐する |

### 5.2 結合確認

| シナリオ | 期待結果 |
|----------|----------|
| 詳細ダイアログから開いている Seed 入力へコピー | ページ遷移や再 mount を待たずに反映される |
| MT Seed 検索から起動時刻検索へ転写 | 起動時刻検索が既に mount 済みでも対象 Seed が反映される |
| サイドバー設定変更後に生成実行 | 日時入力欄を触り直さなくても最新設定で結果が変わる |
| store reset 後のフォーム表示 | 表示値と検索・生成に使われる値が一致する |

### 5.3 実行コマンド

```powershell
pnpm test:run --project unit src/test/components/seed-input-section.test.tsx
pnpm test:run --project unit src/test/components
pnpm exec tsc -b --noEmit
pnpm lint:ts
pnpm format:check:ts
```

## 6. 実装チェックリスト

- [x] Startup Seed 不具合から派生値 stale 化の原因を切り分けた
- [x] 横展開で pending 値、props 初期化 state、トグル付き内部 state のリスクを整理した
- [x] 派生値の所有者と dependency の基本方針を定義した
- [x] pending 値の mount 後反映方針を定義した
- [x] `pendingSeedOrigins` の target 分離方針を定義した
- [x] props 初期化ローカル state の同期方針を定義した
- [x] `pendingTargetSeeds` の mount 後反映を実装する
- [x] `pendingSeedOrigins` / `pendingDetailOrigins` の mount 後反映を実装する
- [x] 数値入力・IV 入力の外部値同期を必要箇所へ適用する
- [x] トグル付きフィルタの外部 reset 同期方針を実装へ反映する
- [x] 上記の回帰テストを追加する
