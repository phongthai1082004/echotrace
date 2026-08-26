import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // ponytail: these are pre-existing tsx console-log scratch scripts, not vitest suites
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/merge-book-content.test.ts',
      '**/payos.service.test.ts',
      '**/cart.service.test.ts',
    ],
  },
});
