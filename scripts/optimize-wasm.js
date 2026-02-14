import { existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const inputPath = join(root, 'src/wasm/wasm_pkg_bg.wasm');
const outputPath = join(root, 'src/wasm/wasm_pkg_bg.opt.wasm');

if (!existsSync(inputPath)) {
  throw new Error(`WASM input not found: ${inputPath}`);
}

const result = spawnSync('wasm-opt', ['-O4', '--enable-simd', '-o', outputPath, inputPath], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error('wasm-opt failed. Ensure binaryen is installed and wasm-opt is on PATH.');
}

renameSync(outputPath, inputPath);
console.log('Optimized wasm with wasm-opt.');
