# Worker 設計

Web Worker による並列処理の設計を定義する。

## 1. 設計目標

1. **CPU コア活用**: 利用可能な全コアを使用
2. **進捗表示**: 一貫した進捗 UI (割合/件数/残り時間/スループット)
3. **キャンセル対応**: ユーザー操作による中断
4. **WASM 独立インスタンス**: 各 Worker で独立した WASM を初期化

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                       Main Thread                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UI/React  │  │   Stores    │  │   WorkerPool        │  │
│  │             │←─│             │←─│   - spawn workers   │  │
│  │             │  │ - progress  │  │   - dispatch tasks  │  │
│  │             │  │ - results   │  │   - collect results │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Worker #1     │ │   Worker #2     │ │   Worker #N     │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │   WASM    │  │ │  │   WASM    │  │ │  │   WASM    │  │
│  │ Instance  │  │ │  │ Instance  │  │ │  │ Instance  │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 3. Worker 数決定

```typescript
const workerCount = navigator.hardwareConcurrency ?? 4;
```

- `navigator.hardwareConcurrency` で論理コア数を取得
- 取得不可の場合はフォールバック (4)
- ユーザー設定は提供しない (設計判断)

## 4. メッセージプロトコル

### 4.1 メッセージ型定義

```typescript
// Main → Worker
type WorkerRequest =
  | { type: 'init' }
  | { type: 'start'; taskId: string; task: SearchTask }
  | { type: 'cancel' };

// Worker → Main
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; taskId: string; progress: ProgressInfo }
  | { type: 'result'; taskId: string; results: SearchResult[] }
  | { type: 'done'; taskId: string }
  | { type: 'error'; taskId: string; message: string };

interface ProgressInfo {
  processed: number;
  total: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  throughput: number;  // items/sec
}
```

### 4.2 タスク型

```typescript
type SearchTask =
  | { kind: 'egg-datetime'; params: EggDatetimeSearchParams }
  | { kind: 'mtseed-datetime'; params: MtseedDatetimeSearchParams }
  | { kind: 'mtseed'; params: MtseedSearchParams }
  | { kind: 'trainer-info'; params: TrainerInfoSearchParams };
```

## 5. WorkerPool 実装

### 5.1 責務

- Worker の生成・破棄
- タスクのディスパッチ
- 進捗の集約
- 結果の収集
- キャンセル制御

### 5.2 インターフェース

```typescript
interface WorkerPool {
  /** Worker 数 */
  readonly size: number;

  /** 検索を開始 */
  start(tasks: SearchTask[]): void;

  /** 検索をキャンセル */
  cancel(): void;

  /** 進捗を購読 */
  onProgress(callback: (progress: AggregatedProgress) => void): () => void;

  /** 結果を購読 */
  onResult(callback: (results: SearchResult[]) => void): () => void;

  /** 完了を購読 */
  onComplete(callback: () => void): () => void;

  /** エラーを購読 */
  onError(callback: (error: Error) => void): () => void;

  /** リソース解放 */
  dispose(): void;
}

interface AggregatedProgress {
  /** 全タスクの処理済み件数 */
  totalProcessed: number;
  /** 全タスクの総件数 */
  totalCount: number;
  /** 全体進捗率 (0-100) */
  percentage: number;
  /** 経過時間 (ms) */
  elapsedMs: number;
  /** 残り時間推定 (ms) */
  estimatedRemainingMs: number;
  /** スループット (items/sec) */
  throughput: number;
  /** 完了タスク数 / 総タスク数 */
  tasksCompleted: number;
  tasksTotal: number;
}
```

## 6. Worker 内部実装

### 6.1 ライフサイクル

```
[Created] → init → [Ready] → start → [Running] → done → [Ready]
                                   ↓
                               cancel → [Ready]
```

### 6.2 バッチ処理

```typescript
// Worker 内部
async function runSearch(task: SearchTask) {
  const searcher = createSearcher(task);
  
  while (!searcher.is_done && !cancelled) {
    const batch = searcher.next_batch(BATCH_SIZE);
    
    // 進捗報告
    postMessage({
      type: 'progress',
      taskId,
      progress: calculateProgress(batch, startTime),
    });
    
    // 結果報告 (バッチごと)
    if (batch.results.length > 0) {
      postMessage({
        type: 'result',
        taskId,
        results: batch.results,
      });
    }
    
    // UI スレッドへ制御を戻す
    await yieldToMain();
  }
  
  postMessage({ type: 'done', taskId });
}
```

### 6.3 バッチサイズ

| 検索種別 | バッチサイズ | 備考 |
|---------|-------------|------|
| `EggDatetimeSearcher` | 1000 | 日時ごとの探索 |
| `MtseedDatetimeSearcher` | 1000 | 日時ごとの探索 |
| `MtseedSearcher` | 0x10000 | Seed 空間探索 |
| `TrainerInfoSearcher` | 1000 | 日時ごとの探索 |

## 7. タスク分割

WASM 側で提供される `generate_*_search_tasks()` 関数を使用：

```typescript
import { generate_egg_search_tasks } from 'wasm-pkg';

const tasks = generate_egg_search_tasks(
  context,
  dateRange,
  eggParams,
  genConfig,
  filter,
  workerCount,
);
```

- 組み合わせ × 時間チャンクでタスクを生成
- Worker 数を考慮した分割

## 8. 進捗表示仕様

### 8.1 表示項目

| 項目 | 表示例 | 計算方法 |
|-----|-------|---------|
| 進捗率 | `45.2%` | `(totalProcessed / totalCount) * 100` |
| 処理済み | `1,234,567 / 2,500,000` | 集約値 |
| 経過時間 | `00:01:23` | `Date.now() - startTime` |
| 残り時間 | `約 00:01:45` | `(total - processed) / throughput` |
| スループット | `18,500 件/秒` | `processed / elapsedSec` |

### 8.2 更新頻度

- 進捗報告: バッチ処理ごと
- UI 更新: 最大 10 回/秒 (100ms throttle)

## 9. キャンセル処理

### 9.1 フロー

1. ユーザーがキャンセルボタン押下
2. `WorkerPool.cancel()` 呼び出し
3. 各 Worker に `{ type: 'cancel' }` 送信
4. Worker は次のバッチ処理前にフラグをチェック
5. キャンセル時は `done` を送信してループ終了

### 9.2 注意点

- WASM 処理中は即時停止不可 (バッチ単位)
- キャンセル後も結果は保持 (途中結果を破棄しない)

## 10. 検討事項

- [ ] Worker の事前初期化 vs 遅延初期化
- [ ] 結果のストリーミング vs 完了時一括
- [ ] エラー時のリトライ戦略
