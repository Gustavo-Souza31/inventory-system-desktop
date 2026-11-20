# 017 — Testes E2E dos fluxos principais do lojista

- **Status:** em revisão
- **Agente:** DeepSeek
- **Branch:** `deepseek/e2e-fluxos-lojista`
- **Depende de:** 001 e, para cada fluxo, a tarefa da funcionalidade (006, 008, 011, 013)
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

Ter testes que criam dados em uma conta de teste e verificam os fluxos principais: venda no PDV, alerta de estoque baixo, contagem de estoque e venda fiado.

## Contexto

- A tarefa 001 monta o Playwright (`npm run test:e2e`) e só testa navegação. Esta usa a mesma estrutura e **cria dados**, por isso exige conta de teste separada no Supabase (`E2E_EMAIL`, `E2E_PASSWORD`).
- Cada fluxo só pode ser testado depois que a funcionalidade correspondente for integrada. Faça um arquivo `.spec.ts` por fluxo e marque `test.skip` com o motivo enquanto a tarefa dependente não estiver concluída.
- Limpe os dados criados ao fim de cada teste (produtos, vendas, clientes de teste), para a conta não acumular lixo.

## O que fazer

1. `e2e/venda.spec.ts`: cadastra um produto com estoque, vende no PDV (dinheiro, com troco) e confere que o estoque baixou.
2. `e2e/estoque-baixo.spec.ts` (após 006): produto abaixo do mínimo aparece no Painel.
3. `e2e/contagem.spec.ts` (após 008): contagem com diferença gera ajuste e o estoque fica igual ao contado.
4. `e2e/fiado.spec.ts` (após 013): venda fiado aumenta o saldo do cliente e o pagamento o reduz.

## Arquivos

- Pode alterar: `e2e/**`
- **Não alterar:** nada em `src/`, `electron/`, `supabase/`

## Fora de escopo

- Rodar no GitHub Actions, testes de Electron ou Android.

## Critérios de pronto

- [x] `npm run build` passa sem erros
- [x] Cada teste limpa os dados que criou
- [x] Nenhuma credencial no diff
- [x] Testes de funcionalidades ainda não integradas estão com `test.skip` e motivo

---

## Relatório

_(preenchido pelo agente)_

- Agente: DeepSeek
- Branch: `deepseek/e2e-fluxos-lojista`
- O que foi feito:
  - `e2e/helpers.ts` ganhou utilitários para os fluxos: checagem de credenciais,
    sufixo único por execução, cadastro de produto pela tela de Produtos, conferência
    da quantidade na tabela e exclusão do produto (limpeza).
  - `e2e/venda.spec.ts`: teste real do PDV — cadastra produto com estoque 5, busca
    pelo SKU, adiciona ao carrinho, paga R$ 20,00 em dinheiro (total R$ 10,00,
    confere o troco de R$ 10,00), finaliza a venda e confere que o estoque foi para 4.
    O produto é excluído no `finally` (as movimentações caem por `ON DELETE CASCADE`).
  - `e2e/estoque-baixo.spec.ts`, `e2e/contagem.spec.ts` e `e2e/fiado.spec.ts`:
    testes com `test.skip` e motivo explícito, porque as tarefas 006, 008 e 013 ainda
    não estão integradas nesta branch. Cada um tem o roteiro previsto comentado para
    quando a funcionalidade chegar. Todos também se auto-ignoram sem E2E_EMAIL/E2E_PASSWORD.
  - `e2e/README.md` atualizado com a lista de specs, quais precisam de credenciais e
    como limpar restos de uma execução que falhou.
- Arquivos alterados: `e2e/helpers.ts`, `e2e/venda.spec.ts` (novo),
  `e2e/estoque-baixo.spec.ts` (novo), `e2e/contagem.spec.ts` (novo),
  `e2e/fiado.spec.ts` (novo), `e2e/README.md`, `tasks/017-e2e-fluxos-lojista.md`
- Como testar:
  1. `npx playwright install chromium` (uma vez por máquina)
  2. preencher `E2E_EMAIL` e `E2E_PASSWORD` no `.env` com uma conta de teste (nunca a real)
  3. `npm run build`
  4. `npm run test:e2e`
  Sem as variáveis, `login.spec.ts` roda e os demais aparecem como *skipped*.
- `npm run build`: passou
- Observações / dúvidas:
  - O fluxo de venda não pôde ser executado de verdade nesta máquina: o `.env` local
    só tem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, sem `E2E_EMAIL`/`E2E_PASSWORD`.
    Com a conta de teste configurada, `venda.spec.ts` passa a rodar; os seletores foram
    escritos a partir de `src/pages/Products.tsx` e `src/pages/Sales.tsx`.
  - A tarefa 011 (cupom não fiscal) não tem spec previsto na 017; nada foi criado para ela.
  - Os testes de 006/008/013 estão prontos como esqueleto documentado; ao integrar cada
    funcionalidade, basta remover o `test.skip(true, ...)` do arquivo correspondente e
    seguir o roteiro comentado.

