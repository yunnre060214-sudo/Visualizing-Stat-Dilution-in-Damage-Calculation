import { defineConfig } from "@playwright/test";

const environment = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env ?? {};

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173/Visualizing-Stat-Dilution-in-Damage-Calculation/",
    reuseExistingServer: !environment.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: environment.PLAYWRIGHT_EXECUTABLE_PATH
      ? {
          executablePath: environment.PLAYWRIGHT_EXECUTABLE_PATH,
          args: ["--no-sandbox"],
        }
      : undefined,
  },
});
