import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  projects: [
    { name:'desktop-chromium', use:{...devices['Desktop Chrome']} },
    { name:'mobile-chromium', use:{...devices['Pixel 7']} }
  ],
  reporter: [['list']]
});
