# Startup Seed 再解決タイミング修正 仕様書

## 1. 概要

### 1.1 目的

`SeedInputSection` の Startup タブで、サイドバーの DS 設定や Timer0/VCount 範囲を変更しても `SeedOrigin` が再解決されない不具合を修正する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Startup タブ | `SeedInputSection` の `manual-startup` モード。DS 設定、起動日時、キー入力から `SeedOrigin::Startup` を解決する |
| `SeedOrigin` | 生成元 Seed を表す WASM 型。直接 Seed 由来の `Seed` と起動条件由来の `Startup` を持つ |
| `resolveSeedOrigins` | `SeedSpec` を `SeedOrigin[]` に変換する TypeScript 側の共通ヘルパー |
| DS 設定 | サイドバーで管理する `DsConfig` と Timer0/VCount 範囲 |
| 派生値 | 入力状態から計算される値。本件では `SeedOrigin[]` が該当する |

### 1.3 背景・問題

ユーザ報告では、`はじめから` / `つづきから` や起動条件の設定を変更しても結果が変わらず、時間部分の数値を変更すると再計算されるように見える挙動があった。

調査の結果、WASM の生成 API は `GameStartConfig.start_mode` を反映しており、`Continue` と `NewGame` で結果が分岐することを確認した。一方で `SeedInputSection` の Startup タブでは、`datetime` または `keyInput` を変更した時だけ `resolveSeedOrigins` が実行され、サイドバー側の `DsConfig` や `Timer0VCountRange[]` の変更では `SeedOrigin[]` が更新されていなかった。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 設定反映の一貫性 | Startup タブが有効な間、サイドバー設定変更だけで `SeedOrigin[]` が更新される |
| 操作手順の明確化 | ユーザが日時入力欄を触り直さなくても、現在の設定で検索・生成できる |
| 回帰防止 | DS 設定変更に対する再解決をコンポーネントテストで固定する |

### 1.5 着手条件

`SeedInputSection` が Startup タブの入力状態を保持し、親ページへ `SeedOrigin[]` を通知する既存構造を維持する。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/forms/seed-input-section.tsx` | 修正 | `manual-startup` が有効な間、`dsConfig` / `ranges` 変更時にも `resolveSeedOrigins` を実行する |
| `src/test/components/seed-input-section.test.tsx` | 修正 | DS 設定変更で Startup origins が再解決される回帰テストを追加 |
| `package.json` | 修正 | `packageManager` を `pnpm@11.5.1` に更新 |

## 3. 設計方針

### 3.1 派生値の所有者

`SeedOrigin[]` は Startup タブの入力値とサイドバー設定から導出される派生値である。派生元は以下の 4 種類とする。

| 派生元 | 変更元 | 再解決の必要性 |
|--------|--------|----------------|
| `dsConfig` | サイドバー DS 設定 | 必須 |
| `ranges` | サイドバー Timer0/VCount 範囲 | 必須 |
| `datetime` | Startup タブ日時入力 | 必須 |
| `keyInput` | Startup タブキー入力 | 必須 |

### 3.2 再解決タイミング

`manual-startup` が有効な間だけ自動再解決する。別タブが有効な場合は、そのタブの `origins` を維持し、Startup タブへ戻った時に最新の `dsConfig` / `ranges` / `datetime` / `keyInput` で再解決する。

### 3.3 コールバック依存の扱い

`onOriginsChange` は親コンポーネント側でインライン関数として渡されるため、`autoResolveStartup` の依存配列に直接含めると不要な再生成や再実行につながる。既存の `onOriginsChangeRef` を使い、最新のコールバックを呼び出す。

## 4. 実装仕様

### 4.1 `autoResolveStartup` の依存関係

`autoResolveStartup` は `dsConfig` と `ranges` を依存に持つ。これにより、サイドバー設定が変わると callback が更新される。

```tsx
const autoResolveStartup = useCallback(
  (dt: Datetime, ki: KeyInput) => {
    const resolved = resolveSeedOrigins({
      type: 'Startup',
      ds: dsConfig,
      datetime: dt,
      ranges,
      key_input: ki,
    });
    setStartupOrigins(resolved);
    onOriginsChangeRef.current(resolved);
  },
  [dsConfig, ranges]
);
```

### 4.2 Startup タブ有効時の自動再解決

`manual-startup` が有効な場合のみ、最新の `datetime` と `keyInput` を ref から読み取り、自動再解決する。

```tsx
useEffect(() => {
  if (mode !== 'manual-startup') return;
  autoResolveStartup(datetimeRef.current, keyInputRef.current);
}, [mode, autoResolveStartup]);
```

### 4.3 対象外

`GameStartConfig.start_mode` は `SeedOrigin` の解決条件ではなく、生成時の `GenerationConfig.game_start` として WASM に渡される。したがって、Startup タブの `SeedOrigin[]` 再解決条件には含めない。

## 5. テスト方針

### 5.1 コンポーネントテスト

`SeedInputSection` を `manual-startup` で表示し、`useDsConfigStore.getState().setConfig()` により DS 設定を更新する。モックした `resolveSeedOrigins` が新しい DS 設定に応じた `SeedOrigin[]` を返し、`onOriginsChange` に通知されることを検証する。

### 5.2 既存テスト確認

既存の以下の動作を維持する。

| 項目 | 期待 |
|------|------|
| タブ切り替え | 切り替え先タブの保持済み origins が通知される |
| pending detail origin | `Startup` / `Seed` の転記時に適切なタブへ切り替わる |
| pending bulk origins | 一括転記時に Import タブへ切り替わる |

### 5.3 検証コマンド

```powershell
pnpm exec vitest run --project unit src/test/components/seed-input-section.test.tsx
pnpm exec tsc -b --noEmit
pnpm format:check:ts
pnpm lint:ts
```

## 6. 実装チェックリスト

- [x] `autoResolveStartup` の通知先を `onOriginsChangeRef.current` に変更
- [x] `manual-startup` 有効時に `dsConfig` / `ranges` 変更で再解決する `useEffect` を追加
- [x] DS 設定変更時の再解決テストを追加
- [x] 対象コンポーネントテスト pass を確認
- [x] TypeScript 型チェック pass を確認
- [x] TS format / lint pass を確認
