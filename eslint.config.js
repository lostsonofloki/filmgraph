import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'scripts/**',
      'playwright-artifacts/**',
      'backup-*/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Vite client + rare CRA-style fallbacks in supabaseClient.js
        process: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'MOODS',
            'MOOD_CATEGORIES',
            'useLists',
            'useToast',
            'useUser',
          ],
        },
      ],
      'react/prop-types': 'off',
      // Copy-heavy UI; escaping every quote in prose is not worth the noise
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
