import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "e2e/server-only-stub.ts"),
    },
  },
  test: {
    include: ["e2e/**/*.test.ts"],
    setupFiles: ["e2e/env.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
