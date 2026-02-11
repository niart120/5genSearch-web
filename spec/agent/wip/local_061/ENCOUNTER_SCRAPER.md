# エンカウントテーブル スクレイピングスクリプト 仕様書

## 1. 概要

### 1.1 目的

pokebook.jp の静的 HTML テーブルから BW/BW2 のエンカウントデータを取得し、本リポジトリで利用可能な JSON ファイルとして出力する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| EncounterLocationsJson | バージョン・メソッド単位の出力 JSON スキーマ |
| EncounterSlotJson | 1 スロット分のデータ (speciesId, rate, levelRange + 拡張フィールド) |
| メソッド | エンカウント種別: Normal, ShakingGrass, DustCloud, Surfing, SurfingBubble, Fishing, FishingBubble |
| バージョン | B, W, B2, W2 |
| species-ja.json | 日本語種族名 → speciesId のマッピングファイル |
| gen5-species.json | PokeAPI から取得済みの全 649 種族データ |
| suffixRules | 同一ロケーション名の重複行を区別するためのサフィックス定義 |

### 1.3 背景・問題

- 本リポジトリの WASM は `EncounterSlotConfig[]` を入力として受け取る設計だが、そのデータソースが存在しない
- リファレンス (pokemon-gen5-initseed) にスクレイピングスクリプトが存在するため、これを移植・拡張する
- 本リポジトリの `EncounterSlotConfig` は `gender_ratio`, `has_held_item`, `shiny_locked` を含むため、出力 JSON にもこれらを埋め込む

### 1.4 期待効果

| 指標 | 値 |
|------|-----|
| 出力 JSON ファイル数 | 28 (4 バージョン x 7 メソッド) |
| スロット合計 | 全ロケーション x 各メソッドのスロット数 |
| 手動データ入力 | 不要 (自動取得) |

### 1.5 着手条件

- `gen5-species.json` が存在すること (既に `spec/agent/completed/local_029/` に配置済み)
- Node.js 実行環境があること
- `cheerio` パッケージが利用可能であること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `scripts/scrape-encounters.js` | 新規 | スクレイピングスクリプト本体 |
| `src/data/encounters/aliases/species-ja.json` | 新規 | 日本語種族名 → speciesId マッピング |
| `src/data/encounters/generated/v1/{version}/{method}.json` | 新規 (自動生成) | スクレイピング結果の JSON |
| `package.json` | 修正 | `cheerio` を devDependencies に追加、`scrape:encounters` スクリプト追加 |

---

## 3. 設計方針

### 3.1 リファレンスからの移植方針

リファレンスの `scripts/scrape-encounters.js` をベースにし、以下を変更する:

1. **種名解決**: リファレンスは `pokemon-species.ts` からパース。本リポジトリでは `gen5-species.json` から日本語名 → ID マッピングを生成し `species-ja.json` に永続化する
2. **出力スキーマ拡張**: `EncounterSlotJson` に `genderRatio`, `hasHeldItem` フィールドを追加。`gen5-species.json` から性別比・所持アイテム情報を参照して埋め込む
3. **表示名辞書**: リファレンスの i18n display-names 辞書は移植しない。本リポジトリは lingui ベースの i18n を使用するため、ロケーション名は別途対応する
4. **ESM**: `import` 構文を使用 (既存スクリプトに準拠)

### 3.2 スクレイピング対象

| バージョン | URL パターン |
|------------|-------------|
| B | `https://pokebook.jp/data/sp5/enc_b` |
| W | `https://pokebook.jp/data/sp5/enc_w` |
| B2 | `https://pokebook.jp/data/sp5/enc_b2` |
| W2 | `https://pokebook.jp/data/sp5/enc_w2` |

各 URL は全メソッド共通 (同一ページ内にセクション分割)。

### 3.3 スロット率プリセット

| メソッド | スロット数 | 確率配分 (%) |
|----------|-----------|-------------|
| Normal | 12 | [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1] |
| ShakingGrass | 12 | [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1] |
| DustCloud | 12 | [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1] |
| Surfing | 5 | [60, 30, 5, 4, 1] |
| SurfingBubble | 5 | [60, 30, 5, 4, 1] |
| Fishing | 5 | [60, 30, 5, 4, 1] |
| FishingBubble | 5 | [60, 30, 5, 4, 1] |

### 3.4 ロケーション重複解決

pokebook.jp では同一ロケーション名で複数の行 (エリア区分) が存在する場合がある。
リファレンスと同一の `DUPLICATE_SUFFIX_RULES` を移植し、BW / BW2 それぞれのルールセットで解決する。

- `plan === undefined`: 全行をマージ
- `plan === null`: 行が同一と見なし、最初のバリアントを採用
- `plan === string[]`: ユニーク行にサフィックスを付与して分離

### 3.5 HTML パース戦略

| 対象 | パーサー | 行フォーマット |
|------|---------|---------------|
| Normal / ShakingGrass / DustCloud | `parseWideRowIntoSlots` | 1行 = ロケーション名 + 12 セル (名前(Lv)) |
| Surfing / SurfingBubble / Fishing / FishingBubble | `parseWaterRowSlots` | ロケーション行 + 4 連続行 (各メソッド 5 セル) |

ShakingGrass と DustCloud は同一セクション内に混在するため `rowLooksLikeDust` で判別する。

---

## 4. 実装仕様

### 4.1 出力スキーマ

```typescript
interface EncounterLocationsJson {
  version: 'B' | 'W' | 'B2' | 'W2';
  method: string;
  source: { name: string; url: string; retrievedAt: string };
  locations: Record<string, {
    displayNameKey: string;
    slots: EncounterSlotJson[];
  }>;
}

interface EncounterSlotJson {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
  genderRatio: string;   // GenderRatio enum 名 (例: "F1M1", "MaleOnly")
  hasHeldItem: boolean;   // 該当バージョンで所持アイテムあり
}
```

### 4.2 species-ja.json 生成

`gen5-species.json` の日本語名をキーとし speciesId を値とする JSON を生成する。
スクリプト初回実行時に自動生成し、`src/data/encounters/aliases/species-ja.json` に保存する。

```json
{
  "フシギダネ": 1,
  "フシギソウ": 2,
  "フシギバナ": 3
}
```

### 4.3 genderRatio 解決

`gen5-species.json` の `gender` フィールドから WASM 側 `GenderRatio` enum 名に変換する。

| gender.type | gender.femaleThreshold | GenderRatio |
|-------------|----------------------|-------------|
| genderless | - | Genderless |
| male-only / fixed=male | - | MaleOnly |
| female-only / fixed=female | - | FemaleOnly |
| ratio | 32 | F1M7 |
| ratio | 64 | F1M3 |
| ratio | 128 | F1M1 |
| ratio | 192 | F3M1 |

### 4.4 hasHeldItem 解決

`gen5-species.json` の `heldItems` フィールドからバージョンを参照する。
バージョンキーの対応: B→black, W→white, B2→black-2, W2→white-2。
該当バージョンの配列が空でなければ `true`。

### 4.5 コマンドライン引数

```powershell
node scripts/scrape-encounters.js
node scripts/scrape-encounters.js --version=B --method=Normal
node scripts/scrape-encounters.js --version=B2 --url=https://example.com/test
```

| 引数 | 既定値 | 説明 |
|------|--------|------|
| `--version` | 全バージョン | 特定バージョンのみ実行 |
| `--method` | 全メソッド | 特定メソッドのみ実行 |
| `--url` | SOURCE_MAP 参照 | URL を手動指定 (テスト用) |

### 4.6 主要関数一覧

| 関数 | 責務 |
|------|------|
| `main()` | エントリーポイント。全 version x method を巡回 |
| `scrapeVersionMethod(version, method, url?)` | 1 バージョン x 1 メソッドのスクレイピング実行 |
| `parseEncounterPage(html, opts)` | HTML → EncounterLocationsJson 変換のルーター |
| `parseWaterEncounterPage(html, opts)` | 水系メソッド用パーサー |
| `parseWideRowIntoSlots($, tr, method, aliasJa, speciesData, version)` | 12 枠行のパース |
| `parseWaterRowSlots($, tr, method, aliasJa, speciesData, version)` | 5 枠行のパース |
| `findSectionTables($, method)` | HTML の見出しからセクションテーブルを抽出 |
| `resolveLocationGroup(baseName, rows, opts)` | 同一ロケーション名の重複解決 |
| `loadSpeciesAliasJa()` | species-ja.json をロード |
| `generateSpeciesAliasJa()` | gen5-species.json から species-ja.json を生成 |
| `resolveGenderRatio(speciesData, speciesId)` | speciesId → GenderRatio 文字列 |
| `resolveHasHeldItem(speciesData, speciesId, version)` | speciesId + version → boolean |

---

## 5. テスト方針

スクレイピングスクリプトは開発時のデータ取得ツールであり、本番バンドルに含まれない。
テストは以下の方法で担保する。

### 5.1 手動検証

1. 生成された JSON ファイル数が 28 であることを確認
2. 各 JSON の `locations` が空でないことを確認
3. サンプルロケーション (例: B版 1番道路 Normal) のスロット数が 12 であることを確認
4. `genderRatio`, `hasHeldItem` フィールドが正しく埋め込まれていることを確認

### 5.2 スクリプト内検証

- 未知の日本語種族名は `MISSING_SPECIES` セットに収集し、実行終了時に警告出力
- スロット率の合計が 100% であることのアサーション (Normal=12 枠で合計 100)

---

## 6. 実装チェックリスト

- [ ] `cheerio` を devDependencies に追加
- [ ] `species-ja.json` 生成ロジック実装
- [ ] `scripts/scrape-encounters.js` 実装
  - [ ] SOURCE_MAP 定義
  - [ ] SLOT_RATE_PRESETS 定義
  - [ ] DUPLICATE_SUFFIX_RULES (BW / B2W2) 定義
  - [ ] HTML パーサー (Normal 系 / Water 系)
  - [ ] genderRatio 解決
  - [ ] hasHeldItem 解決
  - [ ] ロケーション重複解決
  - [ ] CLI 引数パース
- [ ] 全 28 ファイルの生成確認
- [ ] サンプルデータの目視検証
- [ ] `package.json` に `scrape:encounters` スクリプト追加
