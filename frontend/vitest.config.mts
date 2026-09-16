import path from "node:path";
import { defineConfig } from "vitest/config";

// ponytail: one jsdom env for all tests (attribution needs window/localStorage);
// pure-logic suites just ignore the DOM.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next/**"],
  },
});
