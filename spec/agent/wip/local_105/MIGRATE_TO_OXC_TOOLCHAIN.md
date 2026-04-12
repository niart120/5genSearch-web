# ESLint/Prettier → oxlint/oxfmt 移行 仕様書

## 1. 概要

### 1.1 目的

フロントエンドの linter/formatter を ESLint + Prettier から oxlint + oxfmt へ移行し、ツールチェインを Oxc エコシステムに統一する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| oxlint | Oxc プロジェクトが提供する Rust 製 JavaScript/TypeScript リンター |
| oxfmt | Oxc プロジェクトが提供する Rust 製フォーマッター（Prettier 互換） |
| `@oxlint/migrate` | ESLint flat config を `.oxlintrc.json` に変換する公式 CLI ツール |
| `oxfmt --migrate=prettier` | `.prettierrc` を `.oxfmtrc.jsonc` に変換する oxfmt 組み込み機能 |

### 1.3 背景・問題

- ESLint は JavaScript 製であり、プロジェクト規模に対して実行速度に改善の余地がある
- ESLint + Prettier の組み合わせは 11 個の npm パッケージに依存しており、依存関係の管理コストが高い
- Vite が Oxc エコシステム（Rolldown）に移行しており、ツールチェインの統一が合理的

### 1.4 期待効果

| 指標 | 現行 | 移行後 |
|------|------|--------|
| linter/formatter 関連 npm 依存数 | 13 パッケージ | 2 パッケージ (`oxlint`, `oxfmt`) |
| lint 実行速度 | ESLint 基準 | oxlint 公称 50-100x 高速 |
| format 実行速度 | Prettier 基準 | oxfmt 公称 30x 高速 |

### 1.5 着手条件

- `oxfmt` npm パッケージがインストール可能であること（`pnpm add -D oxfmt` が成功すること）
- oxlint v1.59+ が利用可能であること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 変更 | devDependencies 入れ替え、scripts 書き換え、lint-staged 削除 |
| `eslint.config.js` | 削除 | ESLint 設定ファイル |
| `.prettierrc` | 削除 | Prettier 設定ファイル |
| `.prettierignore` | 削除 | Prettier 除外パターン（oxfmt config に統合） |
| `.oxlintrc.json` | 新規 | oxlint 設定ファイル |
| `.oxfmtrc.jsonc` | 新規 | oxfmt 設定ファイル |
| `.github/workflows/ci.yml` | 変更 | lint-ts ジョブのステップ名・コマンド更新 |
| `.vscode/settings.json` | 変更 | formatter 拡張・設定の差替え |
| `.vscode/extensions.json` | 新規 | oxc 拡張を recommendations に追加 |
| `.husky/pre-commit` | 変更 | lint-staged 呼び出しを直接コマンドに変更 |
| `.gitignore` | 変更 | `.eslintcache` → oxlint 関連に変更 |
| `.github/copilot-instructions.md` | 変更 | ツール名・コマンド例の更新 |
| `.github/instructions/typescript.instructions.md` | 変更 | Linter/Formatter 記載の更新 |
| `.github/prompts/pr-merge-cleanup.prompt.md` | 変更 | ESLint → oxlint への言及更新 |

## 3. 設計方針

### 3.1 移行戦略

ESLint → oxlint、Prettier → oxfmt を同一ブランチで一括移行する。oxlint と ESLint の併用（段階的移行）は行わない。

理由: 現行 ESLint のカスタムルールが少なく（3 ルール + プラグイン recommended）、全て oxlint ネイティブプラグインでカバーされているため。

### 3.2 oxlint 設定方針

- 設定ファイル形式: `.oxlintrc.json`
- `@oxlint/migrate` で `eslint.config.js` から自動変換後、手動で調整
- デフォルトプラグイン（`eslint`, `typescript`, `unicorn`, `oxc`）に加え、`react`、`import` プラグインを有効化
- `unicorn` プラグインは oxlint 対応済みルールのみ有効（未対応ルールは許容する）

### 3.3 oxfmt 設定方針

- 設定ファイル形式: `.oxfmtrc.jsonc`
- `oxfmt --migrate=prettier` で `.prettierrc` から自動変換
- 現行 Prettier 設定との対応:

| Prettier 設定 | 値 | oxfmt 対応 |
|---|---|---|
| `semi` | `true` | `"semi": true` |
| `singleQuote` | `true` | `"singleQuote": true` |
| `tabWidth` | `2` | `"tabWidth": 2` |
| `trailingComma` | `"es5"` | `"trailingComma": "es5"` |
| `printWidth` | `100` | `"printWidth": 100`（oxfmt デフォルトと一致） |
| `bracketSpacing` | `true` | `"bracketSpacing": true` |
| `endOfLine` | `"lf"` | `"endOfLine": "lf"` |

- `.prettierignore` の内容は `.oxfmtrc.jsonc` の `"ignorePatterns"` に統合

### 3.4 lint-staged の扱い

lint-staged を devDependencies から削除し、`.husky/pre-commit` を直接コマンド実行に変更する。

理由: lint-staged の設定ファイルが存在しない現状であり、ステージングされたファイルのみの lint は oxlint 単体で十分高速なため、全ファイル lint でも許容範囲内と判断。

### 3.5 VS Code 拡張

- `esbenp.prettier-vscode` → `oxc.oxc-vscode` に変更
- oxc 拡張は linter / formatter 両方を提供するため、1 つの拡張で完結する

## 4. 実装仕様

### 4.1 package.json: devDependencies

削除:

```jsonc
// 以下 13 パッケージを削除
"@eslint/js"
"eslint"
"eslint-config-prettier"
"eslint-import-resolver-typescript"
"eslint-plugin-import"
"eslint-plugin-react-hooks"
"eslint-plugin-react-refresh"
"eslint-plugin-unicorn"
"globals"
"typescript-eslint"
"prettier"
"lint-staged"
```

追加:

```json
{
  "oxlint": "^1.59.0",
  "oxfmt": "latest"
}
```

> `oxfmt` のバージョンは作業着手時に npm で確認し、具体的なバージョンに固定する。

### 4.2 package.json: scripts

```jsonc
{
  // Linter
  "lint":         "oxlint && cargo clippy -p wasm-pkg --all-targets -- -D warnings",
  "lint:ts":      "oxlint",
  "lint:ts:full": "oxlint",
  // lint:ts:fast は削除（oxlint は十分高速なため不要）

  // Formatter
  "format":          "oxfmt && cargo fmt",
  "format:ts":       "oxfmt",
  "format:check":    "oxfmt --check && cargo fmt --check",
  "format:check:ts": "oxfmt --check"
}
```

### 4.3 .oxlintrc.json（新規作成）

`npx @oxlint/migrate eslint.config.js` で生成した結果をベースに、以下の構成とする:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "react", "import", "oxc"],
  "categories": {
    "correctness": "error"
  },
  "env": {
    "browser": true
  },
  "rules": {
    "typescript/no-explicit-any": "error",
    "import/no-cycle": "error",
    "import/no-duplicates": "error",
    "unicorn/prevent-abbreviations": "off"
  },
  "ignorePatterns": [
    "dist",
    "target",
    "wasm-pkg/pkg",
    "src/wasm",
    "src/i18n/locales",
    "**/*.md"
  ]
}
```

> `@oxlint/migrate` の出力結果と差異がある場合は手動で調整する。`react` プラグインには `eslint-plugin-react-hooks` と `eslint-plugin-react-refresh` のルールが含まれる。

### 4.4 .oxfmtrc.jsonc（新規作成）

`oxfmt --migrate=prettier` で生成した結果をベースに、以下の構成とする:

```jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "endOfLine": "lf",
  "ignorePatterns": [
    "dist",
    "node_modules",
    "pnpm-lock.yaml",
    "*.wasm",
    "wasm-pkg/pkg",
    "src/wasm",
    "*.md",
    "spec/**/*.json"
  ]
}
```

### 4.5 .github/workflows/ci.yml

`lint-ts` ジョブ内のステップを変更:

```yaml
      - name: oxlint
        run: pnpm lint:ts

      - name: oxfmt check
        run: pnpm format:check:ts

      - name: TypeScript check
        run: pnpm exec tsc -b --noEmit
```

### 4.6 .vscode/settings.json

```jsonc
{
  "editor.formatOnSave": true,
  "editor.formatOnSaveMode": "modifications",
  "editor.defaultFormatter": "oxc.oxc-vscode",
  // "prettier.requireConfig": true を削除
  "[typescript]": {
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.formatOnSave": true
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true
  }
  // 以下既存設定は維持
}
```

### 4.7 .vscode/extensions.json（新規作成）

```json
{
  "recommendations": ["oxc.oxc-vscode"]
}
```

### 4.8 .husky/pre-commit

```sh
pnpm lint:ts
pnpm format:check:ts
```

### 4.9 .gitignore

`.eslintcache` の行を削除（oxlint はキャッシュファイルを生成しない）。

### 4.10 ドキュメント更新

#### .github/copilot-instructions.md

| 箇所 | 変更前 | 変更後 |
|------|--------|--------|
| フロントエンド技術スタック | `ESLint + Prettier` | `oxlint + oxfmt` |
| コーディング規約 | `ESLint/Prettier設定に準拠` | `oxlint/oxfmt 設定に準拠` |

#### .github/instructions/typescript.instructions.md

| 箇所 | 変更前 | 変更後 |
|------|--------|--------|
| ツールチェイン Linter | `ESLint (eslint.config.js)` | `oxlint (.oxlintrc.json)` |
| ツールチェイン Formatter | `Prettier (.prettierrc)` | `oxfmt (.oxfmtrc.jsonc)` |
| 基本規約 | `ESLint/Prettier 設定に準拠` | `oxlint/oxfmt 設定に準拠` |

#### .github/prompts/pr-merge-cleanup.prompt.md

| 箇所 | 変更前 | 変更後 |
|------|--------|--------|
| エラー参照 | `ESLint / clippy エラー` | `oxlint / clippy エラー` |

### 4.11 削除対象ファイル

- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`

## 5. テスト方針

移行はツールチェイン変更であり、アプリケーションコードの動作には影響しない。以下の手順で検証する。

| # | 検証項目 | 実行コマンド | 期待結果 |
|---|----------|-------------|----------|
| 1 | oxlint が正常終了する | `pnpm lint:ts` | exit 0、意図しないエラーなし |
| 2 | oxfmt --check が通る | `pnpm format:check:ts` | exit 0（差分なし） |
| 3 | TypeScript 型チェック | `pnpm exec tsc -b --noEmit` | exit 0 |
| 4 | 既存テストが通る | `pnpm test:run` | 全テスト pass |
| 5 | ビルドが成功する | `pnpm build` | dist 出力成功 |
| 6 | pre-commit hook 動作 | `git commit` でフック発火 | lint/format check 実行 |
| 7 | CI パイプライン | push 後の CI 結果 | 全ジョブ green |

フォーマット差分が発生する場合は `oxfmt` で全ファイルフォーマットし、差分を移行コミットに含める。その際、`.git-blame-ignore-revs` にコミット SHA を記録して `git blame` から除外する。

## 6. 実装チェックリスト

- [ ] 作業ブランチ作成 (`chore/migrate-oxc-toolchain` 等)
- [ ] `oxfmt`, `oxlint` を `pnpm add -D` でインストール
- [ ] `npx @oxlint/migrate eslint.config.js` で `.oxlintrc.json` 生成・調整
- [ ] `npx oxfmt --migrate=prettier` で `.oxfmtrc.jsonc` 生成・調整
- [ ] `eslint.config.js`, `.prettierrc`, `.prettierignore` を削除
- [ ] ESLint/Prettier 関連 devDependencies を削除 (`pnpm remove`)
- [ ] `lint-staged` を削除 (`pnpm remove`)
- [ ] `package.json` の scripts を更新
- [ ] `.husky/pre-commit` を更新
- [ ] `.gitignore` から `.eslintcache` を削除
- [ ] `.vscode/settings.json` を更新
- [ ] `.vscode/extensions.json` を新規作成
- [ ] `.github/workflows/ci.yml` を更新
- [ ] `.github/copilot-instructions.md` を更新
- [ ] `.github/instructions/typescript.instructions.md` を更新
- [ ] `.github/prompts/pr-merge-cleanup.prompt.md` を更新
- [ ] `oxfmt` でフォーマット実行、差分コミット
- [ ] `pnpm lint:ts` 通過確認
- [ ] `pnpm format:check:ts` 通過確認
- [ ] `pnpm exec tsc -b --noEmit` 通過確認
- [ ] `pnpm test:run` 通過確認
- [ ] `.git-blame-ignore-revs` にフォーマットコミット SHA を記録
- [ ] CI 全ジョブ green 確認
