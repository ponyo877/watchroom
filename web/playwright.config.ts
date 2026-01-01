import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Test Configuration for WatchRoom
 *
 * Prerequisites:
 * - Backend server running (task dev or go run)
 * - Frontend dev server running (pnpm dev)
 * - Environment variables set (.env.test)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // P2P tests need sequential execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for P2P tests
  reporter: 'html',
  timeout: 60000, // 60 seconds per test for P2P sync
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
