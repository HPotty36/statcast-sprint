import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.venv', 'data', 'web'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    rules: {
      // 핵심 규칙 4: 모든 난수는 시드 RNG(src/engine/rng.ts)에서만
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'src/engine/rng.ts 의 시드 RNG를 사용하세요.' },
      ],
    },
  },
  {
    files: ['src/ui/**/*.tsx', 'src/main.tsx'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
  },
  {
    // 핵심 규칙 3: 엔진은 DOM에 의존하지 않는 순수 TS
    files: ['src/engine/**/*.ts'],
    languageOptions: { globals: { ...globals.es2022 } },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame'],
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', '**/ui/**'] }],
    },
  },
);
