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
| `src/data/encounters/schema.ts` | 変更 | `EncounterSpeciesEntryJson`, `EncounterSpeciesJson`, `StaticEncounterTypeKey` 型追加 |
| `src/data/encounters/loader.ts` | 変更 | 固定エンカウントレジストリ (`staticRegistry`) の初期化・検索 API 追加 |
| `src/data/encounters/converter.ts` | 変更 | `toEncounterSlotConfigFromEntry` 追加 (固定エンカウント→WASM 変換) |
| `src/data/encounters/helpers.ts` | 変更 | `EncounterSpeciesOption` を判別共用型化、`isLocationBasedEncounter` 追加、`listEncounterSpeciesOptions` 統合 |
| `src/data/encounters/static/v1/**/*.json` | 新規 | 固定エンカウントカタログ JSON |
| `src/test/unit/encounter-static.test.ts` | 新規 | 固定エンカウント変換・検索のユニットテスト |
| `src/test/integration/encounter-service.test.ts` | 変更 | 固定エンカウントの統合テスト追加 |

---

## 3. 設計方針

### 3.1 レイヤー構成

```
JSON (generated/v1/)   JSON (static/v1/)
  ↓ import.meta.glob     ↓ import.meta.glob
loader.ts ── wildRegistry  ── staticRegistry
  ↓
helpers.ts ── isLocationBasedEncounter()
           ── listEncounterSpeciesOptions() → EncounterSpeciesOption (union)
  ↓
converter.ts ── toEncounterSlotConfigs()        (wild: 複数スロット)
             ── toEncounterSlotConfigFromEntry() (static: 1 件)
```

### 3.2 設計判断

1. **`data/` 内で完結**: 統一 API は `data/encounters/helpers.ts` に配置する。`services/` はインフラ層であり、データアクセス・変換の責務は `data/` に留める (frontend-structure.md 準拠)
2. **判別共用型**: `EncounterSpeciesOption` を `kind: 'location' | 'static'` で分岐する判別共用型に変更し、呼び出し側で分岐可能にする
3. **`isLocationBasedEncounter`**: `EncounterType` を受け取り、ロケーション選択が必要な野生エンカウントか否かを判定するヘルパーを追加
4. **固定エンカウント JSON のロケーション概念**: 固定エンカウントにロケーション概念はない。エントリ単位の flat リストとして管理する
5. **`genderRatio` の解決**: 固定エンカウント JSON には `genderRatio` を含めず、converter で `gender` フィールドから推定するか、将来的に種族データから解決する (Phase 1 では `F1M1` をデフォルトとし、`gender` 指定がある場合は `MaleOnly`/`FemaleOnly` に変換)
6. **手動データ作成**: リファレンス実装の `static/v1/` ディレクトリから JSON を本リポジトリの形式に手動変換して配置する

---

## 4. 実装仕様

### 4.1 schema.ts 追加型

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
  gender?: 'male' | 'female';
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

export function toEncounterSlotConfigFromEntry(
  entry: EncounterSpeciesEntryJson
): EncounterSlotConfig {
  const genderRatio: GenderRatio =
    entry.gender === 'male' ? 'MaleOnly'
    : entry.gender === 'female' ? 'FemaleOnly'
    : 'F1M1'; // デフォルト (将来的には種族データから解決)

  return {
    species_id: entry.speciesId,
    level_min: entry.level,
    level_max: entry.level,
    gender_ratio: genderRatio,
    has_held_item: false,
    shiny_locked: entry.isShinyLocked ?? false,
  };
}
```

### 4.4 helpers.ts 統一 API

```typescript
import type { EncounterType } from '../../wasm/wasm_pkg';

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
      gender?: 'male' | 'female';
      isHiddenAbility?: boolean;
      isShinyLocked?: boolean;
    };

// ロケーションベース判定用の Set
const LOCATION_BASED_TYPES: ReadonlySet<string> = new Set([
  'Normal', 'ShakingGrass', 'DustCloud', 'PokemonShadow',
  'Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble',
]);

export function isLocationBasedEncounter(encounterType: string): boolean {
  return LOCATION_BASED_TYPES.has(encounterType);
}

export function listEncounterSpeciesOptions(
  version: string,
  method: string,
  locationKey?: string
): EncounterSpeciesOption[];
```

`listEncounterSpeciesOptions` は `isLocationBasedEncounter(method)` で分岐し:
- `true`: 既存の `listEncounterSpecies` ロジック (ロケーション内スロットを種族集約、`kind: 'location'`)
- `false`: `listStaticEncounterEntries` から `kind: 'static'` オプションを生成

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
      "isShinyLocked": true
    },
    {
      "id": "cobalion-guidance-chamber",
      "displayNameKey": "cobalion_guidance_chamber",
      "speciesId": 638,
      "level": 42
    }
  ]
}
```

---

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|----------|
| `toEncounterSlotConfigFromEntry` | gender → genderRatio 変換、shinyLocked デフォルト、level_min == level_max |
| `isLocationBasedEncounter` | 野生種別で `true`、固定種別で `false` |
| `listEncounterSpeciesOptions` (static) | 固定エンカウントエントリが `kind: 'static'` で返ること |
| `listEncounterSpeciesOptions` (location) | 既存の `kind: 'location'` が維持されること |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| 固定レジストリ初期化 | `import.meta.glob` で固定エンカウント JSON が読み込まれること |
| `listStaticEncounterEntries` | 既知バージョン・メソッドでエントリが返ること |
| `listEncounterSpeciesOptions` 統一 API | 野生と固定の両方が正しく返ること |

---

## 6. 実装チェックリスト

- [ ] `src/data/encounters/schema.ts` に `StaticEncounterTypeKey`, `EncounterSpeciesEntryJson`, `EncounterSpeciesJson` 追加
- [ ] `src/data/encounters/static/v1/` に固定エンカウント JSON 配置
  - [ ] B/StaticSymbol.json
  - [ ] W/StaticSymbol.json
  - [ ] B2/StaticSymbol.json
  - [ ] W2/StaticSymbol.json
  - [ ] 御三家・化石・イベント等 (対象範囲は着手時に判断)
- [ ] `src/data/encounters/loader.ts` に固定レジストリ初期化・検索 API 追加
- [ ] `src/data/encounters/converter.ts` に `toEncounterSlotConfigFromEntry` 追加
- [ ] `src/data/encounters/helpers.ts` を判別共用型 API に拡張
  - [ ] `EncounterSpeciesOption` 判別共用型化
  - [ ] `isLocationBasedEncounter` 追加
  - [ ] `listEncounterSpeciesOptions` 統一 API 実装
- [ ] `src/test/unit/encounter-static.test.ts` 作成
- [ ] `src/test/integration/encounter-service.test.ts` に固定エンカウントテスト追加
- [ ] 既存テストが引き続きパスすることを確認
