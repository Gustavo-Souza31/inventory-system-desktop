import { expect, type Page } from '@playwright/test';

/**
 * Faz login com E2E_EMAIL/E2E_PASSWORD e espera o menu lateral aparecer.
 * Use uma conta de teste, nunca a conta real.
 */
export async function login(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error('Defina E2E_EMAIL e E2E_PASSWORD no .env');
  }

  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // Só existe depois da sessão válida (src/components/Layout.tsx).
  await expect(page.locator('.sidebar')).toBeVisible();
}
