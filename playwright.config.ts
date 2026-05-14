import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — E2E smoke fase 1.
 *
 * Em CI / dev local: webServer block sobe `pnpm dev` antes dos testes.
 * Em ambiente DEV remoto (smoke pos-deploy): setar E2E_BASE_URL pra
 * skipar webServer e bater direto na URL real.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL ??
            "postgres://stub:stub@localhost:5432/stub",
        },
      },
});
