# WASM 出力先再配置 仕様書

## 1. 概要

### 1.1 目的

wasm-pack の出力先を `packages/wasm/` から `public/wasm/` + `src/wasm/` に再配置し、Vite + GitHub Pages デプロイに適した構成へ移行する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| グルーコード | wasm-bindgen が生成する JS ファイル (`wasm_pkg.js`) |
| WASM バイナリ | コンパイル済みの WebAssembly ファイル (`wasm_pkg_bg.wasm`) |
| 静的配信 | Vite が `public/` 配下のファイルをそのまま `dist/` にコピーする仕組み |

### 1.3 背景・問題

現在の `packages/wasm/` 配置には以下の問題がある:

| 問題 | 詳細 |
|------|------|
| 意図不明確 | `packages/` は npm workspace 用の命名規約だが、publish 予定なし |
| Vite との相性 | `src/` 外のため、Vite のモジュール解決が不自然 |
| Worker からのアクセス | 相対パス (`../../packages/wasm/...?url`) でのハック的読み込みが必要 |
| パス解決問題 | wasm-bindgen の `import.meta.url` ベースのパス解決が Vite バンドル時に破綻 |

### 1.4 期待効果

| 効果 | 詳細 |
|------|------|
| パス解決の安定化 | `public/` 配下は絶対パス (`/wasm/...`) で確実にアクセス可能 |
| 構成の明確化 | ビルド成果物の配置意図が明確 |
| Worker 実装の簡素化 | `?url` サフィックス不要 |
| デプロイ互換性 | GitHub Pages での静的配信と自然に整合 |

### 1.5 着手条件

- 現行の Worker 実装 (`local_033`) が完了していること
- テストが通過する状態であること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 変更 | `build:wasm` の `--out-dir` を変更 |
| `tsconfig.json` | 変更 | `@wasm` パスを `./src/wasm/` に変更 |
| `.gitignore` | 変更 | `src/wasm/`、`public/wasm/` を追加 |
| `src/wasm/.gitignore` | 新規 | WASM 以外を Git 管理対象に |
| `public/wasm/.gitignore` | 新規 | WASM バイナリを除外 |
| `scripts/copy-wasm.js` | 新規 | WASM バイナリを `public/wasm/` にコピー |
| `src/workers/search.worker.ts` | 変更 | WASM URL を `/wasm/wasm_pkg_bg.wasm` に変更 |
| `src/workers/gpu.worker.ts` | 変更 | 同上 |
| `packages/wasm/` | 削除 | 旧出力ディレクトリを削除 |

### 仕様書の更新

| ファイル | 変更内容 |
|----------|----------|
| `spec/agent/local_030/WASM_BUILD_CONFIG.md` | 出力先を `src/wasm/` に修正 |
| `spec/agent/local_031/WASM_BINDING_VERIFICATION.md` | パス参照を修正 |
| `spec/agent/local_033/WORKER_FOUNDATION.md` | WASM パス前提を修正 |
| `spec/agent/architecture/frontend-structure.md` | `@wasm` エイリアスを修正 |

## 3. 設計方針

### 3.1 ディレクトリ構成

```
wasm-pkg/                    # Rust ソース（変更なし）
  src/
  Cargo.toml

src/
  wasm/                      # ← wasm-pack --out-dir
    wasm_pkg.js              # グルーコード
    wasm_pkg.d.ts            # 型定義
    wasm_pkg_bg.wasm         # (コピー元、Git 除外)
    wasm_pkg_bg.wasm.d.ts

public/
  wasm/
    wasm_pkg_bg.wasm         # ← scripts/copy-wasm.js でコピー
```

### 3.2 ビルドフロー

```
pnpm build:wasm
    │
    ├─ wasm-pack build → src/wasm/
    │
    └─ node scripts/copy-wasm.js
           │
           └─ src/wasm/*.wasm → public/wasm/
```

### 3.3 Worker からのアクセス

```typescript
// 変更前
import wasmUrl from '../../packages/wasm/wasm_pkg_bg.wasm?url';
await initWasm(wasmUrl);

// 変更後
await initWasm('/wasm/wasm_pkg_bg.wasm');
```

## 4. 実装仕様

### 4.1 package.json

```json
{
  "scripts": {
    "build:wasm": "wasm-pack build wasm-pkg --target web --out-dir ../src/wasm && node scripts/copy-wasm.js",
    "build:wasm:dev": "wasm-pack build wasm-pkg --target web --out-dir ../src/wasm --dev && node scripts/copy-wasm.js"
  }
}
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@wasm": ["./src/wasm/wasm_pkg.d.ts"],
      "@wasm/*": ["./src/wasm/*"]
    }
  }
}
```

### 4.3 scripts/copy-wasm.js

```javascript
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const src = join(root, 'src/wasm/wasm_pkg_bg.wasm');
const dest = join(root, 'public/wasm/wasm_pkg_bg.wasm');

if (!existsSync(dirname(dest))) {
  mkdirSync(dirname(dest), { recursive: true });
}

copyFileSync(src, dest);
console.log('Copied wasm_pkg_bg.wasm to public/wasm/');
```

### 4.4 .gitignore 追加

```gitignore
# WASM build output
src/wasm/wasm_pkg_bg.wasm
public/wasm/
```

### 4.5 Worker 修正

```typescript
// src/workers/search.worker.ts
async function handleInit(): Promise<void> {
  await initWasm('/wasm/wasm_pkg_bg.wasm');
  // ...
}
```

## 5. テスト方針

| テスト種別 | 検証内容 |
|------------|----------|
| ビルド確認 | `pnpm build:wasm` が正常終了 |
| ファイル確認 | `src/wasm/`、`public/wasm/` に成果物が存在 |
| 開発サーバ | `pnpm dev` で Worker が WASM を読み込めること |
| 本番ビルド | `pnpm build` → `dist/wasm/wasm_pkg_bg.wasm` が存在 |
| Worker 動作 | 検索機能が正常動作 |

## 6. 実装チェックリスト

### 6.1 実装タスク

- [ ] `scripts/copy-wasm.js` を作成
- [ ] `package.json` の `build:wasm` スクリプトを更新
- [ ] `tsconfig.json` の `paths` を更新
- [ ] `.gitignore` に `src/wasm/wasm_pkg_bg.wasm`、`public/wasm/` を追加
- [ ] `src/workers/search.worker.ts` の WASM URL を変更
- [ ] `src/workers/gpu.worker.ts` の WASM URL を変更
- [ ] `pnpm build:wasm` を実行して動作確認
- [ ] `packages/wasm/` ディレクトリを削除

### 6.2 仕様書更新タスク

- [ ] `local_030/WASM_BUILD_CONFIG.md` を更新
- [ ] `local_031/WASM_BINDING_VERIFICATION.md` を更新
- [ ] `local_033/WORKER_FOUNDATION.md` を更新
- [ ] `architecture/frontend-structure.md` を更新

### 6.3 検証タスク

- [ ] `pnpm dev` で開発サーバ起動、Worker 動作確認
- [ ] `pnpm build` で本番ビルド成功
- [ ] `pnpm preview` でプレビュー動作確認
