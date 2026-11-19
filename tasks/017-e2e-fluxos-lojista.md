# 017 — Testes E2E dos fluxos principais do lojista

- **Status:** bloqueada
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

- [ ] `npm run build` passa sem erros
- [ ] Cada teste limpa os dados que criou
- [ ] Nenhuma credencial no diff
- [ ] Testes de funcionalidades ainda não integradas estão com `test.skip` e motivo

---

## Relatório

_(preenchido pelo agente)_

- Agente:
- Branch:
- O que foi feito:
- Arquivos alterados:
- Como testar:
- `npm run build`:
- Observações / dúvidas:
