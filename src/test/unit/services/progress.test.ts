/**
 * 進捗サービスのユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressAggregator } from '../../../services/progress';
import type { ProgressInfo } from '../../../workers/types';

describe('ProgressAggregator', () => {
  let aggregator: ProgressAggregator;

  beforeEach(() => {
    aggregator = new ProgressAggregator();
  });

  describe('start', () => {
    it('should initialize with correct task count', () => {
      aggregator.start(5);
      const progress = aggregator.getAggregatedProgress();

      expect(progress.tasksTotal).toBe(5);
      expect(progress.tasksCompleted).toBe(0);
    });

    it('should reset previous state', () => {
      aggregator.start(3);
      aggregator.updateProgress('task-0', createProgress(50, 100));
      aggregator.markCompleted('task-0');

      aggregator.start(5);
      const progress = aggregator.getAggregatedProgress();

      expect(progress.tasksTotal).toBe(5);
      expect(progress.tasksCompleted).toBe(0);
      expect(progress.totalProcessed).toBe(0);
    });
  });

  describe('updateProgress', () => {
    it('should accumulate progress from multiple tasks', () => {
      aggregator.start(3);

      aggregator.updateProgress('task-0', createProgress(100, 1000));
      aggregator.updateProgress('task-1', createProgress(200, 1000));
      aggregator.updateProgress('task-2', createProgress(300, 1000));

      const progress = aggregator.getAggregatedProgress();

      expect(progress.totalProcessed).toBe(600);
      expect(progress.totalCount).toBe(3000);
    });

    it('should update existing task progress', () => {
      aggregator.start(1);

      aggregator.updateProgress('task-0', createProgress(100, 1000));
      aggregator.updateProgress('task-0', createProgress(500, 1000));

      const progress = aggregator.getAggregatedProgress();

      expect(progress.totalProcessed).toBe(500);
      expect(progress.totalCount).toBe(1000);
    });
  });

  describe('markCompleted', () => {
    it('should increment completed count', () => {
      aggregator.start(3);
      aggregator.updateProgress('task-0', createProgress(100, 100));

      aggregator.markCompleted('task-0');

      const progress = aggregator.getAggregatedProgress();
      expect(progress.tasksCompleted).toBe(1);
    });

    it('should update progress to 100% for completed task', () => {
      aggregator.start(1);
      aggregator.updateProgress('task-0', createProgress(50, 100));

      aggregator.markCompleted('task-0');

      const progress = aggregator.getAggregatedProgress();
      expect(progress.totalProcessed).toBe(100);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('isComplete', () => {
    it('should return false when not all tasks are completed', () => {
      aggregator.start(3);
      aggregator.markCompleted('task-0');

      expect(aggregator.isComplete()).toBe(false);
    });

    it('should return true when all tasks are completed', () => {
      aggregator.start(2);
      aggregator.markCompleted('task-0');
      aggregator.markCompleted('task-1');

      expect(aggregator.isComplete()).toBe(true);
    });
  });

  describe('getAggregatedProgress', () => {
    it('should calculate percentage correctly', () => {
      aggregator.start(2);
      aggregator.updateProgress('task-0', createProgress(500, 1000));
      aggregator.updateProgress('task-1', createProgress(500, 1000));

      const progress = aggregator.getAggregatedProgress();
      expect(progress.percentage).toBe(50);
    });

    it('should handle zero total count', () => {
      aggregator.start(1);
      aggregator.updateProgress('task-0', createProgress(0, 0));

      const progress = aggregator.getAggregatedProgress();
      expect(progress.percentage).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      aggregator.start(3);
      aggregator.updateProgress('task-0', createProgress(100, 100));
      aggregator.markCompleted('task-0');

      aggregator.reset();

      const progress = aggregator.getAggregatedProgress();
      expect(progress.tasksTotal).toBe(0);
      expect(progress.tasksCompleted).toBe(0);
      expect(progress.totalProcessed).toBe(0);
    });
  });
});

// =============================================================================
// Helper
// =============================================================================

function createProgress(processed: number, total: number): ProgressInfo {
  return {
    processed,
    total,
    percentage: total > 0 ? (processed / total) * 100 : 0,
    elapsedMs: 1000,
    estimatedRemainingMs: 1000,
    throughput: 1000,
  };
}
