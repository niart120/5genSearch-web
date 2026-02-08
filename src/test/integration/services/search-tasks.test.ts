/**
 * 検索タスク生成サービス 統合テスト
 *
 * Browser Mode で実行される統合テスト。
 * search-tasks.ts の各関数が WASM を呼び出して正しい SearchTask[] を生成することを検証する。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import wasmInit from '../../../wasm/wasm_pkg.js';
import { createMtseedIvSearchTasks } from '../../../services/search-tasks';

describe('search-tasks', () => {
  beforeAll(async () => {
    await wasmInit();
  });

  describe('createMtseedIvSearchTasks', () => {
    it('should generate tasks with correct kind', () => {
      const tasks = createMtseedIvSearchTasks(
        {
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
        },
        4
      );

      expect(tasks.length).toBe(4);
      for (const task of tasks) {
        expect(task.kind).toBe('mtseed');
      }
    });

    it('should cover full seed range without gaps', () => {
      const tasks = createMtseedIvSearchTasks(
        {
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
        },
        4
      );

      // 最初のタスクは 0 から開始
      expect(tasks[0].params.start_seed).toBe(0);

      // 最後のタスクは 0xFFFF_FFFF で終了
      expect(tasks.at(-1).params.end_seed).toBe(0xff_ff_ff_ff);

      // 隣接タスク間に隙間がないこと
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].params.start_seed).toBe(tasks[i - 1].params.end_seed! + 1);
      }
    });

    it('should preserve base params in all tasks', () => {
      const tasks = createMtseedIvSearchTasks(
        {
          iv_filter: {
            hp: [31, 31],
            atk: [31, 31],
            def: [31, 31],
            spa: [31, 31],
            spd: [31, 31],
            spe: [31, 31],
          },
          mt_offset: 10,
          is_roamer: true,
        },
        2
      );

      for (const task of tasks) {
        expect(task.params.mt_offset).toBe(10);
        expect(task.params.is_roamer).toBe(true);
      }
    });
  });
});
