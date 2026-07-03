# 第5世代種族マスタ再生成仕様書

## 1. 概要

### 1.1 目的

BW/BW2 向けの種族マスタを第5世代時点の内容として再生成する。対象はガントル単体の補正でも、特性だけの補正でもなく、`gen5-species.json` そのものを「第5世代スナップショット」として作り直すこととする。

実装では、PokeAPI の `pokemon` / `pokemon-species` / `ability` / `item` から #1 から #649 の必要項目を取得し、`past_abilities` と `past_stats` を第5世代基準で適用した `gen5-species.json` を生成する。所持アイテムは `held_items.version_details` から BW/BW2 のバージョン別値を採用する。通常ビルドや実行時に PokeAPI へアクセスする設計にはしない。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 第5世代種族マスタ | BW/BW2 で使う #1 から #649 の名前、性別比、持ち物、特性、種族値をまとめた固定データ |
| 第5世代特性データ | ポケットモンスター ブラック・ホワイト/ブラック2・ホワイト2時点で参照する種族ごとの通常特性・隠れ特性 |
| 通常特性1 | `AbilitySlot::First` で参照する通常特性 |
| 通常特性2 | `AbilitySlot::Second` で参照する通常特性。存在しない種族では `get_ability_name` が通常特性1へフォールバックする |
| 隠れ特性 | `AbilitySlot::Hidden` で参照する特性 |
| PokeAPI 現行レスポンス | `https://pokeapi.co/api/v2/pokemon/{id}` の `abilities`。最新世代の値を含むため、第5世代マスタとしてそのまま使わない |
| PokeAPI 世代差分 | `past_abilities` に含まれる過去世代のスロット差分。PokeAPI 公式ドキュメントでは、`generation` は listed abilities を持っていた最後の世代を表す |
| PokeAPI 種族値差分 | `past_stats` に含まれる過去世代の種族値差分。`generation` は listed stats を持っていた最後の世代を表す |
| PokeAPI 所持アイテム詳細 | `held_items.version_details` に含まれるバージョン別の所持アイテムと出現率 |
| 第5世代スナップショット | PokeAPI から取得した現在値に、第5世代時点まで有効な `past_abilities` と `past_stats` を適用して生成した #1 から #649 の固定データ |
| 固定マスタ | リポジトリに保持している `spec/agent/complete/local_029/gen5-species.json` と、そこから生成される Rust 静的データ |

### 1.3 背景・問題

事実:

- `spec/agent/complete/local_029/gen5-species.json` の #525 ガントルは `ability2` が `weak-armor` / `くだけるよろい` になっている。
- 生成済みの `wasm-pkg/src/data/species.rs` でも #525 ガントルの `ability_ids` が `[62, 80, 44]` になっており、通常特性2として `くだけるよろい` が表示される。
- 2026-07-03 に PokeAPI `pokemon/525` を確認したところ、現行 `abilities` は `sturdy`, `weak-armor`, `sand-force` を返した。同じレスポンスの `past_abilities` には、過去世代の通常特性2が空である差分が含まれていた。
- 全649種を同じ規則で監査した結果、ローカル固定マスタと第5世代復元値の差分は45スロットあった。
- `past_stats` も同様に確認したところ、ローカル固定マスタと第5世代復元値の種族値差分は66項目あった。例として #526 ギガイアスの特防は現行80だが、第5世代では70である。
- 所持アイテムは `held_items.version_details` に BW/BW2 のバージョン別値が含まれており、監査対象に含めた。既存固定マスタと PokeAPI 復元値の所持アイテム差分は0件だった。
- `scripts/generate-species-data.js` は入力として `spec/agent/local_029/gen5-species.json` を参照しているが、現行リポジトリの実ファイルは `spec/agent/complete/local_029/gen5-species.json` にある。

根本原因:

- 元データ作成時に PokeAPI の現行 `abilities` と `stats` を取り込み、対象世代への正規化を行っていない。
- `gen5-species.json` には取得元、取得日、世代差分の適用規則、再生成手順が残っていない。そのため、後続の Rust 生成では誤った固定マスタを正しい前提として扱っている。
- 生成スクリプトは JSON から Rust への変換だけを担っており、種族データ自体が第5世代かどうかを検証しない。
- `scripts/generate-species-data.js` は既存の `items.rs` 生成物に対応する出力処理を持っていなかったため、再生成時に所持アイテム生成が置き去りになるリスクがあった。

未検証:

- PokeAPI 以外の資料で45特性スロットと66種族値項目すべてを二重確認していない。
- 隠れ特性の入手可否までは扱わない。今回の補正対象は「スロットに割り当てられる特性名」であり、配布や入手経路の有無ではない。

### 1.4 期待効果

| 項目 | 期待効果 |
|------|----------|
| 表示補正 | ガントルを含む45スロットで、第5世代時点の特性名を表示する |
| 計算補正 | ギガイアスを含む66項目で、第5世代時点の種族値を使って実数値を計算する |
| 所持アイテム確認 | BW/BW2 のバージョン別所持アイテムを監査し、今回の再生成で差分がないことを確認する |
| 横展開 | 個別報告された種族だけでなく、全649種を同じ生成規則で第5世代化する |
| 再発防止 | PokeAPI 現行値を手で取り込まず、世代正規化済みの固定マスタを生成できる |
| 再生成手順 | `node scripts/fetch-gen5-species-data.js` で固定マスタを再生成し、`node scripts/generate-species-data.js` で Rust データへ反映できる |

### 1.5 着手条件

- `spec/agent/complete/local_029/SPECIES_DATA_ARCHITECTURE.md` の種族データ生成方針を前提にする。
- 実装は `docs/local-114-gen5-species-data` ブランチで行う。
- 既存の未コミット `package.json` 変更はユーザー許可により同一コミットへ含める。
- PokeAPI を使う処理はデータ取得スクリプトと監査スクリプトに限定し、通常ビルド・テスト・実行時の依存にしない。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 更新 | `packageManager` を `pnpm@11.9.0` に更新する |
| `spec/agent/complete/local_029/gen5-species.json` | 再生成 | PokeAPI から第5世代スナップショットとして再生成する。特性と種族値を世代差分で正規化し、所持アイテムは BW/BW2 の `version_details` を採用する |
| `scripts/pokeapi-gen5-species-data.js` | 新規 | PokeAPI 取得、ローカルキャッシュ、第5世代復元、固定マスタとの差分検出を共有実装として提供する |
| `scripts/generate-species-data.js` | 修正 | 入力パスを `spec/agent/complete/local_029/gen5-species.json` に変更し、存在しない場合のエラーを明示する。`items.rs` も `gen5-species.json` から生成する |
| `scripts/fetch-gen5-species-data.js` | 新規 | PokeAPI から全649種の第5世代スナップショットを生成し、`gen5-species.json` を更新する |
| `scripts/audit-gen5-species-data.js` | 新規 | PokeAPI から全649種の第5世代スナップショットを復元し、固定マスタの特性、種族値、所持アイテムを比較する確認用コマンド |
| `wasm-pkg/src/data/species.rs` | 再生成・テスト追加 | 補正後の固定マスタから特性 ID と種族値を再生成し、代表種族の回帰テストを追加する |
| `wasm-pkg/src/data/abilities.rs` | 再生成・テスト追加 | 補正後の特性名テーブルを再生成し、代表種族の回帰テストを追加する |
| `wasm-pkg/src/data/items.rs` | 再生成確認 | `gen5-species.json` の所持アイテムから再生成できることを確認する。今回の生成物差分はなし |
| `wasm-pkg/src/data/names.rs` | 再生成 | PokeAPI 名称に合わせて英語名差分を反映する |
| `wasm-pkg/src/data/mod.rs` | 再生成確認 | 既存の `items` / `stats` 公開を維持したまま再生成できることを確認する |

## 3. 設計方針

通常ビルドやアプリ実行時に PokeAPI へアクセスしない。アプリの対象は BW/BW2 に固定されているため、参照する種族情報は第5世代スナップショットとしてリポジトリ内に保持する。

PokeAPI は固定マスタを生成するための開発時ソースとして扱う。現行 `abilities` と `stats` は第5世代マスタではないため、そのまま採用しない。`past_abilities` と `past_stats` の世代ラベルを使って、対象スロット・対象種族値ごとに第5世代時点の値を復元する。

第5世代値の復元規則:

1. 各スロットの初期値は PokeAPI 現行 `abilities` とする。
2. `past_abilities` をスロット別に見る。
3. PokeAPI 公式ドキュメントに従い、`past_abilities.generation` を「その listed abilities が有効だった最後の世代」として扱う。
4. 対象世代を第5世代とし、世代番号が5以上の `past_abilities` だけを候補にする。
5. 同じスロットに複数候補がある場合は、世代番号が最も小さい候補を採用する。
6. 候補の `ability` が `null` の場合、そのスロットは第5世代では存在しないものとして `null` にする。

この規則により、第4世代以前の隠れ特性なし差分は第5世代マスタへ誤適用しない。ゲンガーの `levitate`、ダーテングの `early-bird`、プリン系統の通常特性2なしなど、変更時期が第6世代以降の差分を第5世代へ戻せる。

第5世代種族値の復元規則:

1. 各種族値の初期値は PokeAPI 現行 `stats` とする。
2. `past_stats` を能力値別に見る。
3. PokeAPI 公式ドキュメントに従い、`past_stats.generation` を「その listed stats が有効だった最後の世代」として扱う。
4. 対象世代を第5世代とし、世代番号が5以上の `past_stats` だけを候補にする。
5. 同じ能力値に複数候補がある場合は、世代番号が最も小さい候補を採用する。
6. `special` は第1世代向けの統合特殊値であり、第5世代の `specialAttack` / `specialDefense` には適用しない。

所持アイテムの復元規則:

1. `pokemon/{id}` の `held_items` を参照する。
2. `version_details.version.name` が `black` / `white` / `black-2` / `white-2` のものだけを採用する。
3. `rarity` は `50` / `100` を `HeldItemSlot::Common`、`5` を `HeldItemSlot::Rare`、`1` を `HeldItemSlot::VeryRare` に対応させる。
4. 今回の監査では既存固定マスタとの差分は0件だったため、値変更は発生しない。ただし、監査と Rust 生成の対象から外さない。

データ取得は PokeAPI の Fair Use Policy に従い、ローカルキャッシュを使える実装にする。同じ実行中に同一 URL を複数回取得しない。実装では `POKEAPI_CACHE_DIR` が指定されていない場合、OS の一時ディレクトリ配下に `5gensearch-pokeapi-cache` を作る。このキャッシュはコミット対象にしない。

## 4. 実装仕様

### 4.1 第5世代スナップショット生成

`scripts/fetch-gen5-species-data.js` を追加し、`gen5-species.json` を生成する。

想定する実行方法:

```powershell
node scripts/fetch-gen5-species-data.js
```

仕様:

- #1 から #649 までを対象にする。
- `pokemon/{id}` から種族値、特性、過去特性、持ち物を取得する。
- `pokemon-species/{id}` から日本語名、英語名、性別比を取得する。
- `ability/{name}` から日本語名と英語名を取得する。
- `item/{name}` から日本語名と英語名を取得する。
- 持ち物は `version_details.version.name` が `black` / `white` / `black-2` / `white-2` のものだけを採用する。
- 出力 JSON は安定したキー順にする。種族 ID は数値昇順、スロットは `ability1`、`ability2`、`hidden` の順にする。
- 取得元メタデータは通常データに混ぜない。必要ならスクリプトの出力ログに取得日時と PokeAPI URL を記録する。

性別比の変換:

| PokeAPI `gender_rate` | 出力 |
|-----------------------|------|
| `-1` | `{ "type": "genderless" }` |
| `0` | `{ "type": "fixed", "fixed": "male" }` |
| `8` | `{ "type": "fixed", "fixed": "female" }` |
| その他 | `{ "type": "ratio", "femaleThreshold": gender_rate * 32 }` |

特性スロットの変換:

| PokeAPI slot | `is_hidden` | 出力先 |
|--------------|-------------|--------|
| `1` | `false` | `abilities.ability1` |
| `2` | `false` | `abilities.ability2` |
| 任意 | `true` | `abilities.hidden` |

`past_abilities` 適用後に `ability` が `null` になったスロットは、対応する出力先を `null` にする。

種族値の変換:

| PokeAPI stat | 出力キー |
|--------------|----------|
| `hp` | `baseStats.hp` |
| `attack` | `baseStats.attack` |
| `defense` | `baseStats.defense` |
| `special-attack` | `baseStats.specialAttack` |
| `special-defense` | `baseStats.specialDefense` |
| `speed` | `baseStats.speed` |

`past_stats` 適用後の値を出力する。PokeAPI の `effort` は EV yield であり、現行の `gen5-species.json` には保持しない。

所持アイテムの変換:

| PokeAPI `rarity` | `HeldItemEntry` |
|------------------|-----------------|
| `50` / `100` | `common` |
| `5` | `rare` |
| `1` | `very_rare` |

PokeAPI の `held_items.version_details` はバージョン別の値を持つため、`black` / `white` / `black-2` / `white-2` ごとに出力する。

### 4.2 特性差分の確認対象

2026-07-03 時点の全649種監査で検出した差分は次の45スロット。

| 全国図鑑番号 | 種族 | スロット | 現行ローカル値 | 第5世代値 |
|--------------|------|----------|----------------|-----------|
| 39 | プリン / Jigglypuff | 2 | `competitive` / かちき | `null` |
| 40 | プクリン / Wigglytuff | 2 | `competitive` / かちき | `null` |
| 94 | ゲンガー / Gengar | 1 | `cursed-body` / のろわれボディ | `levitate` / ふゆう |
| 109 | ドガース / Koffing | 2 | `neutralizing-gas` / かがくへんかガス | `null` |
| 110 | マタドガス / Weezing | 2 | `neutralizing-gas` / かがくへんかガス | `null` |
| 145 | サンダー / Zapdos | 3 | `static` / せいでんき | `lightning-rod` / ひらいしん |
| 174 | ププリン / Igglybuff | 2 | `competitive` / かちき | `null` |
| 243 | ライコウ / Raikou | 3 | `inner-focus` / せいしんりょく | `volt-absorb` / ちくでん |
| 244 | エンテイ / Entei | 3 | `inner-focus` / せいしんりょく | `flash-fire` / もらいび |
| 245 | スイクン / Suicune | 3 | `inner-focus` / せいしんりょく | `water-absorb` / ちょすい |
| 275 | ダーテング / Shiftry | 2 | `wind-rider` / かぜのり | `early-bird` / はやおき |
| 278 | キャモメ / Wingull | 2 | `hydration` / うるおいボディ | `null` |
| 279 | ペリッパー / Pelipper | 2 | `drizzle` / あめふらし | `null` |
| 311 | プラスル / Plusle | 3 | `lightning-rod` / ひらいしん | `null` |
| 312 | マイナン / Minun | 3 | `volt-absorb` / ちくでん | `null` |
| 324 | コータス / Torkoal | 2 | `drought` / ひでり | `null` |
| 349 | ヒンバス / Feebas | 2 | `oblivious` / どんかん | `null` |
| 350 | ミロカロス / Milotic | 2 | `competitive` / かちき | `null` |
| 352 | カクレオン / Kecleon | 3 | `protean` / へんげんじざい | `null` |
| 355 | ヨマワル / Duskull | 3 | `frisk` / おみとおし | `null` |
| 356 | サマヨール / Dusclops | 3 | `frisk` / おみとおし | `null` |
| 393 | ポッチャマ / Piplup | 3 | `competitive` / かちき | `defiant` / まけんき |
| 394 | ポッタイシ / Prinplup | 3 | `competitive` / かちき | `defiant` / まけんき |
| 395 | エンペルト / Empoleon | 3 | `competitive` / かちき | `defiant` / まけんき |
| 396 | ムックル / Starly | 3 | `reckless` / すてみ | `null` |
| 475 | エルレイド / Gallade | 2 | `sharpness` / きれあじ | `null` |
| 477 | ヨノワール / Dusknoir | 3 | `frisk` / おみとおし | `null` |
| 524 | ダンゴロ / Roggenrola | 2 | `weak-armor` / くだけるよろい | `null` |
| 525 | ガントル / Boldore | 2 | `weak-armor` / くだけるよろい | `null` |
| 526 | ギガイアス / Gigalith | 2 | `sand-stream` / すなおこし | `null` |
| 543 | フシデ / Venipede | 3 | `speed-boost` / かそく | `quick-feet` / はやあし |
| 544 | ホイーガ / Whirlipede | 3 | `speed-boost` / かそく | `quick-feet` / はやあし |
| 545 | ペンドラー / Scolipede | 3 | `speed-boost` / かそく | `quick-feet` / はやあし |
| 574 | ゴチム / Gothita | 2 | `competitive` / かちき | `null` |
| 575 | ゴチミル / Gothorita | 2 | `competitive` / かちき | `null` |
| 576 | ゴチルゼル / Gothitelle | 2 | `competitive` / かちき | `null` |
| 582 | バニプッチ / Vanillite | 2 | `snow-cloak` / ゆきがくれ | `null` |
| 583 | バニリッチ / Vanillish | 2 | `snow-cloak` / ゆきがくれ | `null` |
| 584 | バイバニラ / Vanilluxe | 2 | `snow-warning` / ゆきふらし | `null` |
| 598 | ナットレイ / Ferrothorn | 3 | `anticipation` / きけんよち | `null` |
| 607 | ヒトモシ / Litwick | 3 | `infiltrator` / すりぬけ | `shadow-tag` / かげふみ |
| 608 | ランプラー / Lampent | 3 | `infiltrator` / すりぬけ | `shadow-tag` / かげふみ |
| 609 | シャンデラ / Chandelure | 3 | `infiltrator` / すりぬけ | `shadow-tag` / かげふみ |
| 613 | クマシュン / Cubchoo | 2 | `slush-rush` / ゆきかき | `null` |
| 614 | ツンベアー / Beartic | 2 | `slush-rush` / ゆきかき | `null` |

`null` にした通常特性2は、表示解決時に既存仕様どおり通常特性1へフォールバックする。`null` にした隠れ特性は、`AbilitySlot::Hidden` の解決結果が `"???"` になる。隠れ特性の候補が第5世代に存在しない種族では、この挙動を正とする。

この表は実装時の確認用であり、手編集リストではない。`fetch-gen5-species-data.js` の生成結果がこの差分を自然に解消することを確認する。

### 4.3 種族値差分の確認対象

2026-07-03 時点の全649種監査で検出した種族値差分は次の66項目。

| 全国図鑑番号 | 種族 | 種族値 | 現行ローカル値 | 第5世代値 |
|--------------|------|--------|----------------|-----------|
| 12 | バタフリー / Butterfree | `specialAttack` | 90 | 80 |
| 15 | スピアー / Beedrill | `attack` | 90 | 80 |
| 18 | ピジョット / Pidgeot | `speed` | 101 | 91 |
| 24 | アーボック / Arbok | `attack` | 95 | 85 |
| 25 | ピカチュウ / Pikachu | `defense` | 40 | 30 |
| 25 | ピカチュウ / Pikachu | `specialDefense` | 50 | 40 |
| 26 | ライチュウ / Raichu | `speed` | 110 | 100 |
| 31 | ニドクイン / Nidoqueen | `attack` | 92 | 82 |
| 34 | ニドキング / Nidoking | `attack` | 102 | 92 |
| 36 | ピクシー / Clefable | `specialAttack` | 95 | 85 |
| 40 | プクリン / Wigglytuff | `specialAttack` | 85 | 75 |
| 45 | ラフレシア / Vileplume | `specialAttack` | 110 | 100 |
| 51 | ダグトリオ / Dugtrio | `attack` | 100 | 80 |
| 62 | ニョロボン / Poliwrath | `attack` | 95 | 85 |
| 65 | フーディン / Alakazam | `specialDefense` | 95 | 85 |
| 71 | ウツボット / Victreebel | `specialDefense` | 70 | 60 |
| 76 | ゴローニャ / Golem | `attack` | 120 | 110 |
| 83 | カモネギ / Farfetch'd | `attack` | 90 | 65 |
| 85 | ドードリオ / Dodrio | `speed` | 110 | 100 |
| 101 | マルマイン / Electrode | `speed` | 150 | 140 |
| 103 | ナッシー / Exeggutor | `specialDefense` | 75 | 65 |
| 164 | ヨルノズク / Noctowl | `specialAttack` | 86 | 76 |
| 168 | アリアドス / Ariados | `specialDefense` | 70 | 60 |
| 181 | デンリュウ / Ampharos | `defense` | 85 | 75 |
| 182 | キレイハナ / Bellossom | `defense` | 95 | 85 |
| 184 | マリルリ / Azumarill | `specialAttack` | 60 | 50 |
| 189 | ワタッコ / Jumpluff | `specialDefense` | 95 | 85 |
| 211 | ハリーセン / Qwilfish | `defense` | 85 | 75 |
| 219 | マグカルゴ / Magcargo | `hp` | 60 | 50 |
| 219 | マグカルゴ / Magcargo | `specialAttack` | 90 | 80 |
| 222 | サニーゴ / Corsola | `hp` | 65 | 55 |
| 222 | サニーゴ / Corsola | `defense` | 95 | 85 |
| 222 | サニーゴ / Corsola | `specialDefense` | 95 | 85 |
| 226 | マンタイン / Mantine | `hp` | 85 | 65 |
| 267 | アゲハント / Beautifly | `specialAttack` | 100 | 90 |
| 277 | オオスバメ / Swellow | `specialAttack` | 75 | 50 |
| 279 | ペリッパー / Pelipper | `specialAttack` | 95 | 85 |
| 284 | アメモース / Masquerain | `specialAttack` | 100 | 80 |
| 284 | アメモース / Masquerain | `speed` | 80 | 60 |
| 295 | バクオング / Exploud | `specialDefense` | 73 | 63 |
| 301 | エネコロロ / Delcatty | `speed` | 90 | 70 |
| 313 | バルビート / Volbeat | `defense` | 75 | 55 |
| 313 | バルビート / Volbeat | `specialDefense` | 85 | 75 |
| 314 | イルミーゼ / Illumise | `defense` | 75 | 55 |
| 314 | イルミーゼ / Illumise | `specialDefense` | 85 | 75 |
| 337 | ルナトーン / Lunatone | `hp` | 90 | 70 |
| 338 | ソルロック / Solrock | `hp` | 90 | 70 |
| 358 | チリーン / Chimecho | `hp` | 75 | 65 |
| 358 | チリーン / Chimecho | `defense` | 80 | 70 |
| 358 | チリーン / Chimecho | `specialDefense` | 90 | 80 |
| 398 | ムクホーク / Staraptor | `specialDefense` | 60 | 50 |
| 407 | ロズレイド / Roserade | `attack` | 70 | 55 |
| 488 | クレセリア / Cresselia | `defense` | 110 | 120 |
| 488 | クレセリア / Cresselia | `specialDefense` | 120 | 130 |
| 508 | ムーランド / Stoutland | `attack` | 110 | 100 |
| 521 | ケンホロウ / Unfezant | `attack` | 115 | 105 |
| 526 | ギガイアス / Gigalith | `specialDefense` | 80 | 70 |
| 527 | コロモリ / Woobat | `hp` | 65 | 55 |
| 537 | ガマゲロゲ / Seismitoad | `attack` | 95 | 85 |
| 542 | ハハコモリ / Leavanny | `specialDefense` | 80 | 70 |
| 545 | ペンドラー / Scolipede | `attack` | 100 | 90 |
| 553 | ワルビアル / Krookodile | `defense` | 80 | 70 |
| 558 | イワパレス / Crustle | `attack` | 105 | 95 |
| 614 | ツンベアー / Beartic | `attack` | 130 | 110 |
| 615 | フリージオ / Cryogonal | `hp` | 80 | 70 |
| 615 | フリージオ / Cryogonal | `attack` | 50 | 30 |

この表も実装時の確認用であり、手編集リストではない。`fetch-gen5-species-data.js` の生成結果がこの差分を自然に解消することを確認する。

### 4.4 監査スクリプト

`scripts/audit-gen5-species-data.js` を追加する。既定では読み取り専用で、PokeAPI から復元した第5世代特性・種族値・所持アイテムと固定マスタの差分を標準出力に出す。

想定する実行方法:

```powershell
node scripts/audit-gen5-species-data.js
```

仕様:

- `spec/agent/complete/local_029/gen5-species.json` を読み込む。
- PokeAPI `https://pokeapi.co/api/v2/pokemon/{id}` を #1 から #649 まで取得する。
- `abilities` / `past_abilities` / `stats` / `past_stats` / `held_items.version_details` から第5世代値を復元する。
- 固定マスタとの差分がなければ終了コード0。
- 差分があれば Markdown 表を出力し、終了コード1。
- `--json` 指定時は差分を JSON で出力する。
- `--offline` は実装しない。通常のテストゲートへ組み込まないため、ネットワーク失敗は監査失敗として扱う。

世代番号変換は、文字列比較ではなく明示的な対応表で行う。

```javascript
const GENERATION_NUMBER = {
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
};
```

### 4.5 Rust 生成スクリプト

`scripts/generate-species-data.js` の入力パスを現行ファイルに合わせる。

```javascript
const SPECIES_JSON_PATH = join(ROOT_DIR, 'spec/agent/complete/local_029/gen5-species.json');
```

入力ファイルが存在しない場合は、対象パスを含むエラーを投げる。

```javascript
if (!existsSync(SPECIES_JSON_PATH)) {
  throw new Error(`Species data not found: ${SPECIES_JSON_PATH}`);
}
```

特性 ID は `gen5-species.json` から再構築されるため、補正後の再生成で `ABILITY_NAMES` の並びと `ability_ids` が機械的に変わる可能性がある。差分確認では、個々の ID 番号ではなく、`get_ability_name(species_id, slot, locale)` の結果を基準にする。

所持アイテム ID も `gen5-species.json` から再構築する。`wasm-pkg/src/data/items.rs` は既存の `HeldItemEntry` 形式を維持し、`50` / `100` / `5` / `1` の rarity を `common` / `rare` / `very_rare` に割り当てる。今回の再生成では `items.rs` の内容差分は出ない。

### 4.6 回帰テスト

`scripts/generate-species-data.js` が出力する `wasm-pkg/src/data/abilities.rs` のテストテンプレートに、代表的な差分を追加する。

```rust
#[test]
fn test_get_ability_name_gen5_corrected_slots() {
    assert_eq!(get_ability_name(525, AbilitySlot::Second, "ja"), "がんじょう");
    assert_eq!(get_ability_name(525, AbilitySlot::Second, "en"), "Sturdy");
    assert_eq!(get_ability_name(94, AbilitySlot::First, "ja"), "ふゆう");
    assert_eq!(get_ability_name(94, AbilitySlot::First, "en"), "Levitate");
    assert_eq!(get_ability_name(393, AbilitySlot::Hidden, "ja"), "まけんき");
    assert_eq!(get_ability_name(393, AbilitySlot::Hidden, "en"), "Defiant");
}
```

`null` になった隠れ特性の代表として、#396 ムックルなどが `"???"` を返ることも確認する。

```rust
#[test]
fn test_get_ability_name_missing_hidden_ability_returns_unknown() {
    assert_eq!(get_ability_name(396, AbilitySlot::Hidden, "ja"), "???");
    assert_eq!(get_ability_name(396, AbilitySlot::Hidden, "en"), "???");
}
```

種族値の代表差分も `wasm-pkg/src/data/species.rs` のテストテンプレートに追加する。

```rust
#[test]
fn test_get_species_entry_gen5_corrected_base_stats() {
    assert_eq!(get_species_entry(526).base_stats.special_defense, 70);
    assert_eq!(get_species_entry(25).base_stats.defense, 30);
    assert_eq!(get_species_entry(488).base_stats.defense, 120);
}
```

## 5. テスト方針

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| データ取得 | `node scripts/fetch-gen5-species-data.js` | PokeAPI から `gen5-species.json` を第5世代スナップショットとして生成できる |
| 監査 | `node scripts/audit-gen5-species-data.js` | 補正後の固定マスタと PokeAPI から復元した第5世代特性・種族値・所持アイテムに差分がない |
| 再生成確認 | `node scripts/generate-species-data.js` | 現行パスの `gen5-species.json` から Rust データを生成できる。`items.rs` も生成対象に含める |
| Rust ユニット | `wasm-pkg/src/data/abilities.rs` | 代表特性差分が第5世代値で解決される |
| Rust ユニット | `wasm-pkg/src/data/species.rs` | 代表種族値差分が第5世代値で解決される |
| Rust ユニット | `wasm-pkg/src/data/items.rs` | 既存の所持アイテムテストが再生成後も通る |
| WASM ビルド | `pnpm build:wasm:dev` | 生成済み Rust データを TypeScript 側の WASM 成果物へ反映できる |
| 回帰確認 | `cargo test -p wasm-pkg` | 既存の Rust テストが補正後も通る |

現時点の検証結果:

| コマンド | 結果 |
|----------|------|
| `Invoke-RestMethod https://pokeapi.co/api/v2/pokemon/525` | 現行 `abilities` と `past_abilities` の差分を確認 |
| `Invoke-RestMethod https://pokeapi.co/api/v2/pokemon/94` | `past_abilities` が #94 ゲンガーの第5世代値 `levitate` を保持していることを確認 |
| `Invoke-RestMethod https://pokeapi.co/api/v2/pokemon/40` | `generation-v` ラベルの差分が第5世代時点の通常特性2なしを示すことを確認 |
| `Invoke-RestMethod https://pokeapi.co/api/v2/pokemon/526` | `past_stats` が #526 ギガイアスの第5世代特防70を保持していることを確認 |
| `node -e <全649種特性監査>` | 第5世代復元値との差分45スロットを確認 |
| `node -e <全649種種族値監査>` | 第5世代復元値との差分66項目を確認 |
| `node -e <補正前固定マスタ監査>` | 実装した監査ロジックで補正前の差分が特性45件、種族値66件、所持アイテム0件であることを確認 |
| `node scripts/fetch-gen5-species-data.js` | `gen5-species.json` を第5世代スナップショットとして再生成 |
| `node scripts/generate-species-data.js` | `species.rs` / `abilities.rs` / `items.rs` / `names.rs` / `mod.rs` を再生成 |
| `node scripts/audit-gen5-species-data.js` | 補正後の特性・種族値・所持アイテム差分が0件であることを確認 |
| `node --check scripts/pokeapi-gen5-species-data.js` | 構文エラーなし |
| `node --check scripts/fetch-gen5-species-data.js` | 構文エラーなし |
| `node --check scripts/audit-gen5-species-data.js` | 構文エラーなし |
| `node --check scripts/generate-species-data.js` | 構文エラーなし |
| `cargo fmt --package wasm-pkg` | 再生成後の Rust ファイルを整形 |
| `pnpm format:check:ts` | 成功 |
| `pnpm lint:ts` | 成功 |
| `cargo test -p wasm-pkg` | 328 unit tests、1 frame test、6 resolve integration tests、doc tests が成功 |
| `pnpm build:wasm:dev` | WASM dev build が成功 |
| PokeAPI 公式ドキュメント確認 | `past_abilities.generation` が listed abilities を持っていた最後の世代を表すことを確認 |
| PokeAPI 公式ドキュメント確認 | `past_stats.generation` が listed stats を持っていた最後の世代を表すことを確認 |
| `git diff -- wasm-pkg/src/data/items.rs` | 所持アイテム生成物に差分がないことを確認 |

## 6. 実装チェックリスト

- [x] ガントル単体ではなく全649種を監査対象にする方針へ修正する
- [x] PokeAPI `past_abilities` の世代ラベルを第5世代値へ復元する規則を確認する
- [x] PokeAPI `past_stats` の世代ラベルを第5世代値へ復元する規則を確認する
- [x] 全649種監査で45スロットの差分を確認する
- [x] 全649種監査で66種族値項目の差分を確認する
- [x] 全649種監査で所持アイテム差分が0件であることを確認する
- [x] `scripts/generate-species-data.js` の入力パスが現行ファイル配置とずれていることを確認する
- [x] `scripts/pokeapi-gen5-species-data.js` を追加する
- [x] `scripts/fetch-gen5-species-data.js` を追加する
- [x] `scripts/audit-gen5-species-data.js` を追加する
- [x] `node scripts/fetch-gen5-species-data.js` で `gen5-species.json` を第5世代スナップショットとして再生成する
- [x] `scripts/generate-species-data.js` の入力パスとエラーを修正する
- [x] `scripts/generate-species-data.js` で `items.rs` も再生成対象に含める
- [x] 生成テンプレートに第5世代特性・種族値補正の回帰テストを追加する
- [x] `node scripts/audit-gen5-species-data.js` で補正後の差分が0件になることを確認する
- [x] `node scripts/generate-species-data.js` で Rust データを再生成する
- [x] 生成差分が第5世代スナップショット化と生成物更新として説明可能であることを確認する
- [x] `cargo test -p wasm-pkg` を実行する
- [x] `pnpm build:wasm:dev` を実行し、必要な WASM 成果物を更新する
- [x] 実装結果と検証結果をこの仕様書へ反映する
