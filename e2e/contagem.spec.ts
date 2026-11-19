import { test } from '@playwright/test';
import { MOTIVO_CREDENCIAIS, hasCredentials } from './helpers';

// A tarefa 008 (tela de contagem de estoque) ainda não está integrada nesta
// branch: não existe rota nem tela de contagem. Quando integrar, remover o
// skip abaixo e implementar o roteiro do teste.
test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);
test.skip(true, 'Contagem de estoque (tarefa 008) ainda não integrada nesta branch');

test('contagem com diferença gera ajuste e o estoque fica igual ao contado', async () => {
  // Roteiro previsto para quando a 008 estiver integrada:
  // 1. login(page)
  // 2. createProduct(page, { quantity: 10, ... })
  // 3. abrir a tela de contagem, informar 7 como quantidade contada e confirmar
  // 4. conferir que o ajuste foi registrado e que expectProductStock(page, sku, 7)
  // 5. deleteProduct(page, sku) no finally
  test.info().annotations.push({
    type: 'todo',
    description: 'Implementar após a integração da tarefa 008 (tela de contagem de estoque).',
  });
});
