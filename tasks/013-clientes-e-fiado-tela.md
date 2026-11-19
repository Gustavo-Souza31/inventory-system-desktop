# 013 — Clientes e venda fiado: telas

- **Status:** aberta
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/clientes-fiado-tela`
- **Depende de:** 012
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

O lojista cadastra clientes, vende "fiado" no PDV escolhendo o cliente e registra pagamentos do que o cliente deve.

## Contexto

- Banco e lógica vêm da tarefa 012 (`src/utils/customerBalance.ts` e RPCs). Use-os; não acesse tabelas direto.
- Padrão de página com CRUD: veja `src/pages/Suppliers.tsx` e o hook `useCrud`.

## O que fazer

1. Página `src/pages/Customers.tsx`: lista com nome, telefone e saldo devedor; modal de cadastro e edição; detalhe do cliente com histórico de lançamentos e botão "Registrar pagamento".
2. No PDV (`src/pages/Sales.tsx`), forma de pagamento "Fiado": seletor de cliente (com busca e "novo cliente").
3. Rota `/clientes` e item no menu.

## Arquivos

- Pode alterar: `src/App.tsx`, `src/components/Layout.tsx`, `src/pages/Sales.tsx`, `src/index.css`
- Pode criar: `src/pages/Customers.tsx`
- **Não alterar:** `src/database/`, `src/utils/`

## Fora de escopo

- Juros, multa, envio de cobrança por WhatsApp.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Venda fiado sem cliente selecionado não finaliza
- [ ] Saldo do cliente atualiza após venda e após pagamento
- [ ] Funciona na largura de celular

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
