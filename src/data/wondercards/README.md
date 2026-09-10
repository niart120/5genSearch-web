# 配達員カード定義

`generated/v1/<language>/<id>.json` に1枚ずつ収録する。7言語の700定義（配布タマゴ48件を含む）を読み込み、同じ配布の対象ソフトは `versions` に保持する。取得元は [Project Pokémon EventsGallery の固定コミット](https://github.com/projectpokemon/EventsGallery/tree/154d81be88453f6f78ec1d6d86e85fe0f2f5c240/Released/Gen%205/Wondercards)。取得先・コミット・入力件数・例外は `scripts/wondercards/config.js` で管理する。

## 再生成

Node.js 24以上を使用する。

```powershell
pnpm collect:wondercards
pnpm collect:wondercards --language=ja
pnpm collect:wondercards --check
pnpm collect:wondercards --input-dir=C:\work\EventsGallery --check
pnpm test:wondercards
```

`--input-dir` は固定コミットへ checkout 済みのリポジトリを指定する。HEAD と取得対象の追跡変更、各ファイルの Git blob ハッシュを確認し、未追跡ファイルは読み込まない。このモードではネットワークに接続しない。

ネットワーク取得でも固定 SHA の一覧・内容・Git blob ハッシュを照合する。全件検証後に一時出力を反映し、反映失敗時は既存JSONを復元する。通常実行は言語別の入力・収録・対象外件数と理由を報告する。`--check` は追加・変更・削除のパスを出力し、差分があると非ゼロで終了する。言語指定時はその言語のJSONだけを更新する。

生成JSONは UTF-8 / LF / 2スペース / 末尾改行あり。`JSON.stringify` の固定形式を使うため oxfmt の対象外とし、`--check` で再生成との差分を確認する。`source`、`displayName`、`otName`、取得日時、言語の重複情報は生成しない。固定値0を保持し、未指定値はプロパティを省略する。

反映中の強制終了や復元自体の失敗では `generated/.wondercards-update/old/` に退避データが残る。エラーで示された場所から旧JSONを復旧し、同時実行がないことを確認してこの作業用ディレクトリを片付ける。新規の収集は残存ディレクトリを検出して停止する。

## 読み込みと表示

`loadWonderCards(language, version?)` は言語別に遅延読み込み・キャッシュし、返却時に複製する。`getWonderCard(id, language, version)` はID不在・対象外ソフト・言語不一致を拒否する。対象言語は `getWonderCardLanguage(region)` で ROM リージョンから選ぶ。アプリ表示言語や `.pgf` の個体言語では選ばない。

`getWonderCardDisplays(cards, locale)` は既存の種族名データと原文タイトルから「種族名（cardTitle）」を返す。配布タマゴも同じ形式。重複する通常配布には `trainerLabel`（例: `TID: 03013`）、同TIDの候補や重複タマゴには `disambiguationId` を返す。候補配列内の重複だけを判定し、カードや受取人情報を書き換えない。

内部IDの補助表示が必要な実例は英語版SPR2012のレシラム／ゼクロム（通常版と `[LW]` 版）、日本語の大学祭配布や配布タマゴ、韓国語の御三家タマゴなど。表示が同じでも上流の別ファイルを統合しない。画面での補助情報の配置は画面実装時に決める。

## 検証境界

`loader.ts` はカードのメタデータ・配布区分・言語フォルダを検証し、JSONの `null` を `undefined` に正規化する。`converter.ts` は配布元または受取人のIDを選び、H/A/B/C/D/S順の六要素へ変換する。WASMの公開入力にカードID・タイトル・言語は追加しない。

バイナリの列挙値・数値範囲は収集時に検査する。個体値は元データの H/A/B/S/C/D 順から並び替える。既知の非対応条件も自動で捨てず、相対パス・理由・根拠を持つ除外設定を必要とする。初回709件の内訳は700件を収録、アイテムカード9件を対象外とし、補正・個別除外なし。

全700定義を各対象ソフトのWASM構築と少量生成へ通すブラウザ統合テストを持つ。従来のPokeFinder由来3件の生成条件・期待値は `src/test/fixtures/wondercards/` に保持し、製品カタログから独立して照合する。実機での個体照合は未実施。

将来の画面では `useSearchConfig(false)` を使い、開始時にカードID・表示名・変換済み条件・起動設定・範囲・フィルターを `structuredClone` して保持する。日時結果から一覧へ渡す場合も、結果の `source` と実行時設定を使う。

詳細な収録数・検証結果は [local_125](../../../spec/agent/complete/local_125/WONDER_CARD_COLLECTION.md) を参照する。
