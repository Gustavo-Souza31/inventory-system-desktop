import { test } from '@playwright/test';
import { MOTIVO_CREDENCIAIS, hasCredentials } from './helpers';

// A tarefa 013 (telas de clientes e fiado) ainda não está integrada nesta
// branch: não existem rotas de clientes nem forma de pagamento "fiado" no PDV.
// Quando integrar, remover o skip abaixo e implementar o roteiro do teste.
test.skip(!hasCredentials, MOTIVO_CREDENCIAIS);
test.skip(true, 'Clientes e fiado (tarefa 013) ainda não integrados nesta branch');

test('venda fiado aumenta o saldo do cliente e o pagamento o reduz', async () => {
  // Roteiro previsto para quando a 013 estiver integrada:
  // 1. login(page)
  // 2. criar um cliente de teste (nome único) pela tela de Clientes
  // 3. createProduct(page, { price: 10, ... })
  // 4. vender fiado no PDV escolhendo o cliente e conferir o saldo de R$ 10,00
  // 5. registrar o pagamento e conferir que o saldo volta a R$ 0,00
  // 6. limpar cliente, produto e venda criados no finally
  test.info().annotations.push({
    type: 'todo',
    description: 'Implementar após a integração da tarefa 013 (clientes e fiado).',
  });
});
