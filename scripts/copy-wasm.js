import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const src = join(root, 'src/wasm/wasm_pkg_bg.wasm');
const dest = join(root, 'public/wasm/wasm_pkg_bg.wasm');

if (!existsSync(dirname(dest))) {
  mkdirSync(dirname(dest), { recursive: true });
}

copyFileSync(src, dest);
console.log('Copied wasm_pkg_bg.wasm to public/wasm/');
