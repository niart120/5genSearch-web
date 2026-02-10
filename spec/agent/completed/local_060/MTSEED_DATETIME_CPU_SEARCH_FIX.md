# MT Seed 起動時刻検索 CPU 経路修正 仕様書

## 1. 概要

### 1.1 目的

local_054 で実装した MT Seed 起動時刻検索において、CPU 経路での検索が実行不能となる不具合を修正する。原因はメインスレッドで WASM が未初期化のまま WASM 関数 (`generate_mtseed_search_tasks`) を呼び出していることにある。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| タスク生成 | 検索空間を Worker 数に応じて分割し、各 Worker に割り当てる `SearchTask[]` を作成する処理 |
| `search-tasks.ts` | メインスレッドで WASM のタスク生成関数を呼び出すサービスモジュール |
| `initWasm` | `wasm-bindgen` が生成する WASM 初期化関数。`wasm_pkg.js` の default export |
| deprecated init API | `initWasm(url)` 形式の呼び出し。現行の wasm-bindgen は `initWasm({ module_or_path: url })` 形式を要求する |

### 1.3 背景・問題

#### 問題 1: メインスレッド WASM 未初期化 (致命的)

`search-tasks.ts` はモジュール冒頭のコメントに「メインスレッドで実行される前提 (WASM 初期化済み)」と記載しているが、実際にはメインスレッドで WASM を初期化する処理がどこにも存在しない。WASM の初期化は Worker 内 (`search.worker.ts`, `gpu.worker.ts`) でのみ行われている。

CPU 経路の呼び出しチェーン:

```
datetime-search-page.tsx handleSearch()
  → use-datetime-search.ts startSearch()
    → search-tasks.ts createMtseedDatetimeSearchTasks()
      → wasm_pkg.js generate_mtseed_search_tasks()  ← wasm 未初期化で TypeError
```

エラーメッセージ:

```
Uncaught TypeError: Cannot read properties of undefined (reading '__wbindgen_malloc')
    at generate_mtseed_search_tasks (wasm_pkg.js:403:61)
    at createMtseedDatetimeSearchTasks (search-tasks.ts:57:22)
    at use-datetime-search.ts:44:23
    at datetime-search-page.tsx:128:5
```

`wasm_pkg.js` 内部の `wasm` 変数が `undefined` のため、`wasm.__wbindgen_malloc` でプロパティアクセス例外が発生する。

GPU 経路は `context` と `targetSeeds` を GPU Worker にそのまま渡し、Worker 側で検索を完結するため、メインスレッドで WASM 関数を呼ばず問題が発生しない。

#### 問題 2: Worker WASM 初期化の deprecated API 使用 (警告)

`search.worker.ts` と `gpu.worker.ts` が `initWasm(WASM_URL)` (文字列の直接渡し) で呼び出しているが、現行の `wasm-bindgen` は `initWasm({ module_or_path: WASM_URL })` 形式を要求する。

```
wasm_pkg.js:1771 using deprecated parameters for the initialization function;
pass a single object instead
```

このメッセージが有効コア数 (32) と同数出力されていた。これは WorkerPool が CPU Worker を `navigator.hardwareConcurrency` 個生成し、各 Worker の `handleInit()` で `initWasm(WASM_URL)` を呼び出した結果。

現時点では deprecated 警告のみで動作に支障はないが、将来の wasm-bindgen アップデートで互換性が失われるリスクがある。

**影響範囲**:

| ファイル | 問題 |
|---------|------|
| `src/services/search-tasks.ts` | メインスレッドで WASM 初期化なしに WASM 関数を呼び出す |
| `src/features/datetime-search/hooks/use-datetime-search.ts` | `search-tasks.ts` 経由で未初期化 WASM を呼ぶトリガ |
| `src/workers/search.worker.ts` | deprecated init API 使用 |
| `src/workers/gpu.worker.ts` | deprecated init API 使用 |

### 1.4 期待効果

| 指標 | 修正前 | 修正後 |
|------|--------|--------|
| CPU 経路の起動時刻検索 | TypeError で実行不能 | 正常に実行可能 |
| コンソール deprecated 警告 | Worker 数分出力 | 出力なし |

### 1.5 着手条件

- [x] bug の存在を開発者ツールのエラーメッセージで確認済み
- [x] GPU 経路の疎通確認済み (問題なし)
- [x] 根本原因の特定完了 (メインスレッド WASM 未初期化)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/services/wasm-init.ts` | 新規 | メインスレッド WASM 初期化シングルトン |
| `src/services/search-tasks.ts` | 修正 | モジュールコメント修正 (初期化前提の記述を削除) |
| `src/features/datetime-search/hooks/use-datetime-search.ts` | 修正 | WASM 初期化を await してからタスク生成 |
| `src/workers/search.worker.ts` | 修正 | `initWasm` 呼び出しをオブジェクト形式に変更 |
| `src/workers/gpu.worker.ts` | 修正 | `initWasm` 呼び出しをオブジェクト形式に変更 |
| `src/test/integration/services/search-tasks.test.ts` | 修正 | 初期化フロー変更に伴うテスト修正 |

## 3. 設計方針

### 3.1 修正方針: メインスレッド WASM 初期化の導入

メインスレッドでも WASM を初期化し、`search-tasks.ts` 内のタスク生成関数が正常に動作するようにする。

**代替案の検討と採否**:

| 方式 | 概要 | 評価 |
|------|------|------|
| A. メインスレッド WASM 初期化 | `initWasm()` をメインスレッドでも呼ぶ | **採用**: 変更量が最小。タスク生成関数の呼び出しが既存コードの前提と一致する |
| B. タスク生成を TypeScript で再実装 | Rust の `generate_mtseed_search_tasks` ロジックを TS で複製 | 却下: ロジックの二重管理が発生。Rust 側変更時に同期が必要になる |
| C. タスク生成を Worker 内に移動 | Worker が自身の担当範囲を自律的に計算 | 却下: Worker プロトコル (`WorkerRequest`) の変更が広範。現行の「タスクを受け取って実行」モデルとの乖離が大きい |

### 3.2 初期化のシングルトン配置

`src/services/wasm-init.ts` に `initMainThreadWasm()` を新設する。`services/` に配置する理由:

- `services/` は「機能横断のインフラサービス」と定義されており、WASM 初期化はその性質に合致する
- `src/wasm/` は `.gitignore` で全ファイル除外 (`*`) されており、`wasm-pack` 生成物専用のディレクトリであるため手書きコードの配置に不適
- feature 固有のモジュール (`search-tasks.ts`) に初期化責務を持たせると、別 feature が WASM を使う際に不適切な依存が生まれる

初期化は一度だけ実行される。モジュールスコープの Promise 変数で冪等性を担保する (加えて WASM 側の `__wbg_init` も `if (wasm !== undefined) return wasm;` でガード)。

呼び出し元の各フックで `await initMainThreadWasm()` を実行してからタスク生成を呼ぶ。

将来的には `vite-plugin-wasm` + `--target bundler` への移行により手動初期化自体が不要になる可能性がある (開発ジャーナル 2026-02-11 参照)。

### 3.3 deprecated init API の修正

`initWasm(WASM_URL)` を `initWasm({ module_or_path: WASM_URL })` に変更する。対象は `search.worker.ts`、`gpu.worker.ts`、および新設の `src/services/wasm-init.ts`。

## 4. 実装仕様

### 4.1 `src/services/wasm-init.ts` の新設

アプリ全体でメインスレッド WASM 初期化をシングルトンとして提供する。

```typescript
/**
 * メインスレッド WASM 初期化 (シングルトン)
 *
 * メインスレッドで WASM 関数を呼ぶ前に await する。
 * Worker 内の初期化とは独立 — Worker は各自で initWasm を呼ぶ。
 */

import initWasm from '../wasm/wasm_pkg.js';

const WASM_URL = '/wasm/wasm_pkg_bg.wasm';

let initPromise: Promise<void> | undefined;

/**
 * メインスレッドで WASM を初期化する。
 *
 * 複数回呼び出しても初回のみ実行される (冪等)。
 * メインスレッドで WASM 関数を呼ぶ前に必ず await すること。
 */
export function initMainThreadWasm(): Promise<void> {
  if (initPromise === undefined) {
    initPromise = initWasm({ module_or_path: WASM_URL }).then(() => undefined);
  }
  return initPromise;
}
```

- `initPromise` をモジュールスコープに保持し、複数回呼び出し時に同一 Promise を返す
- `initWasm` の戻り値 (`InitOutput`) は不要なため `void` に変換
- `src/services/` 配下に配置し、機能横断のインフラサービスとして feature に依存しないシングルトンとする

### 4.2 `src/services/search-tasks.ts` の修正

モジュール冒頭コメントの「WASM 初期化済み前提」記述を「呼び出し前に `initMainThreadWasm()` で初期化すること」に修正する。タスク生成関数自体のシグネチャ・実装は変更しない。

### 4.3 `src/features/datetime-search/hooks/use-datetime-search.ts` の修正

`startSearch` 内で `initMainThreadWasm()` を await してからタスク生成を呼ぶ。

```typescript
import { initMainThreadWasm } from '@/services/wasm-init';
import { createMtseedDatetimeSearchTasks } from '@/services/search-tasks';

// startSearch コールバック内:
const startSearch = useCallback(
  (context: DatetimeSearchContext, targetSeeds: MtSeed[]) => {
    if (useGpu) {
      const gpuTask: GpuMtseedSearchTask = {
        kind: 'gpu-mtseed',
        context,
        targetSeeds,
      };
      search.start([gpuTask]);
    } else {
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      void initMainThreadWasm().then(() => {
        const tasks = createMtseedDatetimeSearchTasks(context, targetSeeds, workerCount);
        search.start(tasks);
      });
    }
  },
  [useGpu, config.workerCount, search]
);
```

`initMainThreadWasm()` は冪等なため、2 回目以降の検索開始では即座に resolve される。

### 4.4 Worker init API 修正

#### 4.4.1 `src/workers/search.worker.ts`

```typescript
// 修正前
await initWasm(WASM_URL);

// 修正後
await initWasm({ module_or_path: WASM_URL });
```

#### 4.4.2 `src/workers/gpu.worker.ts`

```typescript
// 修正前
await initWasm(WASM_URL);

// 修正後
await initWasm({ module_or_path: WASM_URL });
```

## 5. テスト方針

### 5.1 ユニットテスト

本修正の対象は WASM 初期化フローであり、純粋な TypeScript ロジックのユニットテストは不要。

### 5.2 統合テスト

| テスト | 対象 | 検証内容 |
|--------|------|----------|
| `search-tasks.test.ts` | `initMainThreadWasm` (from `@/services/wasm-init`) + `createMtseedDatetimeSearchTasks` | WASM 初期化後にタスク生成が成功することを検証 |
| 手動検証 | CPU 経路の起動時刻検索 | エラーなく検索結果が返ること |
| 手動検証 | GPU 経路の起動時刻検索 | 修正によるリグレッションがないこと |
| 手動検証 | コンソール出力 | deprecated 警告が出力されないこと |

### 5.3 既存テストへの影響

`search-tasks.test.ts` は Browser Mode (headless Chromium) で実行される統合テストであり、テスト内で `initMainThreadWasm()` (`@/services/wasm-init`) を呼び出すよう修正が必要。

## 6. 実装チェックリスト

- [x] `src/services/wasm-init.ts` を新設 (`initMainThreadWasm` シングルトン)
- [x] `src/services/search-tasks.ts` のモジュールコメント修正
- [x] `src/features/datetime-search/hooks/use-datetime-search.ts` で `initMainThreadWasm()` を呼び出し
- [x] `src/workers/search.worker.ts` の `initWasm` 呼び出しをオブジェクト形式に修正
- [x] `src/workers/gpu.worker.ts` の `initWasm` 呼び出しをオブジェクト形式に修正
- [x] `src/test/integration/services/search-tasks.test.ts` を初期化フロー変更に対応
- [ ] CPU 経路の起動時刻検索が正常動作することを手動検証
- [ ] GPU 経路にリグレッションがないことを手動検証
- [ ] コンソールに deprecated 警告が出力されないことを確認
