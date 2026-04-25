import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "HOST_PASSWORD=playwright-host-password GOOGLE_SHEETS_ID= GOOGLE_SHEETS_GID= GOOGLE_SHEETS_TAB= GOOGLE_SERVICE_ACCOUNT_KEY_PATH= GOOGLE_SERVICE_ACCOUNT_EMAIL= GOOGLE_PRIVATE_KEY= npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
