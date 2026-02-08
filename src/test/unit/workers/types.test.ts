/**
 * Worker 型定義のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import type {
  WorkerRequest,
  WorkerResponse,
  ProgressInfo,
  SearchTask,
} from '../../../workers/types';

describe('Worker Types', () => {
  describe('WorkerRequest', () => {
    it('should type init request correctly', () => {
      const request: WorkerRequest = {
        type: 'init',
      };

      expect(request.type).toBe('init');
    });

    it('should type start request correctly', () => {
      const request: WorkerRequest = {
        type: 'start',
        taskId: 'task-0',
        task: {
          kind: 'mtseed',
          params: {
            iv_filter: {
              hp: [0, 31],
              atk: [0, 31],
              def: [0, 31],
              spa: [0, 31],
              spd: [0, 31],
              spe: [0, 31],
            },
            mt_offset: 7,
            is_roamer: false,
            start_seed: 0,
            end_seed: 0xff_ff_ff_ff,
          },
        },
      };

      expect(request.type).toBe('start');
      expect(request.taskId).toBe('task-0');
      expect(request.task.kind).toBe('mtseed');
    });

    it('should type cancel request correctly', () => {
      const request: WorkerRequest = {
        type: 'cancel',
      };

      expect(request.type).toBe('cancel');
    });
  });

  describe('WorkerResponse', () => {
    it('should type ready response correctly', () => {
      const response: WorkerResponse = {
        type: 'ready',
      };

      expect(response.type).toBe('ready');
    });

    it('should type progress response correctly', () => {
      const progress: ProgressInfo = {
        processed: 1000,
        total: 10_000,
        percentage: 10,
        elapsedMs: 500,
        estimatedRemainingMs: 4500,
        throughput: 2000,
      };

      const response: WorkerResponse = {
        type: 'progress',
        taskId: 'task-0',
        progress,
      };

      expect(response.type).toBe('progress');
      expect(response.progress.percentage).toBe(10);
    });

    it('should type done response correctly', () => {
      const response: WorkerResponse = {
        type: 'done',
        taskId: 'task-0',
      };

      expect(response.type).toBe('done');
      expect(response.taskId).toBe('task-0');
    });

    it('should type error response correctly', () => {
      const response: WorkerResponse = {
        type: 'error',
        taskId: 'task-0',
        message: 'Something went wrong',
      };

      expect(response.type).toBe('error');
      expect(response.message).toBe('Something went wrong');
    });
  });

  describe('ProgressInfo', () => {
    it('should calculate percentage correctly', () => {
      const progress: ProgressInfo = {
        processed: 5000,
        total: 10_000,
        percentage: 50,
        elapsedMs: 1000,
        estimatedRemainingMs: 1000,
        throughput: 5000,
      };

      expect(progress.percentage).toBe(50);
      expect(progress.throughput).toBe(5000);
    });

    it('should handle zero total', () => {
      const progress: ProgressInfo = {
        processed: 0,
        total: 0,
        percentage: 0,
        elapsedMs: 0,
        estimatedRemainingMs: 0,
        throughput: 0,
      };

      expect(progress.percentage).toBe(0);
    });
  });

  describe('SearchTask', () => {
    it('should type mtseed task correctly', () => {
      const task: SearchTask = {
        kind: 'mtseed',
        params: {
          iv_filter: {
            hp: [31, 31],
            atk: [31, 31],
            def: [31, 31],
            spa: [31, 31],
            spd: [31, 31],
            spe: [31, 31],
          },
          mt_offset: 7,
          is_roamer: false,
          start_seed: 0,
          end_seed: 0xff_ff_ff_ff,
        },
      };

      expect(task.kind).toBe('mtseed');
    });

    it('should type mtseed-datetime task correctly', () => {
      const task: SearchTask = {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [0x12_34_56_78],
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
            start_year: 2010,
            start_month: 9,
            start_day: 18,
            start_second_offset: 0,
            range_seconds: 86_400,
          },
          condition: {
            timer0: 0x0c_79,
            vcount: 0x60,
            key_code: 0x2f_ff,
          },
        },
      };

      expect(task.kind).toBe('mtseed-datetime');
      expect(task.params.target_seeds).toContain(0x12_34_56_78);
    });
  });
});
