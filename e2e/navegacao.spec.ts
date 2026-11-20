import { test, expect } from '@playwright/test';
import { login } from './helpers';

const menu = [
  { label: 'Painel', path: '/' },
  { label: 'Vendas', path: '/vendas' },
  { label: 'Produtos', path: '/produtos' },
  { label: 'Categorias', path: '/categorias' },
  { label: 'Fornecedores', path: '/fornecedores' },
  { label: 'Movimentações', path: '/movimentacoes' },
  { label: 'Locais', path: '/locais' },
  { label: 'Relatórios', path: '/relatorios' },
  { label: 'Configurações', path: '/configuracoes' },
];

const hasCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.skip(!hasCredentials, 'Defina E2E_EMAIL e E2E_PASSWORD no .env');

test('navega por todas as telas do menu sem erros no console', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await login(page);

  for (const item of menu) {
    await page.getByRole('link', { name: item.label, exact: true }).click();
    await expect(page).toHaveURL((url) => (url.hash.replace(/^#/, '') || '/') === item.path);
  }

  expect(errors).toEqual([]);
});
