# 012 — Clientes e venda fiado: banco e lógica

- **Status:** aberta
- **Agente:** Claude
- **Branch:** `claude/clientes-fiado-banco`
- **Depende de:** —
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

Existir no banco e em `src/utils/` o cadastro de clientes e o controle de saldo devedor (fiado): venda a prazo, pagamento parcial e consulta do que cada cliente deve.

## Contexto

- Vendas existem em `Sales` com formas de pagamento dinheiro, cartão e PIX. Fiado vira uma nova forma de pagamento ligada a um cliente.
- `src/utils/phone.ts` já formata telefone; reutilizar.
- Se a tarefa 009 (perfis) entrar antes, as tabelas novas devem usar `empresa_id`; se entrar depois, a 009 migra estas também.

## O que fazer

1. Tabelas `clientes` (nome, telefone, observação) e `lancamentos_cliente` (cliente, venda opcional, valor, tipo: `fiado` ou `pagamento`, data), com RLS.
2. Venda com forma de pagamento "fiado" exige cliente e cria o lançamento na mesma transação (RPC).
3. Função em `src/utils/` para calcular o saldo devedor por cliente.
4. Tipos em `src/database/types.ts`.

**Aplicar a migração no Supabase só com autorização do usuário.**

## Arquivos

- Pode alterar: `supabase/schema.sql`, `src/database/`, `src/utils/`
- Pode criar: `src/utils/customerBalance.ts`

## Fora de escopo

- Telas (tarefa 013), juros e multa, cobrança automática por mensagem.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Venda fiado sem cliente é rejeitada
- [ ] Saldo = soma dos fiados menos os pagamentos
- [ ] RLS isola os clientes por usuário

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
