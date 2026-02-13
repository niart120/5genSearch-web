# エンカウントデータ遅延読み込み 仕様書

## 1. 概要

### 1.1 目的

エンカウント JSON データの読み込みを `eager: true` (即時) から dynamic import (遅延) に切り替え、初期バンドルサイズを削減する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| eager import | `import.meta.glob({ eager: true })` によりビルド時に全モジュールをバンドルに含める方式 |
| dynamic import | `import.meta.glob({ eager: false })` により実行時に必要なモジュールのみを非同期ロードする方式 |
| Registry | version + method をキーとしてエンカウントデータを格納する内部辞書 |

### 1.3 背景・問題

- `src/data/encounters/loader.ts` で `import.meta.glob({ eager: true })` を使用し、全 JSON (46 ファイル、合計約 2.5 MB) をバンドルに含めている
- ユーザは通常 1 バージョン (B/W/B2/W2) × 1 メソッド (Normal/Fishing 等) の組み合わせしか利用しない
- dev-journal 記載時点 (28 ファイル) から 46 ファイルに増加しており、バンドルサイズへの影響が拡大している

### 1.4 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| 初期バンドルに含まれるエンカウント JSON | 約 2.5 MB (46 ファイル全量) | 0 MB (選択時にオンデマンドロード) |
| 最大追加ロード量 | N/A | 約 260 KB (BW2 Normal.json 1 ファイル + 関連 static 数 KB) |

### 1.5 着手条件

- なし (独立した パフォーマンス改善)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|--------|---------|---------|
| `src/data/encounters/loader.ts` | 変更 | `eager: true` → lazy に変更、API を非同期化、キャッシュ付き |
| `src/data/encounters/helpers.ts` | 変更 | loader 呼び出しを非同期対応、`listLocations` / `listSpecies` を `async` に |
| `src/features/pokemon-list/components/pokemon-params-form.tsx` | 変更 | `useMemo` → `useEffect` + `useState` 非同期パターンに変更、ハンドラ非同期化 |
| `src/test/unit/encounter-helpers.test.ts` | 変更 | `mockReturnValue` → `mockResolvedValue`、テスト関数に `async`/`await` 追加 |
| `src/test/integration/encounter-service.test.ts` | 変更 | 全テストに `async`/`await` 追加 |

## 3. 設計方針

### 3.1 `import.meta.glob` の lazy 化

`eager: true` を削除 (デフォルトの `eager: false`) することで、Vite が各 JSON を個別チャンクとして分割する。
`import.meta.glob` の返り値は `Record<string, () => Promise<T>>` となる。

### 3.2 レジストリの非同期初期化

現在の `ensureRegistry()` は同期関数。これを非同期に変更する。

キャッシュ戦略:
- 一度ロードした version × method の組み合わせはメモリにキャッシュし、再ロードしない
- キャッシュキーは `${version}_${method}` (現在の Registry キーと同一)

### 3.3 static エンカウントの扱い

`static/v1/` は合計約 17 KB と小さいため、以下の 2 案がある:

1. **lazy 化しない** (`eager: true` のまま): 17 KB のバンドル増は許容範囲
2. **lazy 化する**: generated と同様に遅延ロード

方針: generated と同様に lazy 化する (一貫性を優先)。実装コストは同等。

### 3.4 呼び出し元の非同期対応

`getEncounterSlots()`, `listLocations()` 等が `async` になるため、呼び出し元で `await` または state 経由の非同期パターンが必要。

コンポーネント側:
- `useEffect` + state で非同期ロード結果を管理
- ロード中は既存の UI (セレクトボックス等) を disabled またはローディング表示

### 3.5 glob パスからの version/method 推定

現在は JSON 内の `data.version` / `data.method` を参照しているが、lazy 化後はロード前にキーを特定する必要がある。
glob パスのパターン `./generated/v1/{version}/{method}.json` からパースして、必要な JSON のみをロードする。

## 4. 実装仕様

### 4.1 loader.ts の非同期 API

```ts
// dynamic import (lazy)
const generatedModules = import.meta.glob<EncounterLocationsJson>(
  './generated/v1/**/*.json',
  { import: 'default' }
);

const staticModules = import.meta.glob<EncounterSpeciesJson>(
  './static/v1/**/*.json',
  { import: 'default' }
);

// パスから version/method を抽出
// 例: "./generated/v1/B/Normal.json" → { version: "B", method: "Normal" }
function parseModulePath(path: string): { version: string; method: string } | undefined {
  const match = path.match(/\/v1\/(\w+)\/(\w+)\.json$/);
  if (!match) return undefined;
  return { version: match[1], method: match[2] };
}

// キャッシュ付き非同期ロード
const registryCache: Registry = {};

async function loadRegistryEntry(
  version: string,
  method: string
): Promise<Record<string, RegistryEntry> | undefined> {
  const key = `${version}_${method}`;
  if (registryCache[key]) return registryCache[key];

  // 該当する glob エントリを探す
  const targetPath = Object.keys(generatedModules).find((path) => {
    const parsed = parseModulePath(path);
    return parsed?.version === version && parsed?.method === method;
  });
  if (!targetPath) return undefined;

  const data = await generatedModules[targetPath]();
  const bucket: Record<string, RegistryEntry> = {};
  for (const [locKey, payload] of Object.entries(data.locations)) {
    const normalizedKey = normalizeLocationKey(locKey);
    bucket[normalizedKey] = {
      displayNameKey: locKey,
      slots: payload.slots,
    };
  }
  registryCache[key] = bucket;
  return bucket;
}

// Public API (非同期)
async function getEncounterSlots(
  version: string,
  location: string,
  method: string
): Promise<EncounterSlotJson[] | undefined> {
  const bucket = await loadRegistryEntry(version, method);
  if (!bucket) return undefined;
  const normalizedLoc = normalizeLocationKey(location);
  return bucket[normalizedLoc]?.slots;
}

async function listLocations(
  version: string,
  method: string
): Promise<Array<{ key: string; displayNameKey: string }>> {
  const bucket = await loadRegistryEntry(version, method);
  if (!bucket) return [];
  return Object.entries(bucket).map(([locKey, entry]) => ({
    key: locKey,
    displayNameKey: entry.displayNameKey,
  }));
}
```

### 4.2 helpers.ts の変更

`helpers.ts` の公開関数で `loader.ts` を呼び出している箇所を `async` に変更する。

**キャッシュ戦略**: helpers.ts 自体はキャッシュ層を持たない。loader.ts のレジストリキャッシュが一次キャッシュとして機能し、helpers.ts は毎回 loader から導出する。再導出コストは O(slots) (通常 ~12 要素) で無視できる。

### 4.3 コンポーネント側の非同期対応パターン

スロットと種族の取得をひとつの `useEffect` に統合し、`Promise.all` で並列取得する。
これにより `handleLocationChange` と species effect の重複呼び出しを排除する。

```tsx
// stale closure 回避用 ref (render 外で更新)
const valueRef = useRef(value);
useEffect(() => { valueRef.current = value; });

// スロット + 種族一覧: 単一 effect で一括取得
useEffect(() => {
  let cancelled = false;
  const load = async (): Promise<void> => {
    if (isLocationBased && selectedLocation) {
      const [slots, species] = await Promise.all([
        getEncounterSlots(version, selectedLocation, method),
        listSpecies(version, method, selectedLocation),
      ]);
      if (!cancelled) {
        setSpeciesOptions(species);
        onChange({ ...valueRef.current, slots: toSlotConfigs(slots), availableSpecies: species });
      }
    }
  };
  void load();
  return () => { cancelled = true; };
}, [version, method, isLocationBased, selectedLocation, onChange]);

// handleLocationChange は setSelectedLocation のみ (同期)
const handleLocationChange = useCallback(
  (key: string) => { setSelectedLocation(key); },
  []
);
```
```

## 5. テスト方針

| テスト | 分類 | 検証内容 |
|-------|------|---------|
| `loadRegistryEntry` | unit | 指定した version/method のデータのみがロードされること |
| `parseModulePath` | unit | glob パスから version/method が正しく抽出されること |
| キャッシュ動作 (loader) | unit | 同一 version/method の 2 回目呼び出しでモジュールローダが再実行されないこと (helpers.ts はキャッシュを持たない) |
| `listLocations` (async) | unit | 既存テストを非同期に変更して検証 |
| `getEncounterSlots` (async) | unit | 既存テストを非同期に変更して検証 |

テストでは `import.meta.glob` をモック (`vi.mock`) し、`() => Promise.resolve(...)` を返すことで非同期動作を検証する。

## 6. 実装チェックリスト

- [x] `loader.ts`: `import.meta.glob` の `eager: true` を削除 (generated)
- [x] `loader.ts`: `import.meta.glob` の `eager: true` を削除 (static)
- [x] `loader.ts`: `parseModulePath` ヘルパー追加
- [x] `loader.ts`: レジストリキャッシュ + 非同期ロード関数
- [x] `loader.ts`: 公開 API (`getEncounterSlots`, `listLocations`, `getLocationEntry`, `listStaticEncounterEntries`, `getStaticEncounterEntry`) を `async` に変更
- [x] `helpers.ts`: loader 呼び出しを `async`/`await` に変更 (キャッシュ層は除去済み)
- [x] コンポーネント: スロット+種族を単一 effect で並列取得 (`Promise.all`)、`handleLocationChange` は同期化
- [x] テスト: 既存テストを非同期対応に修正 (helpers キャッシュテストは除去)
- [x] `pnpm build` が正常に完了すること (チャンク分割の確認)
- [x] `pnpm test:run` 通過
- [x] `pnpm lint` / `pnpm format:check:ts` 通過
