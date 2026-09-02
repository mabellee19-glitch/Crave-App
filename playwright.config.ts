import { defineConfig, devices } from '@playwright/test';

/**
 * Die Tests starten die App wie im Betrieb (production build) und pruefen sie
 * in zwei Groessen: iPhone (mobile Navigation unten) und iPad/Desktop.
 * WebKit deckt Safari ab, wenn die Engine lokal installiert ist.
 */
const PORT = Number(process.env.PORT ?? 3100);

/**
 * In Umgebungen mit vorinstalliertem Chromium (z. B. CI-Container) kann der
 * Pfad ueber PLAYWRIGHT_CHROMIUM_PATH gesetzt werden. Ohne die Variable nimmt
 * Playwright den selbst heruntergeladenen Browser.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'iphone',
      // Geraetegroesse und Touch von iPhone 13, Engine aber Chromium: WebKit
      // ist nicht in jeder Umgebung installiert. Wer Safari genau abbilden
      // will, setzt hier browserName auf 'webkit' (siehe README).
      use: { ...devices['iPhone 13'], browserName: 'chromium', isMobile: true, hasTouch: true },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/status`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { CRAVE_DATA_DIR: '.playwright-data' },
  },
});
