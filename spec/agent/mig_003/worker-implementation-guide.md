# Worker 実装ガイド

Phase 1 タスク P1-6, P1-7 に対応する Worker 基盤実装と単体テスト設計。

## 1. 概要

本ドキュメントでは、TypeScript側のWorker基盤実装パターンと、テスト戦略を定義する。

### 1.1 対象読者

- Worker実装担当者
- テスト実装担当者

### 1.2 前提知識

- [mig_001: Worker アーキテクチャ設計](../mig_001/worker-architecture.md)
- [mig_002: WASM API 仕様](../mig_002/wasm-api-specification.md)

## 2. Worker 実装パターン

### 2.1 基本構造

```typescript
// src/workers/{worker-name}-worker.ts

import type {
  WorkerRequest,
  WorkerResponse,
  SearchParams,
  SearchResult,
  SearchCompletion,
  SearchProgress,
} from '@/types/{worker-type}';
import {
  initWasm,
  getWasm,
  isWasmReady,
} from '@/lib/core/wasm-interface';

// ========================================
// 内部状態
// ========================================

interface InternalState {
  params: SearchParams | null;
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

// ========================================
// Worker コンテキスト
// ========================================

const ctx = self as typeof self & { onclose?: () => void };
const post = (message: WorkerResponse) => ctx.postMessage(message);

// 初期化完了通知
post({ type: 'READY', version: '1' });

// ========================================
// メッセージハンドラ
// ========================================

ctx.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  (async () => {
    try {
      switch (msg.type) {
        case 'START_SEARCH':
          await handleStart(msg.params);
          break;
        case 'PAUSE':
          handlePause();
          break;
        case 'RESUME':
          handleResume();
          break;
        case 'STOP':
          state.stopRequested = true;
          break;
        default:
          break;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      post({ type: 'ERROR', message, category: 'RUNTIME', fatal: false });
    }
  })();
};

// ========================================
// ハンドラ実装
// ========================================

async function handleStart(params: SearchParams) {
  if (state.running) return;

  // バリデーション
  const errors = validateParams(params);
  if (errors.length > 0) {
    post({ type: 'ERROR', message: errors.join(', '), category: 'VALIDATION', fatal: false });
    return;
  }

  state.params = params;
  state.stopRequested = false;
  state.pauseRequested = false;
  state.running = true;

  const startTime = performance.now();

  try {
    // WASM 初期化
    await ensureWasm();

    // 検索実行
    const result = await executeSearch(params, startTime);

    // 完了通知
    const completion: SearchCompletion = {
      reason: state.stopRequested ? 'stopped' : 'completed',
      processedCombinations: result.processedCount,
      totalCombinations: result.totalCount,
      resultsCount: result.resultsCount,
      elapsedMs: performance.now() - startTime,
    };
    post({ type: 'COMPLETE', payload: completion });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    post({ type: 'ERROR', message, category: 'RUNTIME', fatal: true });
  } finally {
    cleanupState();
  }
}

function handlePause() {
  if (!state.running) return;
  state.pauseRequested = true;
  post({ type: 'PAUSED' });
}

function handleResume() {
  if (!state.running) return;
  state.pauseRequested = false;
  post({ type: 'RESUMED' });
}

// ========================================
// 検索実行
// ========================================

async function executeSearch(
  params: SearchParams,
  startTime: number
): Promise<SearchExecutionResult> {
  const wasm = getWasm();
  
  // イテレータ作成
  const iterator = createIterator(wasm, params);
  
  let resultsCount = 0;
  let processedCount = 0;
  const totalCount = iterator.totalSeconds;
  let lastProgressTime = startTime;

  const PROGRESS_INTERVAL_MS = 100;
  const BATCH_SIZE = 100;
  const CHUNK_SECONDS = 10;

  while (!iterator.isFinished) {
    // 一時停止処理
    await waitWhilePaused();

    // 停止チェック
    if (state.stopRequested) {
      break;
    }

    // バッチ取得
    const batch = iterator.next_batch(BATCH_SIZE, CHUNK_SECONDS);
    const results = batch.to_array();
    processedCount = iterator.processedSeconds;

    // 結果送信
    if (results.length > 0) {
      const converted = convertResults(results, params);
      post({ type: 'RESULTS', payload: { results: converted, batchIndex: processedCount } });
      resultsCount += results.length;
    }

    // 進捗通知
    const now = performance.now();
    if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
      const elapsedMs = now - startTime;
      const progressPercent = (processedCount / totalCount) * 100;
      const estimatedRemainingMs = progressPercent > 0
        ? (elapsedMs / progressPercent) * (100 - progressPercent)
        : 0;

      const progress: SearchProgress = {
        processedCombinations: processedCount,
        totalCombinations: totalCount,
        foundCount: resultsCount,
        progressPercent,
        elapsedMs,
        estimatedRemainingMs,
        processedSeconds: processedCount,
      };
      post({ type: 'PROGRESS', payload: progress });
      lastProgressTime = now;
    }
  }

  return { resultsCount, processedCount, totalCount };
}

// ========================================
// ユーティリティ
// ========================================

async function ensureWasm(): Promise<void> {
  if (!isWasmReady()) {
    await initWasm();
  }
}

async function waitWhilePaused(): Promise<void> {
  while (state.pauseRequested && !state.stopRequested) {
    await sleep(100);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanupState(): void {
  state.running = false;
  state.params = null;
  state.stopRequested = false;
  state.pauseRequested = false;
}

// クリーンアップ
ctx.onclose = () => {
  cleanupState();
};

export {};
```

### 2.2 Worker 種別ごとの差分

| Worker | イテレータ | 結果変換 | 備考 |
|--------|-----------|---------|------|
| BootTimingWorker | `BootTimingSearchIterator` | `convertBootTimingResults` | セグメントループはTS側 |
| InitialSeedWorker | `MtSeedBootTimingSearchIterator` | `convertMtSeedResults` | セグメントループはTS側 |
| GenerationWorker | `SeedEnumerator` | `parseFromWasmRaw` + `resolvePokemon` | 逐次処理 |

### 2.3 セグメントループパターン

Boot Timing / Initial Seed 探索では、timer0 × vcount × keyCode のセグメントをTypeScript側でループする。

```typescript
async function executeSearch(
  params: SearchParams,
  startTime: number
): Promise<SearchExecutionResult> {
  const wasm = getWasm();
  
  // セグメント生成
  const segments = generateSegments(params);
  const totalSegments = segments.length;
  
  let resultsCount = 0;
  let processedSegments = 0;

  for (const segment of segments) {
    // 停止チェック
    if (state.stopRequested || resultsCount >= params.maxResults) {
      break;
    }

    // 一時停止処理
    await waitWhilePaused();

    // セグメント用イテレータ作成
    const dsConfig = buildDSConfig(wasm, params);
    const segmentParams = buildSegmentParams(wasm, segment);
    const timeRangeParams = buildTimeRangeParams(wasm, params.timeRange);
    const searchRangeParams = buildSearchRangeParams(wasm, params);

    const iterator = new wasm.MtSeedBootTimingSearchIterator(
      dsConfig,
      segmentParams,
      timeRangeParams,
      searchRangeParams,
      new Uint32Array(params.targetSeeds),
    );

    // セグメント内検索
    while (!iterator.isFinished && !state.stopRequested) {
      const batch = iterator.next_batch(BATCH_SIZE, CHUNK_SECONDS);
      const results = batch.to_array();
      
      if (results.length > 0) {
        const converted = convertResults(results, params);
        post({ type: 'RESULTS', payload: { results: converted, batchIndex: processedSegments } });
        resultsCount += results.length;
      }
    }

    processedSegments++;
    
    // 進捗通知
    postProgress(processedSegments, totalSegments, resultsCount, startTime);
  }

  return { resultsCount, processedCount: processedSegments, totalCount: totalSegments };
}

function generateSegments(params: SearchParams): Segment[] {
  const segments: Segment[] = [];
  const keyCodes = generateValidKeyCodes(params.keyInputMask);

  for (let timer0 = params.timer0Range.min; timer0 <= params.timer0Range.max; timer0++) {
    for (let vcount = params.vcountRange.min; vcount <= params.vcountRange.max; vcount++) {
      for (const keyCode of keyCodes) {
        segments.push({ timer0, vcount, keyCode });
      }
    }
  }

  return segments;
}
```

### 2.4 Generation Worker パターン

Generation Worker は逐次処理で、イテレータから1件ずつポケモンを取得する。

```typescript
async function handleStart(
  params: GenerationParams,
  resolutionContext?: SerializedResolutionContext,
) {
  if (state.running) return;

  const errors = validateGenerationParams(params);
  if (errors.length > 0) {
    post({ type: 'ERROR', message: errors.join(', '), category: 'VALIDATION', fatal: false });
    return;
  }

  state.params = params;
  state.resolutionContext = hydrateResolutionContext(resolutionContext);
  state.stopRequested = false;
  state.running = true;

  try {
    const enumerator = await prepareEnumerator(params);
    state.enumerator = enumerator;

    const runOutcome = executeEnumeration(params);
    postResults(runOutcome.results, runOutcome.resolved);
    post({ type: 'COMPLETE', payload: runOutcome.completion });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    post({ type: 'ERROR', message, category: 'WASM_INIT', fatal: true });
  } finally {
    cleanupState();
  }
}

function executeEnumeration(params: GenerationParams) {
  const results: GenerationResult[] = [];
  const resolved: ResolvedPokemonData[] = [];
  let processedAdvances = 0;
  let shinyFound = false;
  let reason: GenerationCompletion['reason'] | null = null;

  const startTime = performance.now();
  const totalAdvances = params.maxAdvances - Number(params.offset);

  for (let i = 0; i < totalAdvances; i++) {
    if (state.stopRequested) {
      reason = 'stopped';
      break;
    }

    const raw = state.enumerator!.next_pokemon();
    if (!raw) {
      reason = 'max-advances';
      break;
    }

    const unresolved = parseFromWasmRaw(raw);
    const result: GenerationResult = {
      ...unresolved,
      advance: readAdvanceOrFallback(raw, Number(params.offset) + i),
    };

    const isShiny = (result.shiny_type ?? 0) !== 0;
    if (isShiny) shinyFound = true;

    processedAdvances++;

    if (results.length < params.maxResults) {
      results.push(result);
      resolved.push(resolvePokemon(result, state.resolutionContext));
    }

    if (params.stopAtFirstShiny && isShiny) {
      reason = 'first-shiny';
      break;
    }

    if (params.stopOnCap && results.length >= params.maxResults) {
      reason = 'max-results';
      break;
    }
  }

  if (!reason) {
    reason = state.stopRequested ? 'stopped' : 'max-advances';
  }

  return {
    results,
    resolved,
    completion: {
      reason,
      processedAdvances,
      resultsCount: results.length,
      elapsedMs: performance.now() - startTime,
      shinyFound,
    },
  };
}
```

## 3. Worker Manager 実装パターン

### 3.1 単一 Worker Manager

```typescript
// src/lib/workers/{worker-name}-worker-manager.ts

import type {
  WorkerRequest,
  WorkerResponse,
  SearchParams,
  SearchResult,
  SearchCompletion,
} from '@/types/{worker-type}';
import { isWorkerResponse } from '@/types/{worker-type}';

type ResultsCb = (results: SearchResult[]) => void;
type CompleteCb = (completion: SearchCompletion) => void;
type ErrorCb = (message: string, category: string, fatal: boolean) => void;
type ProgressCb = (progress: SearchProgress) => void;

interface CallbackRegistry {
  results: ResultsCb[];
  complete: CompleteCb[];
  error: ErrorCb[];
  progress: ProgressCb[];
}

export class WorkerManager {
  private worker: Worker | null = null;
  private callbacks: CallbackRegistry = { results: [], complete: [], error: [], progress: [] };
  private running = false;
  private terminated = false;

  constructor(
    private readonly createWorker: () => Worker = () =>
      new Worker(new URL('@/workers/{worker-name}-worker.ts', import.meta.url), { type: 'module' }),
  ) {}

  // ========================================
  // Public API
  // ========================================

  async start(params: SearchParams): Promise<void> {
    if (this.running) {
      throw new Error('Search already running');
    }

    const needsFreshWorker = this.terminated || this.worker === null;
    this.ensureWorker(needsFreshWorker);
    this.running = true;

    const request: WorkerRequest = {
      type: 'START_SEARCH',
      params,
      requestId: this.generateRequestId(),
    };
    this.worker!.postMessage(request);
  }

  pause(): void {
    if (!this.running) return;
    this.worker?.postMessage({ type: 'PAUSE' } satisfies WorkerRequest);
  }

  resume(): void {
    if (!this.running) return;
    this.worker?.postMessage({ type: 'RESUME' } satisfies WorkerRequest);
  }

  stop(): void {
    if (!this.running) return;
    this.worker?.postMessage({ type: 'STOP' } satisfies WorkerRequest);
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.running = false;
    this.terminated = true;
  }

  isRunning(): boolean {
    return this.running;
  }

  // ========================================
  // Callback Registration
  // ========================================

  onResults(cb: ResultsCb): this {
    this.callbacks.results.push(cb);
    return this;
  }

  onComplete(cb: CompleteCb): this {
    this.callbacks.complete.push(cb);
    return this;
  }

  onError(cb: ErrorCb): this {
    this.callbacks.error.push(cb);
    return this;
  }

  onProgress(cb: ProgressCb): this {
    this.callbacks.progress.push(cb);
    return this;
  }

  // ========================================
  // Internal
  // ========================================

  private ensureWorker(forceNew = false): void {
    if (this.worker && (forceNew || this.terminated)) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.worker) return;

    this.worker = this.createWorker();
    this.terminated = false;
    this.worker.onmessage = (ev: MessageEvent) => this.handleMessage(ev.data);
    this.worker.onerror = () => {
      this.emitError('Worker error event', 'RUNTIME', true);
      this.terminate();
    };
  }

  private handleMessage(raw: unknown): void {
    if (!isWorkerResponse(raw)) return;

    switch (raw.type) {
      case 'READY':
        break;
      case 'PROGRESS':
        this.callbacks.progress.forEach(cb => cb(raw.payload));
        break;
      case 'RESULTS':
        this.callbacks.results.forEach(cb => cb(raw.payload.results));
        break;
      case 'COMPLETE':
        this.running = false;
        this.callbacks.complete.forEach(cb => cb(raw.payload));
        break;
      case 'ERROR':
        this.emitError(raw.message, raw.category, raw.fatal);
        if (raw.fatal) {
          this.running = false;
          this.terminate();
        }
        break;
    }
  }

  private emitError(message: string, category: string, fatal: boolean): void {
    this.callbacks.error.forEach(cb => cb(message, category, fatal));
  }

  private generateRequestId(): string {
    return `req-${Math.random().toString(36).slice(2, 10)}`;
  }
}
```

### 3.2 並列 Worker Manager

```typescript
// src/lib/workers/multi-worker-manager.ts

import type { TimeChunk } from '@/types/parallel';
import type {
  SearchParams,
  SearchResult,
  SearchProgress,
  SearchCompletion,
} from '@/types/{worker-type}';

interface WorkerState {
  worker: Worker;
  chunk: TimeChunk;
  progress: WorkerProgress;
  completed: boolean;
}

interface AggregatedProgress {
  totalCurrentStep: number;
  totalSteps: number;
  totalElapsedTime: number;
  totalEstimatedTimeRemaining: number;
  totalMatchesFound: number;
  activeWorkers: number;
  completedWorkers: number;
  workerProgresses: Map<number, WorkerProgress>;
  progressPercent: number;
}

export interface MultiWorkerCallbacks {
  onProgress: (progress: AggregatedProgress) => void;
  onResult: (result: SearchResult) => void;
  onComplete: (message: string) => void;
  onError: (error: string) => void;
  onPaused: () => void;
  onResumed: () => void;
  onStopped: () => void;
}

export class MultiWorkerManager {
  private workers: Map<number, WorkerState> = new Map();
  private callbacks: MultiWorkerCallbacks | null = null;
  private searchRunning = false;
  private maxWorkers: number;
  private managerStartTime = 0;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers ?? getDefaultWorkerCount();
  }

  // ========================================
  // Public API
  // ========================================

  setMaxWorkers(count: number): void {
    if (this.searchRunning) {
      console.warn('Cannot change worker count during active search');
      return;
    }
    this.maxWorkers = Math.max(1, Math.min(count, navigator.hardwareConcurrency || 4));
  }

  getMaxWorkers(): number {
    return this.maxWorkers;
  }

  async startParallelSearch(
    params: SearchParams,
    callbacks: MultiWorkerCallbacks,
  ): Promise<void> {
    if (this.searchRunning) {
      throw new Error('Search is already running');
    }

    this.cleanup();
    this.callbacks = callbacks;
    this.searchRunning = true;
    this.managerStartTime = performance.now();

    try {
      // チャンク分割
      const chunks = calculateTimeChunks(params, this.maxWorkers);

      if (chunks.length === 0) {
        throw new Error('No valid chunks created for search');
      }

      // 全Workerを並列初期化
      await Promise.all(chunks.map(chunk => this.initializeWorker(chunk, params)));

      // 進捗監視開始
      this.startProgressMonitoring();
    } catch (error) {
      console.error('Failed to start parallel search:', error);
      this.cleanup();
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  pauseAll(): void {
    if (!this.searchRunning) return;
    this.workers.forEach(state => {
      state.worker.postMessage({ type: 'PAUSE' });
    });
    this.callbacks?.onPaused();
  }

  resumeAll(): void {
    if (!this.searchRunning) return;
    this.workers.forEach(state => {
      state.worker.postMessage({ type: 'RESUME' });
    });
    this.callbacks?.onResumed();
  }

  stopAll(): void {
    if (!this.searchRunning) return;
    this.workers.forEach(state => {
      state.worker.postMessage({ type: 'STOP' });
    });
  }

  terminateAll(): void {
    this.workers.forEach(state => {
      state.worker.terminate();
    });
    this.workers.clear();
    this.searchRunning = false;
  }

  // ========================================
  // Internal
  // ========================================

  private async initializeWorker(chunk: TimeChunk, params: SearchParams): Promise<void> {
    const worker = new Worker(
      new URL('@/workers/{worker-name}-worker.ts', import.meta.url),
      { type: 'module' },
    );

    const state: WorkerState = {
      worker,
      chunk,
      progress: {
        workerId: chunk.workerId,
        currentStep: 0,
        totalSteps: chunk.estimatedOperations,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        matchesFound: 0,
        status: 'initializing',
      },
      completed: false,
    };

    this.workers.set(chunk.workerId, state);

    worker.onmessage = (ev: MessageEvent) => {
      this.handleWorkerMessage(chunk.workerId, ev.data);
    };

    worker.onerror = () => {
      this.callbacks?.onError(`Worker ${chunk.workerId} error`);
    };

    // READY待機
    await new Promise<void>((resolve) => {
      const originalHandler = worker.onmessage;
      worker.onmessage = (ev: MessageEvent) => {
        if (ev.data.type === 'READY') {
          worker.onmessage = originalHandler;
          resolve();
        }
      };
    });

    // チャンク用パラメータで検索開始
    const chunkParams = { ...params, dateRange: chunkToDateRange(chunk) };
    worker.postMessage({
      type: 'START_SEARCH',
      params: chunkParams,
      requestId: `worker-${chunk.workerId}`,
    });
  }

  private handleWorkerMessage(workerId: number, data: unknown): void {
    const state = this.workers.get(workerId);
    if (!state) return;

    if (!isWorkerResponse(data)) return;

    switch (data.type) {
      case 'PROGRESS':
        this.updateWorkerProgress(workerId, data.payload);
        break;
      case 'RESULTS':
        for (const result of data.payload.results) {
          this.callbacks?.onResult(result);
        }
        break;
      case 'COMPLETE':
        state.completed = true;
        this.checkAllCompleted();
        break;
      case 'ERROR':
        this.callbacks?.onError(data.message);
        break;
    }
  }

  private updateWorkerProgress(workerId: number, progress: SearchProgress): void {
    const state = this.workers.get(workerId);
    if (!state) return;

    state.progress = {
      ...state.progress,
      currentStep: progress.processedCombinations,
      matchesFound: progress.foundCount,
      elapsedTime: progress.elapsedMs,
      estimatedTimeRemaining: progress.estimatedRemainingMs,
      status: 'running',
    };
  }

  private aggregateProgress(): AggregatedProgress {
    let totalCurrent = 0;
    let totalSteps = 0;
    let totalMatches = 0;
    let activeWorkers = 0;
    let completedWorkers = 0;

    const workerProgresses = new Map<number, WorkerProgress>();

    this.workers.forEach((state, workerId) => {
      totalCurrent += state.progress.currentStep;
      totalSteps += state.progress.totalSteps;
      totalMatches += state.progress.matchesFound;
      workerProgresses.set(workerId, state.progress);

      if (state.completed) {
        completedWorkers++;
      } else {
        activeWorkers++;
      }
    });

    const elapsedTime = performance.now() - this.managerStartTime;
    const progressPercent = totalSteps > 0 ? (totalCurrent / totalSteps) * 100 : 0;
    const estimatedRemaining = progressPercent > 0
      ? (elapsedTime / progressPercent) * (100 - progressPercent)
      : 0;

    return {
      totalCurrentStep: totalCurrent,
      totalSteps,
      totalElapsedTime: elapsedTime,
      totalEstimatedTimeRemaining: estimatedRemaining,
      totalMatchesFound: totalMatches,
      activeWorkers,
      completedWorkers,
      workerProgresses,
      progressPercent,
    };
  }

  private checkAllCompleted(): void {
    const allCompleted = Array.from(this.workers.values()).every(s => s.completed);
    if (allCompleted) {
      this.searchRunning = false;
      this.callbacks?.onComplete('All workers completed');
    }
  }

  private cleanup(): void {
    this.workers.forEach(state => {
      state.worker.terminate();
    });
    this.workers.clear();
    this.searchRunning = false;
  }
}

function getDefaultWorkerCount(): number {
  return Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 8));
}
```

## 4. 単体テスト設計 (P1-7)

### 4.1 テスト戦略

| レベル | 対象 | テストフレームワーク | 備考 |
|-------|------|---------------------|------|
| Unit | 型定義・バリデーション | Vitest | Worker不要 |
| Unit | Worker Manager | Vitest + Mock Worker | Workerをモック |
| Integration | Worker + WASM | Vitest Browser Mode | 実際のWorker |
| E2E | 全体フロー | Playwright | ブラウザ実行 |

### 4.2 型定義・バリデーションテスト

```typescript
// src/test/types/{worker-type}.test.ts

import { describe, it, expect } from 'vitest';
import {
  createDefaultSearchParams,
  validateSearchParams,
  isWorkerResponse,
} from '@/types/{worker-type}';

describe('createDefaultSearchParams', () => {
  it('should create default params with valid structure', () => {
    const params = createDefaultSearchParams();

    expect(params).toBeDefined();
    expect(params.timer0Range).toBeDefined();
    expect(params.vcountRange).toBeDefined();
    expect(params.maxResults).toBeGreaterThan(0);
  });
});

describe('validateSearchParams', () => {
  function createValidParams() {
    const params = createDefaultSearchParams();
    params.targetSeeds = [0x12345678];
    return params;
  }

  it('should pass validation for valid params', () => {
    const params = createValidParams();
    const errors = validateSearchParams(params);
    expect(errors).toHaveLength(0);
  });

  it('should fail when targetSeeds is empty', () => {
    const params = createValidParams();
    params.targetSeeds = [];
    const errors = validateSearchParams(params);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when timer0Range min > max', () => {
    const params = createValidParams();
    params.timer0Range = { min: 0x1000, max: 0x0fff };
    const errors = validateSearchParams(params);
    expect(errors).toContain('Timer0の最小値は最大値以下である必要があります');
  });
});

describe('isWorkerResponse', () => {
  it('should return true for valid READY response', () => {
    const response = { type: 'READY', version: '1' };
    expect(isWorkerResponse(response)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isWorkerResponse(null)).toBe(false);
  });

  it('should return false for invalid type', () => {
    expect(isWorkerResponse({ type: 'INVALID' })).toBe(false);
  });
});
```

### 4.3 Mock Worker テスト

```typescript
// src/test/workers/{worker-name}-worker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  WorkerRequest,
  WorkerResponse,
} from '@/types/{worker-type}';
import { createDefaultSearchParams } from '@/types/{worker-type}';

describe('Worker Mock Integration', () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let mockTerminate: ReturnType<typeof vi.fn>;
  let mockOnMessage: ((ev: MessageEvent) => void) | null;

  function createMockWorker() {
    mockPostMessage = vi.fn();
    mockTerminate = vi.fn();
    mockOnMessage = null;

    return {
      postMessage: mockPostMessage,
      terminate: mockTerminate,
      set onmessage(handler: ((ev: MessageEvent) => void) | null) {
        mockOnMessage = handler;
      },
      get onmessage() {
        return mockOnMessage;
      },
    } as unknown as Worker;
  }

  function simulateWorkerMessage(msg: WorkerResponse) {
    if (mockOnMessage) {
      mockOnMessage({ data: msg } as MessageEvent);
    }
  }

  beforeEach(() => {
    mockPostMessage = vi.fn();
    mockTerminate = vi.fn();
    mockOnMessage = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should send START_SEARCH request', () => {
    const worker = createMockWorker();
    const params = createDefaultSearchParams();
    params.targetSeeds = [0x12345678];

    const request: WorkerRequest = { type: 'START_SEARCH', params };
    worker.postMessage(request);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'START_SEARCH' })
    );
  });

  it('should handle READY response', () => {
    createMockWorker();
    simulateWorkerMessage({ type: 'READY', version: '1' });
    // アサーション
  });

  it('should handle COMPLETE response', () => {
    createMockWorker();
    simulateWorkerMessage({
      type: 'COMPLETE',
      payload: {
        reason: 'completed',
        processedCombinations: 1000,
        totalCombinations: 1000,
        resultsCount: 5,
        elapsedMs: 1000,
      },
    });
    // アサーション
  });

  it('should simulate complete search workflow', async () => {
    const worker = createMockWorker();
    const params = createDefaultSearchParams();
    params.targetSeeds = [0x12345678];

    const receivedMessages: WorkerResponse[] = [];
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      receivedMessages.push(ev.data);
    };

    // 1. START_SEARCH 送信
    worker.postMessage({ type: 'START_SEARCH', params });

    // 2. Worker レスポンスをシミュレート
    simulateWorkerMessage({ type: 'READY', version: '1' });
    simulateWorkerMessage({
      type: 'PROGRESS',
      payload: {
        processedCombinations: 500,
        totalCombinations: 1000,
        foundCount: 2,
        progressPercent: 50,
        elapsedMs: 5000,
        estimatedRemainingMs: 5000,
      },
    });
    simulateWorkerMessage({
      type: 'COMPLETE',
      payload: {
        reason: 'completed',
        processedCombinations: 1000,
        totalCombinations: 1000,
        resultsCount: 5,
        elapsedMs: 10000,
      },
    });

    expect(receivedMessages).toHaveLength(3);
    expect(receivedMessages[0].type).toBe('READY');
    expect(receivedMessages[2].type).toBe('COMPLETE');
  });
});
```

### 4.4 統合テスト（実Worker）

```typescript
// src/test/workers/{worker-name}-worker.integration.test.ts

import { describe, it, expect } from 'vitest';

// Worker が使用可能な環境のみ実行
if (typeof Worker === 'undefined') {
  describe.skip('Worker Integration (no Worker support)', () => {
    it('skipped', () => { expect(true).toBe(true); });
  });
} else {
  function makeParams() {
    return {
      // ... 有効なパラメータ
    };
  }

  function createWorker() {
    return new Worker(
      new URL('@/workers/{worker-name}-worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  function waitFor(
    worker: Worker,
    predicate: (msg: unknown) => boolean,
    timeoutMs = 5000
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('timeout'));
      }, timeoutMs);

      worker.addEventListener('message', (ev) => {
        if (predicate(ev.data)) {
          clearTimeout(timer);
          resolve(ev.data);
        }
      });
    });
  }

  describe('Worker Integration', () => {
    it('emits READY on start', async () => {
      const w = createWorker();
      const ready = await waitFor(w, (m: any) => m.type === 'READY');
      expect(ready).toEqual({ type: 'READY', version: '1' });
      w.terminate();
    });

    it('emits RESULTS then COMPLETE', async () => {
      const w = createWorker();
      await waitFor(w, (m: any) => m.type === 'READY');

      w.postMessage({ type: 'START_SEARCH', params: makeParams() });

      const complete = await waitFor(w, (m: any) => m.type === 'COMPLETE');
      expect((complete as any).payload.reason).toBeDefined();

      w.terminate();
    });

    it('STOP request sets completion reason to stopped', async () => {
      const w = createWorker();
      await waitFor(w, (m: any) => m.type === 'READY');

      w.postMessage({ type: 'START_SEARCH', params: makeParams() });
      w.postMessage({ type: 'STOP' });

      const complete = await waitFor(w, (m: any) => m.type === 'COMPLETE');
      expect((complete as any).payload.reason).toBe('stopped');

      w.terminate();
    });
  });
}
```

### 4.5 テストユーティリティ

```typescript
// src/test/helpers/worker-test-helpers.ts

import type { WorkerResponse } from '@/types/{worker-type}';

/**
 * 指定した条件を満たすメッセージを収集
 */
export function collectMessages(
  worker: Worker,
  types: WorkerResponse['type'][],
  endPredicate: (msg: WorkerResponse) => boolean,
  timeoutMs = 60000
): Promise<WorkerResponse[]> {
  return new Promise((resolve, reject) => {
    const collected: WorkerResponse[] = [];
    const timer = setTimeout(() => {
      reject(new Error(`Timeout collecting messages (${timeoutMs}ms)`));
    }, timeoutMs);

    const handler = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data;
      if (types.includes(msg.type)) {
        collected.push(msg);
      }
      if (endPredicate(msg)) {
        clearTimeout(timer);
        worker.removeEventListener('message', handler);
        resolve(collected);
      }
    };

    worker.addEventListener('message', handler);
  });
}

/**
 * Worker の READY 待機
 */
export function waitForReady(worker: Worker, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Worker READY timeout'));
    }, timeoutMs);

    const handler = (ev: MessageEvent) => {
      if (ev.data.type === 'READY') {
        clearTimeout(timer);
        worker.removeEventListener('message', handler);
        resolve();
      }
    };

    worker.addEventListener('message', handler);
  });
}
```

## 5. ファイル構成

```
src/
├── workers/
│   ├── boot-timing-worker.ts
│   ├── boot-timing-worker-gpu.ts
│   ├── initial-seed-worker.ts
│   ├── initial-seed-worker-gpu.ts
│   └── generation-worker.ts
│
├── lib/
│   └── workers/
│       ├── boot-timing-worker-manager.ts
│       ├── initial-seed-worker-manager.ts
│       ├── generation-worker-manager.ts
│       ├── multi-worker-manager.ts
│       └── chunk-calculator.ts
│
├── types/
│   ├── boot-timing-search.ts
│   ├── initial-seed-search.ts
│   ├── generation.ts
│   ├── parallel.ts
│   └── callbacks.ts
│
└── test/
    ├── helpers/
    │   └── worker-test-helpers.ts
    ├── types/
    │   ├── boot-timing-search.test.ts
    │   ├── initial-seed-search.test.ts
    │   └── generation.test.ts
    └── workers/
        ├── boot-timing-worker.test.ts
        ├── boot-timing-worker.integration.test.ts
        ├── initial-seed-worker.test.ts
        ├── initial-seed-worker.integration.test.ts
        ├── generation-worker.test.ts
        └── generation-worker.integration.test.ts
```

## 6. 次ステップ

本ガイドに基づき、Phase 2 以降で以下を実装する:

1. 各Worker種別の実装
2. Worker Manager の実装
3. 単体テスト・統合テストの実装
4. WorkerService（UIとの統合層）の実装
