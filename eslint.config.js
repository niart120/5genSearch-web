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
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      unicorn.configs.recommended,
    ],
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.app.json'],
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],
      'unicorn/prevent-abbreviations': 'off',
    },
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
]);
