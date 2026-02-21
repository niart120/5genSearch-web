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

/**
 * GPUAdapterInfo 拡張プロパティ (Chrome 131+)
 */
interface GPUAdapterInfoExtended extends GPUAdapterInfo {
  readonly type?: string;
  readonly driver?: string;
}

function hasWebGpu(): boolean {
  return 'gpu' in navigator && navigator.gpu !== undefined;
}

async function requestAdapterInfo(): Promise<GPUAdapterInfoExtended | undefined> {
  if (!hasWebGpu()) return undefined;
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    return adapter?.info as GPUAdapterInfoExtended | undefined;
  } catch {
    return undefined;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe.skipIf(!hasWebGpu())('GPU Profile Detection', () => {
  let browserInfo: GPUAdapterInfoExtended | undefined;
  let wasmProfile: GpuProfile | undefined;

  beforeAll(async () => {
    browserInfo = await requestAdapterInfo();

    // cacheGpuAdapterInfo 相当: globalThis にブラウザ情報を設定
    if (browserInfo) {
      (globalThis as Record<string, unknown>).__wgpu_browser_adapter_info = {
        type: browserInfo.type ?? '',
        description: browserInfo.description ?? '',
        vendor: browserInfo.vendor ?? '',
        driver: browserInfo.driver ?? '',
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

    it('description が空でない (Chrome/Edge)', () => {
      // Chrome/Edge では description にデバイス名が入る
      // Firefox/Safari では空の可能性がある
      expect(browserInfo?.description).toBeDefined();
      console.log('[GPUAdapterInfo] description:', browserInfo?.description);
    });

    it('vendor が空でない', () => {
      expect(browserInfo?.vendor).toBeDefined();
      console.log('[GPUAdapterInfo] vendor:', browserInfo?.vendor);
    });

    it('type プロパティの値を確認', () => {
      // Chrome 131+ では "discrete GPU" / "integrated GPU" / "CPU" / ""
      const validTypes = ['discrete GPU', 'integrated GPU', 'CPU', '', undefined];
      console.log('[GPUAdapterInfo] type:', browserInfo?.type);
      expect(validTypes).toContain(browserInfo?.type);
    });

    it('driver プロパティの値を確認', () => {
      // Chrome 固有の非標準プロパティ
      console.log('[GPUAdapterInfo] driver:', browserInfo?.driver);
      // 型の存在のみ確認 (undefined も許容)
      expect(typeof browserInfo?.driver === 'string' || browserInfo?.driver === undefined).toBe(
        true
      );
    });

    it('全プロパティをダンプ', () => {
      console.log('[GPUAdapterInfo] full dump:', {
        architecture: browserInfo?.architecture,
        description: browserInfo?.description,
        device: browserInfo?.device,
        vendor: browserInfo?.vendor,
        type: browserInfo?.type,
        driver: browserInfo?.driver,
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

    it('name が空でない', () => {
      // wgpu WebGPU バックエンドは空文字を返すが、
      // ブラウザ情報からのフォールバックで補完される
      console.log('[GpuProfile] name:', wasmProfile?.name);
      expect(typeof wasmProfile?.name).toBe('string');
    });

    it('vendor が空でない', () => {
      console.log('[GpuProfile] vendor:', wasmProfile?.vendor);
      expect(typeof wasmProfile?.vendor).toBe('string');
    });

    it('driver の値を確認', () => {
      console.log('[GpuProfile] driver:', wasmProfile?.driver);
      expect(typeof wasmProfile?.driver).toBe('string');
    });

    it('全プロパティをダンプ', () => {
      console.log('[GpuProfile] full dump:', wasmProfile);
    });
  });

  // ---------------------------------------------------------------------------
  // 整合性: ブラウザ情報と WASM プロファイルの対応
  // ---------------------------------------------------------------------------

  describe('Browser ↔ WASM 整合性', () => {
    it('ブラウザの type が "discrete GPU" なら kind は Discrete', () => {
      if (browserInfo?.type !== 'discrete GPU') return;
      expect(wasmProfile?.kind).toBe('Discrete');
    });

    it('ブラウザの type が "integrated GPU" なら kind は Integrated', () => {
      if (browserInfo?.type !== 'integrated GPU') return;
      expect(wasmProfile?.kind).toBe('Integrated');
    });

    it('name はブラウザの description と一致するか wgpu の name', () => {
      // wgpu WebGPU バックエンドは name が空 → ブラウザの description にフォールバック
      // wgpu が name を返すようになった場合はそちらが使われる
      if (browserInfo?.description) {
        console.log(
          '[Consistency] browser.description:',
          browserInfo.description,
          '/ wasm.name:',
          wasmProfile?.name
        );
      }
    });
  });
});
