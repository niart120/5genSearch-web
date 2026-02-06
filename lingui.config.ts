import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'ja',
  locales: ['ja', 'en'],
  catalogs: [
    {
      path: '<rootDir>/src/i18n/locales/{locale}/messages',
      include: ['src'],
      exclude: ['src/wasm/**', 'src/test/**'],
    },
  ],
  compileNamespace: 'ts',
});
