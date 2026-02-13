# Git Hooks 統合・強化 仕様書

## 1. 概要

### 1.1 目的

Git hooks を Husky に一元化し、commit 時と push 時に適切なチェックを自動実行する仕組みを整備する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Husky | Git hooks をリポジトリ管理下で定義・共有するツール。`.husky/` ディレクトリにフックスクリプトを配置する |
| lint-staged | ステージ済みファイルのみを対象に任意のコマンドを実行するツール |
| pre-commit | `git commit` 実行直前に走る Git hook |
| pre-push | `git push` 実行直前に走る Git hook |

### 1.3 背景・問題

現状、Git hooks が 2 系統共存しており、機能に抜け漏れがある。

**系統 1: Husky + lint-staged (稼働中)**

- `.husky/pre-commit` → `pnpm exec lint-staged`
- `.lintstagedrc.json` は Prettier / `cargo fmt` のみ (フォーマッタ限定)
- ESLint / clippy / tsc は実行されない

**系統 2: `.git/hooks/pre-commit.ps1` (未稼働)**

- ESLint → tsc → Prettier → clippy → rustfmt を全て実行
- Husky v9 が `core.hooksPath` を `.husky/` に設定するため、`.git/hooks/` は一切実行されない
- `.git/hooks/` はリポジトリにトラッキングされず、他の開発環境に共有されない

**発生した問題**

local_074 (StatsFilter 統合) で以下の lint エラーがコミット時に検出されず、マージ後に発覚した:

| ファイル | ルール | 内容 |
|---|---|---|
| `egg-filter-form.tsx` | `import/no-duplicates` | `wasm_pkg.js` からの import が 2 箇所に分散 |
| `egg-list-page.tsx` | `unicorn/no-useless-undefined` | IIFE 内の `return undefined` |
| `pokemon-list-page.tsx` | `unicorn/no-useless-undefined` | 同上 |

### 1.4 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| commit 時の ESLint 実行 | なし | 差分ファイル対象に実行 |
| commit 時の clippy 実行 | なし | `.rs` 差分がある場合に実行 |
| push 時の全ファイル lint | なし | ESLint + clippy を全ファイル対象に実行 |
| フック管理の一元性 | 2 系統共存 | Husky のみ |
| `.git/hooks/` のカスタムスクリプト | 3 ファイル (未稼働) | 削除 |

### 1.5 着手条件

- なし (開発インフラ改善)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `.lintstagedrc.json` | 変更 | ESLint / clippy を追加 |
| `.husky/pre-commit` | 変更なし | 既存のまま (`pnpm exec lint-staged`) |
| `.husky/pre-push` | 新規 | 全ファイル対象の lint + 型チェック |
| `.git/hooks/pre-commit` | 削除 | 未稼働のシェルラッパー |
| `.git/hooks/pre-commit.ps1` | 削除 | 未稼働の PowerShell スクリプト |

## 3. 設計方針

### 3.1 pre-commit: 差分ファイル対象の高速チェック

lint-staged を拡張し、ステージ済みファイルに対して linter + formatter を実行する。

コミットのたびに実行されるため高速性を重視する:

- TS/JS ファイル: ESLint (`--fix`) → Prettier (`--write`)
- Rust ファイル: `cargo clippy` → `cargo fmt`

`tsc` は単一ファイル指定での実行ができないため、lint-staged には含めない。代わりに pre-push で全体チェックする。

### 3.2 pre-push: 全ファイル対象の包括チェック

push 前に全ファイルを対象とした包括的なチェックを実行する:

1. `pnpm lint` (ESLint 全体 + clippy 全体)
2. `pnpm exec tsc -b --noEmit` (TypeScript 型チェック)
3. `pnpm format:check` (Prettier + rustfmt のチェックモード)

push は commit より頻度が低いため、全ファイル対象でも許容できる。

### 3.3 `.git/hooks/` のカスタムスクリプト削除

`.git/hooks/pre-commit` と `.git/hooks/pre-commit.ps1` は Husky により無効化されており機能していない。混乱を避けるため削除する。これらは `.git/` 配下であるため Git トラッキング外であり、コミットには含まれない。手動削除のみ。

### 3.4 lint-staged の ESLint 実行に関する注意点

lint-staged で ESLint を `--fix` 付きで実行する場合、auto-fixable なルール (例: `import/no-duplicates`) は自動修正される。auto-fix 不可能なエラーがある場合はコミットが中断される。

`--fix` による意図しない書き換えを避けたい場合は、`eslint` (fix なし) のみにして、エラー時にコミットを止める方式も選択可能。

### 3.5 clippy のワーキングディレクトリ

`cargo clippy` は `wasm-pkg/` ディレクトリで実行する必要がある。lint-staged の設定では直接 `cd` できないため、ラッパースクリプトを用いるか、`package.json` の既存スクリプト (`lint` の clippy 部分) を活用する。

lint-staged の Rust ファイル向け設定では、対象ファイルの有無をトリガーとして `cargo clippy -p wasm-pkg --all-targets -- -D warnings` を実行する。lint-staged はファイルパスを引数として渡すが、clippy はファイル単位の指定に対応しないため、コマンドに `() =>` 関数形式を使うか、渡されたファイルパスを無視してプロジェクト全体を対象にする。

## 4. 実装仕様

### 4.1 `.lintstagedrc.json` 変更後

```json
{
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,css,html}": "prettier --write",
  "*.rs": [
    "cargo clippy -p wasm-pkg --all-targets -- -D warnings",
    "cargo fmt --"
  ]
}
```

lint-staged v16 では、`*.rs` に対してファイル引数が渡されるが、`cargo clippy` はファイル引数を無視しプロジェクト全体をチェックする。`cargo fmt --` は指定ファイルのみフォーマットする。

### 4.2 `.husky/pre-push` 新規作成

```sh
pnpm lint
pnpm exec tsc -b --noEmit
pnpm format:check
```

### 4.3 `.git/hooks/` カスタムスクリプト削除手順

手動で以下を削除する:

```powershell
Remove-Item .git/hooks/pre-commit -ErrorAction SilentlyContinue
Remove-Item .git/hooks/pre-commit.ps1 -ErrorAction SilentlyContinue
```

`.git/hooks/*.sample` ファイルは Git のデフォルトであり、削除不要。

## 5. テスト方針

### 5.1 pre-commit の動作確認

| テスト | 検証内容 | 方法 |
|--------|----------|------|
| ESLint auto-fix | `import/no-duplicates` が自動修正される | 意図的に重複 import を作成してコミット |
| ESLint エラー中断 | auto-fix 不可なエラーでコミットが中断される | 未使用変数を含むファイルをコミット |
| Prettier | フォーマット崩れが自動修正される | インデント崩れのファイルをコミット |
| clippy | `.rs` ステージ時に clippy が実行される | clippy 警告のある Rust コードをコミット |
| `cargo fmt` | Rust ファイルが自動フォーマットされる | フォーマット崩れの `.rs` をコミット |
| 非対象ファイル | `.md` のみの変更時に ESLint/clippy が実行されない | `.md` のみをステージしてコミット |

### 5.2 pre-push の動作確認

| テスト | 検証内容 | 方法 |
|--------|----------|------|
| ESLint 全体 | 全 TS ファイルが lint される | `pnpm lint` の出力を確認 |
| tsc | 型エラーで push が中断される | 型エラーを含むコードを push |
| format:check | フォーマット差分で push が中断される | 未フォーマットのコードを push |

### 5.3 `cargo clippy` のファイル引数の挙動確認

lint-staged がファイル引数を渡した際に `cargo clippy` がエラーにならず正常動作することを事前確認する。

```powershell
cargo clippy -p wasm-pkg --all-targets -- -D warnings wasm-pkg/src/lib.rs
```

上記でエラーが出る場合、lint-staged 設定を関数形式に変更してファイル引数を無視する:

```json
{
  "*.rs": () => [
    "cargo clippy -p wasm-pkg --all-targets -- -D warnings",
    "cargo fmt --"
  ]
}
```

この場合、設定ファイルを `.lintstagedrc.json` から `.lintstagedrc.mjs` に変更する必要がある。

## 6. 実装チェックリスト

- [ ] `.git/hooks/pre-commit` 削除
- [ ] `.git/hooks/pre-commit.ps1` 削除
- [ ] `.lintstagedrc.json` に ESLint + clippy 追加
- [ ] `cargo clippy` のファイル引数挙動確認、必要に応じ `.lintstagedrc.mjs` に変更
- [ ] `.husky/pre-push` 新規作成
- [ ] pre-commit 動作確認: ESLint auto-fix
- [ ] pre-commit 動作確認: ESLint エラー中断
- [ ] pre-commit 動作確認: clippy 実行
- [ ] pre-commit 動作確認: 非対象ファイルのみの変更で不要なチェックが走らない
- [ ] pre-push 動作確認: `pnpm lint` + `tsc` + `format:check` 通過
- [ ] pre-push 動作確認: エラー時に push 中断
