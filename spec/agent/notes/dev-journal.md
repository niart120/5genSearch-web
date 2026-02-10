# 開発ジャーナル (Dev Journal)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-09: calculate_game_offset / TID-SID 生成ロジックの整理

`offset.rs` には BW 3 パターン + BW2 5 パターンの計 8 関数が個別定義されている。
各パターンは「前半の乱数消費列 + チラーミィ/チラチーノ PID・ID 決定 + TID/SID 決定」という共通構造を持つ。
`advance_to_tid_sid_point_bw/bw2` も `bw_new_game_*` / `bw2_new_game_*` と処理が重複している。

以下のリファクタリングが考えられる:
- 各パターンの "前半消費列" をデータ駆動 (ステップ列) で表現し、ディスパッチ関数を統一する
- `calculate_game_offset` と `calculate_trainer_info` で重複する前半処理を共通化する
- ただしパターン数が有限かつコメントで元実装との対応が明示されているため、可読性とのトレードオフがある

## 2026-02-10: pre-commit と Lingui 生成物の整合

現状: `.git/hooks/pre-commit.ps1` で `src/i18n/locales/` を除外し、CI は `pnpm format:check` で全体を検査している。
観察: フックはリポジトリ管理外のため共有されず、生成物の整形漏れが CI で検知される。
当面の方針: `src/i18n/locales/` をチェック対象に戻し、Husky でフック設定をリポジトリ管理に含める方針を検討する。

## 2026-02-10: PC 版 FeatureContent 内部のレイアウト構成

現状 design-system.md のレイアウト図および各機能 spec (DATETIME_SEARCH.md, EGG_SEARCH.md) では、FeatureContent 内部を「上: フォーム → 下: 結果テーブル」の縦積みで暗黙に前提としている。
PC 版では横幅に余裕があるため、フォームと結果を左右に分割する構成 (メインエリア内 2 ペイン = アプリ全体 3 ペイン) も候補になりうる。
ただし入力項目数が機能ごとに大きく異なるため、一律の分割が適切かは検証が必要。
起動時刻検索 (local_054) の実装時に、実際のフォーム量と結果表示を見ながら判断するのが適切。

## 2026-02-10: メインコンテンツのグローバル max-width 廃止

現状: `ResponsiveContainer` の外枠 `div` に `max-w-screen-xl mx-auto` (1280px 中央寄せ) を適用していた。
観察: VS Code / Slack / Discord / Teams 等のワークベンチ型アプリでは、メインコンテンツにグローバルな `max-width` を設けていない。テーブルやフォームが主体のツール系 UI では、幅が広いほど情報表示に有効。`max-width` が有効なのは長文テキスト主体のコンテンツ閲覧型 UI (ブログ、ドキュメントサイト) に限られる。
当面の方針: グローバルな `max-width` を廃止し、個別コンポーネントが必要に応じて自身の `max-width` を設定する方式に変更する (local_058)。
