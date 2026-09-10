# 配達員カード定義

`data/v1/pokefinder.json` の生成条件は PokeFinder のコミット `ecf97624791aec147960c4f48b92ad492945b05c` の [Gen 5 event fixtures](https://github.com/Admiral-Fish/PokeFinder/blob/ecf97624791aec147960c4f48b92ad492945b05c/Test/Gen5/event5.json) から転記した事実データ。テスト内の受取人 ID はカードへ転記せず、配布タマゴは実行時の受取人 ID を使用する。

## 値の対応

個体値・性格の `255` は未指定。性別の `0` / `1` は Male / Female、`2` は性別固定なし。特性の `0` / `1` は First / Second。個体値の順序は H・A・B・C・D・S。生成用のスクリプトや `.pgf` の読み込み機能は含めない。

カード名・対象 ROM は配布アーカイブでも確認した（2026-09-10）。

| ID | 配布資料 | 対象 ROM |
|----|----------|----------|
| `secret-egg-pidove` | [Ash's Pidove](https://projectpokemon.org/home/files/file/694-ashs-pidove/) | BW |
| `spring-2013-meloetta` | [Spring Meloetta](https://projectpokemon.org/home/files/file/706-spring-meloetta/) | BW / BW2 |
| `event11-zoroark` | [Snarl Zoroark (Toys R Us)](https://projectpokemon.org/home/files/file/705-snarl-zoroark-toys-r-us/) | BW |

`versions` はゲームの世代・バージョン適合を表し、配布言語・リージョンの受信可否は表さない。実機で受け取った個体との比較検証は未実施。

## 検証境界

`loader.ts` が ID・表示名・対象 ROM・配布区分と ID 指定を検証し、JSON の `null` を `undefined` に変換する。`converter.ts` は配布元または受取人の ID を選び、固定個体値を六要素の公開入力へ変換する。種族・レベル・乱数条件の値域と整合性は Rust の構築時に検証する。同梱全カードを WASM の構築と生成へ通すブラウザ統合テストを持つ。

将来の画面では `useSearchConfig(false)` を使い、開始時にカード ID・表示名・変換済み条件・起動設定・範囲・フィルターを `structuredClone` して保持する。実行中の入力変更から結果の意味を保護する。日時結果から一覧へ渡す場合も、結果の `source` と実行時設定を使う。
