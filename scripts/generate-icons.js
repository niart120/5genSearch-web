/**
 * アプリアイコンのリサイズスクリプト
 * 元画像 public/icon.png から各サイズのバリアントを生成する
 *
 * Usage: node scripts/generate-icons.js
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const source = join(publicDir, 'icon.png');

const variants = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

for (const { name, size } of variants) {
  const output = join(publicDir, name);
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output);
  console.log(`Generated: ${name} (${size}x${size})`);
}

console.log('Done.');
