# 状態管理方針

フロントエンドの状態管理設計を定義する。

## 1. 設計目標

1. **Store の肥大化防止**: 機能単位で分割し、単一ファイルの巨大化を避ける
2. **tsx との疎結合**: コンポーネントが Store 実装詳細に依存しない
3. **永続化対象の明確化**: 保存すべき状態と一時状態を区別
4. **テスト容易性**: Store を独立してテスト可能

## 2. ライブラリ選定

### 2.1 選定結果

**Zustand** を採用する。

### 2.2 机上比較サマリ

以下4基準で机上比較を実施し、総合的に Zustand を選定した。

| 基準 | Zustand | Jotai | 判定 |
|------|---------|-------|------|
| 機能間状態共有 | Store 間 `subscribe` / slices 統合で対応。手動同期コストあり | atom import で宣言的に共有。Profile 同期が自然 | Jotai |
| 永続化 (localStorage) | `persist` middleware。partialize / version / migrate 組込み | `atomWithStorage`。atom 単位で完結するが migrate 自作 | 引き分け |
| Worker 連携 | `getState()` / `setState()` で React 外から更新可能 | `store.set()` で可能だが Provider scope に束縛 | Zustand |
| 参考実装の問題回避 | 設計規約で回避可能 (分割・hooks 隠蔽の徹底) | 構造的に回避しやすい (atom 分散) | Jotai |

Zustand を選定した理由:

1. **Worker 連携が本PJの最重要制約**: WorkerPool → 進捗更新 → UI 反映の流れで React 外アクセスが頻発する。Zustand の `getState()` / `setState()` はこのパターンに自然に適合する
2. **参考実装の問題は設計で回避可能**: 肥大化の主因は「1 Store に全部入れた」ことであり、本PJは Store 分割方針 (Section 4) + hooks 隠蔽 (Section 5) で対策済み
3. **エージェントとの開発効率**: 定型パターンが確立されており、コーディングエージェントへの指示精度が高い
4. **学習コスト 0**: 参考実装 (niart120/pokemon-gen5-initseed) での使用経験が直接活かせる

### 2.3 参考実装で観測された問題と対策

| 問題 | 原因 | 本PJでの対策 |
|------|------|-------------|
| `app-store.ts` 肥大化 (636行+) | 1 Store に全状態 + persist 設定を集約 | Store 分割方針 (Section 4) で分離 |
| Profile 同期の散逸 | 独立 Store ごとに `useEffect` + `applyProfile` | `subscribe` ベースの一方向同期ユーティリティを共通化 (Section 5.3) |
| persist 設定の複雑化 | partialize + merge + カスタム serializer | Store 分割で persist 対象を狭く保つ |
| Store 内に WorkerManager 保持 | Store がロジックを抱え込む | WorkerPool は `services/` に分離済み。Store は状態のみ保持 |
| コンポーネントから Store 直結 | `useAppStore(s => s.xxx)` がコンポーネント中に散在 | hooks レイヤで隠蔽 (Section 5.1) |

## 3. 状態分類

### 3.1 永続化対象 (localStorage)

| 状態 | 説明 |
|-----|------|
| DS 設定 | MAC アドレス、Hardware、Version、Region |
| Timer0/VCount 範囲 | 各 DS の個体差設定 |
| トレーナー情報 | TID/SID |
| UI 設定 | 言語、テーマ (将来) |

### 3.2 セッション状態 — Zustand Store (非永続化)

| 状態 | 説明 | 管理方式 |
|-----|------|----------|
| 検索結果 | 生成されたリスト。機能横断で参照するため Store 化 | `stores/search/results.ts` |

### 3.2.1 セッション状態 — ローカル (useState)

| 状態 | 説明 | 管理方式 |
|-----|------|----------|
| 検索条件 | 各機能の入力パラメータ | 各 feature のローカル state |
| 進捗情報 | 処理割合、残り時間 | `use-search.ts` 内 useState |
| Worker 状態 | 実行中/待機中 | `use-search.ts` 内 useState |

### 3.3 ローカル状態 (useState)

| 状態 | 説明 |
|-----|------|
| フォーム入力中の値 | バリデーション前の一時値 |
| UI 展開状態 | アコーディオン開閉など |

## 4. Store 分割方針

### 4.1 機能単位分割

```
stores/
├── settings/
│   ├── ds-config.ts      # DS設定 (永続化)
│   ├── trainer.ts        # トレーナー情報 (永続化)
│   ├── ui.ts             # UI設定 (永続化)
│   └── index.ts          # re-export
│
├── search/
│   ├── results.ts        # 検索結果 (非永続化)
│   └── index.ts          # re-export
│
├── sync.ts               # Store 間同期
└── index.ts              # re-export
```

**進捗 (progress) を Store 化しない理由**: 現時点で進捗を参照するのは `use-search.ts` を呼び出すコンポーネントのみ。ProgressOverlay 等でコンポーネントツリーを跨ぐ参照が必要になった段階で Store 化を検討する。

### 4.2 分割基準

1. **永続化有無**: 永続化対象は独立した Store に分離し、persist 設定を局所化
2. **更新頻度**: 高頻度更新 (進捗) と低頻度更新 (設定) を分離し、不要な再レンダリングを回避
3. **依存関係**: 相互依存する状態は同一 Store に集約

### 4.3 Store 設計規約

- 1 Store のコード量は **200行以下** を目安とする
- State と Actions を interface で分離定義する
- WorkerManager 等のインスタンスは Store に保持しない (`services/` に分離)
- Store ファイル内にコンポーネント用 selector を定義してよい

## 5. コンポーネント連携パターン

### 5.1 推奨パターン: hooks 隠蔽

コンポーネントは Store を直接参照せず、カスタムフック経由でアクセスする。

```tsx
// hooks/use-ds-config.ts
import { useDsConfigStore } from '../stores/settings/ds-config';

export function useDsConfig() {
  const config = useDsConfigStore((s) => s.config);
  const setConfig = useDsConfigStore((s) => s.setConfig);
  return { config, setConfig } as const;
}

// components/DsConfigForm.tsx
function DsConfigForm() {
  const { config, setConfig } = useDsConfig();
  // ...
}
```

### 5.2 アンチパターン

```tsx
// NG: コンポーネントから Store を直接参照
import { useDsConfigStore } from '../stores/settings/ds-config';

function DsConfigForm() {
  const config = useDsConfigStore((s) => s.config);
  // ...
}
```

例外: features/ 内の機能固有コンポーネントが、同機能の Store を直接参照する場合は許容する (hooks 化の費用対効果が低いため)。

### 5.3 Store 間同期パターン

DS 設定など共通状態を複数 Store が参照する場合、`useEffect` の散在を避け、`subscribe` ベースの一方向同期を使用する。

```typescript
// stores/sync.ts
import { useDsConfigStore } from './settings/ds-config';
import { useSearchStore } from './search/results';

/**
 * DS 設定変更時に検索 Store のパラメータを同期する。
 * アプリ起動時に1回だけ呼び出す。
 */
export function setupStoreSyncSubscriptions(): () => void {
  const unsub = useDsConfigStore.subscribe(
    (state) => state.config,
    (config) => {
      useSearchStore.getState().applyDsConfig(config);
    },
  );
  return unsub;
}
```

## 6. 永続化実装

### 6.1 要件

- localStorage を使用
- JSON シリアライズ可能な形式
- バージョニング (スキーマ変更対応)

### 6.2 実装方針

Zustand `persist` middleware を使用する。永続化対象 Store ごとに独立して適用する。

```typescript
// stores/settings/ds-config.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DsConfigState {
  config: DsConfig;
  setConfig: (config: Partial<DsConfig>) => void;
}

export const useDsConfigStore = create<DsConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_DS_CONFIG,
      setConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),
    }),
    {
      name: 'ds-config',
      version: 1,
    },
  ),
);
```

### 6.3 persist 設定ガイドライン

| 設定 | 方針 |
|------|------|
| `name` | Store ごとに一意のキー (`ds-config`, `trainer`, `ui-settings`) |
| `version` | スキーマ変更時にインクリメント |
| `migrate` | version 不一致時のデータ変換関数。不要な間は省略 |
| `partialize` | Store 内の全状態が永続化対象なら省略。Actions は自動除外される |
| `merge` | ネストが浅い場合はデフォルト (shallow merge) で十分 |

### 6.4 スキーマ変更時の対応

`persist` の `version` + `migrate` で対応する。localStorage 内の旧バージョンデータを新スキーマに変換する。

```typescript
persist(storeCreator, {
  name: 'ds-config',
  version: 2,
  migrate: (persisted, version) => {
    if (version === 1) {
      // v1 → v2: timer0 (number) → timer0Range ({ min, max })
      const old = persisted as { timer0?: number };
      persisted.timer0Range = { min: old.timer0 ?? 0, max: old.timer0 ?? 0 };
      delete old.timer0;
    }
    return persisted;
  },
});
```

本PJの永続化対象 (DS 設定、トレーナー情報、UI 設定) はスキーマが安定する見込みが高く、migrate が必要になる頻度は低い。

## 7. テスト方針

### 7.1 Store 単体テスト

React コンポーネント不要で `getState()` / `setState()` で直接テスト可能。

```typescript
import { useDsConfigStore } from './ds-config';

describe('ds-config store', () => {
  beforeEach(() => {
    // Store をリセット
    useDsConfigStore.setState(useDsConfigStore.getInitialState());
  });

  it('should update config', () => {
    useDsConfigStore.getState().setConfig({ macAddress: '00:11:22:33:44:55' });
    expect(useDsConfigStore.getState().config.macAddress).toBe('00:11:22:33:44:55');
  });
});
```

### 7.2 テスト環境

- jsdom 環境で localStorage モックを提供 (既存の `src/test/setup.ts` に設定済み)
- persist middleware の hydration を考慮し、テスト前に Store をリセット

## 8. 関連ドキュメント

- [Worker 設計](./worker-design.md) — Worker → Store の状態更新フロー
- [フロントエンド構成](./frontend-structure.md) — `stores/`, `hooks/` のディレクトリ配置
- [実装ロードマップ](./implementation-roadmap.md) — Phase 1.3 状態管理基盤
