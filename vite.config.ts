import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { lingui } from '@lingui/vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';

// https://vite.dev/config/
export default defineConfig({
  base: '/5genSearch-web/',
  plugins: [
    wasm(),
    tailwindcss(),
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
});
