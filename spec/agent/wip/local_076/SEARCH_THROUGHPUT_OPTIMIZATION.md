# 検索スループット最適化 仕様書

## 1. 概要

### 1.1 目的

MtseedDatetime 検索における CPU / GPU 両パスのスループット劣化を調査・改善する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MtseedDatetime 検索 | 起動時刻候補に対して SHA-1 ハッシュを計算し、対象 MT Seed を探す処理 |
| バッチ | `next_batch()` 1 回の呼び出しで処理する要素数 |
| ディスパッチ | GPU Compute Shader 1 回の実行単位 |
| yield | `setTimeout(resolve, 0)` でイベントループに制御を返す操作 |
| 参照実装 | [niart120/pokemon-gen5-initseed](https://github.com/niart120/pokemon-gen5-initseed) |

### 1.3 背景・問題

2 つの性能問題が確認されている。

**CPU パス**: ブラウザでの検索スループットが参照実装の 1/3 程度にとどまる。

| 指標 | 本実装 | 参照実装 |
|------|--------|----------|
| ブラウザ総スループット | ~100M calc/s | ~300M calc/s (32 コア) |
| ネイティブ Criterion | ~11.9M elem/s/core | — |
| 参照実装コアあたり推定 | — | ~9.4M calc/s/core |

Criterion ベンチマーク（ネイティブ）のコアあたり性能 (11.9M) は参照実装のコアあたり推定 (300M / 32 = 9.4M) を上回っている。したがって、SHA-1 SIMD 実装自体の性能問題ではなく、**ブラウザ実行環境における JS/Worker レイヤーのオーバーヘッド**が主因と推定する。

**GPU パス**: ブラウザでの検索スループットが期待値の約 1/4。ネイティブ (Rust) ベンチマークでは性能劣化が再現しないため、WASM 側ではなく **JS 側の制御フロー**に原因があると推定される。

### 1.4 期待効果

| 項目 | 現状 | 目標 |
|------|------|------|
| CPU パス総スループット | ~100M calc/s | コア数に比例するスケーリング |
| GPU パス | 期待値の ~25% | 期待値の ~80% 以上 |

### 1.5 着手条件

- なし (即時着手可)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/workers/search.worker.ts` | 修正 | バッチサイズ調整、yield 戦略変更、進捗報告頻度削減 |
| `src/workers/gpu.worker.ts` | 修正 | 進捗報告頻度削減 |
| `src/services/progress.ts` | 修正 (候補) | スロットリング追加の可能性 |
| `wasm-pkg/.cargo/config.toml` | 新規 | `-C target-feature=+simd128` 設定 |
| `scripts/optimize-wasm.js` | 修正 | `--enable-simd` フラグ追加 |

## 3. 設計方針

### 3.1 要因分析 (机上検討)

#### 3.1.1 CPU パス：仮説一覧

| # | 仮説 | 根拠 | 影響度 (推定) | 検証方法 |
|---|------|------|---------------|----------|
| C1 | `yieldToMain()` のオーバーヘッド | `setTimeout(resolve, 0)` はブラウザで最小 4ms のレイテンシを持つ。`next_batch(500_000)` の処理時間が ~42ms とすると、yield ごとに ~10% のアイドル時間が発生する | 中 | yield の間隔を時間ベースに変更し比較測定 |
| C2 | 進捗報告 `postMessage` の頻度 | **全バッチ完了ごとに** `postMessage` が発行される。Worker 数 × バッチ頻度のメッセージがメインスレッドに到着し、React state 更新 + re-render を誘発する | 中 | 進捗報告をスロットリング (200ms 間隔等) して比較 |
| C3 | WASM ビルド: `-C target-feature=+simd128` 未指定 | `wasm-pkg/.cargo/config.toml` が存在しない。LLVM が SIMD 命令の利用を前提とした最適化（auto-vectorization、定数伝播等）を行えない可能性がある。Portable SIMD のコード生成には影響する | 低〜中 | config.toml を追加してベンチマーク比較 |
| C4 | `wasm-opt` に `--enable-simd` 未指定 | `scripts/optimize-wasm.js` で `-O4` を適用しているが `--enable-simd` がない。wasm-opt が SIMD 命令を理解しないまま最適化を行い、SIMD コードを劣化させる可能性がある | 低〜中 | `--enable-simd` 追加して比較 |
| C5 | `next_batch` の chunk_count と WASM-JS 境界コスト | 1 回の `next_batch()` 呼び出しあたりの WASM→JS 境界越えコストは固定。chunk_count を増やすことで相対的に境界越えのオーバーヘッドを削減できる | 低 | chunk_count を 500K → 2M に変更して比較 |

**C1, C2 の詳細分析**:

現在の CPU Worker ループ構造:
```typescript
while (!searcher.is_done && !cancelled) {
  const batch = searcher.next_batch(500_000);    // ~42ms (12M elem/s)
  postResponse({ type: 'progress', ... });       // postMessage (構造化クローン)
  await yieldToMain();                           // setTimeout(0) → 最小 4ms
}
```

1 サイクルあたり: ~42ms compute + ~4ms yield = ~46ms → 実効 500K / 46ms ≈ 10.9M/s/worker。
8 workers で ~87M/s、16 workers で ~174M/s。コア数が多い環境で参照実装との差が開く。

#### 3.1.2 GPU パス：仮説一覧

| # | 仮説 | 根拠 | 影響度 (推定) | 検証方法 |
|---|------|------|---------------|----------|
| G1 | 毎ディスパッチの進捗報告オーバーヘッド | `currentIterator.next()` 完了ごとに `postMessage` で進捗を送信。ディスパッチが高速に完了する場合、相対的なオーバーヘッドが大きい | 高 | 進捗報告をスロットリングして比較 |
| G2 | `.await` の JS マイクロタスク境界コスト | `wasm_bindgen_futures` による `.await` は JS Promise のマイクロタスクキューを経由する。GPU dispatch → staging buffer map → 結果読み出しの各段階で境界を越える | 中 | ネイティブ vs WASM のディスパッチ単体時間を計測 |
| G3 | `max_dispatches_in_flight` の未活用 | `SearchJobLimits` に `max_dispatches_in_flight` フィールドがあるが、`GpuDatetimeSearchIterator::next()` は 1 回の呼び出しで 1 ディスパッチしか実行しない。GPU パイプラインの空き時間が発生する | 中〜高 | 複数ディスパッチを重畳して GPU 占有率を向上 |
| G4 | staging buffer の `map_async` ポーリング | WASM 環境では `device.poll(Maintain::Poll)` 後に `rx.await` で完了を待つ。ポーリングの粒度が粗いと GPU→CPU 結果転送に遅延が生じる | 低〜中 | ポーリング間隔の調整 |
| G5 | 結果 `postMessage` の構造化クローン | `SeedOrigin[]` の構造化クローンコスト。通常はマッチ件数が少ないため影響は軽微だが、検索初期のバッファアロケーションコストが問題になる可能性 | 低 | Transferable objects の利用を検討 |

**G1, G3 の詳細分析**:

現在の GPU Worker ループ構造:
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
1. `dispatch().await` の結果読み出し中 (CPU→GPU→CPU ラウンドトリップ)
2. JS 側での `postMessage` 送信中
3. 次の `next()` 呼び出しまでの JS マイクロタスク処理中

### 3.2 優先度と実施順序

影響度と実装コストから以下の順で検証する。

**Phase 1**: JS レイヤーの改善 (CPU / GPU 共通、低リスク)

1. CPU Worker: yield 戦略を**時間ベース**に変更 (e.g. 50ms 以上経過したら yield)
2. CPU + GPU Worker: 進捗報告を**スロットリング** (200ms 間隔)
3. CPU Worker: `next_batch` の chunk_count を増加 (500K → 2M)

**Phase 2**: WASM ビルド設定 (CPU、低リスク)

4. `wasm-pkg/.cargo/config.toml` に `target-feature=+simd128` を追加
5. `scripts/optimize-wasm.js` に `--enable-simd` を追加

**Phase 3**: GPU パイプライン改善 (中リスク)

6. 複数ディスパッチの重畳 (`max_dispatches_in_flight` の活用)

## 4. 実装仕様

### 4.1 Phase 1: JS レイヤー改善

#### 4.1.1 CPU Worker: 時間ベース yield

```typescript
// search.worker.ts - runMtseedDatetimeSearch

async function runMtseedDatetimeSearch(
  taskId: string,
  params: MtseedDatetimeSearchParams,
  startTime: number
): Promise<void> {
  const searcher = new MtseedDatetimeSearcher(params);
  const YIELD_INTERVAL_MS = 50;
  const PROGRESS_INTERVAL_MS = 200;
  let lastYieldTime = performance.now();
  let lastProgressTime = performance.now();

  try {
    while (!searcher.is_done && !cancelled) {
      const batch = searcher.next_batch(2_000_000);

      if (batch.results.length > 0) {
        postResponse({
          type: 'result',
          taskId,
          resultType: 'seed-origin',
          results: batch.results,
        });
      }

      const now = performance.now();

      // 進捗報告: 200ms 間隔
      if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
        postResponse({
          type: 'progress',
          taskId,
          progress: calculateProgress(
            batch.processed_count, batch.total_count, startTime
          ),
        });
        lastProgressTime = now;
      }

      // yield: 50ms 以上経過したら制御を返す
      if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
        await yieldToMain();
        lastYieldTime = performance.now();
      }
    }

    // 最終進捗報告
    postResponse({
      type: 'progress',
      taskId,
      progress: calculateProgress(
        searcher.is_done ? /* total */ 0 : 0,
        0,
        startTime
      ),
    });

    postResponse({ type: 'done', taskId });
  } finally {
    searcher.free();
  }
}
```

要点:
- yield を毎バッチ → 50ms 経過時のみに変更。`setTimeout(0)` の 4ms 遅延が毎回発生しなくなる
- 進捗報告を毎バッチ → 200ms 間隔に変更。メインスレッドへの `postMessage` 頻度を削減
- `next_batch` の chunk_count を 500K → 2M に増加

#### 4.1.2 GPU Worker: 進捗報告スロットリング

```typescript
// gpu.worker.ts - executeSearchLoop

async function executeSearchLoop(taskId: string): Promise<void> {
  if (!currentIterator) return;

  const startTime = performance.now();
  const PROGRESS_INTERVAL_MS = 200;
  let lastProgressTime = startTime;

  while (!cancelRequested && !currentIterator.is_done) {
    const batch = await currentIterator.next();
    if (!batch) break;

    // 中間結果は即時報告 (件数が少ないため)
    if (batch.results.length > 0) {
      postResponse({
        type: 'result',
        taskId,
        resultType: 'seed-origin',
        results: batch.results,
      });
    }

    // 進捗報告: 200ms 間隔
    const now = performance.now();
    if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
      const processedCount = Number(batch.processed_count);
      const elapsedMs = now - startTime;
      const throughput = elapsedMs > 0
        ? (processedCount / elapsedMs) * 1000 : 0;

      postResponse({
        type: 'progress',
        taskId,
        progress: {
          processed: processedCount,
          total: Number(batch.total_count),
          percentage: batch.progress * 100,
          elapsedMs,
          estimatedRemainingMs:
            batch.progress > 0
              ? elapsedMs * ((1 - batch.progress) / batch.progress)
              : 0,
          throughput,
        },
      });
      lastProgressTime = now;
    }
  }

  postResponse({ type: 'done', taskId });
}
```

### 4.2 Phase 2: WASM ビルド設定

#### 4.2.1 `.cargo/config.toml`

```toml
# wasm-pkg/.cargo/config.toml
[target.wasm32-unknown-unknown]
rustflags = ["-C", "target-feature=+simd128"]
```

#### 4.2.2 wasm-opt SIMD 対応

```javascript
// scripts/optimize-wasm.js (変更箇所)
const result = spawnSync(
  'wasm-opt',
  ['-O4', '--enable-simd', '-o', outputPath, inputPath],
  { stdio: 'inherit' }
);
```

### 4.3 Phase 3: GPU パイプライン改善

`GpuDatetimeSearchIterator::next()` 内で複数ディスパッチを重畳する設計。Phase 1, 2 の効果を測定した後に着手判断する。概要のみ記載する。

方針: `next()` 呼び出し 1 回で `max_dispatches_in_flight` 個のディスパッチを GPU キューに投入し、最初のディスパッチの結果を返す。次の `next()` 呼び出し時には、先行投入済みのディスパッチのうち完了したものの結果を返しつつ、新しいディスパッチを投入する (スライディングウィンドウ方式)。

## 5. テスト方針

### 5.1 正確性テスト

| テスト | 内容 | 場所 |
|--------|------|------|
| 既存 MtseedDatetime テスト | Phase 1, 2 の変更後に既存テストが通ることを確認 | `wasm-pkg/src/datetime_search/mtseed.rs` |
| 既存統合テスト | Worker 経由の検索結果が変わらないことを確認 | `src/test/integration/` |
| CPU yield 動作確認 | キャンセルが効くことを確認 (yield 頻度低下による応答性劣化がないこと) | 手動テスト |

### 5.2 性能テスト (手動計測)

| テスト | 内容 | 計測方法 |
|--------|------|----------|
| Phase 1 前後の CPU スループット | 同一パラメータで検索し、進捗表示のスループット値を比較 | ブラウザ DevTools + UI 表示 |
| Phase 2 前後の WASM バイナリサイズ | `wasm_pkg_bg.wasm` のファイルサイズ比較 | ファイルサイズ |
| Phase 2 前後の CPU スループット | 同上 | 同上 |
| GPU スループット | 同一パラメータで GPU 検索し、スループットを比較 | 同上 |

## 6. 実装チェックリスト

### Phase 1: JS レイヤー改善

- [ ] CPU Worker: `runMtseedDatetimeSearch` に時間ベース yield を実装
- [ ] CPU Worker: `runEggDatetimeSearch` に同様の変更を適用
- [ ] CPU Worker: `runTrainerInfoSearch` に同様の変更を適用
- [ ] CPU Worker: `runMtseedSearch` に同様の変更を適用
- [ ] GPU Worker: `executeSearchLoop` に進捗スロットリングを実装
- [ ] 既存テスト通過を確認
- [ ] ブラウザでスループットを計測・比較

### Phase 2: WASM ビルド設定

- [ ] `wasm-pkg/.cargo/config.toml` を作成
- [ ] `scripts/optimize-wasm.js` に `--enable-simd` を追加
- [ ] WASM を再ビルドし、バイナリサイズと SIMD 命令数を比較
- [ ] ブラウザでスループットを計測・比較

### Phase 3: GPU パイプライン改善 (Phase 1, 2 の効果次第)

- [ ] 複数ディスパッチ重畳の設計・実装
- [ ] GPU ベンチマークで効果を確認
