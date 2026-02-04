/**
 * WASM ローダーユーティリティ
 *
 * WASM バイナリの取得とパス解決を行う。
 * メインスレッドで実行し、取得した ArrayBuffer を Worker に転送する。
 */

/**
 * WASM バイナリの URL を取得
 *
 * Vite の `?url` サフィックスを使用して、ビルド時に正しいパスが解決される。
 */
const wasmUrl = new URL('@wasm/wasm_pkg_bg.wasm', import.meta.url).href;

/**
 * WASM バイナリを ArrayBuffer として取得
 *
 * メインスレッドで実行し、結果を Worker に Transferable として転送する。
 * これにより、各 Worker でコピーなしで WASM を初期化できる。
 *
 * @returns WASM バイナリの ArrayBuffer
 */
export async function fetchWasmBytes(): Promise<ArrayBuffer> {
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * WASM URL を取得
 *
 * デバッグやログ出力用。
 */
export function getWasmUrl(): string {
  return wasmUrl;
}
