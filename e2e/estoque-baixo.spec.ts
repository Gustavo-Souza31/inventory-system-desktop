import { test } from '@playwright/test';
import { MOTIVO_CREDENCIAIS, hasCredentials } from './helpers';

// A tarefa 006 (alerta de estoque baixo no Painel) ainda não está integrada
// nesta branch: o Painel atual não lista produtos abaixo do estoque mínimo.
// Quando integrar, remover o skip abaixo e implementar o roteiro do teste.
test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);
test.skip(true, 'Alerta de estoque baixo no Painel (tarefa 006) ainda não integrado nesta branch');

test('produto abaixo do estoque mínimo aparece no Painel', async () => {
  // Roteiro previsto para quando a 006 estiver integrada:
  // 1. login(page)
  // 2. createProduct(page, { quantity: 1, minStock: 5, ... })
  // 3. abrir o Painel e conferir que o produto aparece no alerta de estoque baixo
  // 4. deleteProduct(page, sku) no finally
  test.info().annotations.push({
    type: 'todo',
    description: 'Implementar após a integração da tarefa 006 (alerta de estoque baixo).',
  });
});
