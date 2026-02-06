# 状態管理方針

フロントエンドの状態管理設計を定義する。

## 1. 設計目標

1. **Store の肥大化防止**: 機能単位で分割し、単一ファイルの巨大化を避ける
2. **tsx との疎結合**: コンポーネントが Store 実装詳細に依存しない
3. **永続化対象の明確化**: 保存すべき状態と一時状態を区別
4. **テスト容易性**: Store を独立してテスト可能

## 2. ライブラリ選定

### 2.1 候補比較

| 観点 | Zustand | Jotai |
|-----|---------|-------|
| 設計思想 | Flux 風の単一 Store | アトミック (atom 単位) |
| 部分購読 | selector で可能 | atom 単位で自動最適化 |
| DevTools | 公式サポート | 公式サポート |
| 学習コスト | 低 | 低〜中 |
| ボイラープレート | 少ない | 少ない |
| 永続化 | `persist` middleware | `atomWithStorage` |

### 2.2 選定基準

以下の観点で机上比較を行い、選定する (PoC 不要と判断):

- [ ] 複数機能間での状態共有パターン
- [ ] 永続化 (localStorage) との統合
- [ ] Worker との連携パターン
- [ ] 既存の参考実装 (niart120/pokemon-gen5-initseed) の問題点分析

## 3. 状態分類

### 3.1 永続化対象 (localStorage)

| 状態 | 説明 |
|-----|------|
| DS 設定 | MAC アドレス、Hardware、Version、Region |
| Timer0/VCount 範囲 | 各 DS の個体差設定 |
| トレーナー情報 | TID/SID |
| UI 設定 | 言語、テーマ (将来) |

### 3.2 セッション状態 (非永続化)

| 状態 | 説明 |
|-----|------|
| 検索条件 | 各機能の入力パラメータ |
| 検索結果 | 生成されたリスト |
| 進捗情報 | 処理割合、残り時間 |
| Worker 状態 | 実行中/待機中 |

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
│   └── ui.ts             # UI設定 (永続化)
│
├── search/
│   ├── progress.ts       # 進捗状態 (非永続化)
│   └── results.ts        # 検索結果 (非永続化)
│
└── index.ts              # re-export
```

### 4.2 分割基準

1. **永続化有無**: 永続化対象は独立した Store/atom に
2. **更新頻度**: 高頻度更新 (進捗) と低頻度更新 (設定) を分離
3. **依存関係**: 相互依存する状態は同一 Store に

## 5. コンポーネント連携パターン

### 5.1 推奨パターン

```tsx
// hooks/use-ds-config.ts
export function useDsConfig() {
  // Store 実装を隠蔽
  const config = useStore(selectDsConfig);
  const setConfig = useStore(state => state.setDsConfig);
  return { config, setConfig };
}

// components/DsConfigForm.tsx
function DsConfigForm() {
  const { config, setConfig } = useDsConfig();
  // ...
}
```

### 5.2 アンチパターン

```tsx
// NG: Store を直接利用
function DsConfigForm() {
  const config = useDsConfigStore(state => state.config);
  const setConfig = useDsConfigStore(state => state.setConfig);
}
```

## 6. 永続化実装

### 6.1 要件

- localStorage を使用
- JSON シリアライズ可能な形式
- バージョニング (スキーマ変更対応)

### 6.2 実装方針

**TODO**: ライブラリ選定後に具体化

## 7. 検討事項

- [ ] Jotai vs Zustand の机上比較 (2.2 の選定基準に基づく)
- [ ] 参照元アプリの問題点リスト作成
- [ ] Worker 連携時の状態更新パターン検証
