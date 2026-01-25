import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import unusedImports from 'eslint-plugin-unused-imports';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '*.{cjs,js}'] },
  { files: ['pages/**/*.{ts,jsx,tsx}', 'src/**/*.{ts,jsx,tsx}'] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // unused-imports가 처리
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error', // 미사용 import 제거
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
];
