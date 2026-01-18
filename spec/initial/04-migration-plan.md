# 移行計画

現行アーキテクチャから目標アーキテクチャへの段階的移行計画。

## 1. 概要

計算ロジックのWASM集約を4フェーズで実施。

**重要な設計判断:**
- Worker設計をWASM API設計と同時に行う（後回しにしない）
- SharedArrayBufferは採用しない（GitHub Pages + iOS対応の制約）
- 各Workerが独立したWASMインスタンスを保持する構成

## 2. フェーズ構成

```
Phase 0: 基盤整備
    ↓
Phase 1: Worker設計 + WASM API境界定義（同時実施）
    ↓
Phase 2: コア機能実装（計算ロジック + 静的データ）
    ↓
Phase 3: UI統合 + TypeScript計算ロジック削除
```

## 3. 並列化戦略

### 採用しない方式
- **SharedArrayBuffer + wasm threads**: GitHub PagesでのCOOP/COEPヘッダー設定困難、iOS Safariでの動作不安定

### 採用する方式
- **複数Worker + 独立WASMインスタンス**: 各Workerが自身のWASMインスタンスを持つ
- **postMessageによる結果転送**: Structured Clone経由でメインスレッドへ

```
┌─────────────┐
│ Main Thread │  UI / Zustand Store
│  (React)    │
└──────┬──────┘
       │ postMessage (params)
       ▼
┌──────────────────────────────────────────────────┐
│                  Worker Pool                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │  Worker 1   │  │  Worker 2   │  │ Worker N │  │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌──────┐ │  │
│  │ │  WASM   │ │  │ │  WASM   │ │  │ │ WASM │ │  │
│  │ │Instance │ │  │ │Instance │ │  │ │ Inst │ │  │
│  │ └─────────┘ │  │ └─────────┘ │  │ └──────┘ │  │
│  └─────────────┘  └─────────────┘  └──────────┘  │
└──────────────────────────────────────────────────┘
       │ postMessage (results / progress)
       ▼
┌─────────────┐
│ Main Thread │  結果集約・表示
└─────────────┘
```

### Worker種別

| Worker | 用途 | 並列度 | 備考 |
|--------|------|--------|------|
| BootTimingWorker | 起動時刻探索 (SHA-1) | 範囲分割で複数並列 | CPU版 |
| BootTimingWorkerGpu | 起動時刻探索 (SHA-1) | 単一 | WebGPU版 |
| InitialSeedWorker | 初期Seed (MT Seed) 探索 | 範囲分割で複数並列 | CPU版 |
| InitialSeedWorkerGpu | 初期Seed (MT Seed) 探索 | 単一 | WebGPU版 |
| GenerationWorker | 乱数列生成 | 単一（逐次処理） | - |

### 経路選択方針

- **CPU/GPU選択はユーザーがUI側で明示的に指定**
- WASM側は指定された経路で実行（経路の自動選択は行わない）
- **フォールバック**: GPU非対応環境ではGPU選択肢をUI側で非活性化

## 4. WebGPU戦略

### 現行の課題
現行実装ではWebGPU処理がTypeScript側 (`src/lib/webgpu/`) で行われている:
- シェーダーコード (WGSL) がTypeScript側に存在
- GPUデバイス管理・コンピュートパイプライン構築がTypeScript
- WASM側との二重管理

### 目標アーキテクチャ
**wgpuによるWASM側統合**: WebGPU処理もRust (wgpu crate) で実装しWASMに寄せる

```
┌─────────────┐
│ Main Thread │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│                  Worker                           │
│  ┌─────────────────────────────────────────────┐ │
│  │              WASM (Rust)                     │ │
│  │  ┌─────────────┐    ┌─────────────────────┐ │ │
│  │  │  CPU Path   │    │    GPU Path (wgpu)  │ │ │
│  │  │  - SIMD     │    │  - Compute Shader   │ │ │
│  │  │  - LCG      │    │  - Device Context   │ │ │
│  │  │  - SHA-1    │    │  - Pipeline         │ │ │
│  │  └─────────────┘    └─────────────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 利点
- シェーダーコードもRust側で管理 (naga経由でWGSL生成可能)
- CPU/GPU両経路をWASM内に統合
- ビルドの一元管理

### 検討事項

| 項目 | 内容 |
|------|------|
| wgpu対応状況 | wgpu 0.19+ でwasm32-unknown-unknown対応済み |
| WebGPU可用性判定 | 起動時にUI側でチェックし、GPU選択肢の有効/無効を決定 |
| 経路選択 | ユーザーがUIで明示的に選択（自動選択しない） |
| バイナリサイズ | wgpu追加による増加 (要計測) |

### Worker構成

CPU/GPUは別Workerとして維持（ユーザー選択制）:

```
用途                  Worker (CPU)              Worker (GPU)
─────────────────    ─────────────────────    ─────────────────────
起動時刻探索          BootTimingWorker          BootTimingWorkerGpu
初期Seed探索          InitialSeedWorker         InitialSeedWorkerGpu
乱数列生成            GenerationWorker          (GPU版なし)
```

WASM APIは経路ごとに分離:

```rust
// CPU経路
pub fn search_boot_timing_cpu(request: BootTimingRequest) -> BootTimingResult;
pub fn search_initial_seed_cpu(request: InitialSeedRequest) -> InitialSeedResult;

// GPU経路
pub fn search_boot_timing_gpu(request: BootTimingRequest, gpu: GpuContext) -> BootTimingResult;
pub fn search_initial_seed_gpu(request: InitialSeedRequest, gpu: GpuContext) -> InitialSeedResult;

// WebGPU可用性チェック (UI側で使用)
pub fn is_webgpu_available() -> bool;
```

## Phase 0: 基盤整備

### 目標
- プロジェクト構造の確立
- 開発環境セットアップ
- CI/CD基盤構築

### タスク

| ID | タスク | 詳細 |
|----|--------|------|
| P0-1 | Vite + React + TypeScript 初期化 | 完了済み |
| P0-2 | wasm-pack環境構築 | Rust toolchain + wasm-pack |
| P0-3 | Rust formatter/linter設定 | rustfmt + clippy |
| P0-4 | Vitest設定 | 単体テスト環境 |
| P0-5 | ESLint/Prettier設定 | コード品質 |
| P0-6 | GitHub Actions設定 | CI/CD (TypeScript + Rust両方) |

### Rust開発環境

| ツール | 用途 | 設定 |
|--------|------|------|
| rustfmt | コードフォーマット | `rustfmt.toml` でルール定義 |
| clippy | 静的解析 | `#![deny(clippy::all)]` で警告をエラー化 |

### 成果物
- 動作するブランクプロジェクト
- 開発・テスト環境
- CI/CDパイプライン

---

## Phase 1: Worker設計 + WASM API境界定義

### 目標
- Worker ↔ Main Thread間のメッセージプロトコル定義
- Worker内でのWASM API呼び出しインターフェース定義
- 型安全なバインディング生成

### 設計原則
- **Worker-first設計**: WASMはWorker内でのみ呼び出される前提
- **メッセージプロトコル先行**: Main ↔ Worker間の型を先に定義
- **キャンセル機構組み込み**: 長時間処理の中断を最初から考慮

### タスク

| ID | タスク | 詳細 |
|----|--------|------|
| P1-1 | Worker種別・責務定義 | BootTiming/InitialSeed/Generation |
| P1-2 | メッセージプロトコル設計 | Request/Response/Progress/Error型 |
| P1-3 | キャンセル機構設計 | AbortController連携 |
| P1-4 | WASM API定義 | Worker内で呼び出すRust API |
| P1-5 | tsify + serde設定 | TypeScript型自動生成 |
| P1-6 | Worker基盤実装 | 共通Worker抽象化 |
| P1-7 | 単体テスト | プロトコル・API両方 |

### 型共有戦略 (tsify + serde)

Rust側の型定義からTypeScript型を自動生成:

```rust
use serde::{Deserialize, Serialize};
use tsify::Tsify;

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct BootTimingRequest {
    pub mac_address: [u8; 6],
    pub datetime: DateTime,
    pub timer0_range: (u16, u16),
    pub vcount_range: (u8, u8),
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct BootTimingResult {
    pub seeds: Vec<u64>,
    pub elapsed_ms: u32,
}
```

利点:
- Rust側の型定義が単一の真実のソース (Single Source of Truth)
- TypeScript側での型定義重複を排除
- serdeによるシリアライズ/デシリアライズの自動化
- wasm-bindgenとのシームレスな統合

### メッセージプロトコル設計

```typescript
// Main → Worker
type WorkerRequest =
  | { type: 'init' }
  | { type: 'search'; id: string; params: SearchParams }
  | { type: 'generate'; id: string; params: GenerationParams }
  | { type: 'cancel'; id: string }

// Worker → Main
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; id: string; percent: number; current: number }
  | { type: 'batch'; id: string; data: ResultBatch }
  | { type: 'complete'; id: string; reason: CompletionReason }
  | { type: 'error'; id: string; code: string; message: string }
  | { type: 'cancelled'; id: string }
```

### 成果物
- `src/workers/protocol.ts` - メッセージプロトコル型定義
- `src/workers/base-worker.ts` - 共通Worker基盤
- `wasm-pkg/src/api/` - WASM APIモジュール
- `src/lib/wasm/` - TypeScriptバインディング

---

## Phase 2: コア機能実装

### 目標
- WASM側に全計算ロジックを実装 (CPU + GPU両経路)
- 静的データ（種族・エンカウント）をWASM内に埋め込み
- Worker経由での動作確認

### タスク

| ID | タスク | 詳細 |
|----|--------|------|
| P2-1 | Rust計算ロジック実装 (CPU) | LCG, SHA-1, Pokemon生成, SIMD |
| P2-2 | wgpu統合 | WebGPU対応ビルド設定 |
| P2-3 | GPU計算ロジック実装 | Compute Shader (wgpu) |
| P2-4 | 静的データ形式設計 | Rust構造体定義 |
| P2-5 | データ生成スクリプト | JSON → Rust変換 |
| P2-6 | 種族データ埋め込み | 649種 + フォルム |
| P2-7 | エンカウントデータ埋め込み | BW/BW2全場所 |
| P2-8 | Worker実装 (CPU) | BootTiming/InitialSeed/Generation |
| P2-9 | Worker実装 (GPU) | BootTimingGpu/InitialSeedGpu |
| P2-10 | 統合テスト | CPU/GPU各経路でのWASM呼び出し |

### 成果物
- `wasm-pkg/src/core/` - 計算ロジック (CPU)
- `wasm-pkg/src/gpu/` - GPU計算ロジック (wgpu)
- `wasm-pkg/src/data/` - 静的データ
- `src/workers/boot-timing-worker.ts` (CPU)
- `src/workers/boot-timing-worker-gpu.ts` (GPU)
- `src/workers/initial-seed-worker.ts` (CPU)
- `src/workers/initial-seed-worker-gpu.ts` (GPU)
- `src/workers/generation-worker.ts`

---

## Phase 3: UI統合 + TypeScript計算ロジック削除

### 目標
- React UI実装
- 状態管理とWorker制御の責務分離
- TypeScript側から計算ロジックを完全削除

### 状態管理アーキテクチャ

**課題**: ZustandでWorker処理のキック・進捗管理・キャンセルを扱うのは責務混在

**解決策**: レイヤー分離

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  - UI表示・ユーザー入力                                      │
│  - Storeの状態を購読                                         │
│  - WorkerServiceへ処理依頼                                   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│   Zustand Store     │    │       WorkerService             │
│                     │    │                                 │
│ 責務:               │    │ 責務:                           │
│ - UI状態            │    │ - Worker生成・破棄              │
│ - 入力パラメータ    │    │ - 処理のキック                  │
│ - 結果データ保持    │    │ - 進捗・結果のハンドリング      │
│ - フィルタ・ソート  │    │ - キャンセル制御                │
│                     │◀───│ - Storeへ結果を書き込み         │
│ 含まない:           │    │                                 │
│ - 処理のキック      │    │ 含まない:                       │
│ - Worker管理        │    │ - UI状態                        │
│ - キャンセル制御    │    │ - ビジネスロジック              │
└─────────────────────┘    └─────────────────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │       Web Workers        │
                           │  (WASM実行環境)          │
                           └─────────────────────────┘
```

### Zustand Store設計方針

```typescript
// UIに閉じた状態のみ管理
interface SearchStore {
  // 入力パラメータ
  params: SearchParams;
  setParams: (params: Partial<SearchParams>) => void;
  
  // 実行状態 (WorkerServiceから更新される)
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  
  // 結果 (WorkerServiceから書き込まれる)
  results: SearchResult[];
  appendResults: (results: SearchResult[]) => void;
  clearResults: () => void;
  
  // UI状態
  selectedResultIndex: number | null;
  filterSettings: FilterSettings;
}

// Storeに含めない
// - start(), pause(), cancel() などのWorker制御メソッド
// - Worker参照
```

### WorkerService設計方針

```typescript
class WorkerService {
  // Worker制御
  start(params: SearchParams): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  
  // 状態問い合わせ
  isRunning(): boolean;
  
  // Storeへの書き込み (内部で実行)
  private handleProgress(progress: number): void;
  private handleResult(batch: ResultBatch): void;
  private handleComplete(): void;
  private handleError(error: Error): void;
}

// UIからの利用例
const workerService = useWorkerService();
const handleStart = () => workerService.start(store.params);
const handleCancel = () => workerService.cancel();
```

### タスク

| ID | タスク | 詳細 |
|----|--------|------|
| P3-1 | Zustand Store設計 | 入力パラメータ・結果保持・UI状態のみ |
| P3-2 | WorkerService実装 | Worker制御・進捗ハンドリング・Store更新 |
| P3-3 | Worker Manager実装 | Worker Pool管理 (CPU並列) |
| P3-4 | UI Components実装 | Radix UI + Tailwind |
| P3-5 | 結果表示実装 | テーブル・フィルタ・ソート |
| P3-6 | エクスポート機能 | CSV/JSON/TXT |
| P3-7 | E2Eテスト | Playwright |

### 成果物
- `src/store/` - Zustand Store (UI状態・結果保持)
- `src/services/worker-service.ts` - Worker制御層
- `src/lib/worker-manager.ts` - Worker Pool管理
- `src/components/` - UIコンポーネント

---

## 4. マイルストーン

| マイルストーン | フェーズ | 判定基準 |
|---------------|---------|---------|
| M0: 開発環境Ready | Phase 0完了 | pnpm dev でアプリ起動 |
| M1: Worker基盤完成 | Phase 1完了 | メッセージプロトコル動作確認 |
| M2: コア機能動作 | Phase 2完了 | Worker経由でWASM計算実行可能 |
| M3: アプリ完成 | Phase 3完了 | 全機能UI統合完了 |

## 5. リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| WASMバイナリサイズ増大 | ロード時間増加 | wasm-opt最適化、遅延ロード、wgpu featureフラグ分離 |
| Worker初期化コスト | UX低下 | 事前初期化、プリロード |
| データ埋め込みによるビルド時間増加 | 開発効率低下 | 増分ビルド、キャッシュ |
| iOS Safari Worker制約 | 動作不良 | 早期検証、フォールバック検討 |
| wgpu + WASM統合の複雑性 | 開発遅延 | 段階的実装、CPU経路優先 |
| WebGPU非対応ブラウザ | 機能制限 | CPU経路への自動フォールバック |

## 6. 成功指標

| 指標 | 現状 | 目標 |
|-----|------|------|
| TypeScript計算コード行数 | TBD | 0 |
| WASMバイナリサイズ (CPU only) | TBD | < 1.5MB (gzip後) |
| WASMバイナリサイズ (GPU込み) | TBD | < 2.5MB (gzip後) |
| 初回ロード時間 | TBD | < 3秒 |
| Search並列効率 (CPU) | TBD | Worker数に比例したスループット |
| Search速度 (GPU) | TBD | CPU版の5倍以上 |

## 7. 除外事項

以下は本計画の対象外とする:

- **SharedArrayBuffer**: GitHub Pages + iOS制約により不採用
- **wasm threads**: 上記と同様
- **TypeScript側WebGPU実装**: wgpuによるWASM統合に置き換え
