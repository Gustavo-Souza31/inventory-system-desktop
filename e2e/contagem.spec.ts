import { test, expect } from '@playwright/test';
import {
  MOTIVO_CREDENCIAIS,
  hasCredentials,
  login,
  createProduct,
  deleteProduct,
  deleteStockCounts,
  expectProductStock,
  sufixoUnico,
} from './helpers';

test.describe('Contagem de estoque', () => {
  test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);

  test('contagem com diferença gera ajuste e o estoque fica igual ao contado', async ({ page }) => {
    const sufixo = sufixoUnico();
    const produto = {
      name: `Produto E2E contagem ${sufixo}`,
      sku: `E2E-CONTA-${sufixo}`,
      price: 10,
      quantity: 10,
      minStock: 1,
    };

    await login(page);

    let produtoCriado = false;
    try {
      await createProduct(page, produto);
      produtoCriado = true;

      // Conta 7 unidades de um produto que o sistema acha que tem 10.
      await page.goto('/#/contagem');
      await page.getByPlaceholder('Buscar por nome ou SKU...').fill(produto.sku);
      const campo = page.getByLabel(`Quantidade contada de ${produto.name}`);
      await expect(campo).toBeVisible();
      // Em desenvolvimento a tela carrega a lista duas vezes (React StrictMode) e
      // a resposta tardia apaga o valor digitado. Repete o preenchimento até o
      // valor ficar estável, antes de seguir.
      const revisar = page.getByRole('button', { name: 'Revisar e confirmar (1)' });
      await expect(async () => {
        await campo.fill('7');
        await expect(revisar).toBeEnabled({ timeout: 1000 });
        await page.waitForTimeout(700);
        await expect(campo).toHaveValue('7', { timeout: 1000 });
      }).toPass({ timeout: 15000 });
      await revisar.click();
      const resumo = page.locator('.modal').filter({ hasText: 'Resumo da contagem' });
      await expect(resumo).toBeVisible();
      await resumo.getByRole('button', { name: 'Confirmar contagem' }).click();

      const confirmacao = page.locator('.confirm-dialog');
      await expect(confirmacao).toBeVisible();
      await confirmacao.getByRole('button', { name: 'Aplicar contagem' }).click();
      await expect(resumo).toBeHidden();

      // O ajuste foi aplicado: o estoque passou de 10 para 7.
      await expectProductStock(page, produto.sku, 7);

      // E ficou registrado como movimentação de ajuste.
      await page.goto('/#/movimentacoes');
      await expect(page.locator('tbody tr').filter({ hasText: produto.name }).first()).toContainText('Ajuste de contagem');
    } finally {
      if (produtoCriado) {
        await deleteProduct(page, produto.sku);
      }
      await deleteStockCounts();
    }
  });
});
