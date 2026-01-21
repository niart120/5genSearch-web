# Worker アーキテクチャ設計仕様書

Phase 1 タスク P1-1, P1-2, P1-3 に対応する Worker 設計仕様。

## 1. 概要

本ドキュメントでは、WASM計算処理を実行するWeb Workerの種別・責務・通信プロトコル・制御機構を定義する。

**関連ドキュメント**: Worker ↔ WASM 間の詳細インタフェース設計は [mig_002/datetime-search/worker-interface.md](../mig_002/datetime-search/worker-interface.md) を参照。

### 1.1 設計目標

- **計算処理の分離**: UIスレッドから計算処理を完全に分離
- **並列実行**: 複数Workerによる探索処理の並列化
- **キャンセル可能性**: 長時間処理の中断・一時停止・再開
- **型安全性**: TypeScript型によるメッセージプロトコルの厳密化

### 1.2 制約事項

- SharedArrayBuffer は使用しない（GitHub Pages + iOS Safari 制約）
- wasm threads は使用しない（上記と同様）
- 各Workerは独立したWASMインスタンスを保持

### 1.3 型定義方針

- **TypeScript**: `type` を使用（`interface` は使用しない）
- **Rust ↔ TS 型共有**: tsify + serde + serde-wasm-bindgen
- **型アサーション**: 最小限に抑え、型ガードで安全に絞り込む

## 2. Worker 種別と責務 (P1-1)

### 2.1 Worker 種別一覧

| Worker 種別 | ファイル名 | 用途 | 並列度 |
|------------|-----------|------|--------|
| BootTimingWorker | `boot-timing-worker.ts` | 起動時刻探索 (SHA-1, CPU) | 範囲分割で複数並列 |
| BootTimingWorkerGpu | `boot-timing-worker-gpu.ts` | 起動時刻探索 (SHA-1, GPU) | 単一 |
| InitialSeedWorker | `initial-seed-worker.ts` | 初期Seed (MT Seed) 探索 (CPU) | 範囲分割で複数並列 |
| InitialSeedWorkerGpu | `initial-seed-worker-gpu.ts` | 初期Seed (MT Seed) 探索 (GPU) | 単一 |
| GenerationWorker | `generation-worker.ts` | 乱数列生成・Pokemon列挙 | 単一（逐次処理） |

### 2.2 責務マトリクス

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Worker 責務                                   │
├─────────────────────────────────────────────────────────────────────┤
│  含む:                                                               │
│    - WASMインスタンスの初期化・保持                                  │
│    - WASM API呼び出し                                                │
│    - 進捗通知 (postMessage)                                          │
│    - 結果のバッチ送信                                                │
│    - 停止要求への応答                                                │
│                                                                     │
│  含まない:                                                           │
│    - UI状態管理                                                      │
│    - 結果のフィルタリング・ソート（Main Thread側で実施）             │
│    - Worker間通信（Main Threadを経由）                               │
│    - セグメント分割・チャンク分割（Main Thread側で実施）             │
└─────────────────────────────────────────────────────────────────────┘
```

**分割戦略の責務分担**:

| 責務 | 担当レイヤー | 備考 |
|------|-------------|------|
| セグメント列挙 (Timer0×VCount×KeyCode) | Main Thread | 全組み合わせを事前列挙 |
| チャンク分割 (時刻範囲) | Main Thread | Worker数に応じて均等分割 |
| ジョブ割り当て | Main Thread | CPU: チャンク単位, GPU: 全範囲 |
| セグメントループ | Worker/WASM | CPU: Worker内ループ, GPU: ディスパッチ単位 |
| 時刻イテレーション | WASM | イテレータ/GPUカーネル |

詳細は [worker-interface.md](../mig_002/datetime-search/worker-interface.md) §2 を参照。

### 2.3 Worker ライフサイクル

```
Created → Initializing → Ready → Running ⇄ Paused → Completed/Error → Terminated
              │                     │
              └─── WASM Init ───────┘
```

| 状態 | 説明 |
|-----|------|
| Created | Worker インスタンス生成直後 |
| Initializing | WASM モジュール読み込み中 |
| Ready | WASM 初期化完了、処理待機中 |
| Running | 検索/生成処理実行中 |
| Paused | 一時停止中（再開可能） |
| Completed | 処理正常完了 |
| Error | エラー終了 |
| Terminated | Worker 破棄済み |

## 3. メッセージプロトコル設計 (P1-2)

### 3.1 共通メッセージ型

#### Main Thread → Worker (Request)

```typescript
/**
 * Worker リクエスト共通型
 * 検索系・生成系で統一したメッセージ構造を使用
 */
type WorkerRequest =
  | { type: 'START'; params: SearchParams | GenerationParams; requestId?: string }
  | { type: 'PAUSE'; requestId?: string }
  | { type: 'RESUME'; requestId?: string }
  | { type: 'STOP'; requestId?: string };
```

#### Worker → Main Thread (Response)

```typescript
/**
 * Worker レスポンス共通型
 * 全Worker種別で統一したメッセージ構造を使用
 */
type WorkerResponse<TProgress, TResult, TCompletion> =
  | { type: 'READY'; version: string }
  | { type: 'PROGRESS'; payload: TProgress }
  | { type: 'RESULTS'; payload: TResult }
  | { type: 'COMPLETE'; payload: TCompletion }
  | { type: 'ERROR'; message: string; category: ErrorCategory; fatal: boolean }
  | { type: 'PAUSED' }
  | { type: 'RESUMED' };

/**
 * 検索 Worker 用インスタンス
 */
type SearchWorkerResponse = WorkerResponse<Progress, ResultsPayload, Completion>;

/**
 * 生成 Worker 用インスタンス
 * (PAUSED/RESUMED は使用しないが、型の統一性を優先)
 */
type GenerationWorkerResponse = WorkerResponse<never, ResultsPayload, Completion>;
```

### 3.2 進捗情報型

```typescript
/**
 * 進捗情報（Worker → Main Thread）
 */
type Progress = {
  processed: number;           // 処理済み数
  total: number;               // 総数
  foundCount: number;          // 結果件数
  elapsedMs: number;           // 経過時間
  estimatedRemainingMs: number; // 推定残り時間
};

/**
 * Worker 状態（Main Thread 管理用）
 * 並列Worker管理で使用
 */
type WorkerStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'error';

type WorkerState = {
  workerId: number;
  progress: Progress;
  status: WorkerStatus;
};
```

### 3.3 完了情報型

```typescript
/**
 * 完了理由
 * 検索系・生成系で統一
 */
type CompletionReason =
  | 'completed'      // 正常完了（全範囲処理）
  | 'stopped'        // ユーザー停止
  | 'max-results'    // 結果件数上限到達
  | 'first-shiny'    // 色違い発見で停止（生成系のみ）
  | 'error';         // エラー終了

/**
 * 完了情報（共通）
 * shinyFound は reason: 'first-shiny' で判別可能なため不要
 */
type Completion = {
  reason: CompletionReason;
  processed: number;    // 処理済み数
  total: number;        // 総数
  resultsCount: number; // 結果件数
  elapsedMs: number;    // 経過時間
};
```

### 3.4 エラー情報型

```typescript
/**
 * エラーカテゴリ
 */
type ErrorCategory =
  | 'VALIDATION'  // パラメータ検証エラー
  | 'WASM_INIT'   // WASM初期化エラー
  | 'RUNTIME'     // 実行時エラー
  | 'ABORTED';    // 中断

// エラーレスポンスは WorkerResponse 内に含まれるため、個別定義不要
```

### 3.5 結果バッチ型

```typescript
/**
 * 結果ペイロード（共通）
 */
type ResultsPayload<T = unknown> = {
  results: readonly T[];
  batchIndex?: number;  // 検索系で使用
};
```

### 3.6 型ガード

```typescript
const VALID_RESPONSE_TYPES = new Set([
  'READY', 'PROGRESS', 'RESULTS', 'COMPLETE', 'ERROR', 'PAUSED', 'RESUMED'
] as const);

type ResponseType = typeof VALID_RESPONSE_TYPES extends Set<infer T> ? T : never;

function hasType(data: unknown): data is { type: string } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'type' in data &&
    typeof (data as { type: unknown }).type === 'string'
  );
}

function isWorkerResponse(data: unknown): data is WorkerResponse<unknown, unknown, unknown> {
  return hasType(data) && VALID_RESPONSE_TYPES.has(data.type as ResponseType);
}
```

## 4. キャンセル機構設計 (P1-3)

### 4.1 制御フロー

```
┌─────────────┐                           ┌─────────────┐
│ Main Thread │                           │   Worker    │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  { type: 'STOP' }                       │
       │────────────────────────────────────────>│
       │                                         │
       │                            stopRequested = true
       │                                         │
       │                            (処理ループで検査)
       │                                         │
       │  { type: 'COMPLETE', reason: 'stopped' }│
       │<────────────────────────────────────────│
       │                                         │
```

### 4.2 Worker 内部状態

```typescript
interface InternalState {
  params: SearchParams | GenerationParams | null;
  running: boolean;
  stopRequested: boolean;
  pauseRequested: boolean;
}

const state: InternalState = {
  params: null,
  running: false,
  stopRequested: false,
  pauseRequested: false,
};
```

### 4.3 停止・一時停止・再開

#### 停止 (STOP)

```typescript
// Worker 側
case 'STOP':
  state.stopRequested = true;
  break;

// 処理ループ内
if (state.stopRequested) {
  return { reason: 'stopped', ... };
}
```

#### 一時停止 (PAUSE) / 再開 (RESUME)

```typescript
// Worker 側
case 'PAUSE':
  state.pauseRequested = true;
  post({ type: 'PAUSED' });
  break;

case 'RESUME':
  state.pauseRequested = false;
  post({ type: 'RESUMED' });
  break;

// 処理ループ内
async function waitWhilePaused(): Promise<void> {
  while (state.pauseRequested && !state.stopRequested) {
    await sleep(100);
  }
}
```

### 4.4 進捗通知間隔

| 項目 | 値 | 備考 |
|-----|-----|------|
| 進捗通知間隔 | 100-200ms | UIの更新頻度とオーバーヘッドのバランス |
| 結果バッチサイズ | 100-1000件 | postMessage のオーバーヘッド削減 |
| 停止検査間隔 | 各セグメント完了時 | 即時性と処理効率のバランス |

## 5. 並列 Worker 管理

### 5.1 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  WorkerService                           ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │              MultiWorkerManager                      │││
│  │  │                                                      │││
│  │  │  - Worker Pool 管理                                  │││
│  │  │  - チャンク分割・割り当て                            │││
│  │  │  - 進捗集約                                          │││
│  │  │  - 結果マージ                                        │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Worker 1│          │ Worker 2│          │ Worker N│
    │  (WASM) │          │  (WASM) │          │  (WASM) │
    └─────────┘          └─────────┘          └─────────┘
```

### 5.2 チャンク分割

```typescript
/**
 * 時間ベースチャンク
 */
type TimeChunk = {
  workerId: number;
  startDateTime: Date;
  endDateTime: Date;
  rangeSeconds: number;
};

function calculateTimeChunks(
  params: SearchParams,
  maxWorkers: number
): readonly TimeChunk[];
```

### 5.3 進捗集約

```typescript
/**
 * 集約進捗情報
 */
type AggregatedProgress = Progress & {
  activeWorkers: number;
  completedWorkers: number;
  workerStates: ReadonlyMap<number, WorkerState>;
};
```

### 5.4 コールバック

```typescript
/**
 * Worker コールバック（共通）
 * 単一/複数Workerで統一した構造を使用
 */
type WorkerCallbacks<TProgress, TResult> = {
  onProgress: (progress: TProgress) => void;
  onResult: (result: TResult) => void;
  onComplete: (reason: CompletionReason) => void;
  onError: (message: string, category: ErrorCategory, fatal: boolean) => void;
  onPaused?: () => void;
  onResumed?: () => void;
};
```

## 6. Worker 種別別パラメータ

### 6.1 BootTimingWorker / InitialSeedWorker

```typescript
type SearchParams = {
  dateRange: DateRange;
  timer0Range: { min: number; max: number };
  vcountRange: { min: number; max: number };
  keyInputMask: number;
  macAddress: readonly [number, number, number, number, number, number];
  hardware: Hardware;
  romVersion: ROMVersion;
  romRegion: ROMRegion;
  timeRange: DailyTimeRange;
  targetSeeds: readonly number[];
  maxResults: number;
};
```

### 6.2 GenerationWorker

```typescript
type GenerationParams = {
  baseSeed: bigint;
  offset: bigint;
  maxAdvances: number;
  maxResults: number;
  version: 'B' | 'W' | 'B2' | 'W2';
  encounterType: number;
  tid: number;
  sid: number;
  syncEnabled: boolean;
  syncNatureId: number;
  shinyCharm: boolean;
  isShinyLocked: boolean;
  stopAtFirstShiny: boolean;
  stopOnCap: boolean;
  newGame: boolean;
  withSave: boolean;
  memoryLink: boolean;
};
```

## 7. ファイル構成

```
src/
├── types/
│   ├── worker.ts               # Workerメッセージプロトコル型
│   ├── search.ts               # 検索パラメータ・結果型
│   └── generation.ts           # 生成パラメータ・結果型
│
├── workers/
│   ├── boot-timing-worker.ts   # CPU版起動時刻探索
│   ├── initial-seed-worker.ts  # CPU版初期Seed探索
│   └── generation-worker.ts    # 乱数列生成
│
└── lib/
    └── workers/
        ├── worker-manager.ts       # Worker管理（単一/複数統合）
        └── chunk-calculator.ts     # チャンク分割計算
```

**簡約のポイント:**
- `worker-protocol.ts` → `worker.ts` （名前簡約）
- `boot-timing-search.ts` + `initial-seed-search.ts` → `search.ts` （統合）
- `parallel.ts` + `callbacks.ts` → `worker.ts` に統合
- `worker-service.ts` → 削除（Managerに統合）
- `base-worker-manager.ts` + `multi-worker-manager.ts` → `worker-manager.ts`
- GPU Worker は Phase 2 で追加

## 8. テスト戦略

### 8.1 テストレベル

| レベル | 対象 | テストフレームワーク | 備考 |
|-------|------|---------------------|------|
| Unit | 型定義・バリデーション | Vitest | Worker 不要 |
| Unit | Worker Manager | Vitest + Mock Worker | Worker をモック |
| Integration | Worker + WASM | Vitest Browser Mode | 実際の Worker |
| E2E | 全体フロー | Playwright | ブラウザ実行 |

### 8.2 テスト方針

**Unit テスト**:
- 型定義のバリデーション関数
- Worker Manager のコールバック登録・状態管理
- Mock Worker を使用して postMessage/onmessage をシミュレート

**Integration テスト**:
- 実際の Worker インスタンスを生成
- WASM 初期化から READY までのフロー確認
- START → PROGRESS → COMPLETE のメッセージフロー検証
- STOP リクエストによる中断動作確認

**E2E テスト**:
- UI からの検索開始・停止操作
- 結果表示・フィルタリング
- 複数 Worker の並列実行

### 8.3 テストユーティリティ

```typescript
// Worker の READY 待機
function waitForReady(worker: Worker, timeoutMs = 5000): Promise<void>;

// 指定条件を満たすメッセージを収集
function collectMessages(
  worker: Worker,
  types: WorkerResponse['type'][],
  endPredicate: (msg: WorkerResponse) => boolean,
  timeoutMs?: number
): Promise<WorkerResponse[]>;
```

### 8.4 ファイル構成

```
src/test/
├── helpers/
│   └── worker-test-helpers.ts    # テストユーティリティ
├── types/
│   └── *.test.ts                 # 型定義・バリデーションテスト
└── workers/
    ├── *.test.ts                 # Mock Worker テスト
    └── *.integration.test.ts     # 統合テスト
```

## 9. 参照元実装との対応

| 参照元 | 本設計 |
|-------|-------|
| `types/parallel.ts`, `types/callbacks.ts`, `types/worker.ts` | `types/worker.ts` |
| `types/mt-seed-boot-timing-search.ts` | `types/search.ts` |
| `types/generation.ts` | `types/generation.ts` |
| `workers/mt-seed-boot-timing-worker.ts` | `workers/boot-timing-worker.ts`, `workers/initial-seed-worker.ts` |
| `workers/generation-worker.ts` | `workers/generation-worker.ts` |
| `lib/mt-seed/...-multi-worker-manager.ts`, `lib/generation/...-worker-manager.ts` | `lib/workers/worker-manager.ts` |

## 10. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [mig_002/overview.md](../mig_002/overview.md) | WASM API 設計概要 |
| [mig_002/datetime-search/worker-interface.md](../mig_002/datetime-search/worker-interface.md) | Worker ↔ WASM インタフェース詳細 |
| [mig_002/datetime-search/base.md](../mig_002/datetime-search/base.md) | 起動時刻検索 共通基盤 |
| [mig_002/gpu/api.md](../mig_002/gpu/api.md) | GPU API 設計 |
