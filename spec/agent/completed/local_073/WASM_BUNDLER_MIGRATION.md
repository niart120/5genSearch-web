# WASM ビルドターゲット bundler 移行 仕様書

## 1. 概要

### 1.1 目的

WASM ビルドターゲットを `--target web` から `--target bundler` に切り替え、`vite-plugin-wasm` を導入することで、WASM の手動初期化コードと `public/wasm/` への配信パイプラインを廃止する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| `--target web` | wasm-pack のビルドターゲット。ES モジュールを生成し、`initWasm()` の手動呼び出しが必要 |
| `--target bundler` | wasm-pack のビルドターゲット。バンドラ連携を前提とし、import 時に自動初期化可能 |
| `vite-plugin-wasm` | Vite プラグイン。`.wasm` インポートを処理し、`WebAssembly.instantiate` を自動実行 |
| top-level await | ES2022 で導入された構文。モジュールスコープで `await` を使用可能にする。WASM 自動初期化に必須 |
| グルーコード | wasm-bindgen が生成する JS ファイル (`wasm_pkg.js`) |

### 1.3 背景・問題

- `--target web` では `initWasm()` を手動で呼ばないと WASM 関数が使えない
- メインスレッド (`wasm-init.ts`) と各 Worker (`search.worker.ts`, `gpu.worker.ts`) でそれぞれ初期化コードが存在
- `scripts/copy-wasm.js` で `.wasm` バイナリを `public/wasm/` にコピーする追加ステップが必要
- 初期化漏れによるバグが実際に発生した (local_060)
- dev-journal (2026-02-11) に記録済み

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 初期化コード削除 | `wasm-init.ts` のシングルトン初期化、Worker 内の `initWasm()` 呼び出しが不要になる |
| ビルドパイプライン簡略化 | `scripts/copy-wasm.js` が不要になる |
| バグリスク低減 | WASM 初期化漏れの発生源を構造的に排除 |

### 1.5 着手条件

- `vite-plugin-wasm` が `rolldown-vite` (現在使用中の Vite override) と互換性があることの事前確認

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 変更 | `vite-plugin-wasm` を devDependencies に追加、`build:wasm`/`build:wasm:dev` スクリプトの `--target` 変更、`copy-wasm` ステップ削除 |
| `vite.config.ts` | 変更 | `wasm()` プラグイン追加、`worker.format: 'es'` + `worker.plugins` 設定 |
| `src/services/wasm-init.ts` | 削除 | 不要になる |
| `src/workers/search.worker.ts` | 変更 | `initWasm()` 呼び出し削除、import 文変更 |
| `src/workers/gpu.worker.ts` | 変更 | 同上 |
| `src/wasm/wasm_pkg.js` | 変更 (自動生成) | `--target bundler` で再生成される |
| `scripts/copy-wasm.js` | 削除 | 不要になる |
| `public/wasm/` | 削除 | 不要になる（Vite がバンドル時に処理） |

## 3. 設計方針

### 3.1 ビルドコマンドの変更

```powershell
# 変更前
wasm-pack build wasm-pkg --target web --out-dir ../src/wasm --release -- --features gpu

# 変更後
wasm-pack build wasm-pkg --target bundler --out-dir ../src/wasm --release -- --features gpu
```

`--target bundler` にすると、生成されるグルーコード (`wasm_pkg.js`) がデフォルト export で WASM モジュールを返す形になり、バンドラが `.wasm` ファイルをアセットとして処理する。

### 3.2 Vite 設定の変更

```ts
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [
    wasm(),
    tailwindcss(),
    react({ /* ... */ }),
    lingui(),
    tsconfigPaths(),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
});
```

`worker.plugins` に同じプラグインを設定することで Worker 内でも WASM import が自動初期化される。

`worker.format: 'es'` は必須。デフォルトの IIFE 形式では top-level await がサポートされない。`vite-plugin-top-level-await` は `rolldown-vite` と非互換（内部で `rollup` モジュールを要求）のため使用しない。モダンブラウザ（Chrome 89+, Safari 15+, Firefox 89+）は ES module Worker + top-level await を native でサポートしている。

### 3.3 Worker の変更

```ts
// 変更前
import initWasm, { health_check, ... } from '../wasm/wasm_pkg.js';
const WASM_URL = '/wasm/wasm_pkg_bg.wasm';
// init メッセージで: await initWasm({ module_or_path: WASM_URL });

// 変更後
import { health_check, ... } from '../wasm/wasm_pkg.js';
// initWasm 不要 — import 時に自動初期化される
```

Worker の `init` メッセージハンドラは WASM 初期化が不要になるが、Worker の ready 通知としての役割は残す。

### 3.4 Module Worker と top-level await によるメッセージ消失問題

`--target bundler` で生成されるグルーコードは `import * as wasm from "./wasm_pkg_bg.wasm"` の形式を取り、`vite-plugin-wasm` がこれを `await WebAssembly.instantiate(...)` に変換する。この結果、Worker のモジュール評価に top-level await が含まれることになる。

Chromium の Module Worker 実装では、top-level await により非同期になったモジュール評価中に event loop が進行する。この間に `postMessage()` で送信されたメッセージは、`addEventListener('message', ...)` が登録される前に dispatch されるため、ハンドラ不在のまま消失する。

```
時系列:
Main: new Worker(url, {type:'module'})  →  worker.postMessage({type:'init'})
     │                                       │
Worker:                                      │  ← message dispatch（ハンドラ未登録）
     ├── import env.mjs                      │
     ├── import wasm_pkg.js                  │
     │     └── await WebAssembly.instantiate ← event loop 進行
     ├── addEventListener('message', ...)    ← ここでようやく登録
     └── (init メッセージは既に消失)
```

対策として、Worker はモジュール評価完了・リスナー登録の直後に `handleInit()` を自動呼び出しする。これにより `worker-pool.ts` からの `init` コマンドに依存しない。`handleInit()` は冪等に実装し、`init` メッセージが届いた場合でも二重初期化しない。

```ts
// message listener 登録
globalThis.addEventListener('message', (e) => { /* ... */ });

// モジュール評価完了後に自動初期化
handleInit();

function handleInit(): void {
  if (initialized) return; // 冪等性保証
  // ...
}
```

### 3.5 メインスレッド初期化の変更

`src/services/wasm-init.ts` を削除し、WASM 関数を使うモジュールで直接 import する。メインスレッドで WASM を使用する箇所（`seed-resolve.ts` 等）から `await initMainThreadWasm()` の呼び出しを削除する。

### 3.6 optimize-wasm.js の扱い

`scripts/optimize-wasm.js`（`wasm-opt -O4`）はビルド後の最適化として引き続き必要。出力パスが `src/wasm/wasm_pkg_bg.wasm` のままであれば変更不要。

### 3.7 リスクと検証項目

| リスク | 影響 | 対策 |
|--------|------|------|
| `rolldown-vite` との互換性 | プラグインが動作しない | 着手前に互換性を検証。`vite-plugin-top-level-await` は非互換と判明し除外 |
| Module Worker + top-level await | `postMessage` がモジュール評価完了前に消失 | Worker 側で auto-init（3.4 節参照） |
| Worker バンドル形式 | IIFE では top-level await 不可 | `worker.format: 'es'` を設定 |
| HMR 時の WASM リロード | 開発体験の劣化 | `pnpm dev` での動作確認 |
| バンドルサイズ | `.wasm` の配信方法変更 | ビルド出力サイズの比較（3.8 節） |

### 3.8 ビルド出力サイズ

bundler ターゲット移行後の主要ファイルサイズ（`pnpm build` 出力）:

| ファイル | サイズ | gzip |
|----------|--------|------|
| `wasm_pkg_bg.wasm` | 1,016.24 kB | 498.46 kB |
| `index.js` (メインバンドル) | 594.17 kB | 178.99 kB |
| `index.css` | 153.16 kB | 50.80 kB |
| `search.worker.js` | 32.86 kB | — |
| `gpu.worker.js` | 30.67 kB | — |

WASM バイナリは `dist/assets/` 内にハッシュ付きで配置される。`--target web` 時は `public/wasm/` からの配信だったが、bundler ターゲットではバンドラが `.wasm` を asset として処理するため、キャッシュバスティングが自動適用される。

## 4. 実装仕様

### 4.1 package.json の変更

```json
{
  "devDependencies": {
    "vite-plugin-wasm": "^3.5.0"
  },
  "scripts": {
    "build:wasm": "wasm-pack build wasm-pkg --target bundler --out-dir ../src/wasm --release -- --features gpu && node scripts/optimize-wasm.js",
    "build:wasm:dev": "wasm-pack build wasm-pkg --target bundler --out-dir ../src/wasm --dev -- --features gpu"
  }
}
```

`copy-wasm` ステップを削除。`build:wasm:dev` からも `copy-wasm` を削除。

### 4.2 initMainThreadWasm 呼び出し箇所の洗い出し

`initMainThreadWasm()` を `await` している箇所を全て特定し、呼び出しを削除する。

### 4.3 Worker init メッセージの扱い

Worker の `init` メッセージは WASM 初期化の責務がなくなるが、Worker の起動完了を通知するシグナルとして残す。`initWasm()` 呼び出しを削除し、`initialized = true` + `ready` 応答のみとする。

ただし、3.4 節で述べたメッセージ消失問題への対策として、Worker はモジュール評価完了後に `handleInit()` を自動呼び出しする。`handleInit()` は冪等に実装するため、`init` メッセージが正常に届いた場合でも問題は生じない。

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| 統合テスト | WASM 初期化 | import だけで WASM 関数が呼べること |
| 統合テスト | Worker 起動 | Worker 内で WASM 関数が正常動作すること |
| 手動テスト | `pnpm dev` | HMR で WASM リロードが正常に動作すること |
| 手動テスト | `pnpm build && pnpm preview` | 本番ビルドで WASM が正しくバンドルされること |
| 手動テスト | GPU Worker | WebGPU 対応環境で GPU 検索が動作すること |

## 6. 実装チェックリスト

- [x] `rolldown-vite` と `vite-plugin-wasm` の互換性検証
- [x] `pnpm add -D vite-plugin-wasm`（`vite-plugin-top-level-await` は `rolldown-vite` と非互換のため除外）
- [x] `vite.config.ts` にプラグイン追加 (`plugins` + `worker.format: 'es'` + `worker.plugins`)
- [x] `vitest.config.ts` にも同様のプラグイン追加
- [x] `package.json` の `build:wasm` / `build:wasm:dev` を `--target bundler` に変更
- [x] `scripts/copy-wasm.js` 削除
- [x] `public/wasm/` ディレクトリ削除
- [x] `src/services/wasm-init.ts` 削除
- [x] `initMainThreadWasm()` の全呼び出し箇所を削除
- [x] `search.worker.ts` から `initWasm` import と呼び出しを削除、auto-init 追加
- [x] `gpu.worker.ts` から `initWasm` import と呼び出しを削除、auto-init 追加
- [x] `pnpm build:wasm` で `--target bundler` ビルド成功を確認
- [x] `pnpm dev` で開発サーバ正常起動・Worker 初期化を確認
- [x] `pnpm build` で本番ビルド成功を確認
- [x] `pnpm test:run` で全テスト通過
- [x] ビルド出力サイズの比較記録（3.8 節）
