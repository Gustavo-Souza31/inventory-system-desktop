import { test, expect } from '@playwright/test';
import { MOTIVO_CREDENCIAIS, hasCredentials, login, createProduct, deleteProduct, sufixoUnico } from './helpers';

test.describe('Alerta de estoque baixo', () => {
  test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);

  test('produto abaixo do estoque mínimo aparece no Painel', async ({ page }) => {
    const sufixo = sufixoUnico();
    const produto = {
      name: `Produto E2E baixo ${sufixo}`,
      sku: `E2E-BAIXO-${sufixo}`,
      price: 10,
      quantity: 1,
      minStock: 5,
    };

    await login(page);

    let produtoCriado = false;
    try {
      await createProduct(page, produto);
      produtoCriado = true;

      await page.goto('/#/');
      // O Painel lista os produtos mais críticos na seção "Estoque baixo".
      await expect(page.getByText(produto.name, { exact: true })).toBeVisible();
    } finally {
      if (produtoCriado) {
        await deleteProduct(page, produto.sku);
      }
    }
  });
});
