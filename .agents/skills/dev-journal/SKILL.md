---
name: dev-journal
description: Append or maintain concise design notes in spec/agent/notes/dev-journal.md. Use when Codex is asked for $dev-journal, dev journal, 設計メモ, 開発メモ, observations, future consideration notes, or preserving implementation insights that are too small for a full spec.
---

# Dev Journal

`spec/agent/notes/dev-journal.md` に設計上の気づき、疑問、将来検討事項を残す手順。

## Workflow

1. `AGENTS.md` と `spec/agent/AGENTS.md` を確認する。
2. 既存の `spec/agent/notes/dev-journal.md` を読み、同一テーマの重複エントリがないか確認する。
3. 新規追記か既存エントリ更新かを判断する。
4. 大きなテーマなら dev journal ではなく `$spec-format` で仕様書化する。
5. 追記する場合は `references/entry-template.md` の形に従う。

## Rules

- 追記先は `spec/agent/notes/dev-journal.md` に固定する。
- 見出しは `## YYYY-MM-DD: {タイトル}` にする。
- 日付は現在地のローカル日付を使う。必要なら `Get-Date -Format yyyy-MM-dd` で確認する。
- 1 エントリは最大 10 行程度にする。
- 本文には `現状`、`観察`、`当面の方針` を含める。
- 主観的評価、議論の経緯、TODO リスト、実装手順の代用を書かない。
- コード例やデータ構造を書く場合は言語指定付きコードブロックにする。
- 関連する仕様書や実装ファイルへの参照を含める。

## Promotion

- エントリが大きくなった場合は、該当エントリを削除して `spec/agent/wip/local_XXX/` の仕様書へ再構築する。
- 仕様書化した場合は、dev journal に同じ内容を重複して残さない。
