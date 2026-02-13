import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { lingui } from '@lingui/vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { playwright } from '@vitest/browser-playwright';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [
    wasm(),
    react({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),
    lingui(),
    tsconfigPaths(),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
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
                channel: 'chromium', // new headless mode (real Chrome)
                args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
              },
            }),
            headless: true, // new headless mode で試行
            instances: [{ browser: 'chromium' }],
          },
          include: ['src/test/integration/**/*.test.ts'],
          setupFiles: ['./src/test/setup.browser.ts'],
        },
      },
    ],
  },
});
