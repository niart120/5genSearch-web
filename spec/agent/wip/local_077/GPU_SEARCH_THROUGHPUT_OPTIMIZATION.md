# GPU 検索スループット最適化 仕様書

## 1. 概要

### 1.1 目的

MtseedDatetime 検索の GPU パスにおけるスループット劣化を調査・改善する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MtseedDatetime 検索 | 起動時刻候補に対して SHA-1 ハッシュを計算し、対象 MT Seed を探す処理 |
| ディスパッチ | GPU Compute Shader 1 回の実行単位 |
| staging buffer | GPU → CPU へ結果を読み出すための中間バッファ |
| `GpuDatetimeSearchIterator` | WASM 側の GPU 検索イテレータ。`next()` で 1 ディスパッチ分の結果を返す |

### 1.3 背景・問題

ブラウザでの GPU 検索スループットが期待値の約 25%。ネイティブ (Rust) ベンチマークでは性能劣化が再現しないため、WASM 側ではなく JS 側の制御フローに原因があると推定。

| 指標 | 値 |
|------|----|
| ブラウザ GPU スループット | 期待値の ~25% |
| ネイティブベンチマーク | 劣化なし |

### 1.4 期待効果

| 項目 | 現状 | 目標 |
|------|------|------|
| GPU パススループット | 期待値の ~25% | 期待値の ~80% 以上 |

### 1.5 着手条件

- CPU パス最適化 (local_076) の完了後に着手判断

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/workers/gpu.worker.ts` | 修正 | 進捗報告スロットリング、ディスパッチ重畳 |
| `wasm-pkg/src/gpu/` | 修正 (候補) | `max_dispatches_in_flight` 活用 |

## 3. 設計方針

### 3.1 要因分析

| # | 仮説 | 根拠 | 影響度 (推定) | 検証方法 |
|---|------|------|---------------|----------|
| G1 | 毎ディスパッチの進捗報告オーバーヘッド | `currentIterator.next()` 完了ごとに `postMessage` で進捗を送信。ディスパッチが高速に完了する場合、相対的なオーバーヘッドが大きい | 高 | 進捗報告をスロットリングして比較 |
| G2 | `.await` の JS マイクロタスク境界コスト | `wasm_bindgen_futures` による `.await` は JS Promise のマイクロタスクキューを経由する。GPU dispatch → staging buffer map → 結果読み出しの各段階で境界を越える | 中 | ネイティブ vs WASM のディスパッチ単体時間を計測 |
| G3 | `max_dispatches_in_flight` の未活用 | `SearchJobLimits` に `max_dispatches_in_flight` フィールドがあるが、`GpuDatetimeSearchIterator::next()` は 1 回の呼び出しで 1 ディスパッチしか実行しない。GPU パイプラインの空き時間が発生する | 中〜高 | 複数ディスパッチを重畳して GPU 占有率を向上 |
| G4 | staging buffer の `map_async` ポーリング | WASM 環境では `device.poll(Maintain::Poll)` 後に `rx.await` で完了を待つ。ポーリングの粒度が粗いと GPU → CPU 結果転送に遅延が生じる | 低〜中 | ポーリング間隔の調整 |
| G5 | 結果 `postMessage` の構造化クローン | `SeedOrigin[]` の構造化クローンコスト。通常はマッチ件数が少ないため影響は軽微 | 低 | Transferable objects の利用を検討 |

### 3.2 現在の GPU Worker ループ構造

```typescript
while (!cancelRequested && !currentIterator.is_done) {
  batch = await currentIterator.next();       // 1 dispatch + buffer read
  postResponse({ type: 'progress', ... });    // postMessage
  if (batch.results.length > 0) {
    postResponse({ type: 'result', ... });    // postMessage
  }
}
```

`currentIterator.next()` は Rust 内で `pipeline.dispatch(to_process, offset).await` を 1 回実行する。ディスパッチ → submit → staging map → read の全工程が完了するまでブロックし、その間 GPU は次のジョブを受け付けない。

GPU がアイドルになる区間:

1. `dispatch().await` の結果読み出し中 (CPU → GPU → CPU ラウンドトリップ)
2. JS 側での `postMessage` 送信中
3. 次の `next()` 呼び出しまでの JS マイクロタスク処理中

### 3.3 優先度と実施順序

1. G1: 進捗報告スロットリング (低リスク、CPU 側と同様の手法)
2. G3: 複数ディスパッチ重畳 (中リスク、GPU 占有率向上)
3. G2/G4: `.await` 境界コスト / ポーリング間隔 (G1/G3 の効果次第)

## 4. 実装仕様

### 4.1 G1: 進捗報告スロットリング

```typescript
async function executeSearchLoop(taskId: string): Promise<void> {
  if (!currentIterator) return;

  const startTime = performance.now();
  const PROGRESS_INTERVAL_MS = 500;
  let lastProgressTime = startTime;

  while (!cancelRequested && !currentIterator.is_done) {
    const batch = await currentIterator.next();
    if (!batch) break;

    if (batch.results.length > 0) {
      postResponse({ type: 'result', taskId, resultType: 'seed-origin', results: batch.results });
    }

    const now = performance.now();
    if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
      postResponse({ type: 'progress', taskId, progress: calculateProgress(batch, startTime) });
      lastProgressTime = now;
    }
  }

  // 最終進捗
  postResponse({ type: 'done', taskId });
}
```

### 4.2 G3: 複数ディスパッチ重畳 (概要)

`GpuDatetimeSearchIterator::next()` 内で `max_dispatches_in_flight` 個のディスパッチを GPU キューに投入し、最初のディスパッチの結果を返す。次の `next()` 呼び出し時には、先行投入済みのディスパッチのうち完了したものの結果を返しつつ、新しいディスパッチを投入する (スライディングウィンドウ方式)。

G1 の効果を測定した後に詳細設計を行う。

## 5. テスト方針

| テスト | 内容 | 場所 |
|--------|------|------|
| GPU 検索結果の正確性 | 既存の統合テストが通ることを確認 | `src/test/integration/` |
| GPU スロットリング動作 | キャンセルが効くことを確認 | 手動テスト |
| スループット計測 | 同一パラメータで GPU 検索し、スループットを比較 | ブラウザ DevTools + UI 表示 |

## 6. 実装チェックリスト

- [ ] G1: `gpu.worker.ts` に進捗報告スロットリングを実装
- [ ] G1: ブラウザで GPU スループットを計測・比較
- [ ] G3: 複数ディスパッチ重畳の詳細設計 (G1 の効果次第)
- [ ] G3: 実装・テスト
