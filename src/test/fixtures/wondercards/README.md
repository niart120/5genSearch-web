# PokeFinder の生成条件と固定期待値

`pokefinder.ts` は旧製品データ `src/data/wondercards/data/v1/pokefinder.json` の3件の生成条件を保持する。タイトル・言語は検証用の表示材料で、製品ローダーから参照しない。

`pokefinder-results.json` は https://github.com/Admiral-Fish/PokeFinder/blob/ecf97624791aec147960c4f48b92ad492945b05c/Test/Gen5/event5.json の値を保持する。配布タマゴの受取人IDはテスト実行時だけ指定する。

PokeFinder の `advances` は絶対消費位置、このアプリの `advance` は起動時消費後の相対位置。seed=0、続きから、セーブあり、思い出リンク無効の起動時消費を含め、比較可能な絶対位置の期待値を使う。先頭行同士の一致を前提としない。実機での照合とは別の検証である。
