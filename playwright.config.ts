import { defineConfig, devices } from '@playwright/test';

// Carrega .env.local e depois .env (ambos gitignored), na mesma ordem do Vite:
// o .env.local tem prioridade (loadEnvFile não sobrescreve o que já foi lido).
// Assim o E2E usa o mesmo projeto Supabase que o app vai usar — importante para
// apontar para um projeto de teste sem mexer no .env de produção.
// process.loadEnvFile existe no Node 22+; sem os arquivos, os testes que
// dependem de credenciais se auto-ignoram.
for (const arquivo of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(arquivo);
  } catch {
    // Arquivo ausente: segue sem ele.
  }
}

export default defineConfig({
  testDir: 'e2e',
  // Em série: todos os testes usam a mesma conta de teste, e o estoque de um
  // interfere nos avisos (estoque baixo) e nas contagens dos outros.
  fullyParallel: false,
  workers: 1,
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
