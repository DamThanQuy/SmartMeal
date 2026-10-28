import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const output = process.env.SMARTMEAL_E2E_OUTPUT || path.resolve(directory, '../../.e2e-results/manual');
const mobileURL = process.env.SMARTMEAL_E2E_MOBILE_URL || 'http://127.0.0.1:8082';

export default defineConfig({
  testDir: path.join(directory, 'specs'),
  outputDir: path.join(output, 'browser-results'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(output, 'playwright.json') }],
    ['html', { outputFolder: path.join(output, 'playwright-report'), open: 'never' }],
  ],
  use: {
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'admin',
      testMatch: 'admin.spec.mjs',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 1000 },
        baseURL: process.env.SMARTMEAL_E2E_ADMIN_URL || 'http://127.0.0.1:3001',
      },
    },
    {
      name: 'mobile-chromium',
      testMatch: 'mobile.spec.mjs',
      use: { ...devices['iPhone 13'], browserName: 'chromium', baseURL: mobileURL },
    },
    {
      name: 'mobile-webkit',
      testMatch: 'mobile.spec.mjs',
      use: { ...devices['iPhone 13'], browserName: 'webkit', baseURL: mobileURL },
    },
  ],
});
