/**
 * 進捗サービスのユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProgressAggregator,
  formatProgress,
  formatRemainingTime,
  formatThroughput,
} from '../../../services/progress';
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

describe('formatProgress', () => {
  it('should format progress string correctly', () => {
    const progress = {
      totalProcessed: 5000,
      totalCount: 10000,
      percentage: 50,
      elapsedMs: 1000,
      estimatedRemainingMs: 1000,
      throughput: 5000,
      tasksCompleted: 1,
      tasksTotal: 2,
    };

    const formatted = formatProgress(progress);

    expect(formatted).toContain('50.0%');
    expect(formatted).toContain('5.0K/s');
    expect(formatted).toContain('1s');
    expect(formatted).toContain('1/2');
  });
});

describe('formatRemainingTime', () => {
  it('should format seconds', () => {
    expect(formatRemainingTime(30000)).toBe('30s');
  });

  it('should format minutes and seconds', () => {
    expect(formatRemainingTime(90000)).toBe('1m 30s');
  });

  it('should format hours and minutes', () => {
    expect(formatRemainingTime(3700000)).toBe('1h 1m');
  });

  it('should handle zero', () => {
    expect(formatRemainingTime(0)).toBe('0s');
  });

  it('should handle negative values', () => {
    expect(formatRemainingTime(-1000)).toBe('0s');
  });
});

describe('formatThroughput', () => {
  it('should format small values', () => {
    expect(formatThroughput(500)).toBe('500/s');
  });

  it('should format thousands', () => {
    expect(formatThroughput(5000)).toBe('5.0K/s');
  });

  it('should format millions', () => {
    expect(formatThroughput(2500000)).toBe('2.50M/s');
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
