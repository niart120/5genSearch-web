import { describe, it, expect, beforeAll } from 'vitest';
import wasmInit, {
  health_check,
  resolve_seeds,
  generate_pokemon_list,
  generate_egg_list,
  resolve_pokemon_data_batch,
  resolve_egg_data_batch,
  generate_mtseed_iv_search_tasks,
  MtseedDatetimeSearcher,
  GpuDatetimeSearchIterator,
} from '../../wasm/wasm_pkg.js';
import type {
  MtseedDatetimeSearchParams,
  MtseedSearchContext,
  DatetimeSearchContext,
  MtSeed,
} from '../../wasm/wasm_pkg.js';

describe('WASM Binding Verification', () => {
  beforeAll(async () => {
    // Browser Mode では fetch ベースで WASM を読み込む
    await wasmInit();
  });

  describe('health_check', () => {
    it('should return ready message', () => {
      const result = health_check();
      expect(result).toBe('wasm-pkg is ready');
    });
  });

  describe('resolve_seeds', () => {
    it('should resolve seed from direct specification', () => {
      const spec = {
        type: 'Seeds' as const,
        seeds: [0x123456789abcdefn],
      };
      const origins = resolve_seeds(spec);
      expect(origins.length).toBe(1);
      // SeedOrigin は { Seed: ... } | { Startup: ... } の discriminated union
      expect('Seed' in origins[0]).toBe(true);
    });
  });

  describe('generate_pokemon_list', () => {
    it('should be callable', () => {
      expect(typeof generate_pokemon_list).toBe('function');
    });
  });

  describe('generate_egg_list', () => {
    it('should be callable', () => {
      expect(typeof generate_egg_list).toBe('function');
    });
  });

  describe('resolve_pokemon_data_batch', () => {
    it('should be callable', () => {
      expect(typeof resolve_pokemon_data_batch).toBe('function');
    });
  });

  describe('resolve_egg_data_batch', () => {
    it('should be callable', () => {
      expect(typeof resolve_egg_data_batch).toBe('function');
    });
  });

  describe('MtseedDatetimeSearcher', () => {
    it('should create and search without panic', () => {
      const params: MtseedDatetimeSearchParams = {
        target_seeds: [0x32bf6858],
        ds: {
          mac: [0x8c, 0x56, 0xc5, 0x86, 0x15, 0x28] as [
            number,
            number,
            number,
            number,
            number,
            number,
          ],
          hardware: 'DsLite',
          version: 'Black',
          region: 'Jpn',
        },
        time_range: {
          hour_start: 18,
          hour_end: 18,
          minute_start: 0,
          minute_end: 30,
          second_start: 0,
          second_end: 59,
        },
        search_range: {
          start_year: 2010,
          start_month: 9,
          start_day: 18,
          start_second_offset: 0,
          range_seconds: 86400,
        },
        condition: {
          timer0: 0x0c79,
          vcount: 0x60,
          key_code: 0x2fff,
        },
      };

      const searcher = new MtseedDatetimeSearcher(params);
      expect(searcher.is_done).toBe(false);

      // 複数バッチ実行して Worker と同じ条件にする
      let totalProcessed = 0n;
      while (!searcher.is_done) {
        const batch = searcher.next_batch(100);
        expect(batch).toBeDefined();
        totalProcessed = batch.processed_count;
      }
      expect(totalProcessed).toBeGreaterThan(0n);

      searcher.free();
    });
  });

  describe('GpuDatetimeSearchIterator', () => {
    /**
     * GPU adapter およびデバイスが利用可能かチェック
     */
    async function checkGpuDeviceAvailable(): Promise<boolean> {
      if (!('gpu' in navigator)) {
        return false;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return false;
        }
        const device = await adapter.requestDevice();
        device.destroy();
        return true;
      } catch {
        return false;
      }
    }

    it('should find known MT Seed via GPU search (direct WASM call)', async (ctx) => {
      const gpuDeviceAvailable = await checkGpuDeviceAvailable();
      if (!gpuDeviceAvailable) {
        console.log('GPU device is not available, skipping GPU test');
        ctx.skip();
        return;
      }

      // 新 API: DatetimeSearchContext + targetSeeds
      const context: DatetimeSearchContext = {
        ds: {
          mac: [0x8c, 0x56, 0xc5, 0x86, 0x15, 0x28] as [
            number,
            number,
            number,
            number,
            number,
            number,
          ],
          hardware: 'DsLite',
          version: 'Black',
          region: 'Jpn',
        },
        date_range: {
          start_year: 2010,
          start_month: 9,
          start_day: 18,
          end_year: 2010,
          end_month: 9,
          end_day: 18,
        },
        time_range: {
          hour_start: 18,
          hour_end: 18,
          minute_start: 0,
          minute_end: 30,
          second_start: 0,
          second_end: 59,
        },
        ranges: [
          {
            timer0_min: 0x0c79,
            timer0_max: 0x0c79,
            vcount_min: 0x60,
            vcount_max: 0x60,
          },
        ],
        key_spec: { available_buttons: [] },
      };

      const targetSeeds: MtSeed[] = [0x32bf6858];

      // GPU 検索イテレータを直接作成（新 API）
      const iterator = await GpuDatetimeSearchIterator.create(context, targetSeeds);
      expect(iterator.is_done).toBe(false);

      // 全バッチを実行して結果を収集
      const allResults: unknown[] = [];
      let batchCount = 0;
      while (!iterator.is_done) {
        const batch = await iterator.next();
        if (batch) {
          console.log(
            `Batch ${batchCount}: progress=${batch.progress}, results=${batch.results.length}`
          );
          allResults.push(...batch.results);
        }
        batchCount++;
      }

      console.log(`Total batches: ${batchCount}, Total results: ${allResults.length}`);

      // 結果があることを確認
      expect(allResults.length).toBeGreaterThan(0);

      iterator.free();
    }, 60000);
  });

  describe('generate_mtseed_iv_search_tasks', () => {
    it('should split full range into specified number of tasks', () => {
      const context: MtseedSearchContext = {
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
      };

      const tasks = generate_mtseed_iv_search_tasks(context, 4);

      // 4 タスクに分割されること
      expect(tasks.length).toBe(4);

      // 最初のタスクは 0 から開始
      expect(tasks[0].start_seed).toBe(0);

      // 最後のタスクは 0xFFFF_FFFF で終了
      expect(tasks[tasks.length - 1].end_seed).toBe(0xffff_ffff);

      // 各タスクの start_seed が前タスクの end_seed + 1 であること
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].start_seed).toBe(tasks[i - 1].end_seed + 1);
      }
    });
  });
});
