import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
  globalIgnores(['dist', 'wasm-pkg/pkg', 'src/wasm', 'src/i18n/locales', '**/*.md']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      import: importPlugin,
      unicorn,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
      'unicorn/prefer-node-protocol': 'error',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
]);
