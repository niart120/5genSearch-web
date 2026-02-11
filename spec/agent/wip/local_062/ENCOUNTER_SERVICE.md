# エンカウントデータサービス 仕様書

## 1. 概要

### 1.1 目的

スクレイピングスクリプトが生成した JSON ファイルをアプリケーション内で読み込み、UI やポケモン生成ロジックに対して統一的なエンカウントデータ API を提供する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| EncounterSlotConfig | WASM 側の入力型。`species_id`, `level_min`, `level_max`, `gender_ratio`, `has_held_item`, `shiny_locked` を含む |
| EncounterSlotJson | JSON ファイル上のスロット表現。`speciesId`, `rate`, `levelRange`, `genderRatio`, `hasHeldItem` を含む |
| レジストリ | 全バージョン・メソッドの JSON を統合したインメモリ辞書 |
| ロケーションキー | 正規化済みのロケーション名 (空白・ダッシュ等を除去) |

### 1.3 背景・問題

- WASM の `PokemonGenerationParams.slots` に `EncounterSlotConfig[]` を渡す必要がある
- JSON データとして保持するのは `EncounterSlotJson` 形式であるため、変換レイヤーが必要
- UI ではロケーション一覧やポケモン一覧を表示する必要がある

### 1.4 期待効果

| 指標 | 値 |
|------|-----|
| JSON ロード方式 | Vite `import.meta.glob` による静的取り込み (eager) |
| 変換オーバーヘッド | 初回アクセス時のみ |
| キャッシュ | Map ベースのキャッシュで同一クエリを再計算しない |

### 1.5 着手条件

- `scripts/scrape-encounters.js` による JSON 生成が完了していること (local_061)
- `EncounterSlotJson` スキーマが確定していること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/data/encounters/schema.ts` | 新規 | JSON スキーマの TypeScript 型定義 |
| `src/data/encounters/loader.ts` | 新規 | JSON → レジストリのロードと検索 API |
| `src/data/encounters/converter.ts` | 新規 | `EncounterSlotJson[]` → `EncounterSlotConfig[]` 変換 |
| `src/data/encounters/helpers.ts` | 新規 | UI 向けヘルパー (ロケーション一覧、ポケモン一覧) |
| `src/test/unit/encounter-schema.test.ts` | 新規 | スキーマ変換のユニットテスト |
| `src/test/unit/encounter-loader.test.ts` | 新規 | ローダーのユニットテスト |

---

## 3. 設計方針

### 3.1 レイヤー構成

```
JSON files (generated/v1/**/*.json)
  ↓ import.meta.glob (eager)
loader.ts ── registry (インメモリ辞書)
  ↓
converter.ts ── EncounterSlotJson[] → EncounterSlotConfig[]
  ↓
helpers.ts ── UI 向け API (ロケーション一覧 / ポケモン一覧)
```

### 3.2 設計判断

1. **Eager ロード**: JSON ファイルはビルド時にバンドルに取り込む。実行時の fetch は行わない
2. **ロケーションキー正規化**: 空白・各種ダッシュ・アンダースコアを除去し、表記揺れを吸収
3. **`null` 排除**: 外部 JSON 由来の `null` は境界で `undefined` に正規化 (TypeScript 規約準拠)
4. **GenderRatio 型安全**: 文字列から WASM の `GenderRatio` 型への変換は converter で行い、不正値はコンパイル時に検出する
5. **shiny_locked**: JSON には含めず、converter で既定値 `false` を設定する (フィールドが必要になった際に拡張)

---

## 4. 実装仕様

### 4.1 schema.ts

```typescript
export interface EncounterSlotJson {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
  genderRatio: string;
  hasHeldItem: boolean;
}

export interface EncounterLocationPayload {
  displayNameKey: string;
  slots: EncounterSlotJson[];
}

export interface EncounterLocationsJson {
  version: 'B' | 'W' | 'B2' | 'W2';
  method: string;
  source: { name: string; url: string; retrievedAt: string };
  locations: Record<string, EncounterLocationPayload>;
}
```

### 4.2 loader.ts

```typescript
import type { EncounterLocationsJson, EncounterSlotJson } from './schema';

type RegistryEntry = { displayNameKey: string; slots: EncounterSlotJson[] };
type Registry = Record<string, Record<string, RegistryEntry>>;
// key: `${version}_${method}` → Record<normalizedLocationKey, RegistryEntry>

function normalizeLocationKey(location: string): string;
function initRegistry(): Registry;

// 公開 API
export function getEncounterSlots(
  version: string,
  location: string,
  method: string
): EncounterSlotJson[] | undefined;

export function listLocations(
  version: string,
  method: string
): Array<{ key: string; displayNameKey: string }>;
```

### 4.3 converter.ts

`EncounterSlotJson[]` を WASM の `EncounterSlotConfig[]` に変換する。

```typescript
import type { EncounterSlotConfig, GenderRatio } from '../wasm/wasm_pkg';
import type { EncounterSlotJson } from './schema';

const GENDER_RATIO_MAP: Record<string, GenderRatio> = {
  Genderless: 'Genderless',
  MaleOnly: 'MaleOnly',
  FemaleOnly: 'FemaleOnly',
  F1M7: 'F1M7',
  F1M3: 'F1M3',
  F1M1: 'F1M1',
  F3M1: 'F3M1',
};

export function toEncounterSlotConfigs(
  slots: EncounterSlotJson[]
): EncounterSlotConfig[] {
  return slots.map((slot) => ({
    species_id: slot.speciesId,
    level_min: slot.levelRange.min,
    level_max: slot.levelRange.max,
    gender_ratio: GENDER_RATIO_MAP[slot.genderRatio] ?? 'F1M1',
    has_held_item: slot.hasHeldItem,
    shiny_locked: false,
  }));
}
```

### 4.4 helpers.ts

```typescript
import type { EncounterSlotJson } from './schema';

export interface EncounterLocationOption {
  key: string;
  displayNameKey: string;
}

export interface EncounterSpeciesOption {
  speciesId: number;
  firstSlotIndex: number;
  appearances: number;
  totalRate: number;
  minLevel: number;
  maxLevel: number;
}

export function listEncounterLocations(
  version: string,
  method: string
): EncounterLocationOption[];

export function listEncounterSpecies(
  version: string,
  method: string,
  locationKey: string
): EncounterSpeciesOption[];
```

`listEncounterSpecies` はスロット配列から種族ごとに集約し、出現回数・合算レート・レベル範囲を算出する。

---

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|----------|
| `normalizeLocationKey` | 空白・ダッシュ・全角空白の除去 |
| `toEncounterSlotConfigs` | JSON → WASM 型変換の正確性 |
| `toEncounterSlotConfigs` (不正 genderRatio) | 不明な文字列でフォールバック `F1M1` |
| `listEncounterSpecies` | 種族集約・レート合算・レベル範囲 |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 検証内容 |
|--------|----------|
| レジストリ初期化 | `import.meta.glob` で JSON が読み込まれること |
| `getEncounterSlots` | 既知ロケーションのスロット数が正しいこと |
| `listLocations` | 既知バージョン・メソッドで空でないリストが返ること |

---

## 6. 実装チェックリスト

- [ ] `src/data/encounters/schema.ts` 作成
- [ ] `src/data/encounters/loader.ts` 作成
  - [ ] `normalizeLocationKey` 実装
  - [ ] `initRegistry` 実装 (import.meta.glob)
  - [ ] `getEncounterSlots` 実装
  - [ ] `listLocations` 実装
- [ ] `src/data/encounters/converter.ts` 作成
  - [ ] `toEncounterSlotConfigs` 実装
  - [ ] `GENDER_RATIO_MAP` 定義
- [ ] `src/data/encounters/helpers.ts` 作成
  - [ ] `listEncounterLocations` 実装
  - [ ] `listEncounterSpecies` 実装
- [ ] `src/test/unit/encounter-schema.test.ts` 作成
- [ ] `src/test/unit/encounter-loader.test.ts` 作成
- [ ] JSON 生成後の統合テスト実行・確認
