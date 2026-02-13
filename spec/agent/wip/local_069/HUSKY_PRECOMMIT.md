# pre-commit フック共有化 (Husky 導入) 仕様書

## 1. 概要

### 1.1 目的

pre-commit フック設定をリポジトリ管理に含め、チーム間でフォーマットチェックを共有する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Husky | Git フックをリポジトリ管理下に置くための npm パッケージ |
| lint-staged | Git ステージング済みファイルに対してのみ lint / format を実行するツール |

### 1.3 背景・問題

- 現状 `.git/hooks/pre-commit.ps1` で手動設定しているが、リポジトリ管理外のため共有されない
- Lingui の生成物 (`src/i18n/locales/**/*.ts`) は自動生成ファイルだが、Prettier のチェック対象に含まれている
- ESLint は `src/i18n/locales` を除外済み (適切)
- `.prettierignore` には `src/i18n/locales` の除外エントリがない
- CI (`pnpm format:check`) で全体検査するため、ローカルでのフォーマット漏れが CI で検知される

### 1.4 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| フォーマット漏れの検知タイミング | CI 実行時 (push 後) | コミット時 (ローカル) |
| フック設定の共有 | 手動 `.git/hooks/` 配置 | `pnpm install` 時に自動設定 |

### 1.5 着手条件

- なし (独立した DevOps 改善)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|--------|---------|---------|
| `package.json` | 変更 | `husky`, `lint-staged` を devDependencies に追加、`prepare` スクリプト追加 |
| `.husky/pre-commit` | 新規 | lint-staged 実行コマンド |
| `.lintstagedrc.json` | 新規 | lint-staged 設定 |

## 3. 設計方針

### 3.1 Husky + lint-staged 構成

Husky v9 を使用し、`prepare` スクリプトで `husky` を実行して `.husky/` ディレクトリのフックを Git に登録する。

lint-staged はステージング済みファイルに対してのみ処理を実行する。対象:

| glob パターン | 実行コマンド | 備考 |
|--------------|------------|------|
| `*.{ts,tsx,js,jsx,json,css,html}` | `prettier --write` | TS/JSON/CSS 等のフォーマット |
| `*.rs` | `cargo fmt --` | Rust コードのフォーマット |

### 3.2 Lingui 生成物の扱い

`src/i18n/locales/**/*.ts` は `pnpm lingui:compile` の自動生成ファイルである。
Prettier チェック対象に含めることで、生成物のフォーマットが統一される。

方針:
- **`lingui:compile` 後に `prettier --write` を手動実行する運用は不要** — lint-staged がコミット時に自動整形する
- `.prettierignore` への除外追加は行わない (現状維持)
- Lingui 生成物がステージングされた場合、lint-staged が Prettier で整形してからコミットする

### 3.3 Rust ファイルの対象化

`*.rs` ファイルがステージングされた場合、`cargo fmt` で整形する。
`cargo fmt --` は引数としてファイルパスを受け取り、該当ファイルのみを整形する。

## 4. 実装仕様

### 4.1 package.json の変更

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.1.0",
    "lint-staged": "^16.1.0"
  }
}
```

### 4.2 `.husky/pre-commit`

```sh
pnpm exec lint-staged
```

### 4.3 `.lintstagedrc.json`

```json
{
  "*.{ts,tsx,js,jsx,json,css,html}": "prettier --write",
  "*.rs": "cargo fmt --"
}
```

## 5. テスト方針

| テスト | 分類 | 検証内容 |
|-------|------|---------|
| Husky セットアップ | 手動 | `pnpm install` 後に `.husky/_/husky.sh` が生成されること |
| pre-commit 動作 | 手動 | 未整形ファイルをステージングしてコミットすると、自動整形されてコミットされること |
| Lingui 生成物 | 手動 | `lingui:compile` → `git add` → `git commit` で Prettier 整形が適用されること |

自動テストの対象外。CI (`pnpm format:check`) は引き続き全体をチェックする (安全ネット)。

## 6. 実装チェックリスト

- [x] `husky` と `lint-staged` を devDependencies に追加
- [x] `package.json` に `"prepare": "husky"` スクリプトを追加
- [x] `.husky/pre-commit` ファイルを作成
- [x] `.lintstagedrc.json` ファイルを作成
- [x] `pnpm install` を実行して Husky をセットアップ
- [x] 未整形ファイルのコミットで lint-staged が動作することを手動確認
- [ ] CI が引き続き正常に動作することを確認
