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
| ブラウザ総スループット | ~128M calc/s | ~300M calc/s (32 コア) |
| ネイティブ Criterion | 12.6M elem/s/core | — |
| 純 WASM (Node.js V8) | 11.4M elem/s/core | — |
| WASM/Native 比率 | 90.5% | — |
| 参照実装コアあたり推定 | — | ~9.4M calc/s/core |

Criterion ベンチマークと純 WASM ベンチマークにより、WASM コード生成品質はネイティブの 90% と確認。
コアあたり性能は参照実装 (9.4M) を上回っている (12.6M native, 11.4M WASM)。
ブラウザでの低スループットの主因は **マルチスレッドスケーリング問題** (SMT、キャッシュ競合) と
ブラウザ Worker 固有のオーバーヘッド。

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

- [x] CPU Worker: 時間ベース yield を全 4 検索関数に実装 (C1 検証)
- [ ] CPU Worker + GPU Worker: 進捗報告スロットリング (C2)
- [ ] GPU Worker: `executeSearchLoop` に進捗スロットリングを実装

#### C1 検証結果

yield を毎バッチ → 50ms 間隔に変更した結果、スループットに有意な変化なし (~105M/s)。
診断ログによりボトルネックは WASM 実行速度自体であることを確認:

| 指標 | 値 |
|------|----|
| ワーカー数 (hardwareConcurrency) | 32 |
| バッチあたり処理時間 | ~130-185ms (500K 要素) |
| ワーカーあたりスループット | ~2.8-3.7 M/s (平均 ~3.3M/s) |
| WASM/Native 比率 | 3.3 / 11.9 = 28% |
| 期待 WASM/Native 比率 | 50-67% |

結論: `yield` / `postMessage` のオーバーヘッドは支配的ではない。WASM 実行速度 (コード生成品質) が主因。

#### C3/C4 検証結果

SIMD ビルドフラグとwasm-opt対応を追加。ブラウザ全体で 105M → 127.59M/s (~22% 改善)。

#### SHA-1 ループ分割

80ラウンドの match/branch 分岐を 4固定ループ (Ch/Parity/Maj/Parity) に分割。
ネイティブ Criterion: 11.9M → 12.6M (+5.6%)。WASM WAT 上の `i32x4.shl/shr_u` 命令数: 3 → 9。

#### 純 WASM ベンチマーク結果 (Node.js V8)

テスト環境: AMD Ryzen 9 9950X3D (16P/32L cores), Node.js v24.13.0 (V8 13.6)

`wasm-pack build --target nodejs --release` でビルドした WASM を Node.js の `worker_threads` で計測。
`next_batch` の返り値変換 (serde-wasm-bindgen) を含むが、postMessage/yield は含まない。

**シングルスレッド**:

| 指標 | 値 |
|------|----|
| 純 WASM スループット | 11.40 Melem/s |
| ネイティブ Criterion | 12.60 Melem/s |
| WASM / Native 比率 | 90.5% |

WASM コード生成品質は十分高い (ネイティブの 90%) 。

**マルチスレッド (worker_threads)**:

| Threads | Per-worker (M/s) | Aggregate (M/s) | Scaling ratio |
|---------|-----------------|-----------------|---------------|
| 1       | 11.40           | 11.40           | 100%          |
| 4       | 11.07           | 31.68           | 71.5%         |
| 8       | 10.87           | 60.17           | 69.2%         |
| 16      | 10.51           | 98.98           | 58.9%         |
| 32      | 8.35            | 164.10          | 61.4%         |

32 スレッドで aggregate 164M/s。ブラウザの実測値 ~128M/s との差 (~22%) はブラウザ固有のオーバーヘッド (Worker 生成、postMessage、yield) に起因すると推定。

**ボトルネック内訳**:

| 要因 | 影響度 | 根拠 |
|------|--------|------|
| WASM コード品質 | 10% loss | 11.40 vs 12.60 (Native), serde 込み |
| SMT/キャッシュ競合 | 27% loss | per-worker: 11.40 → 8.35 (1→32 threads) |
| スケーリング非線形性 | ~39% loss | 8.35×32=267 vs 164 aggregate |
| ブラウザ固有 overhead | ~22% loss | 164 (Node) vs ~128 (browser) |

**結論**: WASM 実行速度はネイティブの 90% であり、コード生成は問題ない。
スループット低下の主因は **マルチスレッドスケーリングの限界** (HT、キャッシュ競合) と
ブラウザ固有のオーバーヘッド。Worker 数を物理コア数に制限することで改善の余地がある。

### Phase 2: WASM ビルド設定

- [x] `wasm-pkg/.cargo/config.toml` を作成 (`-C target-feature=+simd128`)
- [x] `scripts/optimize-wasm.js` に `--enable-simd` を追加
- [x] WASM を再ビルドし、SIMD 命令 (`v128`, `i32x4`) の出力を確認
- [x] 既存テスト通過を確認 (TS: 830 tests, Rust: 6 tests)
- [ ] ブラウザでスループットを計測・比較

### Phase 3: GPU パイプライン改善 (Phase 1, 2 の効果次第)

- [ ] 複数ディスパッチ重畳の設計・実装
- [ ] GPU ベンチマークで効果を確認

## 6. 検討事項

### BATCH_SIZE の計算コスト根拠

per-element の計算ステップを解析した結果:

| Searcher | 主要処理 | 概算 ops/elem | batch size |
|---|---|---|---|
| MtseedDatetime | SHA-1 SIMD 4並列 (amortized 1/4) + BTreeSet lookup | ~100 | 500,000 |
| TrainerInfo | SHA-1 SIMD 4並列 + LCG ~20-50消費 (PT含む) | ~130-160 | 1,000,000 |
| Mtseed | MT19937 init(624) + twist(624) + offset(7) + IV(6) | ~1,300 | 1,000,000 |
| EggDatetime | SHA-1 + MT init/twist + GameOffset + advance×egg生成 | ~1,500+α | 1,000 |

batch\_size × ops/elem の概算バッチ実行時間 (10 Mops/s WASM 仮定):

| Searcher | batch_size × ops | 推定 ms/batch |
|---|---|---|
| MtseedDatetime | 5M × 100 = 500M | ~50 ms |
| TrainerInfo | 3M × 150 = 450M | ~45 ms |
| Mtseed | 400K × 1300 = 520M | ~52 ms |
| EggDatetime | 50K × 2000+α = 100M+ | ~10 ms+ (advance 依存) |

cancel 応答 ~50ms を目安にバッチサイズを設定。
yield オーバーヘッドを抑えつつ、応答性と計算効率のバランスを取る。
