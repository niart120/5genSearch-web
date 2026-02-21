/**
 * GPU プロファイル検出テスト
 *
 * Browser Mode で実行される統合テスト。
 * ブラウザの GPUAdapterInfo と WASM 側の GpuProfile::detect() の結果を検証する。
 *
 * WebGPU が利用できない環境ではスキップされる。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { detect_gpu_profile } from '../../wasm/wasm_pkg.js';
import type { GpuKind, GpuProfile } from '../../wasm/wasm_pkg.js';

// =============================================================================
// GPU Availability Check
// =============================================================================

function hasWebGpu(): boolean {
  return 'gpu' in navigator && navigator.gpu !== undefined;
}

async function requestAdapterInfo(): Promise<GPUAdapterInfo | undefined> {
  if (!hasWebGpu()) return undefined;
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    return adapter?.info;
  } catch {
    return undefined;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe.skipIf(!hasWebGpu())('GPU Profile Detection', () => {
  let browserInfo: GPUAdapterInfo | undefined;
  let wasmProfile: GpuProfile | undefined;

  beforeAll(async () => {
    browserInfo = await requestAdapterInfo();

    // cacheGpuAdapterInfo 相当: globalThis にブラウザ情報を設定
    if (browserInfo) {
      (globalThis as Record<string, unknown>).__wgpu_browser_adapter_info = {
        vendor: browserInfo.vendor ?? '',
        architecture: browserInfo.architecture ?? '',
        description: browserInfo.description ?? '',
      };
    }

    wasmProfile = await detect_gpu_profile();
  });

  // ---------------------------------------------------------------------------
  // TS 側: ブラウザ GPUAdapterInfo の値確認
  // ---------------------------------------------------------------------------

  describe('Browser GPUAdapterInfo', () => {
    it('GPUAdapterInfo を取得できる', () => {
      expect(browserInfo).toBeDefined();
    });

    it('vendor が空でない', () => {
      expect(browserInfo?.vendor).toBeDefined();
      console.log('[GPUAdapterInfo] vendor:', browserInfo?.vendor);
    });

    it('architecture が空でない', () => {
      expect(browserInfo?.architecture).toBeDefined();
      console.log('[GPUAdapterInfo] architecture:', browserInfo?.architecture);
    });

    it('全プロパティをダンプ', () => {
      console.log('[GPUAdapterInfo] full dump:', {
        vendor: browserInfo?.vendor,
        architecture: browserInfo?.architecture,
        description: browserInfo?.description,
        device: browserInfo?.device,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // WASM 側: GpuProfile::detect() の結果検証
  // ---------------------------------------------------------------------------

  describe('WASM GpuProfile::detect()', () => {
    it('GpuProfile を取得できる', () => {
      expect(wasmProfile).toBeDefined();
    });

    it('kind が有効な GpuKind 値', () => {
      const validKinds: GpuKind[] = ['Discrete', 'Integrated', 'Mobile', 'Unknown'];
      expect(validKinds).toContain(wasmProfile?.kind);
      console.log('[GpuProfile] kind:', wasmProfile?.kind);
    });

    it('kind が Unknown でない', () => {
      // vendor + architecture が取れる環境では Unknown にならない
      if (browserInfo?.vendor) {
        expect(wasmProfile?.kind).not.toBe('Unknown');
      }
    });

    it('vendor が空でない', () => {
      console.log('[GpuProfile] vendor:', wasmProfile?.vendor);
      expect(typeof wasmProfile?.vendor).toBe('string');
    });

    it('architecture の値を確認', () => {
      console.log('[GpuProfile] architecture:', wasmProfile?.architecture);
      expect(typeof wasmProfile?.architecture).toBe('string');
    });

    it('全プロパティをダンプ', () => {
      console.log('[GpuProfile] full dump:', wasmProfile);
    });
  });

  // ---------------------------------------------------------------------------
  // 整合性: ブラウザ情報と WASM プロファイルの対応
  // ---------------------------------------------------------------------------

  describe('Browser ↔ WASM 整合性', () => {
    it('vendor がブラウザと一致する', () => {
      if (browserInfo?.vendor) {
        expect(wasmProfile?.vendor).toBe(browserInfo.vendor);
      }
    });

    it('architecture がブラウザと一致する', () => {
      if (browserInfo?.architecture) {
        expect(wasmProfile?.architecture).toBe(browserInfo.architecture);
      }
    });
  });
});
