# 007 — Contagem de estoque (inventário físico): banco e lógica

- **Status:** em revisão
- **Agente:** Claude
- **Branch:** `claude/contagem-estoque-banco`
- **Depende de:** —
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

Existir no banco e em `src/utils/` o que permite registrar uma contagem física e gerar os ajustes de estoque a partir das diferenças, de forma atômica.

## Contexto

- Movimentações já existem (entrada/saída com motivo). A contagem vira ajustes (movimentações do tipo "ajuste") por produto e local.
- A restauração de backup já usa RPC atômica (commit 3307bec): seguir o mesmo padrão, com RLS por usuário.

## O que fazer

1. Tabelas `contagens` e `contagem_itens` (produto, local, esperado, contado) com RLS.
2. RPC `aplicar_contagem(contagem_id)`: cria as movimentações de ajuste e atualiza o estoque numa transação.
3. Funções em `src/utils/stockCount.ts` para montar a lista de esperado e calcular diferenças.
4. Tipos em `src/database/types.ts`.

**Aplicar a migração no Supabase só com autorização do usuário.**

## Arquivos

- Pode alterar: `supabase/schema.sql`, `src/database/`, `src/utils/`
- Pode criar: `src/utils/stockCount.ts`

## Fora de escopo

- A tela (tarefa 008) e contagem por leitor de código de barras.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Aplicar a contagem duas vezes não duplica ajustes
- [ ] RLS impede ver contagem de outro usuário

---

## Relatório

- Agente: Claude
- Branch: `claude/contagem-estoque-banco`
- O que foi feito: tabelas `stockCounts` e `stockCountItems` com RLS; RPC `apply_stock_count(p_count_id)` atômica e idempotente (contagem já aplicada devolve `applied: false` sem duplicar ajustes); utilitários de contagem para a tela; tipos `StockCount` e `StockCountItem`. Os nomes das tabelas e da RPC seguem o inglês/camelCase do schema existente (a spec dizia `contagens`/`aplicar_contagem`).
- Arquivos alterados: `supabase/schema.sql`, `src/database/types.ts`, `src/utils/stockCount.ts` (novo)
- Como testar: **a migração NÃO foi aplicada no Supabase** (precisa da sua autorização). Depois de aplicar: criar contagem com diferença, chamar a RPC duas vezes e conferir que só a primeira gera movimentação 'Ajuste de contagem'; testar com outro usuário para ver a RLS.
- `npm run build`: passou
- Observações / dúvidas: sem local, o contado vira o estoque total do produto; com local, ajusta o saldo do local e move o total pela mesma diferença. `restore_backup` não inclui as tabelas novas (comentado no schema).
