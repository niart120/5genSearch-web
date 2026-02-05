# WASM ビルド構成 仕様書

## 1. 概要

### 1.1 目的

wasm-pack によるビルド成果物の配置先・Git 管理方針・TypeScript 側からの参照経路を整備し、開発体験と CI の両立を図る。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| WASM 成果物 | wasm-pack が生成する `.wasm`, `.js`, `.d.ts`, `package.json` |
| 型定義ファイル | `.d.ts` ファイル（TypeScript 型情報） |
| グルーコード | `.js` ファイル（WASM ロード・バインディング） |

### 1.3 背景・問題

現状の構成には以下の問題がある：

| 問題 | 詳細 |
|------|------|
| 参照不可 | `wasm-pkg/pkg/` は `.gitignore` 対象のため、clone 直後は型定義が存在せず TS の型チェック・補完が機能しない |
| CI 非対応 | WASM ビルドが CI に含まれておらず、Rust 側の変更が TS 側に影響する場合の検証ができない |
| パス不明確 | TS 側から WASM を import する際の参照経路が未定義 |

### 1.4 期待効果

| 効果 | 詳細 |
|------|------|
| 即時型解決 | clone 直後からエディタ補完・型チェックが機能 |
| CI 検証 | Rust/WASM の変更が TS 側で正しく動作することを CI で検証可能 |
| 参照経路明確化 | `@wasm` alias により import パスが簡潔かつ一貫 |

### 1.5 着手条件

- なし（即時着手可能）

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 変更 | `build:wasm` の出力先変更、`vite-tsconfig-paths` 追加 |
| `tsconfig.json` | 変更 | `paths` に `@wasm` alias 追加 |
| `vite.config.ts` | 変更 | `vite-tsconfig-paths` プラグイン追加 |
| `.gitignore` | 変更 | `packages/wasm/` の管理対象を調整 |
| `.github/workflows/ci.yml` | 変更 | WASM ビルドジョブ追加 |
| `packages/wasm/.gitignore` | 新規 | `.wasm` ファイルを除外 |

## 3. 設計方針

### 3.1 ディレクトリ構成

```
5genSearch-web/
├── packages/
│   └── wasm/                    # wasm-pack 出力先
│       ├── package.json         # Git 管理
│       ├── wasm_pkg.js          # Git 管理
│       ├── wasm_pkg.d.ts        # Git 管理
│       ├── wasm_pkg_bg.js       # Git 管理
│       ├── wasm_pkg_bg.wasm.d.ts # Git 管理
│       ├── wasm_pkg_bg.wasm     # Git 除外
│       └── .gitignore           # .wasm を除外
├── wasm-pkg/                    # Rust ソース（変更なし）
└── src/                         # React ソース
```

### 3.2 Git 管理方針

| ファイル種別 | Git 管理 | 理由 |
|--------------|----------|------|
| `.d.ts` | する | 型チェック・エディタ補完に必須 |
| `.js` | する | WASM ロードに必須、型定義と対応 |
| `package.json` | する | モジュール情報 |
| `.wasm` | しない | 環境差分が出やすい、サイズ大、ビルドで再現可能 |

### 3.3 参照経路

TypeScript から WASM を import する際のパス解決：

```typescript
// 使用例
import init, { search_pokemon } from '@wasm';
```

| 設定箇所 | 設定内容 |
|----------|----------|
| `tsconfig.json` | `"paths": { "@wasm": ["./packages/wasm/wasm_pkg.js"], "@wasm/*": ["./packages/wasm/*"] }` |
| `vite.config.ts` | `vite-tsconfig-paths` プラグインで自動解決 |

### 3.4 CI 戦略

| ジョブ | 目的 |
|--------|------|
| `build-wasm` | WASM ビルドを実行、成果物をアーティファクトとして保存 |
| `test-ts` | `build-wasm` に依存、ビルド済み WASM を使用してテスト |
| `test-rust` | Rust 単体テスト（既存、変更なし） |

整合性の担保：Rust テスト（`cargo test`）で型定義と実装のズレを検出。

## 4. 実装仕様

### 4.1 package.json

```json
{
  "scripts": {
    "build:wasm": "wasm-pack build wasm-pkg --target web --out-dir ../packages/wasm",
    "build:wasm:dev": "wasm-pack build wasm-pkg --target web --out-dir ../packages/wasm --dev"
  },
  "devDependencies": {
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@wasm": ["./packages/wasm/wasm_pkg.js"],
      "@wasm/*": ["./packages/wasm/*"]
    }
  }
}
```

### 4.3 vite.config.ts

```typescript
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
```

### 4.4 .gitignore（ルート）

```gitignore
# Rust/WASM
target/
wasm-pkg/pkg/
Cargo.lock
```

### 4.5 packages/wasm/.gitignore

```gitignore
# WASM バイナリは Git 管理しない
*.wasm
```

### 4.6 .github/workflows/ci.yml（追加ジョブ）

```yaml
build-wasm:
  name: Build WASM
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Rust
      uses: dtolnay/rust-toolchain@nightly
      with:
        targets: wasm32-unknown-unknown

    - name: Install wasm-pack
      run: cargo install wasm-pack

    - name: Cache Cargo
      uses: actions/cache@v4
      with:
        path: |
          ~/.cargo/bin/
          ~/.cargo/registry/index/
          ~/.cargo/registry/cache/
          ~/.cargo/git/db/
          target/
        key: ${{ runner.os }}-cargo-wasm-${{ hashFiles('**/Cargo.lock') }}
        restore-keys: ${{ runner.os }}-cargo-wasm-

    - name: Build WASM
      run: pnpm build:wasm

    - name: Upload WASM artifact
      uses: actions/upload-artifact@v4
      with:
        name: wasm-pkg
        path: packages/wasm/
        retention-days: 1
```

`test-ts` ジョブに依存関係を追加：

```yaml
test-ts:
  name: Test (TypeScript)
  needs: build-wasm
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Download WASM artifact
      uses: actions/download-artifact@v4
      with:
        name: wasm-pkg
        path: packages/wasm/

    # ... 以降は既存のまま
```

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| ビルド確認 | `pnpm build:wasm` | 正常終了、`packages/wasm/` に成果物出力 |
| 型解決確認 | `pnpm exec tsc --noEmit` | `@wasm` import でエラーなし |
| Vite ビルド | `pnpm build` | WASM を含むビルドが成功 |
| CI 実行 | GitHub Actions | 全ジョブが成功 |

## 6. 実装チェックリスト

- [ ] `packages/wasm/.gitignore` を作成
- [ ] `package.json` の `build:wasm` コマンドを変更
- [ ] `package.json` に `vite-tsconfig-paths` を追加
- [ ] `tsconfig.json` に `paths` を追加
- [ ] `vite.config.ts` に `tsconfigPaths` プラグインを追加
- [ ] `.gitignore` から `wasm-pkg/pkg/` を削除（不要になるため）
- [ ] `.github/workflows/ci.yml` に `build-wasm` ジョブを追加
- [ ] `.github/workflows/ci.yml` の `test-ts` に依存関係を追加
- [ ] `pnpm build:wasm` を実行し、`packages/wasm/` に出力確認
- [ ] `packages/wasm/` の型定義ファイルをコミット
- [ ] CI で全ジョブが成功することを確認
