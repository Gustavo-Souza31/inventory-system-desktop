import { test, expect } from '@playwright/test';

// Não precisa de credenciais: só confere que a tela de login carrega.
test.describe('Tela de login', () => {
  test('mostra campos de e-mail, senha e botão de entrar', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });
});
