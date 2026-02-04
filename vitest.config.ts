import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/index.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/test/unit/**/*.test.ts', 'src/test/components/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          browser: {
            enabled: true,
            provider: playwright({
              // WebGPU を有効にするためのフラグ
              launchOptions: {
                args: ['--enable-unsafe-webgpu'],
              },
            }),
            headless: false, // GPU テスト用に headful で実行
            instances: [{ browser: 'chromium' }],
          },
          include: ['src/test/integration/**/*.test.ts'],
          setupFiles: ['./src/test/setup.browser.ts'],
        },
      },
    ],
  },
});
