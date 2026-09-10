# 解析用の固定入力

Project Pokémon EventsGallery のコミット `154d81be88453f6f78ec1d6d86e85fe0f2f5c240` から取得した204 bytesのカード。パーサーを通さず元バイトをコピーしている。元ディレクトリは https://github.com/projectpokemon/EventsGallery/tree/154d81be88453f6f78ec1d6d86e85fe0f2f5c240/Released/Gen%205/Wondercards 。

| ファイル | 上流相対パス |
|----------|--------------|
| `meloetta.pgf` | `ENG/0129 BWB2W2 - SPR2013 Meloetta (ENG).pgf` |
| `pidove.pgf` | `ENG/0029 BW - (Trainer) Pidove Egg (ENG).pgf` |
| `pikachu.pgf` | `ENG/0100 BW - WORLD12 Pikachu (ENG).pgf` |
| `larvitar.pgf` | `ENG/0061 BW - VGC12 Larvitar (ENG).pgf` |
| `genesect.pgf` | `JPN/0136 BWB2W2 - えいがかん Shiny Genesect (JPN).pgf` |

期待値は `pgf.test.js` に手書きで保持する。確認項目は [カード構造](https://projectpokemon.org/home/docs/gen-5/5th-generation-wondercard-map-r2/) の TID/SID、種族、性格、性別、特性、色違い、個体値、レベル、タマゴフラグ、タイトル。ゲノセクトの個体値は攻撃 `0x44=31` と素早さ `0x46=31`。並び替えの全要素と固定値0は変更した入力で別途検証する。

第5世代の終端 `0000` / `FFFF` と専用性別文字 `246D` / `246E` は [PKHeX StringConverter5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter5.cs)・[StringConverter4Util](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter4Util.cs) を2026-09-10に照合。専用文字・異常列のテストは人工入力で行い、元カードは書き換えない。
