import { PokemonDatetimeSearcher, WonderCardDatetimeSearcher } from '@/wasm/wasm_pkg.js';
import type {
  PokemonDatetimeSearchParams,
  PokemonSearchBatchLimits,
  WonderCardBatchLimits,
  WonderCardDatetimeSearchParams,
} from '@/wasm/wasm_pkg.js';

export type BatchBenchmarkRequest =
  | {
      kind: 'pokemon';
      params: PokemonDatetimeSearchParams;
      limits: PokemonSearchBatchLimits;
    }
  | {
      kind: 'wondercard';
      params: WonderCardDatetimeSearchParams;
      limits: WonderCardBatchLimits;
    };

export type BatchBenchmarkResponse =
  | { type: 'ready' }
  | { type: 'result'; results: unknown[] }
  | {
      type: 'done';
      processed: number;
      batchCount: number;
      maxBatchMs: number;
      p95BatchMs: number;
    }
  | { type: 'error'; message: string };

interface BatchSearcher {
  readonly is_done: boolean;
  next_batch(limits: { max_candidates: number; max_results: number }): {
    results: unknown[];
    processed_count: bigint;
  };
  free(): void;
}

function percentile95(values: number[]): number {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] ?? 0;
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

globalThis.addEventListener('message', (event: MessageEvent<BatchBenchmarkRequest>) => {
  void run(event.data);
});
globalThis.postMessage({ type: 'ready' } satisfies BatchBenchmarkResponse);

function createSearcher(request: BatchBenchmarkRequest): BatchSearcher {
  return request.kind === 'pokemon'
    ? new PokemonDatetimeSearcher(request.params)
    : new WonderCardDatetimeSearcher(request.params);
}

async function run(request: BatchBenchmarkRequest): Promise<void> {
  const searcher = createSearcher(request);
  const batchTimes: number[] = [];
  let processed = 0;
  try {
    while (!searcher.is_done) {
      const batchStart = performance.now();
      const batch = searcher.next_batch(request.limits);
      batchTimes.push(performance.now() - batchStart);
      processed = Number(batch.processed_count);
      if (batch.results.length > 0) {
        globalThis.postMessage({
          type: 'result',
          results: batch.results,
        } satisfies BatchBenchmarkResponse);
      }
      await yieldToMain();
    }
    globalThis.postMessage({
      type: 'done',
      processed,
      batchCount: batchTimes.length,
      maxBatchMs: Math.max(...batchTimes),
      p95BatchMs: percentile95(batchTimes),
    } satisfies BatchBenchmarkResponse);
  } catch (error) {
    globalThis.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    } satisfies BatchBenchmarkResponse);
  } finally {
    searcher.free();
  }
}
