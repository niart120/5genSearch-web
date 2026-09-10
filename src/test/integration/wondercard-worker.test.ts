import { afterEach, describe, expect, it } from 'vitest';
import {
  WonderCardListGenerator,
  WonderCardDatetimeSearcher,
  resolve_wondercard_data_batch,
  resolve_seeds,
} from '@/wasm/wasm_pkg.js';
import type {
  CoreDataFilter,
  GeneratedWonderCardData,
  GenerationConfig,
  SeedOrigin,
  WonderCardParams,
  WonderCardDatetimeSearchParams,
  DatetimeSearchContext,
} from '@/wasm/wasm_pkg.js';
import type { SearchTask, WorkerResponse, ProgressInfo, SearchResultType } from '@/workers/types';
import type { WonderCardResultView } from '@/lib/result-view';
import {
  createWonderCardListTasks,
  createWonderCardDatetimeSearchTasks,
} from '@/services/search-tasks';
import { WorkerPool } from '@/services/worker-pool';
import { flattenBatchResults, isGeneratedWonderCardData } from '@/services/batch-utils';
import { loadWonderCards } from '@/data/wondercards/loader';
import { toWonderCardParams } from '@/data/wondercards/converter';
import {
  createTestDsConfig,
  createTestSearchSpace,
  createTestStartupCondition,
} from './helpers/worker-test-utils';

function params(): WonderCardParams {
  return {
    trainer: { tid: 12_345, sid: 54_321 },
    species_id: 25,
    level: 50,
    fixed_ivs: [0, undefined, 31, undefined, 2, undefined],
    fixed_nature: undefined,
    fixed_gender: undefined,
    fixed_ability_slot: 'Hidden',
    shiny_policy: 'Always',
  };
}

function config(): GenerationConfig {
  return {
    version: 'Black',
    game_start: {
      start_mode: 'Continue',
      save: 'WithSave',
      memory_link: 'Disabled',
      shiny_charm: 'NotObtained',
    },
    user_offset: 6,
    max_advance: 30,
  };
}

function origins(): SeedOrigin[] {
  return resolve_seeds({ type: 'Seeds', seeds: [0n, 0x12_34_56_78_9a_bc_de_f0n] });
}

function searchParams(): WonderCardDatetimeSearchParams {
  return {
    ds: createTestDsConfig(),
    search_space: createTestSearchSpace(2010, 9, 18, 7),
    condition: createTestStartupCondition(),
    wondercard_params: params(),
    gen_config: config(),
    filter: undefined,
  };
}

function context(): DatetimeSearchContext {
  return {
    ds: createTestDsConfig(),
    date_range: {
      start_year: 2010,
      start_month: 9,
      start_day: 18,
      end_year: 2010,
      end_month: 9,
      end_day: 18,
    },
    time_range: {
      hour_start: 0,
      hour_end: 0,
      minute_start: 0,
      minute_end: 1,
      second_start: 0,
      second_end: 6,
    },
    ranges: [{ timer0_min: 0xc_79, timer0_max: 0xc_7a, vcount_min: 0x60, vcount_max: 0x61 }],
    key_spec: { available_buttons: ['A'] },
  };
}

function collect(
  generator: WonderCardListGenerator | WonderCardDatetimeSearcher,
  maxCandidates = 13,
  maxResults = 7
) {
  const rows: GeneratedWonderCardData[] = [];
  let previous = 0n;
  try {
    while (!generator.is_done) {
      const batch = generator.next_batch({
        max_candidates: maxCandidates,
        max_results: maxResults,
      });
      expect(batch.processed_count - previous).toBeLessThanOrEqual(BigInt(maxCandidates));
      expect(batch.processed_count).toBeGreaterThan(previous);
      expect(batch.results.length).toBeLessThanOrEqual(maxResults);
      previous = batch.processed_count;
      rows.push(...batch.results);
    }
    const end = generator.next_batch({ max_candidates: 1, max_results: 1 });
    expect(end.results).toEqual([]);
    expect(end.processed_count).toBe(end.total_count);
    return rows;
  } finally {
    generator.free();
  }
}

type WonderTask = Extract<SearchTask, { kind: 'wondercard-list' | 'wondercard-datetime' }>;
const workers: Worker[] = [];
const pools: WorkerPool[] = [];
afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
  for (const pool of pools.splice(0)) pool.dispose();
});

async function readyWorker(): Promise<Worker> {
  const worker = new Worker(new URL('../../workers/search.worker.ts', import.meta.url), {
    type: 'module',
  });
  workers.push(worker);
  await new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'ready') {
        worker.removeEventListener('message', onMessage);
        resolve();
      } else if (event.data.type === 'error') reject(new Error(event.data.message));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (event) => reject(new Error(event.message)), { once: true });
    worker.postMessage({ type: 'init' });
  });
  return worker;
}

function execute(
  worker: Worker,
  task: WonderTask,
  cancelOnResult = false
): Promise<{ rows: GeneratedWonderCardData[]; progress: ProgressInfo[] }> {
  return new Promise((resolve, reject) => {
    const rows: GeneratedWonderCardData[] = [];
    const progress: ProgressInfo[] = [];
    const listener = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === 'result') {
        expect(response.resultType).toBe('wondercard-list');
        if (response.resultType === 'wondercard-list') {
          expect(response.results.length).toBeLessThanOrEqual(256);
          rows.push(...response.results);
        }
        if (cancelOnResult) worker.postMessage({ type: 'cancel' });
      } else if (response.type === 'progress') progress.push(response.progress);
      else if (response.type === 'error') {
        worker.removeEventListener('message', listener);
        reject(new Error(response.message));
      } else if (response.type === 'done') {
        worker.removeEventListener('message', listener);
        resolve({ rows, progress });
      }
    };
    worker.addEventListener('message', listener);
    worker.postMessage({ type: 'start', taskId: 'wondercard-test', task });
  });
}

const key = (row: GeneratedWonderCardData) =>
  JSON.stringify([row.source, row.advance], (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
function sortRows(rows: GeneratedWonderCardData[]) {
  return rows.toSorted((a, b) => key(a).localeCompare(key(b)));
}

describe('wondercard WASM and CPU Worker', () => {
  it('六要素・undefined・固定値 0・列挙型・bigint が実際の WASM 境界を往復する', () => {
    const p = params();
    const before = structuredClone(p);
    const rows = collect(new WonderCardListGenerator(origins(), p, config()));
    expect(rows).toHaveLength(50);
    expect(p).toEqual(before);
    expect(
      rows.every(
        (row) => row.core.ivs.hp === 0 && row.core.ivs.def === 31 && row.core.ivs.spd === 2
      )
    ).toBe(true);
    expect(
      rows.every((row) => row.core.ability_slot === 'Hidden' && row.core.shiny_type !== 'None')
    ).toBe(true);
    expect(rows[25].source).toEqual(origins()[1]);
    const ui = resolve_wondercard_data_batch(rows, 'en');
    const views: WonderCardResultView[] = rows.map((raw, index) => ({ raw, ui: ui[index] }));
    expect(views.map((view) => view.ui.advance)).toEqual(rows.map((row) => row.advance));
    expect(ui[0]).toMatchObject({
      species_name: 'Pikachu',
      ability_name: 'Lightning Rod',
      level: 50,
    });
    expect(ui[0]).not.toHaveProperty('mt_seed');
    expect(ui[0]).not.toHaveProperty('sync_applied');
    expect(ui[0].ivs).not.toContain('?');
    expect(ui[0].stats).not.toContain('?');
  });

  it('local_123 の固定期待値が起動時消費と範囲を含む WASM 経路でも一致する', () => {
    const p = params();
    p.fixed_ivs = [undefined, undefined, undefined, undefined, undefined, undefined];
    p.fixed_ability_slot = undefined;
    p.shiny_policy = 'Random';
    const seeds = resolve_seeds({ type: 'Seeds', seeds: [0x53_50_28_1a_01_68_54_3cn] });
    const rows = collect(
      new WonderCardListGenerator(seeds, p, { ...config(), user_offset: 57, max_advance: 57 })
    );
    expect(rows[0].core).toMatchObject({
      pid: 0xe9_a9_2f_bc,
      nature: 'Relaxed',
      ivs: { hp: 17, atk: 16, def: 22, spa: 19, spd: 14, spe: 24 },
    });
  });

  it('同梱全カードを対象 ROM ごとに構築・生成する', async () => {
    const cards = await loadWonderCards();
    for (const card of cards) {
      for (const version of card.versions) {
        const p = toWonderCardParams(card, { tid: 0, sid: 0 });
        const rows = collect(new WonderCardListGenerator(origins(), p, { ...config(), version }));
        expect(rows).toHaveLength(50);
        expect(
          rows.every(
            (row) => row.core.species_id === card.speciesId && row.core.level === card.level
          )
        ).toBe(true);
      }
    }
  });

  it('カードの不正な値と六要素でない fixed_ivs を構築時に拒否する', async () => {
    const cards = await loadWonderCards();
    cards[0].fixedIvs.hp = 32;
    expect(
      () =>
        new WonderCardListGenerator([], toWonderCardParams(cards[0], { tid: 0, sid: 0 }), config())
    ).toThrow('Fixed IV');
    const p = params();
    p.fixed_ivs.pop();
    expect(() => new WonderCardListGenerator([], p, config())).toThrow();
  });

  it.each(['wondercard-list', 'wondercard-datetime'] as const)(
    '%s が共通結果型・累積進捗・完了を返す',
    async (kind) => {
      const worker = await readyWorker();
      const task: WonderTask =
        kind === 'wondercard-list'
          ? { kind, origins: origins(), params: params(), config: config(), filter: undefined }
          : { kind, params: searchParams() };
      const { rows, progress } = await execute(worker, task);
      const typed: SearchResultType<typeof kind> = rows;
      const expected = kind === 'wondercard-list' ? 50 : 175;
      expect(typed).toHaveLength(expected);
      expect(progress.at(-1)).toMatchObject({
        processed: expected,
        total: expected,
        percentage: 100,
      });
      if (kind === 'wondercard-datetime') {
        const sources = rows.filter((row) => row.advance === 6).map((row) => row.source);
        expect(collect(new WonderCardListGenerator(sources, params(), config()))).toEqual(rows);
        expect(resolve_wondercard_data_batch(rows, 'ja')[0].datetime_iso).toBe(
          '2010-09-18T00:00:00'
        );
      }
    }
  );

  it.each(['wondercard-list', 'wondercard-datetime'] as const)(
    '%s は空入力・全候補不一致・初期化失敗を通知する',
    async (kind) => {
      const worker = await readyWorker();
      const p = searchParams();
      p.search_space.end_seconds = p.search_space.start_seconds;
      const empty: WonderTask =
        kind === 'wondercard-list'
          ? { kind, origins: [], params: params(), config: config(), filter: undefined }
          : { kind, params: p };
      const done = await execute(worker, empty);
      expect(done.rows).toEqual([]);
      expect(done.progress.at(-1)).toMatchObject({ processed: 0, total: 0, percentage: 100 });
      const filter: CoreDataFilter = {
        iv: undefined,
        natures: undefined,
        gender: 'Genderless',
        ability_slot: undefined,
        shiny: undefined,
        stats: undefined,
      };
      const mismatch: WonderTask =
        kind === 'wondercard-list'
          ? { kind, origins: origins(), params: params(), config: config(), filter }
          : { kind, params: { ...searchParams(), filter } };
      const unmatched = await execute(worker, mismatch);
      expect(unmatched.rows).toEqual([]);
      expect(unmatched.progress.at(-1)?.processed).toBe(kind === 'wondercard-list' ? 50 : 175);
      if (empty.kind === 'wondercard-list') empty.params.species_id = 0;
      else empty.params.wondercard_params.species_id = 0;
      await expect(execute(worker, empty)).rejects.toThrow('species');
    }
  );

  it.each(['wondercard-list', 'wondercard-datetime'] as const)(
    '%s の単一 Seed でも中断し、同じ Worker で再実行できる',
    async (kind) => {
      const worker = await readyWorker();
      const cfg = { ...config(), max_advance: 1_000_000 };
      const p = searchParams();
      p.search_space.end_seconds = p.search_space.start_seconds + 1;
      p.gen_config = cfg;
      const task: WonderTask =
        kind === 'wondercard-list'
          ? { kind, origins: [origins()[0]], params: params(), config: cfg, filter: undefined }
          : { kind, params: p };
      const cancelled = await execute(worker, task, true);
      expect(cancelled.progress.at(-1)?.processed).toBeLessThan(1_000_000);
      expect(cancelled.rows.length).toBeGreaterThan(0);
      const rerun = await execute(worker, {
        kind: 'wondercard-list',
        origins: [origins()[0]],
        params: params(),
        config: config(),
        filter: undefined,
      });
      expect(rerun.rows).toHaveLength(25);
    }
  );

  it('一覧のタスク分割は各 Origin を一度だけ含み、単一 Origin は一タスクになる', () => {
    const cfg = config();
    const seedOrigins = origins();
    expect(createWonderCardListTasks([seedOrigins[0]], params(), cfg, undefined, 8)).toHaveLength(
      1
    );
    expect(createWonderCardListTasks([], params(), cfg, undefined, 8)).toEqual([]);
    const tasks = createWonderCardListTasks(seedOrigins, params(), cfg, undefined, 8);
    expect(tasks.flatMap((task) => task.origins)).toEqual(seedOrigins);
    expect(() => createWonderCardListTasks(seedOrigins, params(), cfg, undefined, 0)).toThrow(
      'Worker count'
    );
  });

  it('日時分割と CPU WorkerPool が単一実行と同じ個体集合を返す', async () => {
    const ctx = context();
    ctx.ranges.push(ctx.ranges[0]);
    const build = (count: number) =>
      createWonderCardDatetimeSearchTasks(ctx, params(), config(), undefined, count);
    const serial = build(1).flatMap((task) => collect(new WonderCardDatetimeSearcher(task.params)));
    expect(serial).toHaveLength(14 * 8 * 25);
    const tasks = build(16);
    // 各起動条件の後半日には候補がないため、空の時間チャンクはタスクにしない。
    expect(tasks).toHaveLength(8);
    const split = tasks.flatMap((task) => collect(new WonderCardDatetimeSearcher(task.params)));
    expect(sortRows(split)).toEqual(sortRows(serial));
    expect(
      tasks.every(
        (task) => task.params.search_space.start_seconds < task.params.search_space.end_seconds
      )
    ).toBe(true);
    const pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    pools.push(pool);
    await pool.initialize();
    const rows: GeneratedWonderCardData[] = [];
    let processed = 0;
    pool.onResult((batch) =>
      rows.push(...flattenBatchResults<GeneratedWonderCardData>([batch], isGeneratedWonderCardData))
    );
    pool.onProgress((progress) => {
      processed = progress.totalProcessed;
    });
    await new Promise<void>((resolve, reject) => {
      pool.onComplete(resolve);
      pool.onError(reject);
      pool.start(tasks);
    });
    expect(sortRows(rows)).toEqual(sortRows(serial));
    expect(processed).toBe(serial.length);
  });

  it('日時検索と一覧に同じ個体値・実数値フィルターを適用すると同じ部分集合になる', () => {
    const p = searchParams();
    const all = collect(new WonderCardDatetimeSearcher(p));
    const first = all[0].core;
    const filter: CoreDataFilter = {
      iv: {
        hp: [0, 31],
        atk: [first.ivs.atk, first.ivs.atk],
        def: [0, 31],
        spa: [0, 31],
        spd: [0, 31],
        spe: [0, 31],
        hidden_power_types: undefined,
        hidden_power_min_power: undefined,
      },
      stats: {
        hp: undefined,
        atk: first.stats.attack,
        def: undefined,
        spa: undefined,
        spd: undefined,
        spe: undefined,
      },
      natures: undefined,
      gender: undefined,
      ability_slot: undefined,
      shiny: undefined,
    };
    const expected = all.filter(
      (row) => row.core.ivs.atk === first.ivs.atk && row.core.stats.attack === first.stats.attack
    );
    const sources = all
      .filter((row) => row.advance === p.gen_config.user_offset)
      .map((row) => row.source);
    expect(collect(new WonderCardDatetimeSearcher({ ...p, filter }))).toEqual(expected);
    expect(
      collect(new WonderCardListGenerator(sources, p.wondercard_params, p.gen_config, filter))
    ).toEqual(expected);
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(all.length);
  });

  it('日時のタスク分割は不正な起動範囲と Worker 数を拒否し、カード条件の検証は構築まで保留する', () => {
    const ctx = context();
    const build = (count: number, p = params()) =>
      createWonderCardDatetimeSearchTasks(ctx, p, config(), undefined, count);
    for (const count of [0, -1, 1.5, Number.NaN, 2 ** 32])
      expect(() => build(count)).toThrow('Worker count');
    const invalidCard = { ...params(), level: 0 };
    const tasks = build(1, invalidCard);
    expect(() => new WonderCardDatetimeSearcher(tasks[0].params)).toThrow('level');
    ctx.ranges[0].timer0_min = ctx.ranges[0].timer0_max + 1;
    expect(() => build(1)).toThrow('startup ranges');
    ctx.ranges = [];
    expect(() => build(1)).toThrow('startup ranges');
  });
});
