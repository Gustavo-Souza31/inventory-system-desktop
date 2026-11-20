import { test, expect } from '@playwright/test';
import {
  MOTIVO_CREDENCIAIS,
  hasCredentials,
  login,
  createProduct,
  deleteProduct,
  deleteCustomerByName,
  sufixoUnico,
} from './helpers';

test.describe('Venda fiado', () => {
  test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);

  test('venda fiado aumenta o saldo do cliente e o pagamento o reduz', async ({ page }) => {
    const sufixo = sufixoUnico();
    const cliente = `Cliente E2E ${sufixo}`;
    const produto = {
      name: `Produto E2E fiado ${sufixo}`,
      sku: `E2E-FIADO-${sufixo}`,
      price: 10,
      quantity: 5,
      minStock: 1,
    };

    await login(page);

    let produtoCriado = false;
    let clienteCriado = false;
    try {
      // 1. Cadastra o cliente pela tela de Clientes.
      await page.goto('/#/clientes');
      await page.getByRole('button', { name: 'Novo Cliente' }).first().click();
      const modalCliente = page.locator('.modal');
      await expect(modalCliente).toBeVisible();
      await modalCliente.getByPlaceholder('Nome completo do cliente').fill(cliente);
      await modalCliente.getByRole('button', { name: 'Salvar' }).click();
      await expect(modalCliente).toBeHidden();
      clienteCriado = true;

      await createProduct(page, produto);
      produtoCriado = true;

      // 2. Vende fiado no PDV para esse cliente.
      await page.getByRole('link', { name: 'Vendas', exact: true }).click();
      await page.getByPlaceholder('Buscar produto por nome ou código...').fill(produto.sku);
      await page.locator('button', { hasText: produto.name }).first().click();

      const carrinho = page.locator('.card').filter({ hasText: 'Carrinho de Venda' });
      await carrinho.getByRole('button', { name: 'Fiado', exact: true }).click();
      await carrinho.getByPlaceholder('Buscar cliente por nome ou telefone...').fill(cliente);
      await carrinho.locator('button', { hasText: cliente }).click();
      await carrinho.getByRole('button', { name: 'Finalizar Venda' }).click();

      const sucesso = page.locator('.modal').filter({ hasText: 'Venda Finalizada!' });
      await expect(sucesso).toBeVisible();
      await expect(sucesso).toContainText('Fiado registrado para');
      await sucesso.getByRole('button', { name: 'Nova Venda' }).click();

      // 3. O saldo do cliente passou a ser R$ 10,00.
      await page.goto('/#/clientes');
      await page.getByPlaceholder('Buscar cliente ou telefone...').fill(cliente);
      const linha = page.locator('tbody tr').filter({ hasText: cliente });
      await expect(linha).toContainText('10,00');

      // 4. Registra o pagamento total e o saldo volta a zero.
      await linha.click();
      const detalhe = page.locator('.modal').filter({ hasText: 'Saldo devedor atual' });
      await expect(detalhe).toBeVisible();
      await detalhe.getByRole('button', { name: 'Registrar pagamento' }).click();
      await detalhe.getByPlaceholder('10.00').fill('10');
      await detalhe.getByRole('button', { name: 'Confirmar pagamento' }).click();
      await expect(detalhe.getByRole('button', { name: 'Registrar pagamento' })).toBeDisabled();
      await expect(detalhe).toContainText('0,00');
    } finally {
      if (produtoCriado) {
        await deleteProduct(page, produto.sku);
      }
      if (clienteCriado) {
        await deleteCustomerByName(cliente);
      }
    }
  });
});
