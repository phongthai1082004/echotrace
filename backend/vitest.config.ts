import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/merge-book-content.test.ts',
      '**/payos.service.test.ts',
      '**/cart.service.test.ts',
    ],
  },
});
