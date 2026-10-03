import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
// Features behind a flag (src/lib/flags.ts) are tested against a second
// server with them on: the same build, so it needs `pnpm build` first.
const FLAGGED_PORT = 3101;
const FLAGS_ON = { FEATURE_COMPARE_HEAD_TO_HEAD: "true" };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Fail CI if a test.only slips into a commit.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // Screenshot references (e2e/visual.spec.ts) live in one folder, made on CI.
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  // On CI a missing reference is a failure, never silently written.
  updateSnapshots: process.env.CI ? "none" : "missing",
  expect: {
    // Tolerate antialiasing noise, not a moved or restyled element.
    toHaveScreenshot: { maxDiffPixelRatio: 0.002 },
  },
  use: {
    baseURL,
    // Default to Spanish (the app's default) regardless of the machine's locale.
    locale: "es-AR",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: "flagged/**" },
    // Logging a game happens on a phone at the table, so test mobile too.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: "flagged/**" },
    // e2e/flagged/: what the flags turn on, against the flagged server.
    {
      name: "flagged",
      testMatch: "flagged/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${FLAGGED_PORT}` },
    },
  ],
  webServer: [
    {
      // CI tests the production build (built in an earlier step); locally,
      // reuse `pnpm dev` if it's already running.
      command: process.env.CI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm start --port ${FLAGGED_PORT}`,
      url: `http://localhost:${FLAGGED_PORT}`,
      env: { ...(process.env as Record<string, string>), ...FLAGS_ON },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
