import { test, expect } from '@playwright/test';
import {
  MOTIVO_CREDENCIAIS,
  hasCredentials,
  login,
  createProduct,
  deleteProduct,
  expectProductStock,
  sufixoUnico,
} from './helpers';

test.describe('Venda no PDV', () => {
  test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);

  test('vende um produto em dinheiro, com troco, e baixa o estoque', async ({ page }) => {
    const sufixo = sufixoUnico();
    const produto = {
      name: `Produto E2E venda ${sufixo}`,
      sku: `E2E-VENDA-${sufixo}`,
      price: 10,
      quantity: 5,
      minStock: 1,
    };

    await login(page);

    let produtoCriado = false;
    try {
      // Cadastra pela tela de Produtos, como o lojista faria.
      await createProduct(page, produto);
      produtoCriado = true;

      // Abre o PDV e busca o produto pelo SKU.
      await page.getByRole('link', { name: 'Vendas', exact: true }).click();
      await page
        .getByPlaceholder('Buscar produto por nome ou código...')
        .fill(produto.sku);

      // O primeiro resultado é o do dropdown de busca (antes da grade).
      await page.locator('button', { hasText: produto.name }).first().click();

      const carrinho = page.locator('.card').filter({ hasText: 'Carrinho de Venda' });
      await expect(carrinho.getByText(produto.name, { exact: true })).toBeVisible();
      await expect(carrinho).toContainText('R$ 10,00');

      // Pagamento em dinheiro com troco: total R$ 10,00 e R$ 20,00 entregues.
      await carrinho.getByRole('button', { name: 'Dinheiro', exact: true }).click();
      await carrinho.getByPlaceholder('R$ 0,00').fill('20');
      await expect(carrinho.getByText('Troco:', { exact: true })).toBeVisible();
      await expect(carrinho.getByText('Troco:', { exact: true }).locator('..')).toContainText('10,00');

      await carrinho.getByRole('button', { name: 'Finalizar Venda' }).click();

      const sucesso = page.locator('.modal').filter({ hasText: 'Venda Finalizada!' });
      await expect(sucesso).toBeVisible();
      await expect(sucesso).toContainText('10,00');
      await sucesso.getByRole('button', { name: 'Nova Venda' }).click();
      await expect(sucesso).toBeHidden();

      // A venda deu baixa de 1 unidade: de 5 para 4.
      await expectProductStock(page, produto.sku, 4);
    } finally {
      // Limpa o produto criado. As movimentações da venda caem junto
      // (ON DELETE CASCADE em movements.productId).
      if (produtoCriado) {
        await deleteProduct(page, produto.sku);
      }
    }
  });
});
