import { describe, expect, it } from 'vitest';
import {
  MtseedDatetimeSearcher,
  generate_mtseed_search_tasks,
  generate_egg_search_tasks,
  generate_trainer_info_search_tasks,
  generate_pokemon_search_tasks,
} from '@/wasm/wasm_pkg.js';
import type {
  DatetimeSearchContext,
  EggGenerationParams,
  GameStartConfig,
} from '@/wasm/wasm_pkg.js';
import type { SearchTask, WorkerResponse } from '@/workers/types';
import { createPokemonSearchRequest } from '@/test/helpers/pokemon-search';
import { countDays, countValidSeconds } from '@/services/search-estimation';
import { runSearchInWorker } from './helpers/worker-test-utils';

const egg: EggGenerationParams = {
  trainer: { tid: 1, sid: 2 },
  everstone: 'None',
  female_ability_slot: 'First',
  uses_ditto: false,
  gender_ratio: 'F1M1',
  nidoran_flag: false,
  masuda_method: false,
  parent_male: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  parent_female: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  consider_npc: false,
  species_id: undefined,
};
const newGame: GameStartConfig = {
  start_mode: 'NewGame',
  save: 'NoSave',
  memory_link: 'Disabled',
  shiny_charm: 'NotObtained',
};

function factories() {
  const request = createPokemonSearchRequest();
  return [
    (context: DatetimeSearchContext, workers: number): SearchTask[] =>
      generate_mtseed_search_tasks(context, [1], workers).map((params) => ({
        kind: 'mtseed-datetime',
        params,
      })),
    (context: DatetimeSearchContext, workers: number): SearchTask[] =>
      generate_egg_search_tasks(context, egg, request.genConfig, undefined, workers).map(
        (params) => ({ kind: 'egg-datetime', params })
      ),
    (context: DatetimeSearchContext, workers: number): SearchTask[] =>
      generate_trainer_info_search_tasks(
        context,
        { tid: undefined, sid: undefined, shiny_pid: undefined },
        newGame,
        workers
      ).map((params) => ({ kind: 'trainer-info', params })),
    (context: DatetimeSearchContext, workers: number): SearchTask[] =>
      generate_pokemon_search_tasks(
        context,
        request.pokemonParams,
        request.genConfig,
        request.filter,
        workers
      ).map((params) => ({ kind: 'pokemon-datetime', params })),
  ];
}

describe('日時探索空間の WASM / Worker 境界', () => {
  it('4種類のタスク生成で不正日付・時刻・Worker数を例外にする', () => {
    const { context } = createPokemonSearchRequest();
    for (const create of factories()) {
      expect(() => create(context, 0)).toThrow();
      expect(() =>
        create({ ...context, date_range: { ...context.date_range, start_month: 0 } }, 1)
      ).toThrow();
      expect(() =>
        create({ ...context, time_range: { ...context.time_range, second_end: 60 } }, 1)
      ).toThrow();
    }
  });

  it('4種類とも転送後に改変された区間を Worker が拒否する', async () => {
    const { context } = createPokemonSearchRequest();
    for (const create of factories()) {
      const task = structuredClone(create(context, 1)[0]);
      if (!('params' in task) || !('search_space' in task.params))
        throw new Error('Expected datetime task');
      task.params.search_space.end_seconds = 3_155_760_001;
      await expect(runSearchInWorker(task)).rejects.toThrow('Invalid datetime interval');
    }
  });

  it('4種類とも上限の空区間で進捗0/0を通知して完了する', async () => {
    const { context } = createPokemonSearchRequest();
    for (const create of factories()) {
      const task = structuredClone(create(context, 1)[0]);
      if (!('params' in task) || !('search_space' in task.params))
        throw new Error('Expected datetime task');
      task.params.search_space.start_seconds = 3_155_760_000;
      task.params.search_space.end_seconds = 3_155_760_000;
      const worker = new Worker(new URL('../../workers/search.worker.ts', import.meta.url), {
        type: 'module',
      });
      try {
        const messages = await new Promise<WorkerResponse[]>((resolve, reject) => {
          const responses: WorkerResponse[] = [];
          const timer = setTimeout(() => reject(new Error('Worker timeout')), 10_000);
          worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
            if (event.data.type === 'ready')
              worker.postMessage({ type: 'start', taskId: 'empty', task });
            responses.push(event.data);
            if (event.data.type === 'error') {
              clearTimeout(timer);
              reject(new Error(event.data.message));
            }
            if (event.data.type === 'done') {
              clearTimeout(timer);
              resolve(responses);
            }
          });
          worker.postMessage({ type: 'init' });
        });
        expect(messages.filter((message) => message.type === 'progress')).toMatchObject([
          { progress: { processed: 0, total: 0, percentage: 100 } },
        ]);
      } finally {
        worker.terminate();
      }
    }
  });

  it('部分日への分割後も合計件数が画面見積もりと一致する', () => {
    const { context } = createPokemonSearchRequest();
    for (const date of [
      { start_year: 2000, start_month: 2, start_day: 28, end_year: 2000, end_month: 3, end_day: 1 },
      {
        start_year: 2099,
        start_month: 12,
        start_day: 31,
        end_year: 2099,
        end_month: 12,
        end_day: 31,
      },
    ]) {
      const time = {
        hour_start: 10,
        hour_end: 11,
        minute_start: 30,
        minute_end: 31,
        second_start: 0,
        second_end: 1,
      };
      const tasks = generate_mtseed_search_tasks(
        { ...context, date_range: date, time_range: time },
        [1],
        17
      );
      let count = 0n;
      for (const params of tasks) {
        const searcher = new MtseedDatetimeSearcher(structuredClone(params));
        try {
          const batch = searcher.next_batch(1000);
          expect(batch.processed_count).toBe(batch.total_count);
          expect(searcher.is_done).toBe(true);
          count += batch.total_count;
        } finally {
          searcher.free();
        }
      }
      expect(count).toBe(BigInt(countDays(date) * countValidSeconds(time)));
    }
  });
});
