# 配達員カードの収集・JSON 生成 仕様書

## 1. 概要

### 1.1 目的

Project Pokémon の配布カードから、このアプリが読み込む配達員カード定義を生成する開発用スクリプトを追加する。[local_124](../../complete/local_124/WONDER_CARD_INTEGRATION.md) の `WonderCardCatalogJson` を見直し、言語別配置、対象ソフトの指定、表示名の材料、収録単位を定める。

本書は実装予定の仕様である。2026-09-10 時点では文書のみを作成済みで、スクリプト・型・既存 JSON は未変更。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 元カード | 固定した上流コミットに収録された第 5 世代の `.pgf` ファイル |
| カード定義 | 元カードから抽出した生成条件と、選択・表示に必要な情報 |
| 対象言語 | カードを受け取る ROM の言語。アプリ表示言語・個体言語とは別の情報 |
| 収録設定 | 取得元・固定コミット・例外・除外理由を管理するスクリプト側の設定 |

### 1.3 背景・問題

現在の `src/data/wondercards/data/v1/pokefinder.json` は、PokeFinder のテストから転記した 3 件を製品側ローダーで読み込む。収集・再生成する処理はなく、対象言語も管理していない。

現行の `source` は各 JSON に取得元を持たせるが、自動生成するデータでは取得元と変換規則を収録設定・本仕様書で管理できる。`displayName: { ja, en }` もカードごとの翻訳を要求するため、元カードの親名・カードタイトルと、既存の種族名データから表示を組み立てる方式へ変更する。

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
| `scripts/wondercards/config.js` | 新規 | 上流コミット、言語対応、根拠付きの例外・除外設定 |
| `scripts/wondercards/pgf.js` | 新規 | バイナリの読み取りとカード定義への変換。ネットワーク・ファイル書き込みは行わない |
| `scripts/wondercards/*.test.js` | 新規 | Node.js 標準テストによる解析・再生成・更新失敗の検証 |
| `scripts/wondercards/fixtures/` | 新規 | オフラインで検証できる解析用入力と独立した期待値 |
| `package.json` | 変更 | 収集コマンドとスクリプトのテストコマンド |
| `src/data/wondercards/schema.ts` | 変更 | `source`・`displayName` の廃止、表示材料、対象言語、1 定義単位の型 |
| `src/data/wondercards/generated/v1/<language>/<id>.json` | 新規 | 生成済みの製品用カード定義 |
| `src/data/wondercards/data/v1/pokefinder.json` | 移動・変更 | 製品カタログから外し、必要な検証例をテスト用に保持 |
| `src/test/fixtures/wondercards/` | 新規 | PokeFinder 由来 3 件の生成条件・期待値を保持 |
| `src/data/wondercards/loader.ts` | 変更 | 言語別読み込み、新形式の検証・正規化 |
| `src/data/wondercards/display.ts` | 新規 | 種族名・親名・カードタイトルから選択候補の表示を組み立てる |
| `src/data/wondercards/converter.ts` | 変更 | 新しい型への追従。WASM へ渡す生成条件の契約は維持 |
| `src/test/unit/wondercard-data.test.ts` | 変更 | 新形式・言語・対象ソフト・表示名の検証 |
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

### 3.3 合意事項と表示名の設計案

言語別フォルダ、対象ソフトを `versions` に保持すること、`source` を生成側へ移すこと、TID / SID の異なる配布を別定義にすることは、本書の前提とする。

表示名は先の議論で挙げた設計案を 4.5 に具体化する。翻訳済み `displayName` を廃止し、通常配布では「種族名 + 親名」、配布タマゴでは「種族名 + タマゴ + カードタイトル」を基本表示とする。これは現行実装の説明ではなく、本書で採用する変更案である。

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

これは識別子の作成規則であり、表示名には使わない。同じカード番号、種族名、親名、TID の一致だけでは統合しない。正規化後に ID が衝突した場合は生成を失敗させ、収録設定の明示 ID で解消する。列挙順による連番は付けない。上流のファイル名変更で既存 ID が変わる場合も、明示 ID によって維持する。

### 4.4 `WonderCardCatalogJson` の変更

`source` と `displayName` を削除する。`entries` の包みは残し、生成ファイルは必ず 1 要素とする。カードタイトルと固定の親名は原文のまま保持し、翻訳済みの種族名を重複して保存しない。

以下は変更後の型。`RomVersion`、`Nature`、`Gender`、`AbilitySlot`、`TrainerInfo`、`WonderCardShinyPolicy` は現在と同じ WASM 型を参照する。

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
  | { kind: 'pokemon'; trainer: TrainerInfo; otName: string }
  | { kind: 'egg'; trainer?: never; otName?: never };

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

`language` はローダーがフォルダ名から付与し、JSON 内には重複して書かない。配布タマゴには配布元の `trainer`・`otName` を保存しない。受取人の現在値も定義や表示名に書き込まない。

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
      "otName": "SPR2013",
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

基本表示の案は以下とする。種族名は既存の `get_species_name()`、タマゴ等の定型文はアプリの表示言語を使う。親名とカードタイトルは翻訳しない。

| 区分 | 日本語 UI での表示例 |
|------|----------------------|
| 通常配布 | `メロエッタ（SPR2013）` |
| 配布タマゴ | `マメパトのタマゴ（A Secret Egg!）` |
| 種族名・親名が同じで TID が異なる配布 | `ディアルガ（SUM2013・08193）` |

TID は内部では数値、表示では 5 桁ゼロ埋めとする。基本表示が重複した通常配布には TID を加え、それでも重複する場合はカードタイトルを加える。タマゴを含め、なお重複する場合は内部 ID を補助表示に付け、候補を識別可能にする。これらは選択候補の配列に対する純粋な表示処理とし、JSON に重複した `displayName` を書き戻さない。

一意性を保証するのは `id`。表示名の一致を定義の統合条件に使わない。内部 ID の補助表示が必要な例は収録確認時に報告し、画面実装時に表示方法を確認する。

### 4.6 元カードから生成条件への変換

通常の `.pgf` は `0xCC` bytes。サイズの異なるファイルを切り詰めて解釈しない。複数 byte の整数は little endian で読む。カード種別、列挙値、数値範囲を検査してから出力する。

| 元カードの項目 | 出力・処理 |
|----------------|------------|
| `0xB3` カード種別、`0x5C` タマゴフラグ | ポケモン種別だけを候補にし、タマゴフラグ `0` / `1` を `pokemon` / `egg` に対応させる |
| `0x00` TID、`0x02` SID | 通常配布の `trainer`。各 `u16`、`0` も有効。タマゴでは出力しない |
| `0x1A` 種族、`0x5B` レベル | `speciesId`、`level`。範囲は現行の `1..649`、`1..100` |
| `0x34` 性格 | `0..24` を WASM の性格名へ対応させる。`0xFF` は省略 |
| `0x35` 性別 | `0` = `Male`、`1` = `Female`、`2` = 固定なし。その他は未対応として扱う |
| `0x36` 特性 | `0` = `First`、`1` = `Second`、`2` = `Hidden`、`3` = 固定なし。隠れ特性を含むランダム指定 `4` は現行型で表現できない |
| `0x37` 色違い条件 | `0` = `Never`、`1` = `Random`、`2` = `Always` |
| 固定個体値 | `hp=0x43`、`atk=0x44`、`def=0x45`、`spa=0x47`、`spd=0x48`、`spe=0x46`。`0..31` を保持し `0xFF` は省略 |
| `0x4A..0x59` 親名 | 通常配布の `otName`。タマゴでは出力しない |
| `0x60..0xA9` カードタイトル | `cardTitle` |

固定個体値は元カードの byte 順と H/A/B/C/D/S 順が異なる。PokeFinder の `PGF` コンストラクターでもこの並び替えを確認した。配列をそのままコピーしない。

文字列は第 5 世代の文字コードを考慮して復号し、`0xFFFF` 終端以後の埋め草を除去する。終端を除く内容は保持し、親名の大文字・小文字、全角・半角、記号を一律変換しない。UTF-16LE で読める通常文字だけを確認済みの範囲とし、専用文字・異常なコード列は実装時に検証例を用意する。未解決の文字を代替文字へ黙って置換しない。

非タマゴで固定の親名を取得できないもの、PID 固定指定、ランダムレベル、未対応フォーム等、現行のカード型・生成処理で表現できない条件は推測して省略しない。対象外にする場合は相対パスと理由を収録設定に明記し、集計する。未知の値・不正な値の新規検出は失敗とする。既知の非対応値を一律処理する場合も、値の意味と除外規則を設定・コードに明示する。

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

`collect:wondercards` は `node scripts/collect-wondercards.js`、`test:wondercards` は `node --test scripts/wondercards/*.test.js` を実行する。これらのコマンドは本仕様で追加予定であり、現時点では存在しない。

`--language` は定義済み 7 言語の一つを指定でき、省略時はすべて。`--input-dir` 指定時はネットワークを使わず、Git の HEAD が固定コミットと一致し、取得対象の追跡ファイルに変更がないことを確認する。未追跡ファイルは取得対象に含めない。未知のオプション・無効な言語は開始前にエラーにする。

ネットワーク取得は固定 SHA のファイル一覧から対象を抽出し、同じ SHA の内容を取得する。HTTP 失敗・不完全なファイル一覧・欠損を検出した場合は失敗とする。対象カードの全取得・解析・検証が終わるまで既存出力を書き換えない。

出力は UTF-8、LF、2 スペース、末尾改行あり。プロパティ順、`versions` の順、ファイル列挙順を固定し、現在時刻や取得順に依存させない。`versions` は `Black`, `White`, `Black2`, `White2` の順とする。

書き込みは検証済みの一時出力を用意してから反映する。反映時の失敗でも既存カタログを復元できるようにし、一部だけ更新された状態を成功としない。削除する古い生成物も選択言語の管理対象 JSON に限定する。出力先は repo 内の `generated/v1/` に固定し、他の言語・手書きソース・テスト用データを削除しない。

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
```

言語別に遅延読み込み・キャッシュし、返す値は複製する。`getWonderCard()` は ID 不在・言語不一致・対象ソフト不一致をエラーにし、別カードへ置き換えない。全言語を横断した ID 一意性は生成時とテストで検証する。

ローダーの検証を `source`・`displayName` から、単一 `entries`、`id`、`cardTitle`、言語フォルダ、空でない重複なしの `versions`、配布区分と `trainer`・`otName` の整合性へ変更する。現行の数値条件は、生成時の検査に加えて既存 WASM の構築経路にも通す。

`toWonderCardParams()` は引き続き通常配布の ID と配布タマゴの受取人 ID を選び、個体値を六要素へ変換する。`language`・`otName`・`cardTitle`・カード ID は WASM 入力へ追加しない。

PokeFinder 由来の固定期待値テストは製品カタログの収録数・先頭要素・旧 ID に依存させない。3 件の検証用定義を独立して保持し、製品カタログは別の全件検証へ切り替える。旧配置を新配置と並行して読み込む互換処理は追加しない。

## 5. テスト方針

### 5.1 確認する契約

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| バイナリ変換 | 固定した元カードと期待値 | 通常配布・タマゴ・固定個体値・固定性格・隠れ特性・色違い条件。個体値の素早さと特攻・特防を取り違えない |
| 未指定・境界 | センチネルと値域 | `0xFF` と固定値 `0`、TID / SID の `0`、未知の値、サイズ不正、未対応条件を区別する |
| 文字列 | 親名・タイトル | 日本語・英語・記号・終端・専用文字。不正な文字を黙って失わない |
| 言語・ソフト | フォルダと指定トークン | 7 言語、B/W/B2/W2 の単独指定と複数指定、例外、未知の指定、対象外選択の拒否 |
| 識別 | ID・別配布 | 同種族・同親名・異なる TID の両方を保持。正規化衝突を検出し、表示名では統合しない |
| JSON | 出力と読み込み | `source`・`displayName`・重複した言語情報を出力しない。1 ファイル 1 定義、未指定の省略、キャッシュの編集防止 |
| 表示 | 通常配布・タマゴ・重複 | 種族名の表示言語、親名・タイトルの原文保持、TID の 5 桁表示、最終的な候補の識別 |
| 再生成 | 同一入力での複数回実行 | 同一 byte 列、`--check`、言語限定更新、古い生成物の削除、取得・解析・反映失敗時の既存出力保持 |
| 接続 | 全収録定義 | 各対象ソフトで `toWonderCardParams()` から WASM 構築・少量生成まで通る。タマゴはテスト用受取人を使用 |

収集テストは外部ネットワークに依存させない。実際の固定コミットからの取得・再生成確認と、保存済み入力によるオフラインテストを分ける。パーサー自身の出力をそのまま期待値にはせず、元カードの項目を独立に確認して固定する。

### 5.2 文書作成時点の確認

2026-09-10 に現在のカード型・ローダー・変換・関連テストと、既存のエンカウント収集スクリプトを確認した。上流コミットと第 5 世代カードの言語別配置、PokeFinder の個体値並び替えを確認した。

固定コミットの `ENG/0129 BWB2W2 - SPR2013 Meloetta (ENG).pgf` を読み、サイズ 204 bytes、TID `3013`、SID `0`、種族 `648`、レベル `50`、性格 `255`、性別 `2`、特性 `0`、色違い `0`、全個体値 `255`、親名・カードタイトルを 4.4 の例と照合した。全カードの分類、例外の列挙、専用文字の網羅、生成スクリプトの動作確認は未実施。

テスト: 未実行（仕様書のみの変更）。実装後に収集処理のテスト、関連する単体・WASM 統合テスト、型チェック、Lint、フォーマットを実行し、収録数・除外理由とともに結果を記録する。

## 6. 実装チェックリスト

- [x] 収録単位・言語別配置・対象ソフト・出典管理を文書化する
- [x] カード型の変更と表示名の設計案を定義する
- [ ] 固定コミットの全候補を分類し、対象ソフト・文字列・未対応条件の例外を確認する
- [ ] 収集・解析・再生成・差分確認を実装する
- [ ] 製品カタログを生成し、既存 3 件の検証データを分離する
- [ ] カード型・ローダー・表示関数・関連テストを更新する
- [ ] 全収録定義を WASM 構築へ通し、検証結果と構成資料を更新する

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
