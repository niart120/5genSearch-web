# Agent Spec Guide

## Scope

- `spec/agent` 配下の仕様書、設計メモ、完了記録に適用する。
- 技術文書は事実ベースで簡潔に書き、主観的評価や装飾を避ける。

## Spec Placement

- 新規執筆または着手中の仕様書は `spec/agent/wip/local_{連番}/` に置く。
- 完了済み仕様書は `spec/agent/complete/local_{連番}/` に置く。
- ファイル名は `FEATURE_NAME.md` 形式の大文字スネークケースにする。
- 実装完了後は `wip` から `complete` に移動する。

## Required Spec Sections

```markdown
# {機能名} 仕様書

## 1. 概要
### 1.1 目的
### 1.2 用語定義
### 1.3 背景・問題
### 1.4 期待効果
### 1.5 着手条件

## 2. 対象ファイル
| ファイル | 変更種別 | 変更内容 |

## 3. 設計方針

## 4. 実装仕様

## 5. テスト方針

## 6. 実装チェックリスト
```

## Spec Writing Rules

- 用語定義は表形式で統一する。
- コード例は実装言語を指定したコードブロックで記載する。
- 性能要件と期待効果は、可能な範囲で表形式かつ定量的に記載する。
- チェックリストはタスク完了後に `[x]` で更新する。
- Markdown は H1 をページタイトルに限定し、H2 / H3 を構造的に使う。

## Domain-Specific Specs

- 仕様書の作成、更新、完了移動を行う場合は `.agents/skills/spec-format/SKILL.md` を使う。
- 設計メモを `spec/agent/notes/dev-journal.md` に追記する場合は `.agents/skills/dev-journal/SKILL.md` を使う。
- TypeScript / React の仕様書を書く場合は、root `AGENTS.md` の Coding Rules と `src/AGENTS.md` に従う。
- フロントエンドの配置や責務を扱う仕様書では `spec/agent/architecture/frontend-structure.md` を参照する。
- Rust/WASM の仕様書を書く場合は、`wasm-pkg/AGENTS.md` に従う。
- Rust/WASM の配置やモジュール設計を扱う仕様書では `spec/agent/architecture/rust-structure.md` を参照する。

## Dev Journal

- `spec/agent/notes/dev-journal.md` に時系列で追記する。
- テーマが大きくなった場合は、該当エントリを削除して別途仕様書として再構築する。
- エントリ形式は次の通り:

```markdown
## YYYY-MM-DD: {タイトル}

{本文}
```

- 各エントリは最大 10 行程度にまとめ、現状、観察、当面の方針を含める。
- 実装手順や TODO リストの代用にしない。
