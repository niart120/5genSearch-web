/**
 * 純 WASM MtseedDatetime 検索スループット計測 (Node.js)
 *
 * Worker/postMessage/yield オーバーヘッドなしで WASM 実行速度を測定する。
 * V8 エンジンは Chrome と同じ WASM コンパイラを使用するため、
 * ブラウザ WASM と同等の性能が期待される。
 *
 * 実行: node scripts/bench-wasm-node.mjs [workerCount]
 *   - workerCount 省略: シングルスレッド計測
 *   - workerCount 指定: worker_threads で並列計測 (スケーリング検証)
 */

import { createRequire } from 'module';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

/** 検索パラメータ（Rust テストと同一） */
const PARAMS = {
  target_seeds: [0x12345678, 0x87654321, 0xabcdef01],
  ds: {
    mac: [0x00, 0x09, 0xbf, 0x12, 0x34, 0x56],
    hardware: 'DsLite',
    version: 'Black',
    region: 'Jpn',
  },
  time_range: {
    hour_start: 0,
    hour_end: 23,
    minute_start: 0,
    minute_end: 59,
    second_start: 0,
    second_end: 59,
  },
  search_range: {
    start_year: 2011,
    start_month: 1,
    start_day: 1,
    start_second_offset: 0,
    range_seconds: 86400 * 7, // 1 週間
  },
  condition: {
    timer0: 0x0c79,
    vcount: 0x5f,
    key_code: 0,
  },
};

const CHUNK_SIZE = 500_000;
const TARGET_BATCHES = 1;
const ITERATIONS = 5;
const WARMUP_BATCHES = 2;

// =========================================================================
// Worker thread: 単独WASM計測
// =========================================================================
if (!isMainThread) {
  const wasm = require(workerData.wasmPath);
  const { MtseedDatetimeSearcher } = wasm;

  // ウォームアップ
  {
    const s = new MtseedDatetimeSearcher(PARAMS);
    for (let i = 0; i < WARMUP_BATCHES && !s.is_done; i++) s.next_batch(CHUNK_SIZE);
    s.free();
  }

  let totalElements = 0n;
  let totalNs = 0n;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const s = new MtseedDatetimeSearcher(PARAMS);
    const start = process.hrtime.bigint();
    let batches = 0;
    for (let b = 0; b < TARGET_BATCHES && !s.is_done; b++) {
      s.next_batch(CHUNK_SIZE);
      batches++;
    }
    const elapsed = process.hrtime.bigint() - start;
    totalElements += BigInt(CHUNK_SIZE) * BigInt(batches);
    totalNs += elapsed;
    s.free();
  }

  parentPort.postMessage({
    totalElements: totalElements.toString(),
    totalNs: totalNs.toString(),
  });
  process.exit(0);
}

// =========================================================================
// Main thread
// =========================================================================
const workerCount = parseInt(process.argv[2], 10) || 0;
const wasmPath = join(__dirname, '..', 'target', 'wasm-bench-pkg', 'wasm_pkg.js');

if (workerCount === 0) {
  // シングルスレッド計測
  const wasm = require(wasmPath);
  const { MtseedDatetimeSearcher } = wasm;

  // ウォームアップ
  {
    const s = new MtseedDatetimeSearcher(PARAMS);
    for (let i = 0; i < WARMUP_BATCHES && !s.is_done; i++) s.next_batch(CHUNK_SIZE);
    s.free();
  }

  let totalElements = 0n;
  let totalNs = 0n;
  const results = [];

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const s = new MtseedDatetimeSearcher(PARAMS);
    const start = process.hrtime.bigint();
    let batches = 0;
    for (let b = 0; b < TARGET_BATCHES && !s.is_done; b++) {
      s.next_batch(CHUNK_SIZE);
      batches++;
    }
    const elapsed = process.hrtime.bigint() - start;
    const elements = BigInt(CHUNK_SIZE) * BigInt(batches);
    totalElements += elements;
    totalNs += elapsed;
    const elapsedMs = Number(elapsed) / 1e6;
    const throughput = Number(elements) / (Number(elapsed) / 1e9) / 1e6;
    results.push({ elapsedMs, throughput });
    s.free();
  }

  const totalMs = Number(totalNs) / 1e6;
  const avgThroughput = Number(totalElements) / (Number(totalNs) / 1e9) / 1e6;
  const nativeThroughput = 12.6;
  const ratio = (avgThroughput / nativeThroughput) * 100;

  console.log(`
========================================
WASM Benchmark (Single Thread)
========================================
Chunk size     : ${CHUNK_SIZE}
Batches/iter   : ${TARGET_BATCHES}
Iterations     : ${ITERATIONS}
----------------------------------------`);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(
      `  Iter ${i + 1}: ${r.elapsedMs.toFixed(1)} ms, ${r.throughput.toFixed(2)} Melem/s`
    );
  }
  console.log(`----------------------------------------
Avg throughput : ${avgThroughput.toFixed(2)} Melem/s
Native Criterion: ${nativeThroughput} Melem/s
WASM/Native    : ${ratio.toFixed(1)}%
========================================`);
} else {
  // マルチスレッド計測
  console.log(`\n========================================`);
  console.log(`WASM Benchmark (${workerCount} threads)`);
  console.log(`========================================`);
  console.log(`Chunk size     : ${CHUNK_SIZE}`);
  console.log(`Batches/iter   : ${TARGET_BATCHES}`);
  console.log(`Iterations     : ${ITERATIONS}`);
  console.log(`----------------------------------------`);

  const globalStart = process.hrtime.bigint();

  const promises = [];
  for (let i = 0; i < workerCount; i++) {
    promises.push(
      new Promise((resolve, reject) => {
        const w = new Worker(__filename, {
          workerData: { wasmPath },
        });
        w.on('message', resolve);
        w.on('error', reject);
      })
    );
  }

  const results = await Promise.all(promises);
  const globalElapsed = process.hrtime.bigint() - globalStart;

  let sumElements = 0n;
  const perWorker = [];
  for (const r of results) {
    const el = BigInt(r.totalElements);
    const ns = BigInt(r.totalNs);
    sumElements += el;
    const tp = Number(el) / (Number(ns) / 1e9) / 1e6;
    perWorker.push(tp);
  }

  const globalMs = Number(globalElapsed) / 1e6;
  const aggregateThroughput = Number(sumElements) / (globalMs / 1000) / 1e6;
  const avgPerWorker = perWorker.reduce((a, b) => a + b, 0) / perWorker.length;
  const nativeThroughput = 12.6;

  console.log(`Per-worker avg : ${avgPerWorker.toFixed(2)} Melem/s`);
  console.log(`Aggregate      : ${aggregateThroughput.toFixed(2)} Melem/s`);
  console.log(`Wall clock     : ${globalMs.toFixed(1)} ms`);
  console.log(`Expected (linear): ${(avgPerWorker * workerCount).toFixed(2)} Melem/s`);
  console.log(
    `Scaling ratio  : ${((aggregateThroughput / (avgPerWorker * workerCount)) * 100).toFixed(1)}%`
  );
  console.log(
    `vs Native ×${workerCount}: ${((aggregateThroughput / (nativeThroughput * workerCount)) * 100).toFixed(1)}%`
  );
  console.log(`========================================`);
}
