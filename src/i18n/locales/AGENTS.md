# Translation Catalog Guide

## Scope

- このディレクトリ配下の翻訳カタログに適用する。

## Workflow

1. `pnpm lingui:extract` でソースコードからメッセージを抽出する。
2. 各ロケールの `messages.po` に翻訳を記入する。
3. `pnpm lingui:compile` で `messages.ts` にコンパイルする。
4. コンパイル済み `messages.ts` はバージョン管理対象として扱う。

## Style

- 絵文字や装飾的記号は使わない。
- 日本語 (`ja`) は口語体、ですます調を基本にする。
- 英語 (`en`) は sentence case を基本にする。
- プレースホルダ (`{name}` など) の順序と数を原文と一致させる。

## Editing Rules

- `messages.ts` は自動生成ファイルのため手動編集しない。
- 翻訳作業は `messages.po` に対して行う。
