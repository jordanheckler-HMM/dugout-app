import { defineConfig } from "@playwright/test";

const chrome = process.env.CHROME_PATH;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8123",
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      ...(chrome ? { executablePath: chrome } : {}),
    },
  },
});
