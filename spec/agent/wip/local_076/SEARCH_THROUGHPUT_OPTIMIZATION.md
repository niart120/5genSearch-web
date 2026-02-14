# CPU 検索スループット最適化 仕様書

## 1. 概要

### 1.1 目的

MtseedDatetime 検索をはじめとする CPU パス全般のスループット劣化を調査・改善する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MtseedDatetime 検索 | 起動時刻候補に対して SHA-1 ハッシュを計算し、対象 MT Seed を探す処理 |
| バッチ | `next_batch()` 1 回の呼び出しで処理する要素数 |
| yield | `setTimeout(resolve, 0)` でイベントループに制御を返す操作 |
| 参照実装 | [niart120/pokemon-gen5-initseed](https://github.com/niart120/pokemon-gen5-initseed) |

### 1.3 背景・問題

ブラウザでの CPU 検索スループットが参照実装の約 1/3。

| 指標 | 本実装 | 参照実装 |
|------|--------|----------|
| ブラウザ総スループット | ~128M calc/s | ~300M calc/s (32 コア) |
| ネイティブ Criterion | 12.6M elem/s/core | — |
| 純 WASM (Node.js V8) | 11.4M elem/s/core | — |
| WASM/Native 比率 | 90.5% | — |
| 参照実装コアあたり推定 | — | ~9.4M calc/s/core |

Criterion ベンチマークと純 WASM ベンチマークにより、WASM コード生成品質はネイティブの 90% と確認。コアあたり性能は参照実装 (9.4M) を上回っている (12.6M native, 11.4M WASM)。ブラウザでの低スループットの主因は**マルチスレッドスケーリング問題** (SMT、キャッシュ競合) とブラウザ Worker 固有のオーバーヘッド。

GPU パスの最適化は [local_077](../local_077/GPU_SEARCH_THROUGHPUT_OPTIMIZATION.md) で扱う。

### 1.4 期待効果

| 項目 | 現状 | 目標 |
|------|------|------|
| CPU パス総スループット | ~100M calc/s | コア数に比例するスケーリング |

### 1.5 着手条件

- なし (即時着手可)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/workers/search.worker.ts` | 修正 | バッチサイズ調整、yield 戦略変更、進捗報告スロットリング |
| `wasm-pkg/.cargo/config.toml` | 新規 | `-C target-feature=+simd128` 設定 |
| `scripts/optimize-wasm.js` | 修正 | `--enable-simd` フラグ追加 |

## 3. 設計方針

### 3.1 要因分析 (机上検討)

| # | 仮説 | 根拠 | 影響度 (推定) | 検証方法 |
|---|------|------|---------------|----------|
| C1 | `yieldToMain()` のオーバーヘッド | `setTimeout(resolve, 0)` はブラウザで最小 4ms。バッチ処理時間 ~42ms に対し ~10% のアイドル時間 | 中 | yield 間隔を時間ベースに変更し比較 |
| C2 | 進捗報告 `postMessage` の頻度 | 全バッチ完了ごとに `postMessage` を発行。Worker 数 × バッチ頻度のメッセージが React state 更新を誘発 | 中 | 進捗報告をスロットリング (500ms 間隔) して比較 |
| C3 | WASM ビルド: `-C target-feature=+simd128` 未指定 | `wasm-pkg/.cargo/config.toml` が存在しない。LLVM が SIMD 命令を前提とした最適化を行えない | 低〜中 | config.toml を追加してベンチマーク比較 |
| C4 | `wasm-opt` に `--enable-simd` 未指定 | wasm-opt が SIMD 命令を理解しないまま最適化を行い、SIMD コードを劣化させる可能性 | 低〜中 | `--enable-simd` 追加して比較 |
| C5 | `next_batch` の chunk_count と WASM-JS 境界コスト | 1 回の `next_batch()` 呼び出しあたりの境界越えコストは固定。chunk_count 増加で相対コスト削減 | 低 | chunk_count 変更して比較 |

### 3.2 優先度と実施順序

| Phase | 対象 | リスク |
|-------|------|--------|
| Phase 1 | JS レイヤー改善 (yield, 進捗スロットリング, バッチサイズ) | 低 |
| Phase 2 | WASM ビルド設定 (SIMD フラグ) | 低 |

### 3.3 検証結果

#### C1: yield オーバーヘッド

yield を毎バッチ → 50ms 間隔に変更した結果、スループットに有意な変化なし (~105M/s)。
ボトルネックは WASM 実行速度自体であることを確認。

| 指標 | 値 |
|------|----|
| ワーカー数 (hardwareConcurrency) | 32 |
| バッチあたり処理時間 | ~130-185ms (500K 要素) |
| ワーカーあたりスループット | ~2.8-3.7 M/s (平均 ~3.3M/s) |
| WASM/Native 比率 | 3.3 / 11.9 = 28% |

結論: yield / postMessage のオーバーヘッドは支配的ではない。

#### C3/C4: SIMD ビルドフラグ

`-C target-feature=+simd128` と `wasm-opt --enable-simd` を追加。
ブラウザ全体で 105M → 127.59M/s (**+22%** 改善)。

#### SHA-1 ループ分割 (追加施策)

80 ラウンドの match/branch 分岐を 4 固定ループ (Ch/Parity/Maj/Parity) に分割。
ネイティブ Criterion: 11.9M → 12.6M (+5.6%)。

#### 純 WASM ベンチマーク (Node.js V8)

テスト環境: AMD Ryzen 9 9950X3D (16P/32L cores), Node.js v24.13.0 (V8 13.6)

`wasm-pack build --target nodejs --release` でビルドした WASM を Node.js の `worker_threads` で計測。`next_batch` の返り値変換 (serde-wasm-bindgen) を含むが、postMessage/yield は含まない。

シングルスレッド:

| 指標 | 値 |
|------|----|
| 純 WASM スループット | 11.40 Melem/s |
| ネイティブ Criterion | 12.60 Melem/s |
| WASM / Native 比率 | 90.5% |

マルチスレッド (worker_threads):

| Threads | Per-worker (M/s) | Aggregate (M/s) | Scaling ratio |
|---------|-----------------|-----------------|---------------|
| 1       | 11.40           | 11.40           | 100%          |
| 4       | 11.07           | 31.68           | 71.5%         |
| 8       | 10.87           | 60.17           | 69.2%         |
| 16      | 10.51           | 98.98           | 58.9%         |
| 32      | 8.35            | 164.10          | 61.4%         |

32 スレッドで aggregate 164M/s。ブラウザ実測値 ~128M/s との差 (~22%) はブラウザ固有のオーバーヘッド (Worker 生成、postMessage、yield) に起因。

ボトルネック内訳:

| 要因 | 影響度 | 根拠 |
|------|--------|------|
| WASM コード品質 | 10% loss | 11.40 vs 12.60 (Native), serde 込み |
| SMT/キャッシュ競合 | 27% loss | per-worker: 11.40 → 8.35 (1→32 threads) |
| スケーリング非線形性 | ~39% loss | 8.35*32=267 vs 164 aggregate |
| ブラウザ固有 overhead | ~22% loss | 164 (Node) vs ~128 (browser) |

結論: WASM コード生成品質は問題ない (ネイティブの 90%)。スループット低下の主因は**マルチスレッドスケーリングの限界** (HT、キャッシュ競合) とブラウザ固有のオーバーヘッド。

### 3.4 BATCH_SIZE の計算コスト根拠

per-element の計算ステップを Rust ソースから解析:

| Searcher | 主要処理 | 概算 ops/elem | batch size |
|---|---|---|---|
| MtseedDatetime | SHA-1 SIMD 4 並列 (amortized 1/4) + BTreeSet lookup | ~100 | 5,000,000 |
| TrainerInfo | SHA-1 SIMD 4 並列 + LCG ~20-50 消費 (PT 含む) | ~130-160 | 3,000,000 |
| Mtseed | MT19937 init(624) + twist(624) + offset(7) + IV(6) | ~1,300 | 400,000 |
| EggDatetime | SHA-1 + MT init/twist + GameOffset + advance×egg 生成 | ~1,500+α | 50,000 |

batch_size * ops/elem の概算バッチ実行時間 (10 Mops/s WASM 仮定):

| Searcher | batch_size * ops | 推定 ms/batch |
|---|---|---|
| MtseedDatetime | 5M * 100 = 500M | ~50 ms |
| TrainerInfo | 3M * 150 = 450M | ~45 ms |
| Mtseed | 400K * 1300 = 520M | ~52 ms |
| EggDatetime | 50K * 2000+a = 100M+ | ~10 ms+ (advance 依存) |

cancel 応答 ~50ms を目安にバッチサイズを設定。yield オーバーヘッドを抑えつつ、応答性と計算効率のバランスを取る。

## 4. 実装仕様

### 4.1 CPU Worker: yield 戦略

毎バッチ完了後に yield する。`YIELD_INTERVAL_MS` による時間ベース yield は C1 検証で効果がなかったため廃止。

```typescript
while (!searcher.is_done && !cancelled) {
  const batch = searcher.next_batch(BATCH_SIZE);
  // 結果・進捗処理
  await yieldToMain();
}
```

### 4.2 CPU Worker: 進捗報告スロットリング

`PROGRESS_INTERVAL_MS = 500` で進捗報告を間引く。結果 (`type: 'result'`) は即時送信。

```typescript
const PROGRESS_INTERVAL_MS = 500;
let lastProgressTime = startTime;

// ループ内
const now = performance.now();
if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
  postResponse({ type: 'progress', taskId, progress: { ... } });
  lastProgressTime = now;
}
```

### 4.3 WASM ビルド設定

```toml
# wasm-pkg/.cargo/config.toml
[target.wasm32-unknown-unknown]
rustflags = ["-C", "target-feature=+simd128"]
```

```javascript
// scripts/optimize-wasm.js
spawnSync('wasm-opt', ['-O4', '--enable-simd', '-o', outputPath, inputPath], { stdio: 'inherit' });
```

### 4.4 runSearchLoop<T> 共通ヘルパー

4 種の検索関数に共通するループ処理を型パラメータ付きヘルパーで統一:

```typescript
async function runSearchLoop<T extends { is_done: boolean; free(): void }>(
  taskId: string,
  searcher: T,
  processBatch: (searcher: T) => { results: unknown[]; processed_count: bigint; total_count: bigint },
  startTime: number
): Promise<void> {
  // 共通ループ: processBatch -> progress throttle -> yield -> done
}
```

## 5. テスト方針

| テスト | 内容 | 場所 |
|--------|------|------|
| 既存 MtseedDatetime テスト | SIMD ビルドフラグ変更後にテスト通過を確認 | `wasm-pkg/src/datetime_search/mtseed.rs` |
| 既存統合テスト | Worker 経由の検索結果が変わらないことを確認 | `src/test/integration/` |
| キャンセル応答テスト | yield 頻度変更による応答性劣化がないことを確認 | `src/test/integration/` |
| スループット計測 | 同一パラメータで検索し、進捗表示のスループット値を比較 | ブラウザ DevTools + UI 表示 |

## 6. 実装チェックリスト

### Phase 1: JS レイヤー改善

- [x] C1 検証: 時間ベース yield の効果測定 → 有意差なし
- [x] C2: 進捗報告スロットリング (`PROGRESS_INTERVAL_MS = 500`)
- [x] `runSearchLoop<T>` 共通ヘルパーの抽出
- [x] yield を毎バッチ実行に簡素化 (`YIELD_INTERVAL_MS` 廃止)
- [x] `BATCH_SIZE` 定数の抽出・チューニング

### Phase 2: WASM ビルド設定

- [x] `wasm-pkg/.cargo/config.toml` 作成 (`-C target-feature=+simd128`)
- [x] `scripts/optimize-wasm.js` に `--enable-simd` 追加
- [x] WASM 再ビルド、SIMD 命令 (`v128`, `i32x4`) の出力確認
- [x] 既存テスト通過確認 (TS: 830 tests, Rust: 6 tests)
- [x] SHA-1 ループ分割による追加最適化 (+5.6% native)
- [ ] ブラウザでスループット計測・比較
