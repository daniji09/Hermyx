import js from '@eslint/js';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // ESLint ignores these files to be fixed
  { ignores: ['dist', 'node_modules', 'build'] },
  // Anti-error foundation rules
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { prettier: eslintPluginPrettier },

    rules: {
      // Automatic rules for Prettier
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // Rules for moderns JS (ES6+)
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      // Other rules
      'no-console': 'off',
      'capitalized-comments': ['error', 'always'],
      'no-useless-catch': 'off',
    },
  },
];
