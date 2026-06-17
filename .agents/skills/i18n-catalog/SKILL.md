---
name: i18n-catalog
description: Update Lingui translation catalogs for this React app. Use when Codex is asked for $i18n-catalog, i18n, Lingui, translation, 翻訳, 文言追加, messages.po, messages.ts, locale copy, or extracting/compiling user-facing UI text.
---

# i18n Catalog

Lingui の翻訳カタログを更新する手順。対象は `src/i18n/locales/{locale}/messages.po` と生成物 `messages.ts`。

## Workflow

1. `AGENTS.md`、`src/AGENTS.md`、`src/i18n/locales/AGENTS.md` を確認する。
2. `lingui.config.ts` を確認し、`sourceLocale`、`locales`、catalog path を現在の設定として扱う。
3. ユーザ向けテキストを追加・変更した場合は、ソース側で Lingui macro を使う。
   - JSX 表示文言: `Trans` from `@lingui/react/macro`
   - TS 内の文言: `t` / `msg` from `@lingui/core/macro`
4. `pnpm lingui:extract` を実行して `messages.po` を更新する。
5. 各 locale の `messages.po` を編集する。`messages.ts` は手動編集しない。
6. `pnpm lingui:compile` を実行して `messages.ts` を再生成する。
7. 生成物を含む差分を確認し、必要なら `pnpm format:ts` を実行する。

## Translation Rules

- ソースロケールは `lingui.config.ts` を正とする。現行設定では `sourceLocale: 'en'`。
- 日本語 (`ja`) は口語体、ですます調を基本にする。
- 英語 (`en`) は sentence case を基本にする。
- 絵文字や装飾的記号は使わない。
- プレースホルダ (`{name}` など) の順序と数を原文と一致させる。
- 既存の同種文言がある場合は、訳語と表記を合わせる。
- 翻訳キーが不要になった場合は、手で削る前に `pnpm lingui:extract` の結果を優先する。

## Verification

- カタログ更新後は最低限 `pnpm lingui:extract` と `pnpm lingui:compile` の成功を確認する。
- UI 表示に関わる変更では、該当コンポーネントのテストまたは手動確認を追加で行う。
- `pnpm lingui:extract`、`pnpm lingui:compile`、`pnpm format:ts` が pnpm store 権限で失敗した場合は、コード変更で回避せず、実行環境または権限を整えて同じコマンドを再実行する。
