# 配達員カードの収集・JSON 生成 仕様書

## 1. 概要

### 1.1 目的

Project Pokémon の配布カードから、このアプリが読み込む配達員カード定義を生成する開発用スクリプトを追加する。[local_124](../../complete/local_124/WONDER_CARD_INTEGRATION.md) の `WonderCardCatalogJson` を見直し、言語別配置、対象ソフトの指定、表示名の材料、収録単位を定める。

本書の対象を 2026-09-10 に実装・検証した。固定コミットの全709件を分類し、7言語の700定義を生成した。収録数・除外理由・検証結果は 5.3 に記録する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 元カード | 固定した上流コミットに収録された第 5 世代の `.pgf` ファイル |
| カード定義 | 元カードから抽出した生成条件と、選択・表示に必要な情報 |
| 対象言語 | カードを受け取る ROM の言語。アプリ表示言語・個体言語とは別の情報 |
| 収録設定 | 取得元・固定コミット・例外・除外理由を管理するスクリプト側の設定 |

### 1.3 背景・問題

着手前の `src/data/wondercards/data/v1/pokefinder.json` は、PokeFinder のテストから転記した 3 件を製品側ローダーで読み込んでいた。収集・再生成する処理はなく、対象言語も管理していなかった。

従来の `source` は各 JSON に取得元を持たせていたが、自動生成するデータでは取得元と変換規則を収録設定・本仕様書で管理する。`displayName: { ja, en }` もカードごとの翻訳を要求するため、元カードのカードタイトルと、既存の種族名データから表示を組み立てる方式へ変更した。

### 1.4 期待効果

| 項目 | 期待効果 |
|------|----------|
| 再生成 | 同じ上流コミット・収録設定から同じ JSON ファイル群を生成できる |
| 配置 | 7 言語をフォルダで分け、対象ソフトによるカード定義の複製を避ける |
| 識別 | TID / SID や固定条件の異なる配布を保持し、表示名の重複と ID の重複を分けて扱う |

### 1.5 着手条件・対象範囲

`local_124` のカード変換と WASM 構築経路を利用する。収録用スクリプトによる `.pgf` の解析は本書の対象であり、アプリ実行時の入力は引き続き同梱 JSON とする。

対象は収録処理、カード型、ローダー、表示名を組み立てる純粋関数、関連テスト。画面、永続化、Worker、Rust の生成アルゴリズムは変更しない。エンカウント JSON の `source` は別契約のため、本作業で削除しない。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `scripts/collect-wondercards.js` | 新規 | CLI、取得、変換の実行、検証、JSON の更新・差分確認 |
| `scripts/wondercards/collection.js` | 新規 | 固定入力の取得・検証、生成・集計、差分確認、更新失敗時の復元 |
| `scripts/wondercards/config.js` | 新規 | 上流コミット、言語対応、根拠付きの例外・除外設定 |
| `scripts/wondercards/pgf.js` | 新規 | バイナリの読み取りとカード定義への変換。ネットワーク・ファイル書き込みは行わない |
| `scripts/wondercards/*.test.js` | 新規 | Node.js 標準テストによる解析・再生成・更新失敗の検証 |
| `scripts/wondercards/fixtures/` | 新規 | オフラインで検証できる解析用入力と独立した期待値 |
| `package.json` | 変更 | 収集コマンドとスクリプトのテストコマンド |
| `.github/workflows/ci.yml` | 変更 | オフラインの収集テストを CI へ追加 |
| `.oxfmtrc.json` | 変更 | 固定形式で出力する生成 JSON を oxfmt の対象外にする |
| `src/data/wondercards/schema.ts` | 変更 | `source`・`displayName` の廃止、表示材料、対象言語、1 定義単位の型 |
| `src/data/wondercards/generated/v1/<language>/<id>.json` | 新規 | 生成済みの製品用カード定義 |
| `src/data/wondercards/data/v1/pokefinder.json` | 移動・変更 | 製品カタログから外し、必要な検証例をテスト用に保持 |
| `src/test/fixtures/wondercards/` | 新規 | PokeFinder 由来 3 件の生成条件・期待値を保持 |
| `src/data/wondercards/loader.ts` | 変更 | 言語別読み込み、新形式の検証・正規化 |
| `src/data/wondercards/display.ts` | 新規 | 種族名・カードタイトルから選択候補の表示を組み立て、重複時の補助情報を返す |
| `src/data/wondercards/converter.ts` | 確認 | 新しい型でも変換処理をそのまま利用。WASM へ渡す生成条件の契約は維持 |
| `src/test/unit/wondercard-data.test.ts` | 変更 | 新形式・言語・対象ソフト・表示名の検証 |
| `src/test/unit/wondercard-display.test.ts` | 新規 | 基本表示、重複時の TID・内部 ID、入力を変更しないことを検証 |
| `src/test/integration/wondercard-worker.test.ts` | 変更 | 全収録カードの構築確認と、固定期待値のカタログ依存を分離 |
| `src/data/wondercards/README.md` | 変更 | 生成手順・表示規則・本仕様書への参照 |
| `spec/agent/architecture/frontend-structure.md` | 変更 | 実装時に生成データと表示関数の配置を反映 |

## 3. 設計方針

### 3.1 収録単位と配置

言語フォルダの下に 1 カード定義を 1 ファイルで置く。バージョン別フォルダは設けず、同じ定義が対応するソフトを `versions` に列挙する。TID / SID、種族、レベル、固定条件が異なる定義は統合しない。

```text
src/data/wondercards/generated/v1/
├── ja/
├── en/
├── fr/
├── de/
├── it/
├── es/
└── ko/
```

この配置は `src/data/encounters/generated/v1/` の生成物管理に揃える。上流に別ファイルとして存在するカードは、名前や生成条件が似ているという理由で自動的に統合しない。同じカードに複数ソフトが指定されている場合だけ、一つの `versions` に保持する。

### 3.2 取得元の管理

取得先と固定コミットは `scripts/wondercards/config.js`、値の対応は本書と解析処理で管理する。生成 JSON には `source`、取得日時、元ファイル URL、コミット、ハッシュを埋め込まない。出典用の別 JSON をアプリへ同梱することもしない。

例外の対象は上流の相対パスで指定し、修正内容・理由・確認先を収録設定の該当箇所に残す。これを通常の取得元記録の代わりとなる全件手書き台帳にはしない。

### 3.3 合意事項と表示名

言語別フォルダ、対象ソフトを `versions` に保持すること、`source` を生成側へ移すこと、TID / SID の異なる配布を別定義にすることは、本書の前提とする。

翻訳済み `displayName` を廃止し、通常配布・配布タマゴともに「種族名（cardTitle）」を基本表示とする。表示規則と重複時の区別は 4.5 に定める。`otName` は生成条件にも使わないためカード型へ追加しない。

## 4. 実装仕様

### 4.1 取得対象と固定リビジョン

取得元は https://github.com/projectpokemon/EventsGallery 。初期参照コミットは `154d81be88453f6f78ec1d6d86e85fe0f2f5c240` とする。2026-09-10 に GitHub API で確認した値であり、実行時に `master` の最新値へ自動更新しない。

| 用途 | 対象 |
|------|------|
| 自動取得 | `Released/Gen 5/Wondercards/<upstream-language>/*.pgf` |
| 配布情報の確認 | https://projectpokemon.org/home/files/category/4-generation-5/ |
| 言語別配布・対象ソフトの照合 | https://bulbapedia.bulbagarden.net/wiki/Category:Generation_V_event_distributions |
| 受信条件の補足資料 | `Released/Gen 5/Wondercard Fulls/` と Project Pokémon の完全版カード構造資料 |

初期の自動入力は `.pgf` とし、完全版カードは独立した重複カタログとして取り込まない。Bulbapedia・配布説明ページの巡回取得は初期実装に含めず、命名規則で判定できない例外を確認する資料に使う。

対象ディレクトリのカードをすべて列挙し、カード種別がポケモンのものを収録候補とする。配布タマゴを含め、アイテム・パワー、`Unreleased`、Dream World 等の別経路は含めない。収録候補のうち現行生成条件で表現できないものは、理由を明示して扱う。単に読み取りや検証に失敗したファイルを対象外として隠さない。

### 4.2 言語・対象ソフトの決定

| 上流フォルダ | 出力言語 | 既存 `RomRegion` からの対応 |
|--------------|----------|--------------------------------|
| `JPN` | `ja` | `Jpn` |
| `ENG` | `en` | `Usa` |
| `FRE` | `fr` | `Fra` |
| `GER` | `de` | `Ger` |
| `ITA` | `it` | `Ita` |
| `SPA` | `es` | `Spa` |
| `KOR` | `ko` | `Kor` |

上流フォルダを分類の初期値とし、受取対象の言語と食い違うことが判明した場合は根拠付きの例外で補正する。`.pgf` の個体言語欄を受取対象言語の判定に使わない。完全版カードでは受信可能言語が別の欄にある。アプリ表示言語によって対象フォルダを変更しない。

対象ソフトは上流ファイル名にある独立したソフト指定トークンを読む。

| トークン | `versions` |
|----------|------------|
| `B` / `W` / `B2` / `W2` | 対応する 1 ソフト |
| `BW` | `Black`, `White` |
| `B2W2` | `Black2`, `White2` |
| `BWB2W2` | `Black`, `White`, `Black2`, `White2` |

`B2W2` の部分文字列を `BW` と解釈するような曖昧な一致は使わない。ファイル名に指定がない、未知の表記、配布資料と矛盾する場合は例外設定が必要。カードの入手先ゲームを表す欄を受取対象ソフトと解釈したり、すべてのソフトへ適合すると推定したりしない。

### 4.3 ID とファイル名

`id` は出力言語と元ファイル名の拡張子を除いた部分から決定する。元ファイル名は NFC 正規化、英字の小文字化、文字・数字以外の連続部分のハイフン化、先頭末尾のハイフン除去を行う。Unicode の文字・数字は保持する。

例: `ENG/0129 BWB2W2 - SPR2013 Meloetta (ENG).pgf` は `en-0129-bwb2w2-spr2013-meloetta-eng`。出力は `en/en-0129-bwb2w2-spr2013-meloetta-eng.json` となる。

これは識別子の作成規則であり、基本表示には使わない。同じカード番号、種族名、カードタイトル、TID の一致だけでは統合しない。正規化後に ID が衝突した場合は生成を失敗させ、収録設定の明示 ID で解消する。列挙順による連番は付けない。上流のファイル名変更で既存 ID が変わる場合も、明示 ID によって維持する。

### 4.4 `WonderCardCatalogJson` の変更

`source` と `displayName` を削除する。`entries` の包みは残し、生成ファイルは必ず 1 要素とする。カードタイトルは原文のまま `cardTitle` に保持し、翻訳済みの種族名を重複して保存しない。`otName` は追加しない。

以下は実装した型の契約。`RomVersion`、`Nature`、`Gender`、`AbilitySlot`、`TrainerInfo`、`WonderCardShinyPolicy` は従来と同じ WASM 型を参照する。

```typescript
export type WonderCardLanguage = 'ja' | 'en' | 'fr' | 'de' | 'it' | 'es' | 'ko';

export type FixedIvsJson = Partial<
  Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>
>;

interface WonderCardCommon {
  id: string;
  cardTitle: string;
  versions: RomVersion[];
  speciesId: number;
  level: number;
  fixedIvs: FixedIvsJson;
  fixedNature?: Nature;
  fixedGender?: Exclude<Gender, 'Genderless'>;
  fixedAbilitySlot?: AbilitySlot;
  shinyPolicy: WonderCardShinyPolicy;
}

type WonderCardKind =
  | { kind: 'pokemon'; trainer: TrainerInfo }
  | { kind: 'egg'; trainer?: never };

export type WonderCardEntry = WonderCardCommon & WonderCardKind & {
  language: WonderCardLanguage;
};

export type WonderCardEntryJson = Omit<
  WonderCardCommon,
  'fixedIvs' | 'fixedNature' | 'fixedGender' | 'fixedAbilitySlot'
> & {
  fixedIvs: Partial<Record<keyof FixedIvsJson, number | null>>;
  fixedNature?: Nature | null;
  fixedGender?: Exclude<Gender, 'Genderless'> | null;
  fixedAbilitySlot?: AbilitySlot | null;
} & WonderCardKind;

export interface WonderCardCatalogJson {
  entries: [WonderCardEntryJson];
}
```

`language` はローダーがフォルダ名から付与し、JSON 内には重複して書かない。配布タマゴには配布元の `trainer` を保存しない。受取人の現在値も定義や表示名に書き込まない。

生成 JSON の未指定値はプロパティの省略で表す。`fixedIvs` 自体は必須で、全能力が未固定なら `{}`。`0` は固定値として保持する。ローダーの JSON 境界では従来どおり `null` を `undefined` に正規化するが、生成スクリプトは `null` を出力しない。

固定コミットの SPR2013 メロエッタから得る出力例:

```json
{
  "entries": [
    {
      "id": "en-0129-bwb2w2-spr2013-meloetta-eng",
      "cardTitle": "The Mythical Pokémon Meloetta!",
      "versions": ["Black", "White", "Black2", "White2"],
      "kind": "pokemon",
      "trainer": { "tid": 3013, "sid": 0 },
      "speciesId": 648,
      "level": 50,
      "fixedIvs": {},
      "fixedAbilitySlot": "First",
      "shinyPolicy": "Never"
    }
  ]
}
```

### 4.5 表示名の組み立て

基本表示は通常配布・配布タマゴともに「種族名（cardTitle）」とする。種族名は既存の `get_species_name()` でアプリの表示言語に合わせ、カードタイトルは原文のまま表示する。配布区分は引き続き `kind` で保持する。

| 区分 | 日本語 UI での表示例 |
|------|----------------------|
| 通常配布 | `メロエッタ（The Mythical Pokémon Meloetta!）` |
| 配布タマゴ | `マメパト（A Secret Egg!）` |

基本表示が重複する場合は、選択候補の補助情報で区別する。通常配布には `TID: 03013` の形式で TID を 5 桁ゼロ埋めして返す。それでも区別できない候補と、重複した配布タマゴには内部 ID も補助情報として返す。基本表示の形式は共通のままとし、受取人の TID / SID を区別に使わない。これらは選択候補の配列に対する純粋な表示処理とし、JSON に `displayName` を書き戻さない。補助情報の画面上の配置は画面実装時に決める。

一意性を保証するのは `id`。表示名の一致を定義の統合条件に使わない。内部 ID の補助表示が必要な例は収録確認時に報告し、画面実装時に表示方法を確認する。

`getWonderCardDisplays(cards, locale)` は `id` と `label`、必要な場合だけ `trainerLabel` と `disambiguationId` を返す。`locale` はアプリ表示言語で、カードの `language` とは独立して扱う。

### 4.6 元カードから生成条件への変換

通常の `.pgf` は `0xCC` bytes。サイズの異なるファイルを切り詰めて解釈しない。複数 byte の整数は little endian で読む。カード種別、列挙値、数値範囲を検査してから出力する。

| 元カードの項目 | 出力・処理 |
|----------------|------------|
| `0xB3` カード種別、`0x5C` タマゴフラグ | ポケモン種別だけを候補にし、タマゴフラグ `0` / `1` を `pokemon` / `egg` に対応させる |
| `0x00` TID、`0x02` SID | 通常配布の `trainer`。各 `u16`、`0` も有効。タマゴでは出力しない |
| `0x1A` 種族、`0x5B` レベル | `speciesId`、`level`。範囲は現行の `1..649`、`1..100` |
| `0x08..0x0B` PID、`0x1C` フォーム | 非ゼロ値は非対応として失敗。除外には根拠付きの相対パス設定を必要とする |
| `0x34` 性格 | `0..24` を WASM の性格名へ対応させる。`0xFF` は省略 |
| `0x35` 性別 | `0` = `Male`、`1` = `Female`、`2` = 固定なし。その他は未対応として扱う |
| `0x36` 特性 | `0` = `First`、`1` = `Second`、`2` = `Hidden`、`3` = 固定なし。隠れ特性を含むランダム指定 `4` は現行型で表現できない |
| `0x37` 色違い条件 | `0` = `Never`、`1` = `Random`、`2` = `Always` |
| 固定個体値 | `hp=0x43`、`atk=0x44`、`def=0x45`、`spa=0x47`、`spd=0x48`、`spe=0x46`。`0..31` を保持し `0xFF` は省略 |
| `0x4A..0x59` 親名 | 生成条件・表示に使用しないため JSON に出力しない |
| `0x60..0xA9` カードタイトル | `cardTitle` |

固定個体値は元カードの byte 順と H/A/B/C/D/S 順が異なる。PokeFinder の `PGF` コンストラクターでもこの並び替えを確認した。配列をそのままコピーしない。

カードタイトルは第 5 世代の文字コードを考慮して復号し、`0xFFFF` / `0x0000` 終端以後の埋め草を除去する。終端を除く内容は保持し、大文字・小文字、全角・半角、記号を一律変換しない。専用性別文字 `0x246D` / `0x246E` は `♂` / `♀` に復号する。終端と専用性別文字は PKHeX の `StringConverter5` と `StringConverter4Util` に照合し、人工入力で検証する。制御文字、サロゲート、未解決の私用領域、非文字、代替文字は失敗させる。空のタイトルも検証エラーにし、親名や元ファイル名で補完しない。

PID 固定指定、ランダムレベル、未対応フォーム等、現行のカード型・生成処理で表現できない条件は推測して省略しない。対象外にする場合は相対パスと理由を収録設定に明記し、集計する。未知の値・不正な値の新規検出は失敗とする。既知の非対応値を一律処理する場合も、値の意味と除外規則を設定・コードに明示する。

### 4.7 CLI と再生成

既存の収集処理と同じ Node.js の ESM スクリプトとし、Node.js 24 以上で動作させる。初期実装は標準の `fetch`、ファイル操作、テスト機能を利用する。

```powershell
# 固定コミットから全言語を取得して生成
pnpm collect:wondercards

# 日本語だけを再生成
pnpm collect:wondercards --language=ja

# ファイルを書き換えず、生成結果とコミット済み JSON の一致を確認
pnpm collect:wondercards --check

# 固定コミットへ checkout 済みの取得元リポジトリを使う
pnpm collect:wondercards --input-dir=C:\work\EventsGallery --check

# 収集処理・解析処理のオフラインテスト
pnpm test:wondercards
```

`collect:wondercards` は `node scripts/collect-wondercards.js`、`test:wondercards` は `node --test scripts/wondercards/*.test.js` を実行する。後者は CI でもネットワークに接続せず実行する。

`--language` は定義済み 7 言語の一つを指定でき、省略時はすべて。`--input-dir` 指定時はネットワークを使わず、Git の HEAD が固定コミットと一致し、取得対象の追跡ファイルに変更がないことを確認する。未追跡ファイルは取得対象に含めない。未知のオプション・無効な言語は開始前にエラーにする。

ネットワーク取得は固定 SHA のファイル一覧から対象を抽出し、同じ SHA の内容を取得する。HTTP 失敗・不完全なファイル一覧・欠損を検出した場合は失敗とする。対象カードの全取得・解析・検証が終わるまで既存出力を書き換えない。

一覧の `truncated: false`、固定リビジョンで確認した言語別件数、相対パス、ファイル種別、全ファイルの Git blob ハッシュを検証する。ローカル入力も内容のハッシュを照合し、取得前後の追跡変更を確認する。`assume-unchanged` によって Git status に出ない変更もハッシュの不一致で検出する。

出力は UTF-8、LF、2 スペース、末尾改行あり。プロパティ順、`versions` の順、ファイル列挙順を固定し、現在時刻や取得順に依存させない。`versions` は `Black`, `White`, `Black2`, `White2` の順とする。

書き込みは検証済みの一時出力を用意してから反映する。反映時の失敗でも既存カタログを復元できるようにし、一部だけ更新された状態を成功としない。削除する古い生成物も選択言語の管理対象 JSON に限定する。出力先は repo 内の `generated/v1/` に固定し、他の言語・手書きソース・テスト用データを削除しない。

`generated/.wondercards-update/` に新規出力と旧 JSON を退避し、同時実行を拒否する。反映に失敗したら新規反映分を取り除き旧 JSON を戻す。復元自体が失敗した場合は退避データを残し、復旧先のパスをエラーに含める。強制終了後の自動復旧は行わず、退避データを確認して復旧する。生成 JSON は固定形式を維持するため oxfmt の対象から外し、再生成との差分で検証する。

`--check` は追加・変更・削除予定の相対パスを報告し、差分がある場合は非ゼロで終了する。対象言語ごとの入力数・収録数・対象外数・理由別件数を、通常実行でも表示する。全言語未調査のまま「全配布を網羅」とは扱わない。

### 4.8 ローダー・変換関数への接続

ローダーは `./generated/v1/**/*.json` を読み、言語フォルダを検証する。新しい API は以下とする。

```typescript
export function loadWonderCards(
  language: WonderCardLanguage,
  version?: RomVersion
): Promise<WonderCardEntry[]>;

export function getWonderCard(
  id: string,
  language: WonderCardLanguage,
  version: RomVersion
): Promise<WonderCardEntry>;

export function getWonderCardLanguage(region: RomRegion): WonderCardLanguage;
```

言語別に遅延読み込み・キャッシュし、返す値は複製する。`getWonderCard()` は ID 不在・言語不一致・対象ソフト不一致をエラーにし、別カードへ置き換えない。全言語を横断した ID 一意性は生成時とテストで検証する。

ローダーの検証を `source`・`displayName` から、単一 `entries`、`id`、空でない `cardTitle`、言語フォルダ、空でない重複なしの `versions`、配布区分と `trainer` の整合性へ変更する。現行の数値条件は、生成時の検査に加えて既存 WASM の構築経路にも通す。

`toWonderCardParams()` は引き続き通常配布の ID と配布タマゴの受取人 ID を選び、個体値を六要素へ変換する。`language`・`cardTitle`・カード ID は WASM 入力へ追加しない。

PokeFinder 由来の固定期待値テストは製品カタログの収録数・先頭要素・旧 ID に依存させない。3 件の検証用定義を独立して保持し、製品カタログは別の全件検証へ切り替える。旧配置を新配置と並行して読み込む互換処理は追加しない。

## 5. テスト方針

### 5.1 確認する契約

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| バイナリ変換 | 固定した元カードと期待値 | 通常配布・タマゴ・固定個体値・固定性格・隠れ特性・色違い条件。個体値の素早さと特攻・特防を取り違えない |
| 未指定・境界 | センチネルと値域 | `0xFF` と固定値 `0`、TID / SID の `0`、未知の値、サイズ不正、未対応条件を区別する |
| 文字列 | カードタイトル | 日本語・英語・記号・終端・専用文字。不正な文字を黙って失わず、空のタイトルを拒否する |
| 言語・ソフト | フォルダと指定トークン | 7 言語、B/W/B2/W2 の単独指定と複数指定、例外、未知の指定、対象外選択の拒否 |
| 識別 | ID・別配布 | 同種族・同タイトル・異なる TID の両方を保持。正規化衝突を検出し、表示名では統合しない |
| JSON | 出力と読み込み | `source`・`displayName`・`otName`・重複した言語情報を出力しない。1 ファイル 1 定義、未指定の省略、キャッシュの編集防止 |
| 表示 | 通常配布・タマゴ・重複 | 両区分で「種族名（cardTitle）」、種族名の表示言語、タイトルの原文保持。重複時の TID の 5 桁表示・内部 ID による補助情報、受取人情報を使わないこと |
| 再生成 | 同一入力での複数回実行 | 同一 byte 列、`--check`、言語限定更新、古い生成物の削除、取得・解析・反映失敗時の既存出力保持 |
| 接続 | 全収録定義 | 各対象ソフトで `toWonderCardParams()` から WASM 構築・少量生成まで通る。タマゴはテスト用受取人を使用 |

収集テストは外部ネットワークに依存させない。実際の固定コミットからの取得・再生成確認と、保存済み入力によるオフラインテストを分ける。パーサー自身の出力をそのまま期待値にはせず、元カードの項目を独立に確認して固定する。

### 5.2 文書作成時点の確認

2026-09-10 に現在のカード型・ローダー・変換・関連テストと、既存のエンカウント収集スクリプトを確認した。上流コミットと第 5 世代カードの言語別配置、PokeFinder の個体値並び替えを確認した。

固定コミットの `ENG/0129 BWB2W2 - SPR2013 Meloetta (ENG).pgf` を読み、サイズ 204 bytes、TID `3013`、SID `0`、種族 `648`、レベル `50`、性格 `255`、性別 `2`、特性 `0`、色違い `0`、全個体値 `255`、カードタイトルを 4.4 の例と照合した。

同じ固定コミットのファイル名に `Egg` を含む 48 件（英語・日本語・韓国語）は、すべてタマゴフラグが `1` で、親名領域 `0x4A..0x59` は全バイト `0xFF` だった。英語のマメパトのタイトル `A Secret Egg!` も確認した。全カードの分類、例外の列挙、専用文字の網羅、生成スクリプトの動作確認は未実施。

上記は文書作成時点の確認記録で、実装後の結果を以下に示す。

### 5.3 実装・検証結果（2026-09-10）

固定コミットの対象フォルダにある `.pgf` 全709件を取得・分類した。ポケモン700件を収録し、カード種別2のアイテム9件を対象外とした。個別の補正・除外、ID衝突、非対応の生成条件、未解決のタイトル文字は検出されなかった。対象言語・ソフトは本書のフォルダ・独立トークン規則で判定した。配布説明ページの全件巡回・照合は行っていない。

| 言語 | 入力 | 収録 | タマゴ（収録の内数） | 対象外（アイテム） | 対象ソフトとの組み合わせ数 |
|------|------|------|----------------------|--------------------|----------------------------|
| ja | 472 | 469 | 30 | 3 | 1,082 |
| en | 37 | 36 | 3 | 1 | 92 |
| fr | 24 | 23 | 0 | 1 | 56 |
| de | 23 | 22 | 0 | 1 | 54 |
| it | 24 | 23 | 0 | 1 | 58 |
| es | 24 | 23 | 0 | 1 | 56 |
| ko | 105 | 104 | 15 | 1 | 232 |
| 合計 | 709 | 700 | 48 | 9 | 1,630 |

各言語の全候補を同時に表示した場合、内部 ID の補助表示が必要なのは ja 409件、en 4件、ko 48件。候補をソフトで絞るとこの件数も変わる。例は `en-0033-b-spr2012-zekrom-eng` と `en-0033-b-lw-spr2012-zekrom-eng`（同タイトル `Zekrom!`、同TID `03102`）、日本語の大学祭エレブー配布、韓国語の複数カード番号にまたがる御三家タマゴ。これらを統合せず、画面実装時の補助情報配置に引き継ぐ。

| 検証 | 結果 |
|------|------|
| `pnpm test:wondercards` | 60件成功。実カード5件の独立期待値、未指定・不正値・専用文字、固定Git入力、取得失敗、更新・復元失敗を検証 |
| `pnpm exec vitest run --project unit` | 117ファイル・1,462件成功（カードデータ12件・表示6件を含む） |
| `pnpm exec vitest run --project integration src/test/integration/wondercard-worker.test.ts` | 18件成功。全700定義・1,630組を対象に各4個体を生成し、固定個体値・性格・性別・特性・色違い条件を照合 |
| PokeFinder 由来3件 | 定義と期待値をテスト専用へ移動し、製品カタログの順番・件数・IDから独立してPID・個体値・実数値を照合。seed=0のBW起動43消費を基準に、マメパト・ゾロアークは絶対位置43..48、メロエッタは46..55で一致 |
| `pnpm collect:wondercards --check` | 固定コミットから再取得し、全700JSONがバイト単位で一致 |
| `--input-dir=<固定コミットのcheckout> --check` | 全言語と `--language=ja` の両方で差分なし。実際のローカル入力経路を確認 |
| `pnpm exec tsc -b --noEmit` | 成功 |
| `pnpm lint` / `pnpm format:check` | 成功（oxlint、Clippy、oxfmt、rustfmt） |
| `pnpm build` | WASM releaseビルド・最適化・TypeScript・Viteビルド成功 |

本番ビルドの初回は実行環境の wasm-pack キャッシュ書き込み権限で停止し、所有ユーザーの実行環境で再実行して成功した。既存UIテストの React act / Dialog Description 警告、Viteの500kB超チャンク警告は残るが、今回の検証はすべて成功した。実機照合と画面実装は対象外で、完了判定に含めない。

## 6. 実装チェックリスト

- [x] 収録単位・言語別配置・対象ソフト・出典管理を文書化する
- [x] カード型の変更と共通の表示名・重複時の区別方法を定義する
- [x] 固定コミットの全候補を分類し、対象ソフト・文字列・未対応条件の例外を確認する
- [x] 収集・解析・再生成・差分確認を実装する
- [x] 製品カタログを生成し、既存 3 件の検証データを分離する
- [x] カード型・ローダー・表示関数・関連テストを更新する
- [x] 全収録定義を WASM 構築へ通し、検証結果と構成資料を更新する

## 7. 関連資料

- [配達員の TS / WASM 接続](../../complete/local_124/WONDER_CARD_INTEGRATION.md)
- [配達員の一個体生成](../../complete/local_123/WONDER_CARD_GENERATION.md)
- [フロントエンド構成](../../architecture/frontend-structure.md)
- [Project Pokémon の固定コミット](https://github.com/projectpokemon/EventsGallery/tree/154d81be88453f6f78ec1d6d86e85fe0f2f5c240/Released/Gen%205/Wondercards)
- [Project Pokémon 第 5 世代配布一覧](https://projectpokemon.org/home/files/category/4-generation-5/)
- [Bulbapedia 第 5 世代配布一覧](https://bulbapedia.bulbagarden.net/wiki/Category:Generation_V_event_distributions)
- [第 5 世代カード本体の構造](https://projectpokemon.org/home/docs/gen-5/5th-generation-wondercard-map-r2/)
- [第 5 世代完全版カードの構造](https://projectpokemon.org/home/docs/gen-5/5th-generation-wonder-card-full-map-r148/)
- [PokeFinder の PGF 読み取り](https://github.com/Admiral-Fish/PokeFinder/blob/ecf97624791aec147960c4f48b92ad492945b05c/Core/Gen5/PGF.hpp)
- [PKHeX の PGF 読み取り（PID・フォーム）](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/MysteryGifts/PGF.cs)
- [PKHeX の第5世代文字列復号](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter5.cs)
- [PKHeX の専用性別文字対応](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter4Util.cs)
