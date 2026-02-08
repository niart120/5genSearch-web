/**
 * 進捗集約サービス
 *
 * 複数 Worker からの進捗情報を集約し、全体の進捗を計算する。
 */

import type { ProgressInfo } from '../workers/types';

/**
 * 集約済み進捗情報
 */
export interface AggregatedProgress {
  /** 処理済み件数 (全 Worker 合計) */
  totalProcessed: number;
  /** 総件数 (全 Worker 合計) */
  totalCount: number;
  /** 進捗率 (0-100) */
  percentage: number;
  /** 経過時間 (ms) */
  elapsedMs: number;
  /** 推定残り時間 (ms) */
  estimatedRemainingMs: number;
  /** スループット (items/sec) */
  throughput: number;
  /** 完了タスク数 */
  tasksCompleted: number;
  /** 総タスク数 */
  tasksTotal: number;
}

/**
 * 進捗アグリゲーター
 *
 * 複数タスクの進捗を追跡し、集約した進捗情報を計算する。
 */
export class ProgressAggregator {
  private taskProgress = new Map<string, ProgressInfo>();
  private tasksCompleted = 0;
  private tasksTotal = 0;
  private startTime = 0;

  /**
   * 新しい検索セッションを開始
   *
   * @param tasksTotal 総タスク数
   */
  start(tasksTotal: number): void {
    this.taskProgress.clear();
    this.tasksCompleted = 0;
    this.tasksTotal = tasksTotal;
    this.startTime = performance.now();
  }

  /**
   * タスクの進捗を更新
   *
   * @param taskId タスク ID
   * @param progress 進捗情報
   */
  updateProgress(taskId: string, progress: ProgressInfo): void {
    this.taskProgress.set(taskId, progress);
  }

  /**
   * タスク完了を記録
   *
   * @param taskId タスク ID
   */
  markCompleted(taskId: string): void {
    this.tasksCompleted++;
    // 完了したタスクの進捗は 100% として扱う
    const existing = this.taskProgress.get(taskId);
    if (existing) {
      this.taskProgress.set(taskId, {
        ...existing,
        processed: existing.total,
        percentage: 100,
      });
    }
  }

  /**
   * 集約した進捗情報を取得
   */
  getAggregatedProgress(): AggregatedProgress {
    let totalProcessed = 0;
    let totalCount = 0;

    for (const progress of this.taskProgress.values()) {
      totalProcessed += progress.processed;
      totalCount += progress.total;
    }

    const elapsedMs = performance.now() - this.startTime;
    const percentage = totalCount > 0 ? (totalProcessed / totalCount) * 100 : 0;
    const throughput = elapsedMs > 0 ? (totalProcessed / elapsedMs) * 1000 : 0;
    const remaining = totalCount - totalProcessed;
    const estimatedRemainingMs = throughput > 0 ? (remaining / throughput) * 1000 : 0;

    return {
      totalProcessed,
      totalCount,
      percentage,
      elapsedMs,
      estimatedRemainingMs,
      throughput,
      tasksCompleted: this.tasksCompleted,
      tasksTotal: this.tasksTotal,
    };
  }

  /**
   * 全タスクが完了したかどうか
   */
  isComplete(): boolean {
    return this.tasksCompleted >= this.tasksTotal;
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.taskProgress.clear();
    this.tasksCompleted = 0;
    this.tasksTotal = 0;
    this.startTime = 0;
  }
}

/**
 * 進捗情報をフォーマット
 *
 * @param progress 進捗情報
 * @returns フォーマットされた文字列
 */
export function formatProgress(progress: AggregatedProgress): string {
  const { percentage, throughput, estimatedRemainingMs, tasksCompleted, tasksTotal } = progress;

  const remainingSeconds = Math.ceil(estimatedRemainingMs / 1000);
  const throughputStr =
    throughput >= 1000 ? `${(throughput / 1000).toFixed(1)}K/s` : `${Math.round(throughput)}/s`;

  return `${percentage.toFixed(1)}% | ${throughputStr} | 残り ${remainingSeconds}s | タスク ${tasksCompleted}/${tasksTotal}`;
}

/**
 * 推定残り時間を人間が読みやすい形式にフォーマット
 *
 * @param ms ミリ秒
 * @returns フォーマットされた文字列
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * スループットを人間が読みやすい形式にフォーマット
 *
 * @param throughput items/sec
 * @returns フォーマットされた文字列
 */
export function formatThroughput(throughput: number): string {
  if (throughput >= 1_000_000) {
    return `${(throughput / 1_000_000).toFixed(2)}M/s`;
  }
  if (throughput >= 1000) {
    return `${(throughput / 1000).toFixed(1)}K/s`;
  }
  return `${Math.round(throughput)}/s`;
}
