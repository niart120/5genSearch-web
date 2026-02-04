# GPU Worker テスト 仕様書

## 1. 概要

### 1.1 目的

GPU Worker 経路の統合テストを整備し、テスト網羅性を向上させる。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| GPU Worker | WebGPU を使用した WASM を実行する Worker (`gpu.worker.ts`) |
| CPU Worker | CPU のみで WASM を実行する Worker (`search.worker.ts`) |
| `GpuDatetimeSearchIterator` | WASM 側の GPU 検索イテレータ |
| WorkerPool | 複数 Worker を管理し、タスク分配・進捗集約を行うサービス |

### 1.3 背景・問題

- GPU Worker の実装は完了しているが、統合テストが存在しない
- 既存の WorkerPool テストはすべて `useGpu: false` で実行されている
- GPU 経路のリグレッションを検知できない状態

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| リグレッション検知 | GPU 経路の破損を CI/ローカルテストで検知可能 |
| フォールバック検証 | `navigator.gpu` なし時に CPU Worker が使われることを担保 |
| 信頼性向上 | GPU 検索の初期化・実行・キャンセル・進捗報告が正常に動作することを保証 |

### 1.5 着手条件

- Worker 基盤が完了していること (達成済み)
- WASM バインディングに `GpuDatetimeSearchIterator` がエクスポートされていること (達成済み)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/test/integration/workers/gpu.worker.test.ts` | 新規作成 | GPU Worker 統合テスト |
| `src/test/integration/services/worker-pool-gpu.test.ts` | 新規作成 | WorkerPool GPU 経路テスト |

## 3. 設計方針

### 3.1 テスト実行環境

| 環境 | GPU テスト | 備考 |
|------|------------|------|
| ローカル (WebGPU 対応ブラウザ) | 実行 | headless モードでも可 |
| CI (GPU なし) | スキップ | `describe.skipIf(!navigator.gpu)` |

### 3.2 テスト分類

| テストファイル | 対象 | 実行条件 |
|----------------|------|----------|
| `gpu.worker.test.ts` | GPU Worker 単体の動作 | `navigator.gpu` あり |
| `worker-pool-gpu.test.ts` | WorkerPool での GPU 経路 | 条件別 |

### 3.3 フォールバックテスト

`navigator.gpu` なし時に CPU Worker が使われることを検証する。
このテストは CI 環境でも実行可能（GPU 不要）。

## 4. 実装仕様

### 4.0 テスト用期待値データ

100年分全探索（2000-01-01 ～ 2099-12-31）で取得した実期待値を使用する。

#### 検索条件

| 項目 | 値 |
|------|-----|
| Version | Black (B) |
| Region | JPN |
| Hardware | DS Lite |
| MAC Address | `8C:56:C5:86:15:28` |
| Timer0 | `0x0C79` |
| VCount | `0x60` |
| KeyCode | なし (`0x2FFF`) |
| 日付範囲 | 2000-01-01 ～ 2099-12-31 |
| 時間範囲 | 00:00:00 ～ 23:59:59 |

#### Target Seeds (BW 固定・野生 6V)

```
0x14B11BA6, 0x8A30480D, 0x9E02B0AE, 0xADFA2178, 0xFC4AA3AC
```

#### 期待する検索結果 (3件)

| LCG Seed | Date/Time | MT Seed | Timer0 | VCount |
|----------|-----------|---------|--------|--------|
| `0x2ADAB5DE040079F7` | 2025/08/20 06:41:01 | `0x14B11BA6` | 0x0C79 | 0x60 |
| `0x6C5313399F212006` | 2039/04/21 17:45:41 | `0xFC4AA3AC` | 0x0C79 | 0x60 |
| `0xE8878C0CDAE45CD6` | 2093/09/07 11:46:58 | `0x8A30480D` | 0x0C79 | 0x60 |

### 4.1 GPU Worker テスト (`gpu.worker.test.ts`)

```typescript
describe.skipIf(!navigator.gpu)('GPU Worker', () => {
  // 4.1.1 初期化テスト
  it('should initialize WASM successfully');
  
  // 4.1.2 検索実行テスト
  it('should execute mtseed-datetime search and return results');
  
  // 4.1.3 進捗報告テスト
  it('should report progress during search');
  
  // 4.1.4 キャンセルテスト
  it('should handle cancel request');
  
  // 4.1.5 エラーハンドリングテスト
  it('should return error for unsupported task kind');
});
```

### 4.2 WorkerPool GPU 経路テスト (`worker-pool-gpu.test.ts`)

```typescript
describe.skipIf(!navigator.gpu)('WorkerPool with GPU', () => {
  // 4.2.1 GPU Worker 初期化
  it('should initialize GPU Worker when useGpu is true');
  
  // 4.2.2 GPU 検索実行
  it('should execute search with GPU Worker');
  
  // 4.2.3 進捗集約
  it('should aggregate progress from GPU Worker');
});

describe('WorkerPool GPU fallback', () => {
  // 4.2.4 フォールバック検証 (CI でも実行可能)
  it('should use CPU Workers when navigator.gpu is unavailable');
});
```

### 4.3 テストヘルパー

既存の `worker-test-utils.ts` を活用し、GPU 固有のヘルパーは必要に応じて追加。

## 5. テスト方針

### 5.1 GPU Worker 単体テスト

| テスト項目 | 検証内容 | 優先度 |
|------------|----------|--------|
| 初期化 | WASM 初期化が成功し `ready` レスポンスが返る | 高 |
| 検索実行 | 既知の MT Seed で検索し、期待する結果が返る | 高 |
| 進捗報告 | 検索中に `progress` レスポンスが送信される | 中 |
| キャンセル | `cancel` リクエストで検索が中断される | 中 |
| エラー処理 | 非対応タスク種別でエラーレスポンスが返る | 高 |

### 5.2 WorkerPool GPU 経路テスト

| テスト項目 | 検証内容 | 優先度 |
|------------|----------|--------|
| GPU Worker 選択 | `useGpu: true` かつ `navigator.gpu` ありで GPU Worker が使われる | 高 |
| 検索実行・結果取得 | WorkerPool 経由で GPU 検索が完了し結果が返る | 高 |
| 進捗集約 | GPU Worker からの進捗が `onProgress` で通知される | 中 |

### 5.3 フォールバックテスト

| テスト項目 | 検証内容 | 優先度 |
|------------|----------|--------|
| CPU フォールバック | `navigator.gpu` なし時に CPU Worker が生成される | 高 |

## 6. 実装チェックリスト

- [ ] `src/test/integration/workers/gpu.worker.test.ts` 作成
  - [ ] GPU Worker 初期化テスト
  - [ ] GPU 検索実行テスト
  - [ ] 進捗報告テスト
  - [ ] キャンセルテスト
  - [ ] エラーハンドリングテスト
- [ ] `src/test/integration/services/worker-pool-gpu.test.ts` 作成
  - [ ] WorkerPool GPU 初期化テスト
  - [ ] WorkerPool GPU 検索実行テスト
  - [ ] フォールバックテスト
- [ ] ローカル環境での GPU テスト実行確認
- [ ] CI 環境でスキップされることの確認
