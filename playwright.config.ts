import { defineConfig, devices } from '@playwright/test';

// Carrega o .env da raiz (gitignored) para ler E2E_EMAIL e E2E_PASSWORD.
// process.loadEnvFile existe no Node 22+; se o arquivo não existir, seguimos
// sem ele e os testes que dependem de credenciais se auto-ignoram.
try {
  process.loadEnvFile();
} catch {
  // Sem .env local: os testes com credenciais fazem skip.
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
