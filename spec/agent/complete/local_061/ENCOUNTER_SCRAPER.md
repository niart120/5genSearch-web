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
| speciesAliasJa | 日本語種族名 → speciesId のインメモリマッピング (スクレイパー実行時に `gen5-species.json` から構築) |
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

- `gen5-species.json` が存在すること (既に `spec/agent/complete/local_029/` に配置済み)
- Node.js 実行環境があること
- `cheerio` パッケージが利用可能であること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `scripts/scrape-encounters.js` | 新規 | スクレイピングスクリプト本体 |
| (インメモリ) speciesAliasJa | - | 日本語種族名 → speciesId マッピング。ファイル永続化せずスクレイパー実行時に構築 |
| `src/data/encounters/generated/v1/{version}/{method}.json` | 新規 (自動生成) | スクレイピング結果の JSON |
| `package.json` | 修正 | `cheerio` を devDependencies に追加、`scrape:encounters` スクリプト追加 |

---

## 3. 設計方針

### 3.1 リファレンスからの移植方針

リファレンスの `scripts/scrape-encounters.js` をベースにし、以下を変更する:

1. **種名解決**: リファレンスは `pokemon-species.ts` からパース。本リポジトリでは `gen5-species.json` から日本語名 → ID マッピングをインメモリで構築する (`buildSpeciesAliasJa()`)
2. **出力スキーマ拡張**: `EncounterSlotJson` に `genderRatio`, `hasHeldItem` フィールドを追加。`gen5-species.json` から性別比・所持アイテム情報を参照して埋め込む
3. **表示名辞書**: ロケーション名・メソッド名の日本語/英語辞書を `src/lib/game-data-names.ts` に `ENCOUNTER_LOCATION_NAMES` / `ENCOUNTER_METHOD_NAMES` として配置。生成 JSON 内の `displayNameKey` (正規化キー) から `getEncounterLocationName(key, locale)` で引く。Lingui ではなく辞書方式を採用した理由は Section 7.5 を参照
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

ShakingGrass と DustCloud は pokebook.jp 上の「揺れる草むら, 土煙」セクション内に混在する。
屋外行 (タブンネ等) と洞窟行 (モグリュー/ドリュウズ) が同一テーブルに含まれるため、
パース後にスロット内の種族 ID で判別する (`isDustCloudRow`)。

判定基準: `DUST_CLOUD_SPECIES = new Set([529, 530])` — モグリュー (#529) またはドリュウズ (#530) が
スロットに 1 体でも含まれていれば DustCloud 行、含まれなければ ShakingGrass 行とする。
Gen 5 の仕様上、洞窟の土煙エンカウントはこの 2 種専用であり、屋外の揺れる草むらには出現しないため信頼性が高い。

---

## 4. 実装仕様

### 4.1 出力スキーマ

```typescript
interface EncounterLocationsJson {
  version: 'B' | 'W' | 'B2' | 'W2';
  method: string;
  source: { name: string; url: string; retrievedAt: string };
  locations: Record<string, {
    slots: EncounterSlotJson[];
  }>;
}

interface EncounterSlotJson {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
  genderRatio: GenderRatio;  // WASM 由来の GenderRatio 型 (例: "F1M1", "MaleOnly")
  hasHeldItem: boolean;      // 該当バージョンで所持アイテムあり
}
```

### 4.2 speciesAliasJa 構築

`gen5-species.json` の日本語名をキーとし speciesId を値とするマッピングをインメモリで構築する (`buildSpeciesAliasJa()`)。ファイルには永続化しない。

```javascript
// 実行時のメモリ上の構造
{ "フシギダネ": 1, "フシギソウ": 2, "フシギバナ": 3, ... }
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
| `isDustCloudRow(parsedSlots)` | スロット内の種族 ID で DustCloud 行か判定 |
| `resolveLocationGroup(baseName, rows, opts)` | 同一ロケーション名の重複解決 |
| `buildSpeciesAliasJa()` | gen5-species.json からインメモリマッピングを構築 |
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

- [x] `cheerio` を devDependencies に追加
- [x] `species-ja.json` 生成ロジック実装
- [x] `scripts/scrape-encounters.js` 実装
  - [x] SOURCE_MAP 定義
  - [x] SLOT_RATE_PRESETS 定義
  - [x] DUPLICATE_SUFFIX_RULES (BW / B2W2) 定義
  - [x] HTML パーサー (Normal 系 / Water 系)
  - [x] genderRatio 解決
  - [x] hasHeldItem 解決
  - [x] ロケーション重複解決
  - [x] CLI 引数パース
  - [x] DustCloud 判定 (種族 ID ベース: isDustCloudRow)
- [x] 全 28 ファイルの生成確認
- [x] サンプルデータの目視検証
- [x] `package.json` に `scrape:encounters` スクリプト追加

---

## 7. 実装後の補足事項

### 7.1 DustCloud 判定方式の変更

当初の設計では `rowLooksLikeDust` (テーブル行内のアイテムテキストで判定) を想定していたが、pokebook.jp の HTML 構造上、アイテム情報はテーブルに含まれていなかった。

最終実装では `isDustCloudRow(parsedSlots)` を採用。パース済みスロットの `speciesId` でモグリュー (#529) / ドリュウズ (#530) の存在を判定する方式に変更した。Gen 5 の仕様上、洞窟の土煙エンカウントはこの 2 種専用であるため、誤判定のリスクは低い。

### 7.2 `normalizeLocationKey` の同期

スクレイパー側の `normalizeLocationKey()` (JS) とランタイム側 `src/data/encounters/loader.ts` の `normalizeLocationKey()` (TS) は同一ロジックである必要がある。空白・全角スペース・ハイフン系記号を除去し、アンダースコアは保持する。スクレイパー側には `// Keep in sync with src/data/encounters/loader.ts normalizeLocationKey` コメントで同期の必要性を明示している。

JSON の `locations` オブジェクトキーには ASCII snake_case キー (例: `route_6_spring`) を使用する。スクレイパーは `JA_TO_ASCII_KEY` マッピングにより正規化済み日本語キーを ASCII キーに変換する。

### 7.3 バスラオのフォーム (FORM_ALIASES)

pokebook.jp では「バスラオ赤」「バスラオ青」と表記されるが、Gen 5 ではフォームはバージョン固定 (B/B2=赤縞、W/W2=青縞) であり乱数消費に影響しない。現状は両方とも `speciesId: 550` に正規化しておりフォーム情報は保持していない。UI でフォーム表示が必要になった場合は `EncounterSlotJson` への `formId` 追加が必要。

### 7.4 水系メソッドの重複排除

水系 (Surfing/SurfingBubble/Fishing/FishingBubble) のテーブルでは同一ロケーション名で複数の行 (季節・階層別) が並ぶ場合がある。`WATER_SINGLE_ROW_LOCATIONS` に登録されたロケーションは重複するスロット構成を自動排除する。シグネチャベースの重複判定 (`makeRowSignature`) を使用するため、スロット構成が異なる場合は保持される。

### 7.5 i18n 表示名辞書の方式

ロケーション名 (127 件) とメソッド名 (7 件) の日本語/英語辞書を `src/lib/game-data-names.ts` に配置する。

| 定数 / 関数 | 用途 |
|------------|------|
| `ENCOUNTER_LOCATION_NAMES` | `Record<string, Record<SupportedLocale, string>>` — 正規化キー → ロケール別名称 |
| `getEncounterLocationName(key, locale)` | 辞書引き。キー未登録時は生キーをフォールバック |
| `ENCOUNTER_METHOD_NAMES` | `Record<string, Record<SupportedLocale, string>>` — メソッドキー → ロケール別名称 |
| `getEncounterMethodName(method, locale)` | 辞書引き。キー未登録時は生キーをフォールバック |

Lingui を使わず辞書方式とした理由:

- ロケーション名はソースコード中の UI 文字列ではなくスクレイパーが生成するデータ由来
- Lingui の `extract` は動的キーを検出できず、PO ファイルから自動削除される
- `game-data-names.ts` に既存の NatureName/HiddenPowerName 等と同一パターンで配置でき、プロジェクト全体の一貫性が保たれる
- 参照実装 (niart120/pokemon-gen5-initseed) も同じ辞書方式を採用
