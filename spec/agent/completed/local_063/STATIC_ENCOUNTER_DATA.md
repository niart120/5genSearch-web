# 固定エンカウントデータ・統一 API 仕様書

## 1. 概要

### 1.1 目的

固定シンボル・御三家・化石・イベント配布等の固定エンカウントデータを JSON として管理し、既存の野生エンカウント API と統合した検索 API を `data/encounters/` に提供する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 固定エンカウント | 野生エンカウントテーブルを持たないエンカウント種別の総称。WASM の `EncounterType` のうち `StaticSymbol`, `StaticStarter`, `StaticFossil`, `StaticEvent`, `Roamer`, `HiddenGrotto` が該当 |
| `EncounterSpeciesEntryJson` | 固定エンカウント 1 件の JSON 表現。種族 ID、レベル、色違いロック有無等を含む |
| `EncounterSpeciesJson` | バージョン × エンカウント種別ごとの固定エンカウントカタログ JSON |
| `StaticEncounterTypeKey` | 固定エンカウント種別の文字列ユニオン |
| ロケーションベースエンカウント | ロケーション選択 → スロットテーブルで種族が決まるエンカウント (野生) |

### 1.3 背景・問題

- WASM の `PokemonGenerationParams.slots` は野生・固定問わず `EncounterSlotConfig[]` を受け取る (固定は 1 件)
- 現行の `data/encounters/` は野生エンカウント (`generated/v1/`) のみを扱い、固定エンカウントデータが存在しない
- 利用者 (feature 層) はエンカウント種別ごとに異なる API を使い分ける必要があり、統一的なインターフェースが欠如している

### 1.4 期待効果

| 指標 | 値 |
|------|-----|
| 統一 API | `EncounterSpeciesOption` の判別共用型 (`kind: 'location' \| 'static'`) で wild/static を統合 |
| JSON ロード | Vite `import.meta.glob` eager (野生と同一方式) |
| データソース | リファレンス実装 (niart120/pokemon-gen5-initseed) の `static/v1/` から手動変換 |

### 1.5 着手条件

- local_062 (エンカウントデータサービス) が完了していること
- リファレンス実装の固定エンカウント JSON が入手可能であること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/data/encounters/schema.ts` | 変更 | `EncounterMethodKey` に `PokemonShadow` 追加、`EncounterSpeciesEntryJson` / `EncounterSpeciesJson` / `StaticEncounterTypeKey` 型追加、サブセット制約追加 |
| `src/data/encounters/loader.ts` | 変更 | 固定エンカウントレジストリ (`staticRegistry`) の初期化・検索 API 追加 |
| `src/data/encounters/converter.ts` | 変更 | `toEncounterSlotConfigFromEntry` 追加 (固定エンカウント→WASM 変換) |
| `src/data/encounters/helpers.ts` | 変更 (破壊的) | 既存 API 破棄、`EncounterSpeciesOption` 判別共用型化、`isLocationBasedEncounter` / `listLocations` / `listSpecies` 統一 API |
| `src/data/encounters/static/v1/**/*.json` | 新規 | 固定エンカウントカタログ JSON |
| `scripts/scrape-encounters.js` | 変更 | `PokemonShadow` メソッドの追加 |
| `src/test/unit/encounter-static.test.ts` | 新規 | 固定エンカウント変換・検索のユニットテスト |
| `src/test/unit/encounter-helpers.test.ts` | 変更 | 新 API 名に追従、static 分岐テスト追加 |
| `src/test/integration/encounter-service.test.ts` | 変更 | 固定エンカウント・PokemonShadow の統合テスト追加 |

---

## 3. 設計方針

### 3.1 レイヤー構成

```
JSON (generated/v1/)   JSON (static/v1/)
  ↓ import.meta.glob     ↓ import.meta.glob
loader.ts ── wildRegistry  ── staticRegistry
  ↓
helpers.ts ── isLocationBasedEncounter()
           ── listLocations() / listSpecies() → EncounterSpeciesOption (union)
  ↓
converter.ts ── toEncounterSlotConfigs()        (wild: 複数スロット)
             ── toEncounterSlotConfigFromEntry() (static: 1 件)
```

### 3.2 設計判断

1. **`data/` 内で完結**: 統一 API は `data/encounters/helpers.ts` に配置する。`services/` はインフラ層であり、データアクセス・変換の責務は `data/` に留める (frontend-structure.md 準拠)
2. **判別共用型**: `EncounterSpeciesOption` を `kind: 'location' | 'static'` で分岐する判別共用型に変更し、呼び出し側で分岐可能にする
3. **`isLocationBasedEncounter`**: `EncounterMethodKey` を受け取り、ロケーション選択が必要な野生エンカウントか否かを判定するヘルパーを追加
4. **固定エンカウント JSON のロケーション概念**: 固定エンカウントにロケーション概念はない。エントリ単位の flat リストとして管理する
5. **`genderRatio` の明示指定**: 固定エンカウント JSON に `genderRatio` フィールド (`GenderRatio` 型) を含める。野生エンカウントと同様に JSON 側で性別比を確定させ、converter はパススルーする。伝説ポケモンなどは `Genderless` を指定する
6. **手動データ作成**: リファレンス実装の `static/v1/` ディレクトリから JSON を本リポジトリの形式に手動変換して配置する
7. **`PokemonShadow` の追加**: ホドモエの跳ね橋 (コアルヒー) / ワンダーブリッジ (スワンナ) が該当する。`EncounterMethodKey` に `PokemonShadow` を追加し、スクレイパーの対象メソッドにも含める
8. **既存 API の破壊的変更**: `listEncounterLocations` / `listEncounterSpecies` は未使用のため破棄し、統一 API として簡潔な名称 (`listLocations` / `listSpecies`) に置き換える

### 3.3 型戦略: schema.ts 独自型と WASM 供給型の使い分け

`schema.ts` の `EncounterMethodKey` / `StaticEncounterTypeKey` は JSON ファイルの形状を表現する境界型であり、WASM の `EncounterType` とは目的が異なる (後者は `Egg` を含む全エンカウント種別)。両者を統一すると JSON バリデーション時に不正な値を許容するリスクがある。

分離を維持したうえで、コンパイル時にサブセット関係を検証する:

```typescript
import type { EncounterType } from '../../wasm/wasm_pkg';

// EncounterMethodKey / StaticEncounterTypeKey が EncounterType のサブセットであることを保証
type _AssertWild = EncounterMethodKey extends EncounterType ? true : never;
type _AssertStatic = StaticEncounterTypeKey extends EncounterType ? true : never;
```

これにより WASM 側でバリアントが変更された場合にコンパイルエラーで検知できる。

**関数引数の型選択指針:**

| レイヤー | 引数の型 | 理由 |
|---------|---------|------|
| `schema.ts` / JSON 境界 | `EncounterMethodKey` / `StaticEncounterTypeKey` | JSON の形状を正確に制約する |
| `loader.ts` / `helpers.ts` | `EncounterMethodKey \| StaticEncounterTypeKey` | JSON レジストリへのアクセスであり、JSON 境界型で制約する |
| `converter.ts` | WASM 型 (`GenderRatio`, `EncounterSlotConfig`) を入出力に使用 | WASM API との変換レイヤー |

---

## 4. 実装仕様

### 4.1 schema.ts 変更

#### EncounterMethodKey への PokemonShadow 追加

```typescript
export type EncounterMethodKey =
  | 'Normal'
  | 'ShakingGrass'
  | 'DustCloud'
  | 'PokemonShadow'   // 追加
  | 'Surfing'
  | 'SurfingBubble'
  | 'Fishing'
  | 'FishingBubble';
```

#### 固定エンカウント型の追加

```typescript
export type StaticEncounterTypeKey =
  | 'StaticSymbol'
  | 'StaticStarter'
  | 'StaticFossil'
  | 'StaticEvent'
  | 'Roamer'
  | 'HiddenGrotto';

export interface EncounterSpeciesEntryJson {
  id: string;
  displayNameKey: string;
  speciesId: number;
  level: number;
  genderRatio: GenderRatio;
  isHiddenAbility?: boolean;
  isShinyLocked?: boolean;
}

export interface EncounterSpeciesJson {
  version: GameVersion;
  method: StaticEncounterTypeKey;
  source: { name: string; url: string; retrievedAt: string };
  entries: EncounterSpeciesEntryJson[];
}
```

#### サブセット制約

```typescript
import type { EncounterType } from '../../wasm/wasm_pkg';

type _AssertWild = EncounterMethodKey extends EncounterType ? true : never;
type _AssertStatic = StaticEncounterTypeKey extends EncounterType ? true : never;
```

### 4.2 loader.ts 追加 API

```typescript
type StaticRegistry = Record<string, EncounterSpeciesEntryJson[]>;
// key: `${version}_${method}`

// initStaticRegistry() — import.meta.glob('./static/v1/**/*.json', { eager: true })

export function listStaticEncounterEntries(
  version: string,
  method: string
): EncounterSpeciesEntryJson[];

export function getStaticEncounterEntry(
  version: string,
  method: string,
  entryId: string
): EncounterSpeciesEntryJson | undefined;
```

### 4.3 converter.ts 追加関数

```typescript
import type { EncounterSpeciesEntryJson } from './schema';
import type { EncounterSlotConfig } from '../../wasm/wasm_pkg';

export function toEncounterSlotConfigFromEntry(
  entry: EncounterSpeciesEntryJson
): EncounterSlotConfig {
  return {
    species_id: entry.speciesId,
    level_min: entry.level,
    level_max: entry.level,
    gender_ratio: entry.genderRatio, // JSON で確定済み、パススルー
    has_held_item: false,
    shiny_locked: entry.isShinyLocked ?? false,
  };
}
```

### 4.4 helpers.ts 統一 API

既存の `listEncounterLocations` / `listEncounterSpecies` は未使用のため破棄し、以下の簡潔な API に置き換える。

```typescript
import type {
  EncounterMethodKey,
  StaticEncounterTypeKey,
  GameVersion,
} from './schema';
import type { GenderRatio } from '../../wasm/wasm_pkg';

// 判別共用型
export type EncounterSpeciesOption =
  | {
      kind: 'location';
      speciesId: number;
      firstSlotIndex: number;
      appearances: number;
      totalRate: number;
      minLevel: number;
      maxLevel: number;
    }
  | {
      kind: 'static';
      id: string;
      displayNameKey: string;
      speciesId: number;
      level: number;
      genderRatio: GenderRatio;
      isHiddenAbility?: boolean;
      isShinyLocked?: boolean;
    };

export interface LocationOption {
  key: string;
  displayNameKey: string;
}

// ロケーションベース判定用の Set (EncounterMethodKey の全値)
const LOCATION_BASED_TYPES: ReadonlySet<string> = new Set<EncounterMethodKey>([
  'Normal', 'ShakingGrass', 'DustCloud', 'PokemonShadow',
  'Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble',
]);

export function isLocationBasedEncounter(
  encounterType: EncounterMethodKey | StaticEncounterTypeKey
): encounterType is EncounterMethodKey {
  return LOCATION_BASED_TYPES.has(encounterType);
}

// 統一 API: 既存の listEncounterLocations / listEncounterSpecies を置き換え
export function listLocations(
  version: GameVersion,
  method: EncounterMethodKey
): LocationOption[];

export function listSpecies(
  version: GameVersion,
  method: EncounterMethodKey | StaticEncounterTypeKey,
  locationKey?: string
): EncounterSpeciesOption[];
```

`listSpecies` は `isLocationBasedEncounter(method)` で分岐し:
- `true`: ロケーション内スロットを種族集約 (`kind: 'location'`)
- `false`: `listStaticEncounterEntries` から `kind: 'static'` オプションを生成

#### キャッシュキー設計

キャッシュ Map のキーは wild / static で `locationKey` の有無が異なる:

| 種別 | キー形式 | 例 |
|------|---------|----|
| location | `L\|${version}\|${method}\|${locationKey}` | `L\|B\|Normal\|route_1` |
| static | `S\|${version}\|${method}` | `S\|B\|StaticSymbol` |

static の場合は `locationKey` を含めない。

### 4.5 固定エンカウント JSON 構造例

```json
{
  "version": "B",
  "method": "StaticSymbol",
  "source": {
    "name": "niart120/pokemon-gen5-initseed",
    "url": "https://github.com/niart120/pokemon-gen5-initseed",
    "retrievedAt": "2026-02-11"
  },
  "entries": [
    {
      "id": "reshiram-n-castle",
      "displayNameKey": "reshiram_n_castle",
      "speciesId": 643,
      "level": 50,
      "genderRatio": "Genderless",
      "isShinyLocked": true
    },
    {
      "id": "cobalion-guidance-chamber",
      "displayNameKey": "cobalion_guidance_chamber",
      "speciesId": 638,
      "level": 42,
      "genderRatio": "Genderless"
    }
  ]
}
```

---

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|----------|
| `toEncounterSlotConfigFromEntry` | `genderRatio` パススルー、`shinyLocked` デフォルト `false`、`level_min == level_max` |
| `isLocationBasedEncounter` | 野生種別 (`EncounterMethodKey` 全値) で `true`、固定種別 (`StaticEncounterTypeKey` 全値) で `false` |
| `listSpecies` (static) | 固定エンカウントエントリが `kind: 'static'` で返ること |
| `listSpecies` (location) | ロケーション指定時に `kind: 'location'` が返ること |

#### モック戦略

`helpers.ts` のユニットテストでは `loader.ts` をモックする:

```typescript
vi.mock('@/data/encounters/loader');
const mockListLocations = vi.mocked(listLocationsFromRegistry);
const mockGetEncounterSlots = vi.mocked(getEncounterSlots);
const mockListStaticEntries = vi.mocked(listStaticEncounterEntries);
```

`converter.ts` のテストはモック不要 (純粋関数)。

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| 固定レジストリ初期化 | `import.meta.glob` で固定エンカウント JSON が読み込まれること |
| `listStaticEncounterEntries` | 既知バージョン・メソッドでエントリが返ること |
| `listSpecies` 統一 API | 野生と固定の両方が正しく返ること |
| `PokemonShadow` データ | ホドモエの跳ね橋 / ワンダーブリッジのデータが存在すること |

---

## 6. 実装チェックリスト

- [x] `src/data/encounters/schema.ts` 変更
  - [x] `EncounterMethodKey` に `PokemonShadow` 追加
  - [x] `StaticEncounterTypeKey`, `EncounterSpeciesEntryJson`, `EncounterSpeciesJson` 追加
  - [x] サブセット制約 (`_AssertWild`, `_AssertStatic`) 追加
- [x] `src/data/encounters/static/v1/` に固定エンカウント JSON 配置
  - [x] B/StaticSymbol.json
  - [x] W/StaticSymbol.json
  - [x] B2/StaticSymbol.json
  - [x] W2/StaticSymbol.json
  - [x] 御三家・化石・イベント等 (対象範囲は着手時に判断)
- [x] `scripts/scrape-encounters.js` に `PokemonShadow` 追加・再実行
- [x] `src/data/encounters/loader.ts` に固定レジストリ初期化・検索 API 追加
- [x] `src/data/encounters/converter.ts` に `toEncounterSlotConfigFromEntry` 追加
- [x] `src/data/encounters/helpers.ts` を破壊的に再設計
  - [x] 既存 `listEncounterLocations` / `listEncounterSpecies` 破棄
  - [x] `EncounterSpeciesOption` 判別共用型
  - [x] `isLocationBasedEncounter` (型ガード)
  - [x] `listLocations` / `listSpecies` 統一 API
  - [x] キャッシュキー設計 (wild: locationKey 含む, static: 含まない)
- [x] `src/test/unit/encounter-static.test.ts` 作成
- [x] `src/test/unit/encounter-helpers.test.ts` 新 API に追従
- [x] `src/test/integration/encounter-service.test.ts` に固定エンカウント・PokemonShadow テスト追加
- [x] 既存テストが引き続きパスすることを確認
