# SeedInputSection タブ別 Origins 独立管理 仕様書

## 1. 概要

### 1.1 目的

`SeedInputSection` の3つの入力タブ (Startup / Seeds / Import) が単一の `origins` を共有・上書きし合う現状の構造を改め、各タブが独立した `origins` を保持する設計に変更する。アクティブタブの `origins` のみを外部に公開することで、タブ間の暗黙的なデータ依存を排除する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SeedOrigin | 初期 Seed の出自情報。`Startup` (起動条件由来) または `Seed` (直接指定) の tagged union |
| activeOrigins | 現在アクティブなタブが保持する `SeedOrigin[]`。親コンポーネントへ公開される唯一の origins |
| startupOrigins | Startup タブで解決された `SeedOrigin[]` |
| seedsOrigins | Seeds タブで解決された `SeedOrigin[]` |
| importOrigins | Import タブで保持される `SeedOrigin[]` (JSON 読み込み or 外部転記) |
| pendingDetailOrigins | 詳細ダイアログからの単一 Seed 転記データ (Store 経由) |
| pendingSeedOrigins | 検索結果の一括転記データ (Store 経由) |

### 1.3 背景・問題

- 3タブが1つの `origins` を共有しており、タブ切り替え時に切り替え先タブの入力状態で `origins` を上書きする
- Startup タブで解決した結果が、Seeds タブへの切り替えで消失する (空の `seedText` で上書き)
- Import タブは自身の入力ソースを持たず、他タブの出力を暗黙的に引き継ぐ受動的な動作になっている
- `handleTabChange` 内で `autoResolveStartup`/`autoResolveSeeds` を副作用的に呼ぶ必要があり、テストや挙動の把握が難しい

### 1.4 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| タブ切り替え時のデータ保持 | 切り替え先タブの入力で上書き (消失) | 各タブの結果が独立保持される |
| Import タブの責務 | 他タブの出力を暗黙的に引き継ぐ | JSON 読み込み / 外部転記のみ (単責任) |
| `handleTabChange` の副作用 | `autoResolve*` を呼ぶ必要がある | mode 切り替えのみ、resolve 不要 |
| テスタビリティ | タブ間の暗黙的状態遷移のテストが必要 | 各タブの origins が独立しテスト容易 |

### 1.5 着手条件

- `SeedInputSection` が `PokemonListPage` / `EggListPage` で安定稼働していること → 済
- `pendingDetailOrigins` / `pendingSeedOrigins` の Store 構造が確定していること → 済

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/forms/seed-input-section.tsx` | 修正 | 3タブ分の独立 origins state 導入、activeOrigins 導出、`handleTabChange` 簡素化 |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更なし | Props インターフェース維持のため修正不要 |
| `src/features/egg-list/components/egg-list-page.tsx` | 変更なし | 同上 |
| `src/features/needle/components/seed-input.tsx` | 変更なし | `SeedInputSection` を使用していないため影響なし |
| `src/stores/search/results.ts` | 変更なし | `pendingDetailOrigins` / `pendingSeedOrigins` の構造は維持 |
| `src/test/components/seed-input-section.test.tsx` | 修正 | 独立 origins の保持・タブ切り替え挙動のテスト |

## 3. 設計方針

### 3.1 外部インターフェース維持

`SeedInputSectionProps` は変更しない。親コンポーネントから見た挙動は「`mode` に応じた `origins` が `onOriginsChange` で通知される」という点で現状と同じ。内部実装の変更のみで完結する。

```typescript
// Props は変更なし
interface SeedInputSectionProps {
  featureId: DetailOriginConsumer;
  mode: SeedInputMode;
  onModeChange: (mode: SeedInputMode) => void;
  origins: SeedOrigin[];
  onOriginsChange: (origins: SeedOrigin[]) => void;
  disabled?: boolean;
}
```

### 3.2 内部状態の分離

```
┌─ SeedInputSection ──────────────────────────────┐
│                                                   │
│  startupOrigins ← autoResolveStartup()           │
│  seedsOrigins   ← autoResolveSeeds()             │
│  importOrigins  ← file / pendingSeedOrigins      │
│                                                   │
│  activeOrigins = {                                │
│    'manual-startup': startupOrigins,              │
│    'manual-seeds':   seedsOrigins,                │
│    'import':         importOrigins,               │
│  }[mode]                                          │
│         ↓                                         │
│  onOriginsChange(activeOrigins)                   │
└───────────────────────────────────────────────────┘
```

### 3.3 タブ切り替え時の挙動

- タブ切り替え時、切り替え元タブの origins はそのまま保持する (破棄しない)
- 切り替え先タブの既存 origins を `onOriginsChange` で親に通知する
- `autoResolveStartup` / `autoResolveSeeds` をタブ切り替え時に呼ぶ必要はなくなる (各タブの入力変更時のみ resolve)

### 3.4 外部転記の注入先

| データソース | 注入先タブ | 注入先 origins | タブ切り替え |
|-------------|-----------|----------------|-------------|
| `pendingDetailOrigins` (Startup 型) | Startup タブ | `startupOrigins` | `manual-startup` に切替 |
| `pendingDetailOrigins` (Seed 型) | Seeds タブ | `seedsOrigins` | `manual-seeds` に切替 |
| `pendingSeedOrigins` (一括転記) | Import タブ | `importOrigins` | `import` に切替 |

### 3.5 activeOrigins の親通知タイミング

以下のいずれかが発生した時点で `onOriginsChange(activeOrigins)` を呼ぶ:

1. アクティブタブの入力変更による resolve 完了時
2. タブ切り替え時 (切り替え先タブの既存 origins を通知)
3. 外部転記データの注入時

## 4. 実装仕様

### 4.1 内部 state 変更

```typescript
// 現状: 共有 origins なし (親の origins を上書き)
// ↓
// 変更後: 3タブ分の独立 state
const [startupOrigins, setStartupOrigins] = useState<SeedOrigin[]>([]);
const [seedsOrigins, setSeedsOrigins] = useState<SeedOrigin[]>([]);
const [importOrigins, setImportOrigins] = useState<SeedOrigin[]>([]);
```

### 4.2 activeOrigins の導出と親通知

```typescript
/** アクティブタブの origins を取得 */
function getActiveOrigins(
  mode: SeedInputMode,
  startupOrigins: SeedOrigin[],
  seedsOrigins: SeedOrigin[],
  importOrigins: SeedOrigin[]
): SeedOrigin[] {
  switch (mode) {
    case 'manual-startup':
      return startupOrigins;
    case 'manual-seeds':
      return seedsOrigins;
    case 'import':
      return importOrigins;
  }
}
```

タブ内の resolve / 入力変更 / タブ切り替え時に `onOriginsChange(getActiveOrigins(...))` を呼ぶ。

### 4.3 autoResolve ヘルパーの変更

```typescript
/** Startup タブ: 解決結果を startupOrigins にセット */
const autoResolveStartup = useCallback(
  (dt: Datetime, ki: KeyInput) => {
    setResolveError(undefined);
    const id = ++resolveIdRef.current;
    try {
      const resolved = resolveSeedOrigins({
        type: 'Startup',
        ds: dsConfig,
        datetime: dt,
        ranges,
        key_input: ki,
      });
      if (resolveIdRef.current === id) {
        setStartupOrigins(resolved);
        // アクティブタブが Startup の場合のみ親に通知
        if (modeRef.current === 'manual-startup') {
          onOriginsChange(resolved);
        }
      }
    } catch (error: unknown) {
      if (resolveIdRef.current === id) {
        setResolveError(error instanceof Error ? error.message : String(error));
      }
    }
  },
  [dsConfig, ranges, onOriginsChange]
);
```

`autoResolveSeeds` も同様に `setSeedsOrigins` + 条件付き `onOriginsChange` に変更。

`modeRef` は `mode` の最新値を追跡する ref。`useCallback` の依存を最小化し stale closure を防ぐ。

### 4.4 handleTabChange の簡素化

```typescript
const handleTabChange = useCallback(
  (newTab: string) => {
    const m = newTab as SeedInputMode;
    onModeChange(m);
    setResolveError(undefined);
    setImportError(undefined);

    // 切り替え先タブの既存 origins を親に通知
    const nextOrigins = getActiveOrigins(m, startupOrigins, seedsOrigins, importOrigins);
    onOriginsChange(nextOrigins);
  },
  [onModeChange, onOriginsChange, startupOrigins, seedsOrigins, importOrigins]
);
```

現状にある `autoResolveStartup` / `autoResolveSeeds` の呼び出しが不要になる。

### 4.5 Import タブの操作

```typescript
/** JSON ファイル読み込み → importOrigins にセット */
const handleImportFile = useCallback(
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(undefined);
    file
      .text()
      .then((text) => {
        const parsed = parseSerializedSeedOrigins(text);
        setImportOrigins(parsed);
        onOriginsChange(parsed); // Import タブはアクティブなはず
      })
      .catch((error: unknown) => {
        setImportError(error instanceof Error ? error.message : String(error));
      });
    event.target.value = '';
  },
  [onOriginsChange]
);
```

`SeedOriginTable` の `onOriginsChange` も `setImportOrigins` + 親通知に変更。

### 4.6 初回マウント時の外部転記

```typescript
useEffect(() => {
  if (mountedRef.current) return;
  mountedRef.current = true;

  const store = useSearchResultsStore.getState();

  // 1) pendingDetailOrigins
  const detail = store.pendingDetailOrigins[featureId];
  if (detail) {
    store.clearPendingDetailOrigin(featureId);
    if ('Startup' in detail) {
      const ki = keyCodeToKeyInput(detail.Startup.condition.key_code);
      const hex = detail.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
      setDatetime(detail.Startup.datetime);
      setKeyInput(ki);
      setSeedText(hex);
      onModeChange('manual-startup');
      // Startup タブに注入 → startupOrigins を resolve
      autoResolveStartup(detail.Startup.datetime, ki);
    } else {
      const hex = detail.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
      setSeedText(hex);
      onModeChange('manual-seeds');
      // Seeds タブに注入 → seedsOrigins を resolve
      autoResolveSeeds(hex);
    }
    return;
  }

  // 2) pendingSeedOrigins → Import タブに注入
  const pending = store.pendingSeedOrigins;
  if (pending.length > 0) {
    store.clearPendingSeedOrigins();
    onModeChange('import');
    setImportOrigins(pending);
    onOriginsChange(pending);
    return;
  }

  // 3) デフォルト: Startup タブなら自動解決
  if (mode === 'manual-startup') {
    autoResolveStartup(datetime, keyInput);
  }
}, []);
```

## 5. テスト方針

### 5.1 コンポーネントテスト

| テスト | ファイル | 検証内容 |
|--------|----------|----------|
| Startup 解決→保持 | `src/test/components/seed-input-section.test.tsx` | Startup タブで datetime 変更 → `onOriginsChange` に Startup 由来の origins が通知される |
| Seeds 解決→保持 | 同上 | Seeds タブで hex 入力 → `onOriginsChange` に Seeds 由来の origins が通知される |
| タブ切替で保持 | 同上 | Startup タブで解決後に Seeds タブに切り替え → Seeds の origins が通知される。Startup に戻ると Startup の origins が再通知される |
| Import 独立 | 同上 | Seeds タブで解決後に Import タブに切り替え → Import の origins (空) が通知される |
| 転記 Startup | 同上 | `pendingDetailOrigins` に Startup 型をセット → Startup タブに切り替わり `startupOrigins` にセットされる |
| 転記 Seed | 同上 | `pendingDetailOrigins` に Seed 型をセット → Seeds タブに切り替わり `seedsOrigins` にセットされる |
| 一括転記 | 同上 | `pendingSeedOrigins` をセット → Import タブに切り替わり `importOrigins` にセットされる |
| 一括転記→保持 | 同上 | 一括転記後に他タブに切り替えても `importOrigins` は保持される |

### 5.2 テスト環境

- jsdom 環境 (コンポーネントテスト)
- `resolveSeedOrigins` はモック化 (WASM 依存を排除)

## 6. 実装チェックリスト

- [x] `src/components/forms/seed-input-section.tsx`: 3 つの独立 origins state を導入
- [x] `src/components/forms/seed-input-section.tsx`: `getActiveOrigins` 導出関数を追加
- [x] `src/components/forms/seed-input-section.tsx`: `autoResolveStartup` / `autoResolveSeeds` の出力先を個別 state に変更
- [x] `src/components/forms/seed-input-section.tsx`: `handleTabChange` を簡素化 (resolve 呼び出し削除)
- [x] `src/components/forms/seed-input-section.tsx`: Import タブの操作を `importOrigins` に向ける
- [x] `src/components/forms/seed-input-section.tsx`: 初回マウント時の外部転記を対応タブの origins に注入
- [x] `src/test/components/seed-input-section.test.tsx`: タブ独立テスト追加
- [x] `pnpm lint` / `pnpm exec tsc -b --noEmit` 通過確認
- [x] `pnpm test:run` 通過確認
- [ ] 画面確認: Startup → Seeds → Startup とタブを行き来しても各タブの origins が保持される
- [ ] 画面確認: 外部転記 (詳細ダイアログ / 一括転記) が正しいタブに注入される
