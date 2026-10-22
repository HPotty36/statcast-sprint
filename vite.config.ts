/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 정적 파일은 web/public 아래에 둔다 (sample/ 은 커밋, data/ 는 gitignored)
  publicDir: 'web/public',
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
