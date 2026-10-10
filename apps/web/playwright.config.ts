import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e-ui",
  timeout: 90_000,
  // A cold `next dev` compiles each route on first visit, which can exceed the 5s default.
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: "list",
  use: {
    // The local-stack dev server (`pnpm dev:local`), never the hosted one.
    baseURL: "http://localhost:3100",
    channel: "chrome", // system Chrome, no browser download needed
    headless: true,
    screenshot: "only-on-failure",
  },
});
